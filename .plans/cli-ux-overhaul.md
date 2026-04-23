# CLI UX Overhaul Plan

Status: Planned

Use this plan when improving the terminal interaction model, migrating core flows to Ink, or reducing blocking prompt-driven UX.

Product intent now lives primarily in [.docs/product-prd.md](../.docs/product-prd.md).
Implementation sequencing now lives primarily in [.plans/persistent-shell-implementation.md](./persistent-shell-implementation.md).

This file should stay focused on UX model and shell behavior, not broad engineering migration detail.

## Goal

Turn KitsuneSnipe from a chain of prompts into a coherent terminal app shell:

- one persistent layout
- one interaction model
- global access to key actions
- constrained pickers instead of error-prone freeform input
- strong validation and diagnostics
- premium feel without sacrificing speed or reliability

## Product Decisions

These are the current decisions and should be treated as the default direction unless the project intentionally changes them.

- The shell stays mounted for the whole session; flows change state, not top-level runtime ownership
- Default landing state is a focused search view with visible command and hotkey affordances
- `/` opens a command bar from anywhere
- `Esc` owns close/back behavior; `q` is reserved for quitting from root-level contexts
- Settings, history, provider switcher, diagnostics, and pickers are overlays or panels, not separate prompt flows
- The overlay stack is shallow: one primary panel plus one child confirmation or child picker
- Playback remains inside the same app shell instead of switching to a separate menu mode
- Season and episode selection come from fetched metadata in normal flow
- Provider switching should be globally reachable when the current state makes it safe
- Diagnostics should be split between a compact always-visible status strip and a deeper diagnostics overlay
- Terminal images are optional enhancement, not a dependency for core UX
- Posters load lazily and never block interaction or own layout
- First-run dependency problems should appear as inline blocker cards with an optional setup overlay
- Settings should use staged `Save` / `Cancel` semantics and clearly label whether changes are immediate, next-playback, or disruptive
- Stream failure recovery should be configurable via a small set of recovery patterns rather than being hardcoded forever
- The product is optimized for repeated daily use over first-run theatrics
- Keyboard interaction should use contextual hotkeys plus the command bar, not a globally modeful Vim clone

## Problems In The Current UX

- The app currently mixes raw key reads, `@clack/prompts`, and `fzf`, so the user keeps crossing interaction models
- Important actions are not globally reachable
- Some flows rely on invisible timing or hidden behavior
- Settings and other configuration steps are too blocking
- Metadata-backed choices like seasons and episodes are not consistently treated as structured selections
- Failure handling is mostly textual rather than action-driven
- Picker and menu logic are repeated in multiple places

## Target UX Model

### App shell

- `Header`: app identity, mode, provider, current title, network or resolution status
- `Content`: search results, picker content, playback state, history, or diagnostics
- `Footer`: contextual hotkeys and discoverable actions
- `CommandBar`: command-prefix interface for global actions
- `OverlayPanel`: settings, provider switcher, episode picker, season picker, history, logs

### Interaction rules

- High-frequency actions get direct hotkeys
- Global actions are always reachable through `/`
- `Ctrl+C`, `/`, `Esc`, and `?` are the always-global keys
- When text input is focused, normal typing wins; only `Ctrl+C`, `/`, and `Esc` bypass input focus
- Text input is only used for search and commands
- If the app already knows the valid options, it should present a picker instead of asking for raw input
- Disabled actions should explain why they are disabled
- The UI should not rely on invisible timing windows for action discovery
- If a prefix mode exists, it should be explicit and visible rather than a hidden timeout chord

### Reliability and diagnostics

- Async actions should expose structured states: `idle`, `loading`, `success`, `error`
- Stream resolution should show enough context to explain whether the app used cache, prefetch, fresh scrape, or API resolution
- Failure states should offer direct next actions such as retry, switch provider, open diagnostics, or go back
- Optional recovery automation should be configurable instead of silently fixed in code

## Interaction Decisions To Implement

### Global command model

- One global command router owns command registration, enablement, labels, and disabled reasons
- Components render state; they do not each invent a separate hotkey model
- The footer should always show a stable core action set plus contextual additions
- Recommended direct hotkeys:
  - `/` command bar
  - `c` settings
  - `p` provider picker
  - `h` history
  - `i` image/details pane
  - `?` shortcuts/help
- Recommended list controls:
  - `↑/↓` primary navigation
  - `j/k` as aliases
  - `Enter` confirms
  - `Esc` closes or goes back

### Prefix mode

- Avoid hidden timed key windows
- If an additional shortcut namespace is needed, use an explicit leader mode
- Recommended leader key: `;`
- On leader entry, the footer and status line should visibly advertise the available follow-up actions

### Overlay stack

- Keep one persistent shell under all flows
- Allow one primary overlay and one child overlay above it
- `Esc` closes only the top overlay
- Provider picker, settings, history, diagnostics, subtitles, season picker, and episode picker should be overlays or large panels inside the same shell
- Confirmations and “apply now / later” prompts should be secondary overlays, not entirely separate flows

### Settings behavior

- Use staged edits with `Save`, `Cancel`, and targeted reset actions
- Each setting should advertise one of:
  - `Immediate`
  - `Next playback`
  - `Requires re-resolve`
