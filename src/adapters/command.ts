import { spawn } from "node:child_process";

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CommandOptions {
  cwd?: string;
  timeoutMs?: number;
}

export type CommandRunner = (
  executable: string,
  args: string[],
  options?: CommandOptions
) => Promise<CommandResult>;

export class CommandFailure extends Error {
  constructor(
    public readonly executable: string,
    public readonly exitCode: number,
    public readonly stderr: string
  ) {
    super(executable + " failed (exit " + exitCode + "): " + stderr.slice(-1200));
    this.name = "CommandFailure";
  }
}

export const runCommand: CommandRunner = (executable, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
      timeout: options.timeoutMs ?? 120_000
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const fail = (error: Error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    child.on("error", fail);
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 8_000_000) {
        child.kill();
        fail(new Error(executable + ": stdout exceeded the 8MB limit"));
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 8_000_000) {
        child.kill();
        fail(new Error(executable + ": stderr exceeded the 8MB limit"));
      }
    });
    child.on("close", code => {
      if (!settled) {
        settled = true;
        resolve({ exitCode: code ?? -1, stdout, stderr });
      }
    });
  });

export async function checked(
  run: CommandRunner,
  executable: string,
  args: string[],
  options: CommandOptions = {}
): Promise<string> {
  const result = await run(executable, args, options);
  if (result.exitCode !== 0) {
    throw new CommandFailure(executable, result.exitCode, result.stderr || result.stdout);
  }
  return result.stdout.trim();
}
