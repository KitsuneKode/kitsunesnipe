# Storage Architecture & Hardening Plan

This document breaks down the state of our flat-file JSON storage, identifies critical loopholes, and tracks our implementation decisions to harden the system.

Status: Partially Implemented, Needs Daemon-Era Upgrade

Use this plan when changing config, history, stream cache, provider health cache, source inventory cache, or future sync persistence.

## 1. Scale & Bloat: The Math (4 episodes/day)

If a user watches 4 episodes a day for a month, they generate **120 history entries**.
If they keep that pace for an entire year, they generate **~1,460 entries**.

A typical history entry is roughly 150-200 bytes of JSON.

- **1 Month (120 entries)** = ~24 Kilobytes
- **1 Year (1,460 entries)** = ~292 Kilobytes

For a modern CPU, parsing a 300KB JSON file takes less than **1 millisecond**.
**Conclusion on Scale:** Flat JSON will _not_ bottleneck or bloat in any meaningful way for user history.

## 2. The Real Loopholes: Corruption & Race Conditions

> **Loophole 1: Mid-Write Crashes (The Corruption Risk)**
> We currently use `await writeFile(...)`. If the user hits `Ctrl+C` or the terminal crashes in the exact millisecond the file is being written, the OS writes an incomplete file. The next time they boot the app, `JSON.parse` will fail, and their **entire watch history is permanently destroyed**.

> **Loophole 2: Concurrency Race Conditions**
> We read the whole file, modify a key, and write the whole file back. If two async processes (e.g. background cache refresh and a history update) fire at the exact same time, the slower write will overwrite the faster write, causing silent data loss.

## 3. Implementation Decisions

### Decision 1: Architecture Path

**Decision:** Use a staged storage path.

1. **Now:** Harden JSON with atomic writes, corrupt backups, and write queueing.
2. **Next:** Move cache/history to OS-aware app paths instead of repo-local files.
3. **Daemon/Web era:** Migrate high-churn stores to SQLite.

**Why:** JSON is fine for the single-process CLI today, but SQLite becomes the better foundation once a local daemon, paired web clients, provider health, source inventories, sync event logs, and multiple writers exist.

The new runtime `FileStorage` already implements temp-file writes, atomic rename, corrupt backup, and an in-process write queue. The remaining risks are legacy storage paths, repo-local `stream_cache.json`, missing size limits, missing schema/version markers, and lack of cross-process locking.

### Decision 2: Storage Locations (Cross-Platform)

We will implement an OS-aware path resolver so files land exactly where they belong natively.

**Linux (XDG Base Directory Spec):**

- **Config:** `~/.config/kunai/config.json`
- **History:** `~/.local/share/kunai/history.json`
- **Cache:** `~/.cache/kunai/stream_cache.json`

**macOS:**

- **Config:** `~/Library/Application Support/kunai/config.json`
- **History:** `~/Library/Application Support/kunai/history.json`
- **Cache:** `~/Library/Caches/kunai/stream_cache.json`

**Windows:**

- **Config:** `%APPDATA%\kunai\config.json` (Roaming)
- **History:** `%LOCALAPPDATA%\kunai\history.json` (Local)
- **Cache:** `%LOCALAPPDATA%\kunai\stream_cache.json` (Local)

Legacy note:

- Old KitsuneSnipe paths may exist for early users. A one-time migration should copy or move old config/history/cache into Kunai paths, then leave a `.migrated` marker.
- Repo-local `./stream_cache.json` should be treated as legacy compatibility only.

## 4. Store Classes

### Config

Properties:

- low write frequency
- user-authored or settings-authored
- must survive crashes

Recommended backend:

- JSON is fine long-term.
- Use atomic writes and corrupt backup.
- Validate shape against defaults on load.

### History

Properties:

- medium write frequency
- user valuable
- sync-critical later

Recommended backend:

- JSON is fine for current CLI.
- SQLite is preferred once event-log sync lands.
- Future model should store append-only events, not only latest per-title state.

### Stream Cache

Properties:

- high churn
- short TTL
- safe to lose
- unsafe to trust forever
- can grow unexpectedly if not capped

Recommended backend:

- move out of repo root immediately
- use OS cache directory
- cap by item count and total estimated bytes
- prune on startup and after writes
- use TTL classes per source type
- use SQLite before daemon/web pairing because multiple clients may read/write

### Provider Health Cache

