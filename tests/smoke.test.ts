import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import path from "node:path";
import { checked, runCommand } from "../src/adapters/command";

const app=path.resolve("dist/github-repo-manager.js");
test("compiled standalone JS is present",()=>assert.ok(existsSync(app)));
test("compiled CLI help shows irreversible overwrite warning",async()=>{
  const output=await checked(runCommand,process.execPath,[app,"--help"]);
  assert.match(output,/Usage:/);
  assert.match(output,/PERMANENTLY discards/);
});
test("compiled CLI fails when path is missing",async()=>{
  const result=await runCommand(process.execPath,[app]);
  assert.notEqual(result.exitCode,0);
  assert.match(result.stderr,/Usage:/);
});
