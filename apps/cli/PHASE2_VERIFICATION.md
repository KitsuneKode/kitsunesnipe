# Kunai CLI Phase 2 Verification

Last updated: 2026-05-01

This file is the practical verification checklist for the current playback/runtime work.
It separates:

- what is already implemented in code
- what needs a real manual smoke run
- what can be deferred until the beta-feel pass

## Landed Runtime Work

### Playback controller and autoplay

- `PlaybackSessionState` now models:
  - `manual` vs `autoplay-chain`
  - session-local autoplay pause
  - stop-after-current
- live playback controls now exist:
  - `q` stop current playback
  - `n` next episode
  - `p` previous episode
  - `a` pause/resume autoplay for the current chain
  - `x` stop after current
  - `r` refresh current source
  - `f` fallback provider
  - `s` reload subtitles
  - `i` skip the active recap/intro/preview segment when one is active
- autoplay defaults to `on`
- manual quit near end is credits-aware when IntroDB timing exists
- fallback completion threshold is the last `5s` when timing metadata is absent

### Persistent mpv session

- autoplay chains now reuse one `mpv` process
- episode-to-episode advance uses the persistent player session path
- `next` / `previous` / `refresh` / `fallback` now prefer stopping the current file instead of killing the whole player when possible
- the persistent player is released before post-playback menus and on phase teardown

### Subtitle behavior

- configured language is re-selected from the full inventory before playback
- built-in/provider-native subtitles are preferred over external subtitles for the same language
- all extra subtitle tracks are still attached for in-player switching
- subtitle source metadata is preserved for picker/detail display

### IntroDB timing integration

- credits timing influences completion/near-end behavior
- recap / intro / preview timing is now available to the player auto-skip path
- skip defaults are now part of config:
  - `skipRecap`
  - `skipIntro`
  - `skipPreview`

### In-flight cancellation

- playback resolve work now registers as active cancellable work
- the playback loading shell now shows `ESC to cancel`
- cancelling playback resolve returns to results instead of leaving background work running
- phase-level abort signals now flow through search/provider/timing calls

## Manual Verification To Run Soon

These are the highest-value smoke checks to do next.

### Playback chain

1. Start a series episode with autoplay enabled.
2. Let it reach natural EOF.
3. Confirm the next episode starts in the same `mpv` session without a full visible respawn.
4. Confirm subtitle inventory is reattached on the next episode.

### Live controls

1. During playback press `n`.
2. Confirm the current file stops and the next episode loads in the same session.
3. Repeat with `p`.
4. During playback press `x`.
5. Confirm autoplay stops after the current episode ends.
6. During playback press `a`.
7. Confirm the chain pauses/resumes without changing saved config.

### Resolve cancellation

1. Start an episode that takes a noticeable amount of time to resolve.
2. While the shell shows resolving/loading, press `Esc`.
3. Confirm Kunai returns to the results state.
4. Confirm no stale loading state remains visible.

### Subtitle priority

1. Pick a title that exposes both built-in and external subtitles for English.
2. Confirm English is selected by default.
3. Confirm the selected default is the built-in/provider-native track.
4. Confirm other tracks are still available inside `mpv`.

### Skip timing

1. Play a title with IntroDB timing.
2. Confirm recap/intros/previews auto-skip when enabled.
3. During one of those windows, press `i`.
4. Confirm manual skip jumps to the end of the active segment.

## Good To Defer Until Beta Feel Pass

These should be verified later in a longer manual pass instead of blocking iteration now.

- long multi-episode autoplay chains across season boundaries
- live provider fallback under flaky network conditions
- real-world subtitle source consistency across multiple providers
- poster/image behavior across Kitty, Ghostty, and fallback terminals
- loading-state copy polish and shell feel under repeated interrupt/retry cycles
- end-to-end “browse -> play -> quit -> resume -> next series” flow feel

## Known Remaining UX Layer Work

These are not correctness blockers, but they are still worth doing.

- explicit on-screen playback copy for active skip windows like:
  - `recap available`
  - `intro skipped`
  - `preview skipped`
- optional command-palette surface for skip actions
- wiring the same active cancel control into more non-playback loading flows where it makes sense
- broader beta QA with real providers and real terminal environments

## Quick Commands

Run before and after manual runtime checks:

```sh
bun run typecheck
bun run test
bun run lint
bun run fmt
```
