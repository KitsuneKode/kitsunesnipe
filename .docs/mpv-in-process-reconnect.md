# mpv in-process stream reconnect (persistent session)

This applies only to the **persistent mpv** path (`PersistentMpvSession`, autoplay chain). One-shot `launchMpv` does not run this logic.

## What it does

When playback hits certain failure signals, Kunai **reloads the same stream URL** inside the existing mpv process via IPC (`loadfile … replace`), then:

- **VOD** (mpv reports a positive `duration`): **seeks** back to the last trusted position (capped near the end to avoid overshoot).
- **Live / unknown duration** (`duration` ≤ 0): **reload only** — no seek-back (same rule as normal “live” handling).

After a successful reload, **external subtitles are re-attached** from the current cycle options (same as a fresh file load path).

## When it runs

1. **`network-read-dead`** (from `playback-watchdog`): demuxer reports network + underrun + `raw-input-rate === 0` while paused-for-cache, sustained for ~8s. Fires at most once per stall incident from the watchdog; **reconnect attempts** are still capped per cycle.

2. **Premature EOF** (telemetry guard): `end-file` with `eof` was **demoted** to `unknown` because trusted progress was inconsistent with a full watch (`eofDemotedByPrematureGuard`).

3. **`end-file` with `error`** while **`demuxer-via-network`** was true: treat as a reconnectable network demuxer error before surfacing a terminal failure.

If reconnect **succeeds**, the current `play()` promise **does not resolve** yet; playback continues until a normal end, quit, or exhaustion of retries.

If reconnect **fails** or limits are hit, the cycle ends and the usual `PlaybackResult` is returned.

## Limits and backoff

- **`mpvInProcessStreamReconnectMaxAttempts`** (default `3`, max `12`): counts **started** reloads per playback cycle (new episode resets the counter).
- **Backoff** after a failed `loadfile`: exponential from a base delay, capped (see `PersistentMpvSession` constants). Prevents hammering a dead CDN.
- **`reconnectInFlight`**: serializes overlapping reconnect work.

## Configuration (`~/.config/kunai/config.json`)

| Field | Default | Meaning |
| --- | --- | --- |
| `mpvInProcessStreamReconnect` | `true` | Master switch. `false` disables automatic same-URL reloads (manual **Ctrl+r** / shell refresh still work). |
| `mpvInProcessStreamReconnectMaxAttempts` | `3` | Max reload attempts **per episode play**. Set `0` to disable (same as turning off retries). |

## Relationship to other recovery

- **Provider refresh** (cache bust, new URL) and **Ctrl+r** in mpv remain the way to get a **fresh** resolve when the URL or lease is bad.
- **Libavformat reconnect** flags (`--demuxer-lavf-o=…`) are complementary; they only help when the backend supports them.
- **`keep-open=always`** is **not** used: it can suppress `end-file` and break autoplay/session hand-off. Reconnect is explicit IPC instead.

## Telemetry and UI

- Diagnostics / shell may show **`mpv-in-process-reconnect`** events (`started` | `complete` | `failed`) with attempt number and a short `detail` (trigger + error when failed).
- Seek policy lives in `apps/cli/src/infra/player/mpv-in-process-reconnect.ts` (`computeInProcessReconnectSeek`).
