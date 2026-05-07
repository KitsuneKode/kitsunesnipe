# Repo Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add split CI jobs for PRs, Husky + lint-staged local hooks, a PR template with changeset checklist, and issue template polish.

**Architecture:** Six discrete file changes — a new `pr-ci.yml` for PRs, an updated `ci.yml` for main, two husky hook files, a PR template, and a config.yml update. No new abstractions. Each task is independently committable.

**Tech Stack:** GitHub Actions, Bun, Turborepo, Husky v9, lint-staged, oxlint, oxfmt

**Spec:** `docs/superpowers/specs/2026-05-07-repo-infrastructure-design.md`

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `.github/workflows/pr-ci.yml` | 4 parallel CI jobs + build gate for PRs |
| Modify | `.github/workflows/ci.yml` | Add `permissions: contents: read` + turbo cache env vars |
| Modify | `package.json` | Add `prepare` script, `lint-staged` config, `husky` + `lint-staged` devDeps |
| Create | `.husky/pre-commit` | Runs lint-staged on staged files |
| Create | `.husky/pre-push` | Runs full test suite before push |
| Create | `.github/pull_request_template.md` | Changeset checklist for all PRs |
| Modify | `.github/ISSUE_TEMPLATE/config.yml` | Add link to CONTRIBUTING.md |

---

### Task 1: Install Husky and lint-staged

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
bun add -d husky lint-staged
```

- [ ] **Step 2: Add `prepare` script and `lint-staged` config to `package.json`**

In `package.json`, add `"prepare": "husky"` to the `scripts` block, and add a top-level `"lint-staged"` key. The final relevant sections should look like this:

```json
{
  "scripts": {
    "prepare": "husky",
    "dev": "bun run --cwd apps/cli dev",
    "start": "bun run --cwd apps/cli start",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "fmt": "turbo run fmt",
    "fmt:check": "turbo run fmt:check",
    "test": "turbo run test",
    "test:live:allanime": "bun run --cwd apps/cli test:live:allanime",
    "test:live:miruro": "bun run --cwd apps/cli test:live:miruro",
    "test:live:providers": "bun run --cwd apps/cli test:live:providers",
    "test:live:rivestream": "bun run --cwd apps/cli test:live:rivestream",
    "test:live:vidking": "bun run --cwd apps/cli test:live:vidking",
    "ci": "turbo run typecheck lint fmt:check test",
    "build": "turbo run build",
    "check": "turbo run check",
    "clean": "turbo run clean",
    "experiments:list": "bun run --cwd apps/experiments list",
    "pkg:check": "bun run --cwd apps/cli pkg:check",
    "release:dry-run": "bun run --cwd apps/cli release:dry-run",
    "changeset": "bunx changeset",
    "version:packages": "bunx changeset version",
    "release": "bunx changeset publish",
    "link:global": "bun run --cwd apps/cli link:global",
    "unlink:global": "bun run --cwd apps/cli unlink:global",
    "relink:global": "bun run --cwd apps/cli relink:global"
  },
  "lint-staged": {
    "**/*.{ts,tsx}": ["oxlint", "oxfmt --write"],
    "**/*.{json,md}": ["oxfmt --write"]
  }
}
```

- [ ] **Step 3: Run bun install to initialize husky**

```bash
bun install
```

Expected: husky prints something like `husky - Git hooks installed` or creates the `.husky/` directory. You should now see a `.husky/` directory at the repo root.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add husky and lint-staged"
```

---

### Task 2: Create Husky hook files

**Files:**
- Create: `.husky/pre-commit`
- Create: `.husky/pre-push`

- [ ] **Step 1: Create the pre-commit hook**

```bash
echo 'bunx lint-staged' > .husky/pre-commit
```

- [ ] **Step 2: Create the pre-push hook**

```bash
echo 'bun run test' > .husky/pre-push
```

- [ ] **Step 3: Verify hooks are executable**

Husky v9 manages permissions automatically, but confirm the files exist and look correct:

```bash
cat .husky/pre-commit
cat .husky/pre-push
```

Expected output for pre-commit: `bunx lint-staged`  
Expected output for pre-push: `bun run test`

