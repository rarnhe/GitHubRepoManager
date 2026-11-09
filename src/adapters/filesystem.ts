import { lstat, mkdtemp, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function validateTargetDirectory(input: string): Promise<string> {
  const target = path.resolve(input);
  const root = path.parse(target).root;
  if (target === root || target === os.homedir()) {
    throw new Error("Refusing to operate on a filesystem root or home directory");
  }
  const script = process.argv[1] ? path.resolve(process.argv[1]) : "";
  if (script && (script === target || script.startsWith(target + path.sep))) {
    throw new Error("Refusing to replace the directory containing the running script");
  }
  const stat = await lstat(target);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("Target must be a real local directory, not a symlink");
  }
  return target;
}

export async function makeStagingDirectory(target: string): Promise<string> {
  return mkdtemp(path.join(path.dirname(target), "." + path.basename(target) + "-stage-"));
}

export async function replaceDirectory(stage: string, target: string): Promise<void> {
  // Sibling paths stay on one filesystem. The temporary backup is an
  // in-operation rollback location, not a retained copy of user changes.
  const backup = await mkdtemp(path.join(path.dirname(target), "." + path.basename(target) + "-old-"));
  await rm(backup, { recursive: true, force: true });
  await rename(target, backup);
  try {
    await rename(stage, target);
  } catch (error) {
    try {
      await rename(backup, target);
    } catch (rollbackError) {
      throw new Error("Directory replacement and rollback both failed; old data is at " +
        backup + "; replacement error: " + String(error) + "; rollback error: " + String(rollbackError));
    }
    throw error;
  }
  await rm(backup, { recursive: true, force: true });
}
