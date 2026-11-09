#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const stages=[
  ["npm ci","STAGE_INSTALL","install.log"],
  ["Doctor","STAGE_DOCTOR","doctor.log"],
  ["Typecheck","STAGE_TYPECHECK","typecheck.log"],
  ["Unit","STAGE_UNIT","unit.log"],
  ["Git integration (mock gh)","STAGE_INTEGRATION","integration.log"],
  ["esbuild","STAGE_BUILD","build.log"],
  ["CLI smoke","STAGE_SMOKE","smoke.log"]
];
const lines=["# GitHubRepoManager — CI Test Report","",
  "- Run ID: "+(process.env.GITHUB_RUN_ID||"local"),
  "- Commit: "+(process.env.GITHUB_SHA||"local"),
  "- UTC: "+new Date().toISOString(),
  "- Runner: "+process.platform+" / Node "+process.version,
  "- Real GitHub repo creation: **NOT TESTED** (mock gh + real local Git)",
  "","## Stages","","| Stage | Status |","|---|---|"];
let failures=0;
for(const [label,key] of stages){
  const status=process.env[key]||"unknown";
  if(status!=="success")failures++;
  lines.push("| "+label+" | **"+status.toUpperCase()+"** |");
}
lines.push("","## Summary","",failures===0?"**PASS** — All required stages passed.":
  "**FAIL** — "+failures+" required stages not successful.","","## Failure excerpts","");
for(const [label,key,log] of stages){
  if(process.env[key]==="success")continue;
  lines.push("### "+label,"");
  const file=path.join(root,"tests/output",log);
  if(fs.existsSync(file)){
    lines.push("~~~text",...fs.readFileSync(file,"utf8").split(/\r?\n/).slice(-35).map(s=>s.slice(0,400)),"~~~","");
  }else lines.push("- No log for this stage.","");
}
if(failures===0)lines.push("- None.","");
const report=lines.join("\n")+"\n";
fs.writeFileSync(path.join(root,"test_report.md"),report,"utf8");
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
console.log(report);