- Prefer “next action” semantics over forced restart when possible
- Proposed shell-facing settings additions:
  - `posters`: `off | auto | always`
  - `poster backend`: `auto | kitty | chafa | none`
  - `image size`: `compact | large`
  - `recovery pattern`: `guided | fallback-first | manual`
  - `motion`: `full | reduced | off`

### Diagnostics and status density

- Show compact user-critical state all the time:
  - provider
  - mode
  - current title / episode
  - subtitle state
  - resolve state
  - memory RSS
- Keep deeper detail in a diagnostics overlay:
  - cache vs prefetch vs fresh scrape vs API path
  - subtitle source and chosen track
  - scrape timing
  - retry and fallback history
  - capability status for `mpv`, Playwright, and image backends

### Image support

- Images are progressive enhancement only
- Poster loading should be lazy, optional, and non-blocking
- Use a reserved side preview pane on wide terminals and a collapsible details panel on narrower ones
- Support states:
  - `unsupported`
  - `idle`
  - `loading`
  - `ready`
  - `error`

### First-run dependency guardrails

- Auto-detect missing dependencies on startup
- Never silently install system packages
- Start with an inline blocker panel inside the persistent shell
- Allow expansion to a setup overlay with:
  - what is missing
  - why it matters
  - install choices
  - skip / don’t ask again
- Offer explicit-install flows only after confirmation

### Recovery patterns

- Recovery behavior should be a user-facing policy, not a forever-hardcoded sequence
- Recommended patterns:
  - `guided`: show inline recovery actions with one recommended default
  - `fallback-first`: auto-try a high-confidence compatible fallback once, then surface actions
  - `manual`: never auto-fallback, always present the action panel first
- Even when automation is enabled, the UI should show which path was taken and why

## Architecture Changes

### Phase 0: Interaction architecture first

- declare `src/main.ts` as the canonical target entrypoint and reduce `index.ts` to a migration shim before eventually moving it to `legacy/`
- define a single `AppState`
- define explicit `Action` or command handlers
- centralize selection and validation logic
- create a shared metadata store for title, season, episode, and provider-related selection state
- add a global command router and command availability model
- remove hidden or one-off interaction paths where possible

This phase should start before or alongside the Ink migration. Do not wait until after a full port to fix the state model.

### Phase 1: Ink shell foundation

- introduce an Ink app shell
- add persistent header, content area, footer, and overlay system
- add a global command bar
- add a compact status strip plus diagnostics overlay split
- keep the shell mounted across search, selection, playback state, and post-playback actions

This is the point where “actions available from anywhere” becomes real.

### Phase 2: Migrate highest-friction flows

- search flow
- provider switching
- settings
- season picker
- episode picker
- subtitle picker
- setup blocker and setup overlay
- post-playback actions
- history and diagnostics panels

The goal is to stop mixing `clack`, `fzf`, and custom raw-mode screens as peers.

### Phase 3: Remove repeated logic

- unify picker behavior behind a single searchable picker abstraction
- extract repeated provider-selection and menu-action logic
- centralize validation and capability checks
- centralize metadata fetching, caching, and refetch rules
- centralize recovery-pattern policy handling

### Phase 4: Premium polish

- premium loading states
- motion rules for overlays and status transitions
- fox-themed startup and loader treatment
- Kitty graphics and `chafa` progressive enhancement
- reduced-motion and low-capability fallbacks

## Component and Module Targets

### UI components

- `AppShell`
- `HeaderBar`
- `FooterActions`
- `CommandBar`
- `OverlayPanel`
- `SetupBlockerCard`
- `SetupOverlay`
- `SearchView`
- `SearchablePicker`
- `SettingsPanel`
- `HistoryPanel`
- `DiagnosticsPanel`
- `PlaybackStatusView`

### State and services

- `app-state`
- `command-registry`
- `command-router`
- `capability-service`
- `catalog-store`
- `provider-resolution-service`
- `playback-session-service`
- `diagnostics-store`
- `setup-guardrail-service`
- `recovery-policy-service`

## Validation Rules

- Prefer structured choice over freeform input whenever valid options are already known
- Season and episode selection should always be metadata-backed in normal flow
- Unsafe actions should be blocked before execution rather than rejected afterward
- Provider switching should respect the current playback or resolve state
- Missing capability states such as no Kitty graphics or no `chafa` should degrade cleanly without breaking the shell

## Capability Strategy

- Plain terminal rendering is the baseline
- Kitty graphics protocol is an enhancement path
- `chafa` is a fallback enhancement path
- Motion should be subtle and automatically degradable

## Success Criteria

- The user can access settings, provider switching, history, and diagnostics from anywhere in the app
- The core flow requires fewer blocking transitions and fewer repeated keypresses
- The UI no longer depends on three competing interaction systems
- Season and episode selection are consistent and validated
- Failures feel diagnosable and recoverable instead of opaque
- The visual design feels intentional and premium without slowing the app down

## Implementation Discipline

- shell changes should prefer explicit state machines and command routing over component-local branching
- responsive behavior should degrade panes in a fixed priority order instead of ad hoc hiding
- image, metadata, and diagnostics work must not block list navigation
- use the guidance in `.docs/engineering-guide.md` and `.docs/testing-strategy.md` when shaping new seams
- prefer deterministic state and fixture-driven tests over flaky live-site or timer-heavy tests
