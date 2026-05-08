# Presence Integrations Plan

Status: onboarding implemented; richer activity assets and manual Discord smoke remaining

## Current Behavior

- Presence is off by default.
- `presenceProvider: "discord"` enables Discord when configuration and runtime dependencies are available.
- `presencePrivacy` controls full versus private activity detail.
- `presenceDiscordClientId` or `KUNAI_DISCORD_CLIENT_ID` provides the Discord app id.
- Missing client id, package, IPC, or update failure records diagnostics and disables automatic retries
  until Settings reconnects or presence configuration changes.
- About/diagnostics copy shows whether the Discord client id comes from config, environment, or is missing.
- Settings can enter/clear a Discord client id, connect now, and disconnect now.
- `/presence` opens the same Settings onboarding surface from search, playback, and root overlays.

## Remaining Implementation

### Slice 1: Setup And Settings

- [x] Add a settings flow for entering or clearing `presenceDiscordClientId`.
- [x] Add Settings actions for connect-now and disconnect-now.
- [x] Keep `discord-rpc` optional at runtime (now shipped as an optional dependency in CLI package).

### Slice 2: Diagnostics And Help

- [x] Surface presence status in diagnostics with a compact reason:
  - disabled
  - missing client id
  - missing package
  - Discord IPC unavailable
  - connected
- [x] Add help/docs that say presence never sends stream URLs or headers.

### Slice 3: Activity Polish

- Decide stable Discord application assets:
  - `kunai`
  - `subtitles`
  - optional anime/series/movie icons
- Keep activity text conservative:
  - private: generic playback
  - full: title + episode + provider id
- Do not add elapsed progress or episode art until privacy and asset behavior are verified.

## Verification

- Unit-test activity payloads for private and full privacy.
- Unit-test unavailable states do not retry repeatedly.
- Unit-test status snapshots and settings/onboarding options.
- Manual smoke with Discord running and `KUNAI_DISCORD_CLIENT_ID` set.

## Canonical Doc

See [.docs/presence-integrations.md](../.docs/presence-integrations.md).
