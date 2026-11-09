#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const required=["build.js","package.json","package-lock.json","tsconfig.json",
  "src/core/manager.ts","src/adapters/command.ts","src/adapters/github.ts",
  "src/adapters/filesystem.ts","src/hosts/node.ts","tests/unit.test.ts",
  "tests/integration.test.ts","tests/smoke.test.ts","tests/summarize-ci.cjs",
  ".github/workflows/test_macos.yml"];
const failures=[];
if(Number(process.versions.node.split(".")[0])<24) failures.push("Node.js 24 or later required");
for(const f of required)if(!fs.existsSync(path.join(root,f)))failures.push("Missing "+f);
for(const exe of ["git","gh"]){
  const r=spawnSync(exe,["--version"],{encoding:"utf8",timeout:15000});
  if(r.error||r.status!==0)failures.push("Missing executable "+exe);
}
for(const dep of ["typescript","tsx","esbuild"])
  if(!fs.existsSync(path.join(root,"node_modules",dep)))failures.push("Missing npm package "+dep);
function walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const f=path.join(dir,e.name);
    if(e.isDirectory())walk(f);
    else if(e.isFile()&&!f.endsWith(".ts"))failures.push("Non-TypeScript source "+f);
  }
}
walk(path.join(root,"src"));
for(const f of failures)console.error("FAIL: "+f);
if(failures.length)process.exitCode=1;
else console.log("PASS: Node, Git, gh and TypeScript sources available");
