# GitHubRepoManager — CI Test Report

- Run ID: 42552937236
- Commit: 732f8f5b47e4af4389340033a5d0808aa50f3c79
- UTC: 2026-11-09T02:48:40.490Z
- Runner: darwin / Node v24.22.2
- Real GitHub repo creation: **NOT TESTED** (mock gh + real local Git)

## Stages

| Stage | Status |
|---|---|
| npm ci | **SUCCESS** |
| Doctor | **SUCCESS** |
| Typecheck | **SUCCESS** |
| Unit | **SUCCESS** |
| Git integration (mock gh) | **SUCCESS** |
| esbuild | **SUCCESS** |
| CLI smoke | **FAILURE** |

## Summary

**FAIL** — 1 required stages not successful.

## Failure excerpts

### CLI smoke

~~~text
    stderr: '/Users/runner/work/GitHubRepoManager/GitHubRepoManager/dist/github-repo-manager.js:2\n#!/usr/bin/env node\n^\n\nSyntaxError: Invalid or unexpected token\n    at wrapSafe (node:internal/modules/cjs/loader:1861:18)\n    at Module._compile (node:internal/modules/cjs/loader:1903:20)\n    at Object..js (node:internal/modules/cjs/loader:2060:10)\n    at Module.load (node:internal/modules/cj
  }

test at tests/smoke.test.ts:14:1
✖ compiled CLI fails when path is missing (50.420333ms)
  AssertionError [ERR_ASSERTION]: The input did not match the regular expression /Usage:/. Input:
  
  '/Users/runner/work/GitHubRepoManager/GitHubRepoManager/dist/github-repo-manager.js:2\n' +
    '#!/usr/bin/env node\n' +
    '^\n' +
    '\n' +
    'SyntaxError: Invalid or unexpected token\n' +
    '    at wrapSafe (node:internal/modules/cjs/loader:1861:18)\n' +
    '    at Module._compile (node:internal/modules/cjs/loader:1903:20)\n' +
    '    at Object..js (node:internal/modules/cjs/loader:2060:10)\n' +
    '    at Module.load (node:internal/modules/cjs/loader:1651:32)\n' +
    '    at Module._load (node:internal/modules/cjs/loader:1443:12)\n' +
    '    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)\n' +
    '    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)\n' +
    '    at node:internal/main/run_main_module:33:47\n' +
    '\n' +
    'Node.js v24.22.2\n'
  
      at TestContext.<anonymous> (/Users/runner/work/GitHubRepoManager/GitHubRepoManager/tests/smoke.test.ts:17:10)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:974:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: '/Users/runner/work/GitHubRepoManager/GitHubRepoManager/dist/github-repo-manager.js:2\n#!/usr/bin/env node\n^\n\nSyntaxError: Invalid or unexpected token\n    at wrapSafe (node:internal/modules/cjs/loader:1861:18)\n    at Module._compile (node:internal/modules/cjs/loader:1903:20)\n    at Object..js (node:internal/modules/cjs/loader:2060:10)\n    at Module.load (node:internal/modules/cj
    expected: /Usage:/,
    operator: 'match',
    diff: 'simple'
  }

~~~

