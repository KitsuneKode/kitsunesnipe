# Day-1 Agent Prompt: Temporary English Subtitle Hardening

You are working in the Kunai repo as a Day-1/runtime-aware agent.

Goal:
Add a temporary but clean English-first subtitle hardening path for the CLI while full provider dossiers and provider-core extraction are still in progress. The fix must not scatter subtitle hacks through playback code.

## Read First

1. `AGENTS.md`
2. `.docs/subtitle-resolver-analysis.md`
3. `.docs/diagnostics-guide.md`
4. `.docs/provider-examples.md`
5. `.plans/provider-hardening.md`
6. `.docs/testing-strategy.md`

## Read Code

1. `apps/cli/src/subtitle.ts`
2. `apps/cli/src/app/subtitle-selection.ts`
3. `apps/cli/src/app/PlaybackPhase.ts`
4. `apps/cli/src/infra/browser/BrowserServiceImpl.ts`
5. `apps/cli/src/scraper.ts`
6. `apps/cli/src/services/providers/Provider.ts`
7. Active provider definitions under `apps/cli/src/services/providers/definitions/`
8. `apps/cli/test/unit/subtitle.test.ts`
9. `apps/cli/test/unit/app/subtitle-selection.test.ts`

## Product Decision

For now, English subtitles should be the safest default when subtitles are enabled.

Temporary rule:

- If `config.subLang` is not `none`, prefer English (`en`) unless the user explicitly configured another language.
- If the requested language is missing, fallback to English.
- Prefer non-SDH/non-hearing-impaired tracks.
- Prefer `.srt` for CLI/mpv when both `.srt` and `.vtt` are available.
- `.vtt` remains acceptable.
- If provider payload has subtitles, use provider payload first.
- If provider payload has no usable subtitles and the title has TMDB identity, try active Wyzie resolution.
- If active Wyzie fails, keep playback working and emit diagnostics.

## Architecture Boundary

Do not put subtitle extraction in random playback code.

Correct shape:

```text
provider resolve
  -> provider-owned subtitle evidence when provider exposes subtitles
  -> shared subtitle helpers normalize/select/filter common track lists
  -> playback phase chooses policy: none / configured language / temporary English default
  -> mpv receives selected subtitle and full track list
```

Provider responsibilities:

- Discover provider-specific subtitle payloads/endpoints.
- Return subtitle evidence and raw/normalized subtitle tracks.
- Say when subtitles are absent or unknown.

Shared helper responsibilities:

- Normalize subtitle entries.
- Match languages.
- Prefer English fallback.
- Filter SDH when possible.
- Prefer `.srt` for CLI/mpv.
- Convert Wyzie/provider entries into CLI `SubtitleTrack[]`.

Playback responsibilities:

- Respect `none`.
- Pass selected subtitle and list to `mpv`.
- Record diagnostics.
- Do not know provider-specific subtitle URLs or scraping internals.

## Tasks

1. Audit current subtitle flow and identify where active Wyzie resolution is currently bypassed or unreliable.
2. Add or refine shared subtitle selection helpers in `apps/cli/src/subtitle.ts` or a small adjacent module.
3. Ensure English fallback is applied consistently for CLI playback when subtitles are enabled.
4. Ensure SDH filtering and `.srt` preference are tested.
5. Ensure active Wyzie resolution can be used as fallback for providers/titles with TMDB ID when provider subtitles are missing.
6. Add diagnostics for:
   - provider subtitles used
   - active Wyzie fallback attempted
   - English fallback selected
   - no subtitles found
   - subtitle fetch failed
7. Keep playback non-blocking if subtitle lookup fails.

## Hard Boundaries

- Do not rewrite providers broadly.
- Do not start `@kunai/core`.
- Do not change MPV IPC/telemetry in this task.
- Do not claim all provider subtitles are fixed.
- Do not hardcode English in provider implementations unless that provider API requires it.
- Do not remove existing configured language support.

## Tests

Add or update tests for:

- English fallback when requested language is missing.
- Explicit non-English preference still wins when available.
- SDH track is avoided when a normal English track exists.
- `.srt` beats `.vtt` for otherwise equivalent CLI tracks.
- active Wyzie URL is built for movie and series.
- failed Wyzie lookup does not block playback.

Run:

```sh
bun run typecheck
bun run lint
bun run fmt
bun run test
```

Report:

- What temporary English-first behavior was added.
- Which providers benefit immediately.
- Which providers still need dossier/provider-specific subtitle work.
- Tests added.
- Verification results.
