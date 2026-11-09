import { checked, CommandFailure, CommandRunner, runCommand } from "./command";

export interface RemoteRepository {
  fullName: string;
  url: string;
  defaultBranch: string | null;
  archived: boolean;
}

export interface GithubPort {
  getOwner(): Promise<string>;
  findRepository(fullName: string): Promise<RemoteRepository | null>;
  createRepository(fullName: string, folder: string, visibility: "public" | "private"): Promise<void>;
  cloneDefaultBranch(fullName: string, branch: string, target: string): Promise<void>;
}

export class GithubCli implements GithubPort {
  constructor(private readonly run: CommandRunner = runCommand) {}

  async getOwner(): Promise<string> {
    await checked(this.run, "gh", ["auth", "status"]);
    const login = await checked(this.run, "gh", ["api", "user", "--jq", ".login"]);
    if (!/^[A-Za-z0-9-]+$/.test(login)) throw new Error("Invalid GitHub login");
    return login;
  }

  async findRepository(fullName: string): Promise<RemoteRepository | null> {
    const response = await this.run("gh", ["api", "repos/" + fullName]);
    if (response.exitCode !== 0) {
      if (/\bHTTP 404\b/i.test(response.stderr + " " + response.stdout)) return null;
      throw new CommandFailure("gh api", response.exitCode, response.stderr || response.stdout);
    }
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(response.stdout) as Record<string, unknown>;
    } catch {
      throw new Error("GitHub returned invalid repository JSON");
    }
    if (data.full_name !== fullName || typeof data.html_url !== "string") {
      throw new Error("GitHub repository identity did not match the requested name");
    }
    return {
      fullName,
      url: data.html_url,
      defaultBranch: typeof data.default_branch === "string" ? data.default_branch : null,
      archived: data.archived === true
    };
  }

  async createRepository(fullName: string, folder: string, visibility: "public" | "private"): Promise<void> {
    await checked(this.run, "gh", [
      "repo", "create", fullName, "--" + visibility, "--source=.", "--remote=origin"
    ], { cwd: folder, timeoutMs: 180_000 });
  }

  async cloneDefaultBranch(fullName: string, branch: string, target: string): Promise<void> {
    await checked(this.run, "gh", [
      "repo", "clone", fullName, target, "--", "--branch", branch, "--single-branch"
    ], { timeoutMs: 300_000 });
  }
}
