# GitHubRepoManager

A small TypeScript/Node.js CLI using installed Git and GitHub CLI (gh). It operates on one **existing local folder** and the repository with the same name in your authenticated GitHub account.

## Destructive behavior (important)

- **Remote repository does not exist**: initialize the local Git folder if necessary, stage and commit files, create a public GitHub repository (or private with --private), then push.
- **Remote repository exists**: clone **only its GitHub default branch** into a sibling staging folder, verify the clone, **replace the entire original local folder without asking**, and delete the original folder.
- Remote sync destroys local-only commits, other local branches, edits, ignored and untracked files, hooks, Git config and old .git data. It does not merge, stash, or search other branches for a recent commit.
- The staging folder is verified before replacement. If a replacement fails, the program attempts to restore the old folder. The old folder is not retained after success.
- A network/authentication failure does not count as proof that a repository is absent. The program refuses roots, the home folder, symlink targets, and the folder containing the executing script.

## Requirements

Node.js 24 or newer, git, GitHub CLI (gh), and an authenticated account:

    gh auth login
    git config --global user.name "Your Name"
    git config --global user.email "you@example.com"

## Use

    npm ci
    npm run build
    node dist/github-repo-manager.js "/Users/me/Projects/MyProject"
    node dist/github-repo-manager.js "/Users/me/Projects/MyProject" --repo OtherName --private
    node dist/github-repo-manager.js --help

The folder basename is the default repo name. --private and --public affect only newly created repositories. No interactive confirmation is used. Paths with spaces and non-ASCII characters are supported; repository names are limited to ASCII letters, digits, dots, underscores and hyphens.

Development:

    npm run dev -- "/Users/me/Projects/MyProject"
    npm run typecheck
    npm test

The compiled JS is a single bundled Node.js file. It still requires the installed Node, git and gh programs (not tsx/esbuild at runtime).

## Architecture

    src/core/manager.ts          Create or force-sync orchestration
    src/adapters/command.ts      Spawn without shell; structured process status
    src/adapters/github.ts       gh account, REST repository query, create and clone
    src/adapters/filesystem.ts   Path guards, sibling staging and rename rollback
    src/hosts/node.ts            CLI parsing and result output

The main flow has no cross-branch latest-commit selector, reconciliation engine, stash, merge, or confirmation prompt.

## Verification and CI

Tests are written in TypeScript with node:test and tsx. Git integration tests use real local Git repositories and a local bare remote; the gh interface is mocked, so CI creates **no live GitHub repositories** and requires **no gh login**.

    npm run doctor
    npm run typecheck
    npm run test:unit
    npm run test:integration
    npm run build
    npm run test:smoke

GitHub Actions runs on macos-latest and uses Node.js 24. Regardless of test success or failure it attempts to generate test_report.md and upload the report and log artifacts. On push to main/feature/test branches, it commits the report back to that branch. test_report.md is ignored as a workflow trigger to avoid a push loop. A failed test still fails the GitHub Actions job.

The report distinguishes real local Git and mocked GitHub CLI from a real, manually authorized GitHub repository creation test.
