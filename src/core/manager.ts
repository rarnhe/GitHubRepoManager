import path from "node:path";
import { rm } from "node:fs/promises";
import { checked, CommandFailure, CommandRunner, runCommand } from "../adapters/command";
import { GithubPort, RemoteRepository } from "../adapters/github";
import { makeStagingDirectory, replaceDirectory, validateTargetDirectory } from "../adapters/filesystem";

export interface ManagerOptions {
  localPath: string;
  repoName?: string;
  visibility?: "public" | "private";
}

export interface ManagerResult {
  action: "created" | "synced";
  repository: string;
  branch: string;
  commitSha: string;
  url: string;
}

export function validRepositoryName(name: string): boolean {
  return name !== "." && name !== ".." && name !== ".git" &&
    /^[A-Za-z0-9._-]+$/.test(name);
}

export class GitHubRepoManager {
  constructor(
    private readonly github: GithubPort,
    private readonly run: CommandRunner = runCommand
  ) {}

  private git(args: string[], cwd: string): Promise<string> {
    return checked(this.run, "git", args, { cwd });
  }

  async execute(options: ManagerOptions): Promise<ManagerResult> {
    const target = await validateTargetDirectory(options.localPath);
    const name = options.repoName ?? path.basename(target);
    if (!validRepositoryName(name)) throw new Error("Invalid GitHub repository name: " + name);

    const owner = await this.github.getOwner();
    const fullName = owner + "/" + name;
    const remote = await this.github.findRepository(fullName);
    if (remote === null) {
      return this.create(target, fullName, options.visibility ?? "public");
    }
    return this.sync(target, remote);
  }

  private async create(target: string, fullName: string, visibility: "public" | "private"): Promise<ManagerResult> {
    const inside = await this.run("git", ["rev-parse", "--show-toplevel"], { cwd: target });
    if (inside.exitCode === 0) {
      if (path.resolve(inside.stdout.trim()) !== target) {
        throw new Error("Selected directory is inside a different Git repository; select its root");
      }
    } else {
      await this.git(["init", "-b", "main"], target);
    }

    const origin = await this.run("git", ["remote", "get-url", "origin"], { cwd: target });
    if (origin.exitCode === 0) {
      throw new Error("Refusing to overwrite the local origin remote");
    }
    const hasHead = await this.run("git", ["rev-parse", "--verify", "HEAD"], { cwd: target });

    await this.git(["add", "-A"], target);
    const staged = await this.run("git", ["diff", "--cached", "--quiet"], { cwd: target });
    if (staged.exitCode === 1) {
      await this.git(["commit", "-m", "Initial commit by GitHubRepoManager"], target);
    } else if (staged.exitCode === 0 && hasHead.exitCode !== 0) {
      await this.git(["commit", "--allow-empty", "-m", "Initial commit by GitHubRepoManager"], target);
    } else if (staged.exitCode !== 0) {
      throw new CommandFailure("git diff --cached", staged.exitCode, staged.stderr);
    }

    const branch = await this.git(["symbolic-ref", "--short", "HEAD"], target);
    if (!branch) throw new Error("Cannot push a detached HEAD");
    await this.github.createRepository(fullName, target, visibility);
    await this.git(["push", "-u", "origin", branch], target);
    const commitSha = await this.git(["rev-parse", "HEAD"], target);
    return {
      action: "created",
      repository: fullName,
      branch,
      commitSha,
      url: "https://github.com/" + fullName
    };
  }

  private async sync(target: string, remote: RemoteRepository): Promise<ManagerResult> {
    if (!remote.defaultBranch) throw new Error("Remote repository has no default branch to clone");
    const branch = remote.defaultBranch;
    const stage = await makeStagingDirectory(target);
    try {
      await this.github.cloneDefaultBranch(remote.fullName, branch, stage);
      const commitSha = await this.git(["rev-parse", "HEAD"], stage);
      const checkedOutBranch = await this.git(["symbolic-ref", "--short", "HEAD"], stage);
      if (checkedOutBranch !== branch || !/^[0-9a-f]{40,64}$/i.test(commitSha)) {
        throw new Error("Clone verification failed: wrong branch or invalid HEAD");
      }
      const status = await this.git(["status", "--porcelain"], stage);
      if (status.length > 0) throw new Error("Clone verification failed: working tree is dirty");

      await replaceDirectory(stage, target);
      const actualCommit = await this.git(["rev-parse", "HEAD"], target);
      if (actualCommit !== commitSha) throw new Error("Post-replacement HEAD verification failed");
      return {
        action: "synced",
        repository: remote.fullName,
        branch,
        commitSha,
        url: remote.url
      };
    } finally {
      await rm(stage, { recursive: true, force: true });
    }
  }
}
