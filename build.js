#!/usr/bin/env node
"use strict";
const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");
const outfile = path.join(__dirname, "dist", "github-repo-manager.js");
esbuild.buildSync({
  entryPoints: [path.join(__dirname, "src", "hosts", "node.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  logLevel: "info"
});
fs.chmodSync(outfile, 0o755);
console.log("Built: " + outfile);
