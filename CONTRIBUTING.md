# Contributing to Kunai

Thanks for contributing. This repo is a Turborepo monorepo with a Bun-first runtime.

## Development setup

1. Install Bun (see `packageManager` in `package.json`).
2. Install deps:

```sh
bun install
```

3. Run the CLI in dev mode:

```sh
bun run dev
```

## Before opening a PR

Run the main checks from repo root:

```sh
bun run typecheck
bun run lint
bun run fmt
bun run test
```

For CI-equivalent validation:

```sh
bun run ci
bun run build
```

## Versioning, changelogs, and releases

This project uses Changesets.

### When to add a changeset

Add one for user-facing changes (features, fixes, behavior changes, deprecations, packaging/release-impacting updates).

Skip changesets for internal-only changes that do not affect published artifacts or user behavior.

### Create a changeset

```sh
bun run changeset
```

- Select affected package(s), usually `kunai-cli`.
- Choose the semver bump level.
- Write concise user-facing notes.
- Include platform notes when relevant:
  - Linux (distro/package-manager, mpv/playwright caveats)
  - macOS (brew/manual setup caveats)
  - Windows (WSL/native support caveats)

Commit the generated file in `.changeset/`.

### How release automation works

- Pushes to `main` run `.github/workflows/release.yml`.
- Changesets action opens/updates a "version packages" PR.
- Merging that PR bumps package versions and updates changelogs.
- A follow-up run publishes to npm and creates GitHub release notes.
- npm publish uses Trusted Publishing (OIDC + provenance), not long-lived npm tokens.

See `RELEASING.md` for full release-operator details.

## Turborepo notes

- Add task scripts in package-level `package.json` files.
- Register tasks in `turbo.json`.
- Keep root scripts as delegators (`turbo run <task>`).

## Commit and PR guidance

- Keep PRs focused and reviewable.
- Explain behavior changes and risks in PR description.
- Include test updates when behavior changes.
- For release-relevant work, ensure a changeset is present.
