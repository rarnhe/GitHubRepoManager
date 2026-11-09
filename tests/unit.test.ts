import assert from "node:assert/strict";
import { test } from "node:test";
import { CommandResult, CommandRunner, CommandFailure, checked } from "../src/adapters/command";
import { GithubCli } from "../src/adapters/github";
import { validRepositoryName } from "../src/core/manager";
import { parseArguments } from "../src/hosts/node";

test("CLI accepts one folder and defaults to public", () => {
  const args = parseArguments(["/tmp/MyProject"]);
  assert.equal(args?.localPath, "/tmp/MyProject");
  assert.equal(args?.visibility, "public");
});
test("CLI supports --repo and --private", () => {
  const args = parseArguments(["--private","/tmp/with spaces","--repo","OtherRepo"]);
  assert.equal(args?.visibility, "private");
  assert.equal(args?.repoName, "OtherRepo");
  assert.equal(args?.localPath, "/tmp/with spaces");
});
test("CLI rejects invalid invocation", () => {
  assert.throws(() => parseArguments([]), /Usage/);
  assert.throws(() => parseArguments(["a","b"]), /Exactly one/);
  assert.throws(() => parseArguments(["a","--reset-hard"]), /Unknown option/);
  assert.throws(() => parseArguments(["--repo"]), /requires/);
  assert.equal(parseArguments(["--help"]), null);
});
test("repository name validation excludes injected shell syntax", () => {
  assert.equal(validRepositoryName("name_1.alpha"), true);
  for (const name of ["..",".",".git","x/y","two words","x;rm -rf /",""]) {
    assert.equal(validRepositoryName(name), false, name);
  }
});
test("gh API maps only explicit HTTP 404 to absence", async () => {
  const mock = (stderr: string): CommandRunner => async () => ({exitCode:1,stdout:"",stderr});
  assert.equal(await new GithubCli(mock("gh: Not Found (HTTP 404)")).findRepository("me/name"),null);
  await assert.rejects(new GithubCli(mock("gh: Forbidden (HTTP 403)")).findRepository("me/name"),CommandFailure);
  await assert.rejects(new GithubCli(mock("network timeout")).findRepository("me/name"),CommandFailure);
});
test("gh API reads default branch and repository URL", async () => {
  const reply: CommandResult = {exitCode:0,stdout:JSON.stringify({
    full_name:"tester/proj",html_url:"https://github.com/tester/proj",
    default_branch:"master",archived:false
  }),stderr:""};
  const run: CommandRunner = async (exe,args) => {
    assert.equal(exe,"gh");
    assert.deepEqual(args,["api","repos/tester/proj"]);
    return reply;
  };
  const remote = await new GithubCli(run).findRepository("tester/proj");
  assert.equal(remote?.defaultBranch,"master");
  assert.equal(remote?.url,"https://github.com/tester/proj");
});
test("clone uses exactly the remote default branch via argv, not a shell", async () => {
  const seen: Array<{exe:string,args:string[]}> = [];
  const run: CommandRunner = async (exe,args) => {
    seen.push({exe,args});return {exitCode:0,stdout:"",stderr:""};
  };
  await new GithubCli(run).cloneDefaultBranch("tester/Project","stable","/tmp/with spaces");
  assert.deepEqual(seen,[{exe:"gh",args:[
    "repo","clone","tester/Project","/tmp/with spaces","--","--branch","stable","--single-branch"
  ]}]);
});
test("nonzero command status is surfaced", async () => {
  const run: CommandRunner = async () => ({exitCode:7,stdout:"",stderr:"bad"});
  await assert.rejects(checked(run,"git",["status"]), (err: unknown) =>
    err instanceof CommandFailure && err.exitCode === 7);
});
