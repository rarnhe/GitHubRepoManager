import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { checked, runCommand } from "../src/adapters/command";
import { GithubPort, RemoteRepository } from "../src/adapters/github";
import { GitHubRepoManager } from "../src/core/manager";

async function git(args: string[], cwd: string): Promise<string> {
  return checked(runCommand,"git",args,{cwd});
}
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(),"github-manager-test-"));
  const bare = path.join(root,"remote.git");
  await git(["init","--bare",bare],root);
  return {root,bare,async cleanup(){await rm(root,{recursive:true,force:true});}};
}
function fakeGithub(bare: string, exists: boolean): GithubPort {
  const remote: RemoteRepository = {fullName:"tester/MyProject",
    url:"https://github.com/tester/MyProject",defaultBranch:"main",archived:false};
  return {
    async getOwner(){return "tester";},
    async findRepository(){return exists ? remote : null;},
    async createRepository(_repo,folder){await git(["remote","add","origin",bare],folder);},
    async cloneDefaultBranch(_repo,branch,stage){
      await git(["clone","--branch",branch,"--single-branch",bare,stage],path.dirname(stage));
    }
  };
}
async function prepareRemote(root: string,bare: string): Promise<string> {
  const seed = path.join(root,"seed");
  await mkdir(seed);
  await git(["init","-b","main"],seed);
  await git(["config","user.name","CI Tester"],seed);
  await git(["config","user.email","ci@example.invalid"],seed);
  await writeFile(path.join(seed,"README.md"),"remote default branch\n");
  await git(["add","-A"],seed);
  await git(["commit","-m","initial"],seed);
  const sha = await git(["rev-parse","HEAD"],seed);
  await git(["remote","add","origin",bare],seed);
  await git(["push","-u","origin","main"],seed);
  await git(["switch","-c","feature/latest"],seed);
  await writeFile(path.join(seed,"feature-only.txt"),"newer feature commit\n");
  await git(["add","-A"],seed);
  await git(["commit","-m","newer feature commit"],seed);
  await git(["push","-u","origin","feature/latest"],seed);
  return sha;
}
test("create: initializes regular folder and pushes to local bare remote",async()=>{
  const f = await fixture();
  const keys = ["GIT_AUTHOR_NAME","GIT_AUTHOR_EMAIL","GIT_COMMITTER_NAME","GIT_COMMITTER_EMAIL"];
  const saved = keys.map(k=>process.env[k]);
  try {
    process.env.GIT_AUTHOR_NAME = "CI Tester";
    process.env.GIT_AUTHOR_EMAIL = "ci@example.invalid";
    process.env.GIT_COMMITTER_NAME = "CI Tester";
    process.env.GIT_COMMITTER_EMAIL = "ci@example.invalid";
    const folder = path.join(f.root,"MyProject");
    await mkdir(folder);
    await writeFile(path.join(folder,"first file.txt"),"created via manager\n");
    const result = await new GitHubRepoManager(fakeGithub(f.bare,false)).execute({localPath:folder});
    assert.equal(result.action,"created");
    assert.equal(result.branch,"main");
    assert.match(result.commitSha,/^[a-f0-9]{40}$/);
    const actual = await git(["--git-dir",f.bare,"rev-parse","refs/heads/main"],f.root);
    assert.equal(actual,result.commitSha);
  } finally {
    for (let i=0;i<keys.length;i++){
      if (saved[i]===undefined) delete process.env[keys[i]];
      else process.env[keys[i]]=saved[i];
    }
    await f.cleanup();
  }
});
test("sync: main replaces all old local data even if feature is newer",async()=>{
  const f = await fixture();
  try {
    const sha = await prepareRemote(f.root,f.bare);
    const folder = path.join(f.root,"MyProject");
    await mkdir(folder);
    await git(["init","-b","old-local"],folder);
    await writeFile(path.join(folder,"local-only.txt"),"must disappear");
    await writeFile(path.join(folder,".gitignore"),"ignored.txt\n");
    await writeFile(path.join(folder,"ignored.txt"),"also disappear");
    const result = await new GitHubRepoManager(fakeGithub(f.bare,true)).execute({localPath:folder});
    assert.equal(result.action,"synced");
    assert.equal(result.branch,"main");
    assert.equal(result.commitSha,sha);
    assert.equal(await git(["rev-parse","HEAD"],folder),sha);
    assert.equal((await readFile(path.join(folder,"README.md"),"utf8")).trim(),"remote default branch");
    assert.deepEqual((await readdir(folder)).sort(),[".git","README.md"]);
    assert.equal(await git(["status","--porcelain"],folder),"");
    assert.equal(await git(["symbolic-ref","--short","HEAD"],folder),"main");
    assert.ok(!(await readdir(f.root)).some(x=>x.includes("-stage-")||x.includes("-old-")));
  }finally{await f.cleanup();}
});
test("failed clone keeps all original contents intact",async()=>{
  const f=await fixture();
  try{
    const folder=path.join(f.root,"MyProject");
    await mkdir(folder);
    await writeFile(path.join(folder,"keep.txt"),"original content");
    const gh=fakeGithub(f.bare,true);
    gh.cloneDefaultBranch=async()=>{throw new Error("simulated network failure");};
    await assert.rejects(new GitHubRepoManager(gh).execute({localPath:folder}),/simulated network failure/);
    assert.equal(await readFile(path.join(folder,"keep.txt"),"utf8"),"original content");
    assert.ok(!(await readdir(f.root)).some(x=>x.includes("-stage-")));
  }finally{await f.cleanup();}
});
test("root and home directories are rejected",async()=>{
  const f=await fixture();
  try{
    const manager=new GitHubRepoManager(fakeGithub(f.bare,true));
    await assert.rejects(manager.execute({localPath:path.parse(f.root).root}),/Refusing/);
    await assert.rejects(manager.execute({localPath:os.homedir()}),/Refusing/);
  }finally{await f.cleanup();}
});
