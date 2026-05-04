# Changesets

This directory stores release intents that drive version bumps, changelogs, and release PRs.

## Typical flow

1. Make your code changes.
2. Run `bun run changeset` and describe the user-facing impact.
3. Commit the generated file in `.changeset/*.md`.
4. On `main`, the release workflow opens/updates a "Version Packages" PR.
5. Merging that PR updates versions/changelogs; the follow-up release run publishes and creates GitHub release notes.
