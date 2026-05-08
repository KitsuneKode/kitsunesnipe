# Kunai Runtime Boundary Map

Use this doc when deciding where new runtime, provider, playback, shell, cache,
diagnostics, or legacy-removal work belongs. It is intentionally short and
points at deeper docs instead of replacing them.

## Rule Of Thumb

UI emits intent.
App policy turns intent into deterministic behavior.
Services coordinate work.
Providers return facts and candidates.
Infra performs local mechanics.
Storage persists facts.

If a module does more than one of those jobs, either extract a seam or document
why the overlap is temporary.

## Ownership

| Area                          | Owns                                                                                                         | Must not own                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `packages/types`              | Serializable contracts crossing package, storage, and provider boundaries                                    | UI state, app policy, provider quirks       |
| `packages/schemas`            | Runtime validation for untrusted or persisted data                                                           | Business decisions                          |
| `packages/core`               | Provider SDK contracts, resolver primitives, cache-key policy, fallback abstractions, trace models           | Ink UI, mpv IPC, history writes             |
| `packages/providers`          | Provider-specific source extraction, mirror/source retry, decryption, language/source evidence               | Global fallback UX, history, app settings   |
| `packages/storage`            | SQLite paths, migrations, repositories, TTL helpers                                                          | UI behavior, provider scraping              |
| `apps/cli/src/services`       | App services such as playback resolve, source inventory, diagnostics, presence, search/catalog orchestration | Ink rendering, raw mpv sockets              |
| `apps/cli/src/app`            | Session phases, playback/search policy, user-intent semantics, history decisions                             | Provider internals, terminal drawing        |
| `apps/cli/src/infra`          | mpv, IPC, process, filesystem, terminal/runtime mechanics                                                    | User-facing playback policy                 |
| `apps/cli/src/app-shell`      | Ink components, overlays, footer, command palette, picker rendering                                          | Stream resolution, provider fallback policy |
| `archive/legacy/apps/cli/src` | Quarantined old runtime/provider/browser reference code                                                      | Active beta runtime imports                 |
| `apps/experiments`            | Provider research and scratchpads                                                                            | Production runtime behavior                 |

## Playback Intent Contract

Playback actions should be named intents before they touch mpv:

- history resume: start at the saved timestamp
- history restart, picker selection, replay, next, previous, and source change:
  start at zero and expose the mpv resume prompt only when a real resumable
  timestamp exists
- reload video and quality change: continue from the current playback point

Do not let raw `--start` values leak through picker components or provider
adapters. The app layer owns the meaning, and the infra/player layer owns the
mechanism.

## Command Ownership

Command labels, availability, disabled reasons, and per-surface command sets
belong to `apps/cli/src/domain/session/command-registry.ts`.

UI surfaces should consume named command contexts rather than rebuilding command
lists locally. This keeps `/`, footer hints, help, overlays, and playback
controls aligned.

## Picker Ownership

Opening a picker is never a side effectful media action.

- open picker: inspect choices only
- move/filter picker: UI state only
- confirm picker: emits a selected value
- app/player control layer: decides whether playback must stop/reload/switch

This applies to episode, provider, source, quality, audio, and subtitle pickers.

## Provider Recovery Ownership

Provider-local recovery belongs inside the provider package or CLI provider
adapter:

1. Retry provider-local source/mirror work with bounded attempts.
2. Return structured failure evidence.
3. Let the app-level fallback controller decide when to try another provider.

The fallback controller should prefer cached healthy inventory when possible and
should expose provider/source exhaustion in diagnostics.

## Legacy Quarantine

Active runtime code must not import `archive/legacy`, `apps/experiments`, or other reference-only legacy paths.
The unit boundary test enforces this for active runtime roots.

When removing legacy:

1. Prove the active path has equivalent behavior or a deliberate product
   decision.
2. Add or keep a test around the active path.
3. Move remaining reference code under `legacy` only if it still teaches us
   something.
4. Delete it when it no longer informs provider parity or migration.

## Related Docs

- Runtime architecture: [architecture.md](./architecture.md)
- Target architecture: [architecture-v2.md](./architecture-v2.md)
- Engineering guide: [engineering-guide.md](./engineering-guide.md)
- Shell and overlay UX: [ux-architecture.md](./ux-architecture.md)
- Provider contracts: [providers.md](./providers.md)
- Source inventory contract: [playback-source-inventory-contract.md](./playback-source-inventory-contract.md)
- Testing strategy: [testing-strategy.md](./testing-strategy.md)
