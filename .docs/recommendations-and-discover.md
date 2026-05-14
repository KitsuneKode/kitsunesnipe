# Kunai — Recommendations And Discover

This is the canonical product and architecture reference for the `/recommendation`, `/calendar`,
and `/random` discovery surfaces.

## Goals

- Discovery surfaces are lazy-loaded and never slow startup.
- Recommendations are explicit: the user opens `/recommendation`, chooses a post-playback nudge, or enables an optional startup hint.
- Calendar is a schedule lens: it shows catalog release timing, not provider playability.
- Random is controlled: it shows a small explained tray and never auto-plays.
- Recommendation code stays outside provider adapters. Providers resolve streams; catalog/recommendation services provide browseable metadata.

## Current Implementation

| Capability                                   | Canonical location                                                                                               | Status      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------- |
| Recommendation service contract              | `apps/cli/src/services/recommendations/RecommendationService.ts`                                                 | Implemented |
| TMDB-backed implementation and cache helpers | `apps/cli/src/services/recommendations/RecommendationServiceImpl.ts`                                             | Implemented |
| SQLite recommendation cache                  | `packages/storage/src/repositories/recommendation-cache.ts`                                                      | Implemented |
| Shared section builder                       | `apps/cli/src/app/discover-sections.ts`                                                                          | Implemented |
| Unified discover result loader               | `apps/cli/src/app/discover-results.ts`                                                                           | Implemented |
| Browse-shell discover loading + SWR          | `apps/cli/src/app-shell/ink-shell.tsx`, `apps/cli/src/app/SearchPhase.ts`                                        | Implemented |
| Release schedule service + SQLite cache      | `apps/cli/src/services/catalog/CatalogScheduleService.ts`, `packages/storage/src/repositories/schedule-cache.ts` | Implemented |
| Calendar result loader                       | `apps/cli/src/app/calendar-results.ts`                                                                           | Implemented |
| Random result loader                         | `apps/cli/src/app/random-results.ts`                                                                             | Implemented |
| Command routing                              | `apps/cli/src/domain/session/command-registry.ts`, `apps/cli/src/app-shell/command-router.ts`                    | Implemented |
| Search-phase entry                           | `apps/cli/src/app/SearchPhase.ts`                                                                                | Implemented |
| Startup discovery routes                     | `--calendar`, `--random`, `/calendar`, `/random`                                                                 | Implemented |
| Post-playback nudge/action                   | `apps/cli/src/app/PlaybackPhase.ts`, `apps/cli/src/app-shell/ink-shell.tsx`                                      | Implemented |
| Startup hint config                          | `discoverShowOnStartup` in config                                                                                | Implemented |
| Discover mode + item limit config            | `discoverMode`, `discoverItemLimit` in config                                                                    | Implemented |
| Minimal mode                                 | `minimalMode` in config and shell layout policy                                                                  | Implemented |

## Data Sources

Recommendations use TMDB surfaces on demand:

- title recommendations for recently watched titles
- trending
- recency-weighted genre affinity from local history

Calendar uses catalog schedule services on demand:

- AniList releasing-today for anime mode
- TMDB airing-today for series mode
- SQLite schedule cache keyed by source, mode, title, season, episode, and local day window
- release-aware TTLs so future entries refresh around known release time rather than through a global daily sync

Random uses the same discover pipeline, refreshes the source bundle, and chooses 3 to 5 browseable
picks. It only changes browse results; it does not mutate playback state.

The shell should keep these as suggestions, not as autoplay or background network work.

## Runtime Rules

- Do not fetch recommendations or calendar data on process startup unless the user explicitly starts in that route (`--calendar` or `--random`).
- Keep history-derived personalization local.
- Cache recommendation responses with explicit TTLs in SQLite cache DB.
- Cache schedule responses with release-aware TTLs in SQLite cache DB.
- Use stale-while-revalidate for discover loading in browse shell.
- If recommendations fail, show an empty/error state in Discover rather than failing search or playback.
- Do not couple Discover to provider selection. Opening a recommendation should return to normal browse/title selection flow.
- Do not treat `airs today` as playable. Provider availability is checked only after the user chooses playback.
- Do not auto-play random picks. The user can rerun `/random` to spin again or select a title normally.

## Remaining Product Work

- Add stronger visual verification for discover, calendar, and random loading/layout at small and wide terminal sizes.
- Keep refining the discover companion treatment inside browse so recommendations, calendar entries, and random picks feel native.
- Evaluate whether explicit cache age text is needed for discover/calendar SWR results.
- Extend anime recommendation quality later through catalog identity work; do not add a provider-specific recommendation path.

## Related

- [search-service plan](../.plans/search-service.md)
- [metadata and trending contract](../.plans/metadata-and-trending-contract.md)
- [design system](./design-system.md)