Properties:

- small, derived, frequently updated
- powers source confidence and fallback ranking

Recommended backend:

- SQLite or small JSON in cache dir.
- Never block playback on provider health writes.

### Resolve Trace Store

Properties:

- diagnostic ring buffer
- privacy-sensitive
- useful for support and UX

Recommended backend:

- in-memory ring buffer first
- optional local persisted ring buffer with redaction
- avoid storing raw signed media URLs in exportable reports

## 5. Stream Cache Design

Stream cache entries should not be keyed only by target URL forever. Cache correctness depends on context.

Recommended cache key fields:

```text
providerId
providerVersion
targetId
titleType
season
episode
audioLanguage
subtitleLanguage
qualityPreference
resolverRuntime
authMode
regionHint
```

Recommended entry envelope:

```ts
type StreamCacheEntry = {
  schemaVersion: 1;
  cacheKey: string;
  source: StreamInfo;
  sourceKind: "hls" | "mp4" | "embed";
  providerId: string;
  resolverRuntime: "browser-safe-fetch" | "node-fetch" | "playwright-lease" | "yt-dlp" | "debrid";
  cachedAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  hitCount: number;
  confidence: "high" | "medium" | "low";
};
```

TTL guidance:

- direct signed media URL: 30 seconds-5 minutes
- HLS master manifest URL: 2-15 minutes
- embed URL: 15-60 minutes if provider-stable
- subtitle list: 24 hours
- source inventory without final URL: 15-60 minutes
- provider mapping: hours to days depending on source

Cache writes should be best-effort for playback. A cache write failure must never crash playback.

## 6. Corruption And Concurrency Requirements

Minimum requirements for JSON stores:

- write to `.tmp`
- fsync if practical before rename for highly valuable history
- atomic rename into place
- corrupt file renamed to `.corrupt.bak`
- in-process write queue
- shape validation on read
- default fallback on invalid data

Additional requirements for daemon era:

- cross-process safety
- transaction support
- no read-modify-write races
- WAL mode if using SQLite
- bounded cache pruning in transactions

This is the point where SQLite becomes a practical simplification, not premature architecture.

### Phase A: Atomic Writes & Safeguards (Backend)

1. **Atomic Saves**: Modify `FileStorage.ts` to write to `history.json.tmp` first, then use `fs.renameSync` to swap it with `history.json`. Renames are guaranteed atomic by the OS. It is impossible to corrupt the file during a crash this way.
2. **Safe Parsing**: If `JSON.parse` fails, we should rename the broken file to `history.json.corrupt.bak` instead of just silently erasing the user's data.
3. **Queueing**: Add a simple in-memory write-lock queue to `FileStorage` so overlapping saves are processed sequentially, fixing race conditions.

### Phase B: Cache & History Management (UI)

1. **Cache UI**: Add a `[C] Clear Cache` hotkey in the Settings menu that triggers `await container.cacheStore.clear()`.
2. **History Pruning**: Add a `[P] Prune History (Older than 6 months)` command in the UI.

### Phase C: App Path Migration

1. Stop using repo-local `stream_cache.json` for the default runtime.
2. Keep legacy read fallback for one migration cycle.
3. Copy legacy cache to OS cache dir when safe.
4. Update docs and diagnostics to show the real cache path.
5. Add a migration marker to avoid repeated copies.

### Phase D: SQLite Cache Store

1. Add `StorageService` support for SQLite-backed high-churn stores.
2. Create tables for stream cache, provider health, source inventory, and resolve trace ring buffer.
3. Use WAL mode.
4. Add indexes on cache key, provider ID, expiry, and last accessed time.
5. Prune expired rows on startup and opportunistically after writes.
6. Keep config in JSON unless there is a strong reason to move it.

### Phase E: Sync Event Store

1. Model watch progress as append-only events.
2. Store device ID and local monotonic sequence.
3. Keep materialized latest-progress views for fast UI.
4. Sync event log to paid backend later.
5. Never let stale offline events erase completed episodes.

## 7. Acceptance Criteria

- app no longer writes default stream cache to the repo root
- corrupt config/history/cache files are backed up, not silently destroyed
- cache entries carry expiry and schema version
- cache pruning prevents unbounded growth
- playback continues if cache writes fail
- future daemon can read/write cache without whole-file JSON races
- storage paths in README, AGENTS, quickstart, and diagnostics match runtime behavior
