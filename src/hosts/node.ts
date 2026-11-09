#!/usr/bin/env node
import path from "node:path";
import { GithubCli } from "../adapters/github";
import { GitHubRepoManager, ManagerOptions } from "../core/manager";

export function parseArguments(args: string[]): ManagerOptions | null {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) return null;
  let localPath: string | undefined;
  let repoName: string | undefined;
  let visibility: "public" | "private" = "public";
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--repo") {
      repoName = args[++i];
      if (!repoName || repoName.startsWith("-")) throw new Error("--repo requires a repository name");
    } else if (arg === "--private") {
      visibility = "private";
    } else if (arg === "--public") {
      visibility = "public";
    } else if (arg.startsWith("-")) {
      throw new Error("Unknown option: " + arg);
    } else if (localPath === undefined) {
      localPath = arg;
    } else {
      throw new Error("Exactly one local folder must be supplied");
    }
  }
  if (!localPath) throw new Error("Usage: github-repo-manager <folder> [--repo name] [--private|--public]");
  return { localPath: path.resolve(localPath), repoName, visibility };
}

export const HELP = [
  "GitHubRepoManager - automatic create or destructive default-branch sync",
  "Usage: github-repo-manager <folder> [--repo name] [--private|--public]",
  "",
  "Remote absent: initialize/commit and create/push a repository.",
  "Remote exists: re-clone its default branch and REPLACE the local folder.",
  "WARNING: sync PERMANENTLY discards local-only commits, edits, and untracked files.",
  "There is no confirmation prompt. --private only affects new repositories."
].join("\n");

async function main(): Promise<void> {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (!options) {
      process.stdout.write(HELP + "\n");
      return;
    }
    const result = await new GitHubRepoManager(new GithubCli()).execute(options);
    process.stdout.write(JSON.stringify({ success: true, ...result }, null, 2) + "\n");
  } catch (error) {
    process.stderr.write("GitHubRepoManager: " + String(error) + "\n");
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}