- [ ] **Step 4: Smoke test the pre-commit hook**

Make a trivial change, stage it, and commit to trigger lint-staged:

```bash
# Add a blank line to trigger a staged change
echo "" >> apps/cli/src/main.ts
git add apps/cli/src/main.ts
git commit -m "test: verify pre-commit hook fires"
# lint-staged should print something like "Running tasks for staged files..."
# If the commit succeeds, the hook is wired correctly. Undo and restore:
git reset HEAD~1
git checkout apps/cli/src/main.ts
```

- [ ] **Step 5: Commit the hooks**

```bash
git add .husky/
git commit -m "chore: add pre-commit and pre-push hooks"
```

---

### Task 3: Create pr-ci.yml

**Files:**
- Create: `.github/workflows/pr-ci.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/pr-ci.yml` with this content:

```yaml
name: PR CI

on:
  pull_request:

concurrency:
  group: pr-ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Typecheck
        run: bun run typecheck

  lint:
    name: Lint
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Lint
        run: bun run lint

  fmt:
    name: Format
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Format check
        run: bun run fmt:check

  test:
    name: Test
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Test
        run: bun run test

  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [typecheck, lint, fmt, test]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Build
        run: bun run build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/pr-ci.yml
git commit -m "ci: add split PR CI workflow with parallel jobs"
```

---

### Task 4: Update ci.yml

**Files:**
- Modify: `.github/workflows/ci.yml`

The current `ci.yml` is missing `permissions: contents: read` and Turborepo remote cache env vars.

- [ ] **Step 1: Replace ci.yml with the updated version**

```yaml
name: CI

on:
  push:
    branches: [main, master]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  verify:
    name: Typecheck, lint, format, test
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: CI
        run: bun run ci

      - name: Build CLI
        run: bun run build
```

Note: `pull_request` is removed from the `on` trigger since `pr-ci.yml` now owns that. `ci.yml` only runs on pushes to `main`/`master`.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add permissions, turbo remote cache env vars, remove PR trigger"
```

---

### Task 5: Add PR template

**Files:**
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Create the template**

```markdown
## What changed
<!-- One sentence. -->

## Checklist
- [ ] Changeset added (`bun run changeset`) — or N/A for docs/infra/no-release changes
- [ ] `bun run typecheck && bun run lint && bun run fmt` passes locally
- [ ] Tests pass or new tests added for new behavior
```

- [ ] **Step 2: Commit**

```bash
git add .github/pull_request_template.md
git commit -m "chore: add PR template with changeset checklist"
```

---

### Task 6: Update issue template config

**Files:**
- Modify: `.github/ISSUE_TEMPLATE/config.yml`

- [ ] **Step 1: Add CONTRIBUTING.md link**

The current `config.yml` content is:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Discussions
    url: https://github.com/kitsunekode/kunai/discussions
    about: General questions, ideas, and community chat
```

Replace it with:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Discussions
    url: https://github.com/kitsunekode/kunai/discussions
    about: General questions, ideas, and community chat
  - name: Contributing guide
    url: https://github.com/kitsunekode/kunai/blob/main/CONTRIBUTING.md
    about: How to set up, what to work on, and how to open a good PR.
```

- [ ] **Step 2: Commit**

```bash
git add .github/ISSUE_TEMPLATE/config.yml
git commit -m "chore: add contributing guide link to issue template config"
```

---

## Setup Note (Manual — not part of this plan)

Turborepo remote caching requires two GitHub repo secrets to be set before the cache env vars do anything:
- `TURBO_TOKEN` — create a token at vercel.com/account/tokens (free account works)
- `TURBO_TEAM` — your Vercel team slug (shown in your team URL)

Without these secrets, the `TURBO_TOKEN`/`TURBO_TEAM` env vars will be empty strings and turbo falls back to local caching only. CI still passes — it just won't cache across runs.

---

## Verification After All Tasks

Run this locally to confirm the full local DX chain works:

```bash
# Confirm hooks are installed
ls -la .husky/

# Confirm lint-staged config is wired
bunx lint-staged --list-different

# Confirm CI script still works
bun run ci
```

Then open a test PR to see the four separate job dots appear in the GitHub checks UI.
