# Lists, Queue, Stats, And Sync Plan

Status: planned

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax. Each task is self-contained with tests before implementation.

## Goal

Add user-curated lists (watchlist, favorites, custom), a playable queue with auto-advance, terminal-native stats/heatmap, and push-only sync to AniList/TMDB — without regressing history, resume, or any existing playback flow.

## Design Decisions (Grilled & Locked)

| #   | Decision                | Choice                                                                                                                                                                                              |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------- |
| 1   | Add-to-list UX          | **Inline toggle on search results**. `w` toggles watchlist on focused row. `W` opens mini-picker for favorites/custom. No screen transition. Numeric search input preserved.                        |
| 2   | Habit loop              | **Streak indicator** (`🔥 14d`) in shell header at all times. `sync✓` icon turns amber on failures, red on expired auth. No per-action toasts.                                                      |
| 3   | Queue exhaust           | **Three-tier fallback**: (1) continue next unwatched in-progress title                                                                                                                              | (2) play from watchlist | (3) `/` search. Never a dead end. |
| 4   | Stats                   | **Weekly digest + per-show progress bars + heatmap**. All three in v1. CSV/JSON export. Heatmap uses ANSI 256-color backgrounds + full-block `█`, 4 intensity levels. Rolling 3-month default view. |
| 5   | Multi-device sync trust | **First-connect bidirectional merge with user-confirmed banner**. After first merge, push-only + optional 15d pull window.                                                                          |
| 6   | Empty states            | **Never empty**. Every empty screen shows action-links: `/` search, `d` discover, `h` history, `?` help.                                                                                            |
| 7   | Sync config discovery   | **One-time post-first-episode nudge**: "Sync progress to AniList? [y] setup [n] not now." Fires once. Never again after dismiss.                                                                    |
| 8   | Queue auto-population   | **Manual mode default**. Smart mode opt-in (auto-fills queue from in-progress history + watchlist when below 3 items).                                                                              |
| 9   | Sync push/pull          | Push-only primary. 15d pull window optional. Every sync action shows a summary banner and requires confirmation.                                                                                    |
| 10  | ID separation           | Anime → AniList. Series/Movies → TMDB. No cross-domain reconciliation. Type enum filters the UI.                                                                                                    |
| 11  | Tracker auto-sync       | Push progress silently on playback end. Fire-and-forget. Failures logged to diagnostics only.                                                                                                       |

---

## Architecture

```
@kunai/storage (new tables + repositories)
  lists              -> SQLite: lists, list_items
  queue              -> SQLite: playback_queue
  sync_ledger        -> SQLite: sync_ledger

apps/cli/src/domain/lists/
  ListService.ts     -> Pure CRUD + list operations
  QueueService.ts    -> Manual + smart queue modes
  StatsService.ts    -> Aggregation from history_progress
  StatsFormatter.ts  -> ANSI progress bars, heatmap, digest, CSV/JSON export

apps/cli/src/services/sync/
  SyncAdapter.ts     -> Interface for sync targets
  AniListAdapter.ts  -> GraphQL, OAuth, push progress + list items
  TmdbAdapter.ts     -> REST, session auth, push progress + list items
  SyncService.ts     -> Orchestrator with banner confirmation

apps/cli/src/app-shell/
  + search results inline toggle badge
  + detail view action footer
  + episode picker footer
  + post-playback actions
  + first-episode sync nudge
  + shell header streak + sync indicator
  + empty-state action views
  + settings sync section
  + weekly digest on Monday first launch
```

---

## SQLite Migration (`009_data_lists`)

```sql
-- Lists
CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,              -- "watchlist" | "favorites" | "custom"
  color TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  sync_target TEXT,                -- "anilist" | "tmdb" | null
  remote_id TEXT,                  -- AniList custom list id or TMDB list id
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Default lists
-- id="watchlist", name="Watchlist", kind="watchlist", sort_order=0
-- id="favorites",  name="Favorites",  kind="favorites",  sort_order=1

-- List items
CREATE TABLE IF NOT EXISTS list_items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  title_id TEXT NOT NULL,          -- same as history_progress.title_id
  media_kind TEXT NOT NULL,        -- "movie" | "series" | "anime"
  title TEXT NOT NULL,
  season INTEGER,
  episode INTEGER,
  notes TEXT,
  added_at TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_list_items_list_id
  ON list_items(list_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_list_items_title_id
  ON list_items(title_id, added_at DESC);

-- Playback queue
CREATE TABLE IF NOT EXISTS playback_queue (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  media_kind TEXT NOT NULL,
  title_id TEXT NOT NULL,
  season INTEGER,
  episode INTEGER,
  absolute_episode INTEGER,
  priority INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,             -- "watchlist" | "search" | "continue" | "autoadvance" | "smart"
  added_at TEXT NOT NULL,
  played_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_playback_queue_priority
  ON playback_queue(priority DESC, added_at ASC);

-- Sync ledger
CREATE TABLE IF NOT EXISTS sync_ledger (
  id TEXT PRIMARY KEY,
  target TEXT NOT NULL,             -- "anilist" | "tmdb"
  entity_type TEXT NOT NULL,        -- "list" | "item" | "progress"
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,             -- "push" | "pull"
  status TEXT NOT NULL,             -- "pending" | "done" | "failed"
  payload_json TEXT,
  error_message TEXT,
  synced_at TEXT NOT NULL
);
```

---

## Config Additions

```ts
interface KitsuneConfig {
  // ... existing fields

  /** Per-service sync configuration. All services default to disabled. */
  sync: {
    anilist: {
      enabled: boolean; // default false
      tracker: boolean; // auto-push progress on playback end
      list: boolean; // allow manual list push/pull
      accessToken?: string;
      refreshToken?: string;
      tokenExpiresAt?: number; // epoch ms
    };
    tmdb: {
      enabled: boolean;
      tracker: boolean;
      list: boolean;
      sessionId?: string;
      accountId?: number;
    };
  };
}
```

---

## Sync Protocol

### Push (primary path)

```
User action -> local mutation -> sync_ledger entry (action=push, status=pending)
  -> SyncService.run() collects pending pushes
  -> Shows banner with diff summary
  -> User confirms
  -> Adapter pushes each entry
  -> sync_ledger updated (status=done|failed)
```

### Pull (15d window, explicit opt-in)

```
kunai wl sync --pull
  -> SyncService.collectPullCandidates(15d)
  -> Shows diff: "X items on remote not in local"
  -> User confirms each or batch
  -> Items added to local lists
```

### Tracker auto-push (silent, no banner, no confirmation)

```
PlaybackPhase.onEpisodeEnd():
  if sync.anilist.tracker:
    -> AniListAdapter.pushProgress(title, episode, position, completed)
  if sync.tmdb.tracker:
    -> TmdbAdapter.pushProgress(...)
```

Tracker pushes are fire-and-forget. Failures log to diagnostics and turn the header `sync✓` indicator amber.

### First-connect merge (one-time, bidirectional)

```
First-time sync with AniList
─────────────────────────────────────
Found 12 items on AniList not in local lists.
Found 3 items in local lists not on AniList.

[F]ull merge (add all 12 locally, push 3 to AniList)
[S]elect (choose individually)
[N]o merge — push-only from now on
```

After this bootstrap, push-only with optional 15d pull.

---

## Queue Auto-Advance Protocol

### Manual mode (default)

Queue is explicitly curated by the user. When exhausted:

```
Queue complete. 7 episodes watched.

  1. Continue Steins;Gate S1 E4 (next unwatched)
  2. Start Frieren S1 E1 (from your watchlist)
  3. [/] Search  [r] Repeat queue  [q] Quit
```

### Smart mode (opt-in)

Queue auto-fills when below 3 items:

1. Pull next unwatched episodes from titles with `history_progress` entries that aren't completed
2. Pull from watchlist items that have no history
3. Pull from discover recommendations

Items are ordered: in-progress-first, then watchlist, then recommendations. The queue becomes a live playlist.

---

## Stats / Heatmap System

### Aggregation

Pure aggregation layer over `history_progress`:

```ts
class StatsService {
  monthlyHeatmap(year: number, month: number): HeatmapDay[];
  breakdownByShow(range: DateRange): ShowBreakdownItem[];
  totals(range: DateRange): StatsTotals;
  exportJson(range: DateRange): StatsExportPayload;
  exportCsv(range: DateRange): string;
  streakDays(): number;
}
```

### Heatmap rendering

ANSI 256-color backgrounds + Unicode full-block `█`. 4 intensity levels:

| Level      | Threshold | Color        | ANSI             |
| ---------- | --------- | ------------ | ---------------- |
| 0 (none)   | 0 min     | dim gray     | `\x1b[48;5;237m` |
| 1 (low)    | 1-30 min  | green dim    | `\x1b[48;5;22m`  |
| 2 (medium) | 30-90 min | green mid    | `\x1b[48;5;28m`  |
| 3 (high)   | 90+ min   | green bright | `\x1b[48;5;46m`  |

Default view: rolling 3 months. `--range` for anything else.

```
     May 2026
Mon ░░░░░░░░░░░░░░░░▓▓██░░  8h
Tue ░░░░░░░░░░░░░░░░░░▓▓██  2h
Wed ░░░░░░░░░░░░░░░░░░░░░░▓  —
Thu ░░░░░░░░░░░░▓▓████████  3h
Fri ░░░░░░░░░░░░░░░░░░░░░░  —
Sat ██████████████████████ 12h
Sun ░░░░░░░░░░░░░░░░░░░░░░  —

  ░ = none   ▓ = <30m   █ = 30-90m   █ = 90m+
```

### Per-show progress bars

```
  Steins;Gate        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ 14/24  58%
  Frieren            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 28/28  100%
  Attack on Titan F  ▓▓▓▓░░░░░░░░░░░░░░░░░░  4/16  25%
```

Uses same ANSI color scale.

### Weekly digest (Monday first launch)

```
┌─ Week 20 ───────────────────────────────────────┐
│  12h 34m across 7 shows. Peak: Tuesday (3h 12m) │
│  Streak: 14 days 🔥                              │
│  📺 Frieren: ep 4-8         ▓▓▓▓▓▓▓▓▓▓▓▓░░ 70% │
│     Steins;Gate             ▓▓▓▓▓▓░ 14/24  58%  │
│  [d]ismiss  [/]stats                            │
└─────────────────────────────────────────────────┘
```

Dismissible. Never shown again that week.

### CLI commands

```
kunai stats                    -> current month heatmap + digest
kunai stats --month 2026-01   -> specific month
kunai stats --range 7d        -> last 7 days
kunai stats --range 30d       -> last 30 days
kunai stats --by show         -> table: show | hours | episodes | completion%
kunai stats --by provider     -> table: provider | hours
kunai stats --export json     -> structured data for external viz
kunai stats --export csv      -> spreadsheet import
```

---

## Shell Integration

### Search results — inline toggle badge

```
  1. Dune: Part Two (2024)               ★8.2  [wl ✓]
  2. Dune: Prophecy (TV Series)           ☆7.5  [wl  ]
  3. Steins;Gate                          ★9.1  [wl ✓][fav ✓]
```

- `w` toggles watchlist on focused row. Badge flips instantly.
- `W` opens mini-picker: `[w]atchlist  [f]avorites  [c]ustom list...`

### Detail view

```
  Dune: Part Two (2024)
  ─────────────────────
  [p] play  [w] wl ✓  [f] fav  [q] queue  [i] info  [b] back
```

### Episode picker footer

```
  [p] play  [w] add to watchlist  [q] queue  [b] back
```

### Post-playback actions

```
  Finished Steins;Gate S1 E3
  ───────────────────────────
  [n] next episode  [f] add to favorites  [r] rm from wl  [q] queue  [/] search
```

### Shell header (always visible)

```
┌─ Kunai ───🔥 14d ── sync✓ ─────────────────────┐
```

- Streak count: consecutive days with ≥1 completed episode or >15min watched.
- `sync✓` green: all good. `sync⚠` amber: last push failed. `sync✗` red: auth expired.
- Clickable/pressable `sync⚠` opens sync status panel.

### Browse footer

```
  [/] search  [w] wl (3)  [q] queue (2)  [d] discover  [h] history
```

### Empty states (never a dead end)

```
kunai wl
┌─ Watchlist ─────────────────────────────────────┐
│                                                  │
│  Your watchlist is empty.                        │
│                                                  │
│  [/] Search to find something to watch          │
│  [d] Browse trending                            │
│  [h] Add from history                           │
│                                                  │
└─────────────────────────────────────────────────┘

kunai stats (no history)
┌─ Stats ─────────────────────────────────────────┐
│  Nothing to show yet. Watch your first episode! │
│  [/] Search  [d] Discover                      │
└─────────────────────────────────────────────────┘

kunai queue play (empty queue)
┌─ Queue ─────────────────────────────────────────┐
│  Queue is empty. What should we play?            │
│  1. Continue Steins;Gate S1 E4 (in progress)    │
│  2. Play from watchlist (3 items)               │
│  3. [/] Search for something new                │
└─────────────────────────────────────────────────┘
```

### First-episode sync nudge (fires once)

```
Episode completed. 14:23 watched.
───────────────────────────────────────
Sync progress to AniList? [y] setup [n] not now
```

Fires after the first episode ends, only if no sync target is configured. After dismiss, never again.

---

## CLI Command Surface

```
kunai wl                          # show default list (watchlist)
kunai wl ls                       # list items in default list
kunai wl ls --list favorites      # list favorites
kunai wl add "Dune"               # quick add to watchlist
kunai wl add "Dune" --list fav    # add to favorites
kunai wl rm <title-id>            # remove from default list
kunai wl create "name"            # create custom list
kunai wl delete <list-id>         # delete custom list
kunai wl sync                     # push pending + show banner
kunai wl sync --push              # push only
kunai wl sync --pull              # 15d pull window
kunai wl sync --pull --all        # pull everything (explicit opt-in)

kunai queue                       # show queue
kunai queue ls                    # list items
kunai queue add "Dune"            # add title to queue
kunai queue add "Dune" S1 E3      # add specific episode
kunai queue play                  # play through queue (auto-advance)
kunai queue next                  # skip to next item
kunai queue shuffle               # randomize unplayed items
kunai queue clear                 # remove played items
kunai queue rm <id>               # remove specific item
kunai queue mode                  # show current mode
kunai queue mode smart            # enable smart auto-fill
kunai queue mode manual           # disable smart mode

kunai stats                       # monthly overview + heatmap + digest
kunai stats --by show             # time per show
kunai stats --by provider         # time per provider
kunai stats --range 7d|30d        # last N days
kunai stats --range 2025-01..2025-06  # date range
kunai stats --export json         # structured JSON dump
kunai stats --export csv          # CSV for spreadsheet import

kunai sync status                 # connection status per service
kunai sync connect anilist        # start AniList auth flow
kunai sync connect tmdb           # start TMDB auth flow
kunai sync disconnect anilist     # remove AniList auth
kunai sync disconnect tmdb        # remove TMDB auth
```

---

## Sync Adapters

### SyncAdapter interface

```ts
interface SyncAdapter {
  readonly id: "anilist" | "tmdb";
  isConnected(): boolean;
  connect(config: SyncConfig): Promise<void>;
  disconnect(): void;

  // Tracker (auto-push)
  pushProgress(input: ProgressInput): Promise<SyncResult>;

  // List sync (manual)
  pushListItems(items: ListItemInput[]): Promise<SyncResult[]>;
  pullRecentItems(days: number): Promise<PulledItem[]>;
  pullAllItems(): Promise<PulledItem[]>;
}
```

### AniListAdapter

- **Auth**: OAuth device code flow. POST to `https://anilist.co/api/v2/oauth/authorize`. User opens URL, enters code. Poll `/oauth/token` until complete. Store `accessToken` + `refreshToken` in config.
- **GraphQL mutations**:
  - `SaveMediaListEntry` — update anime status + progress + score
  - `UpdateMediaListEntries` — batch update
- **GraphQL queries**:
  - `MediaList` — get user's list entry for a specific media id
  - `MediaListCollection` — get all list entries for pull
- **Status mapping**:
  - watchlist → `PLANNING`
  - in-progress playback → `CURRENT`
  - completed playback → `COMPLETED`
  - favorites → no AniList equivalent, skip

### TmdbAdapter

- **Auth**: TMDB v3 auth flow. Create request token → open authorize URL → create session ID. Store `sessionId` + `accountId` in config.
- **REST endpoints**:
  - `POST /account/{id}/watchlist` — add/remove movie or TV to watchlist
  - `POST /account/{id}/favorite` — mark/unmark as favorite
  - `GET /account/{id}/watchlist/movies` — pull movie watchlist
  - `GET /account/{id}/watchlist/tv` — pull TV watchlist
  - `GET /account/{id}/favorite/movies` — pull movie favorites
  - `GET /account/{id}/favorite/tv` — pull TV favorites
- **Status mapping**:
  - watchlist → TMDB watchlist
  - favorites → TMDB favorites
  - progress tracking → TMDB does not support episode progress natively, skipped for tracker

---

## CLI Commands (Direct Execution)

```
kunai wl                          # show default list (watchlist)
kunai wl ls                       # list items in default list
kunai wl ls --list favorites      # list favorites
kunai wl add "Dune"               # quick add to watchlist
kunai wl add "Dune" --list fav    # add to favorites
kunai wl rm <title-id>            # remove from default list
kunai wl create "name"            # create custom list
kunai wl delete <list-id>         # delete custom list
kunai wl sync                     # push pending + show banner
kunai wl sync --push              # push only
kunai wl sync --pull              # 15d pull window
kunai wl sync --pull --all        # pull everything (explicit opt-in)

kunai queue                       # show queue
kunai queue ls                    # list items
kunai queue add "Dune"            # add title to queue
kunai queue add "Dune" S1 E3      # add specific episode
kunai queue play                  # play through queue (auto-advance)
kunai queue next                  # skip to next item
kunai queue shuffle               # randomize unplayed items
kunai queue clear                 # remove played items
kunai queue rm <id>               # remove specific item

kunai stats                       # monthly overview + heatmap + digest
kunai stats --by show             # time per show
kunai stats --by provider         # time per provider
kunai stats --range 7d|30d        # last N days
kunai stats --range 2025-01..2025-06  # date range
kunai stats --export json         # structured JSON dump
kunai stats --export csv          # CSV for spreadsheet import

kunai sync status                 # connection status per service
kunai sync connect anilist        # start AniList auth flow
kunai sync connect tmdb           # start TMDB auth flow
kunai sync disconnect anilist     # remove AniList auth
kunai sync disconnect tmdb        # remove TMDB auth
```

---

## Tasks

### Phase 1: Local Lists + Stats + Queue (Foundation)

**Task 1.1: SQLite migration + repositories**

Files:

- Modify: `packages/storage/src/migrations.ts`
- Create: `packages/storage/src/repositories/lists.ts`
- Create: `packages/storage/src/repositories/queue.ts`
- Create: `packages/storage/src/repositories/sync-ledger.ts`
- Test: `packages/storage/test/repositories/lists.test.ts`
- Test: `packages/storage/test/repositories/queue.test.ts`
- Test: `packages/storage/test/repositories/sync-ledger.test.ts`

- [ ] Add `009_data_lists` migration to `dataMigrations`
- [ ] Insert default lists (watchlist, favorites) in migration
- [ ] Create `ListRepository` with full CRUD + `findByTitleId`, `findByListId`
- [ ] Create `QueueRepository` with full CRUD + `popNext`, `removePlayed`, `reorder`
- [ ] Create `SyncLedgerRepository` with `addEntry`, `listPending`, `markDone`, `listByTarget`
- [ ] Run `bun test packages/storage/test/repositories/`

---

**Task 1.2: ListService domain**

Files:

- Create: `apps/cli/src/domain/lists/ListService.ts`
- Create: `apps/cli/src/domain/lists/types.ts`
- Test: `apps/cli/test/unit/domain/lists/list-service.test.ts`

- [ ] Write tests for: `addToList`, `removeFromList`, `isInList`, `getList`, `getAllLists`, `createList`, `deleteList`, `moveItem`
- [ ] Implement `ListService`
- [ ] Run tests

---

**Task 1.3: QueueService domain**

Files:

- Create: `apps/cli/src/domain/lists/QueueService.ts`
- Test: `apps/cli/test/unit/domain/lists/queue-service.test.ts`

- [ ] Write tests for: `enqueue`, `dequeue`, `getQueue`, `remove`, `shuffle`, `clearPlayed`, `advance`, `setMode`, `smartRefill`
- [ ] Implement `QueueService` with manual and smart modes
- [ ] Smart refill logic: in-progress history → watchlist → discover
- [ ] Run tests

---

**Task 1.4: StatsService domain**

Files:

- Create: `apps/cli/src/domain/lists/StatsService.ts`
- Test: `apps/cli/test/unit/domain/lists/stats-service.test.ts`

- [ ] Write tests for: `monthlyHeatmap`, `breakdownByShow`, `breakdownByProvider`, `totals`, `exportJson`, `exportCsv`, `streakDays`
- [ ] Implement `StatsService` — pure aggregation from `HistoryRepository`
- [ ] Run tests

---

**Task 1.5: StatsFormatter**

Files:

- Create: `apps/cli/src/domain/lists/StatsFormatter.ts`
- Test: `apps/cli/test/unit/domain/lists/stats-formatter.test.ts`

- [ ] Write tests for: `formatHeatmap`, `formatProgressBar`, `formatDigest`, `formatBreakdownTable`, `formatCsv`, `formatJsonExport`
- [ ] Implement ANSI heatmap renderer (256-color backgrounds + full-block `█`, 4 intensity levels)
- [ ] Implement per-show progress bars
- [ ] Implement weekly digest formatter
- [ ] Implement CSV export with proper quoting
- [ ] Implement JSON export with structured schema
- [ ] Run tests

---

**Task 1.6: Wire services into container**

Files:

- Modify: `apps/cli/src/container.ts`

- [ ] Instantiate `ListService`, `QueueService`, `StatsService` with repositories
- [ ] Add to `Container` interface
- [ ] Run `bun run typecheck`

---

**Task 1.7: CLI commands — wl, queue, stats**

Files:

- Create: `apps/cli/src/app-shell/commands/list-commands.ts`
- Create: `apps/cli/src/app-shell/commands/queue-commands.ts`
- Create: `apps/cli/src/app-shell/commands/stats-commands.ts`
- Create: `apps/cli/src/app-shell/commands/sync-commands.ts`
- Modify: `apps/cli/src/app-shell/commands.ts` (command registry)

- [ ] Register `/wl` with `ls`, `add`, `rm`, `create`, `delete`, `move`
- [ ] Register `/queue` with `ls`, `add`, `play`, `next`, `shuffle`, `clear`, `rm`, `mode`
- [ ] Register `/stats` with default view, `--by`, `--range`, `--export`
- [ ] Register `/sync` with `status`, `connect`, `disconnect`
- [ ] Render list items in picker format with title, kind, added date
- [ ] Render queue in picker format with status indicators + priority
- [ ] Render stats as formatted terminal output with heatmap + digest
- [ ] Run `bun run typecheck`

---

**Task 1.8: Shell integration**

Files:

- Modify: `apps/cli/src/app-shell/workflows.ts`
- Modify: `apps/cli/src/app/PlaybackPhase.ts`
- Modify: shell header component (find from existing code)

- [ ] Search results: inline `[wl ✓]` / `[wl  ]` toggle badge per row. `w` toggles watchlist. `W` opens multi-list picker.
- [ ] Detail view: `[p] play [w] wl [f] fav [q] queue [i] info`
- [ ] Episode picker footer: `[w] add to watchlist [q] queue`
- [ ] Post-playback: `[n] next [f] fav [r] rm from wl [q] queue [/] search`
- [ ] Shell header: `🔥 14d · sync✓` always visible. Streak from `StatsService.streakDays()`.
- [ ] Browse footer: `[/] search [w] wl (3) [q] queue (2) [d] discover`
- [ ] Empty states: all show action-links (search, discover, history, help)
- [ ] Weekly digest: shown on Monday first launch if history exists, dismissible
- [ ] First-episode sync nudge: fires once after first completed episode, only if no sync configured
- [ ] Run `bun run typecheck`

---

### Phase 2: Queue Auto-Advance

**Task 2.1: Wire queue into playback loop**

Files:

- Modify: `apps/cli/src/app/PlaybackPhase.ts`

- [ ] After episode end + history save, check if active queue session
- [ ] If queue has next item, auto-advance with brief "Next: {title} S{season} E{episode}" banner
- [ ] If queue exhausted, show three-tier fallback: continue in-progress → play from watchlist → search
- [ ] Smart mode: before dequeue, trigger `smartRefill()` if queue below 3 items
- [ ] Write tests for auto-advance + exhaust flows
- [ ] Run `bun run typecheck`

---

### Phase 3: Sync

**Task 3.1: Sync adapter interface**

Files:

- Create: `apps/cli/src/services/sync/SyncAdapter.ts`
- Create: `apps/cli/src/services/sync/types.ts`
- Test: `apps/cli/test/unit/services/sync/sync-adapter-contract.test.ts`

- [ ] Define `SyncAdapter` interface
- [ ] Define `SyncConfig`, `ProgressInput`, `ListItemInput`, `PulledItem`, `SyncResult` types
- [ ] Write contract tests that any adapter must pass
- [ ] Run tests

---

**Task 3.2: AniList sync adapter**

Files:

- Create: `apps/cli/src/services/sync/AniListAdapter.ts`
- Test: `apps/cli/test/unit/services/sync/anilist-adapter.test.ts`

- [ ] OAuth device code flow: `POST /oauth/authorize`, `POST /oauth/token`
- [ ] Store `accessToken` + `refreshToken` + `tokenExpiresAt` in config
- [ ] Handle token refresh on expiry
- [ ] GraphQL: `SaveMediaListEntry` mutation (status, progress, score)
- [ ] GraphQL: `MediaListCollection` query (pull all or by date range)
- [ ] Map local statuses to AniList media list statuses
- [ ] Map AniList statuses to local list kinds on pull
- [ ] Write tests with mocked HTTP + GraphQL responses
- [ ] Run tests

---

**Task 3.3: TMDB sync adapter**

Files:

- Create: `apps/cli/src/services/sync/TmdbAdapter.ts`
- Test: `apps/cli/test/unit/services/sync/tmdb-adapter.test.ts`

- [ ] TMDB v3 auth: create request token → authorize → create session → get account ID
- [ ] Store `sessionId` + `accountId` in config
- [ ] REST: `POST /account/{id}/watchlist` (add/remove movie + TV)
- [ ] REST: `POST /account/{id}/favorite`
- [ ] REST: `GET /account/{id}/watchlist/movies`, `GET /account/{id}/watchlist/tv`
- [ ] Map local kinds to TMDB media_type + list type
- [ ] Write tests with mocked HTTP responses
- [ ] Run tests

---

**Task 3.4: SyncService orchestrator**

Files:

- Create: `apps/cli/src/services/sync/SyncService.ts`
- Create: `apps/cli/src/services/sync/SyncBanner.ts`
- Test: `apps/cli/test/unit/services/sync/sync-service.test.ts`

- [ ] `collectPending(target)` — reads `sync_ledger` for pending pushes
- [ ] `push(target)` — show diff banner, confirm, execute via adapter
- [ ] `pull(target, days?)` — query remote, show diff, confirm, import to local
- [ ] `pushAll()` — iterate all enabled targets
- [ ] `trackerPush(input)` — fire-and-forget, no banner, no ledger tracking
- [ ] `firstConnectMerge(target)` — bidirectional compare, merge banner, execute
- [ ] Banner rendering: per-item diff, confirm / deny / detail
- [ ] Sync header health indicator: poll last sync status per target
- [ ] Write tests
- [ ] Run tests

---

**Task 3.5: Wire sync into container + config**

Files:

- Modify: `apps/cli/src/container.ts`
- Modify: `apps/cli/src/services/persistence/ConfigService.ts`

- [ ] Add `sync` config fields to `KitsuneConfig` (all defaults false)
- [ ] Instantiate `SyncService`, `AniListAdapter`, `TmdbAdapter` in container
- [ ] Wire tracker auto-push into `PlaybackPhase` after history save
- [ ] Run `bun run typecheck`

---

**Task 3.6: Auth UX + settings panel**

Files:

- Modify: `apps/cli/src/app-shell/workflows.ts`
- Modify: settings panel (find existing settings component)

- [ ] `/sync connect anilist` — start device code flow, show URL + code, poll for token
- [ ] `/sync connect tmdb` — start TMDB auth flow
- [ ] `/sync status` — connection status per service, last sync time
- [ ] `/sync disconnect <target>` — clear tokens, confirm
- [ ] Settings panel: sync section with per-service toggles + status
- [ ] Run `bun run typecheck`

---

### Phase 4: Polish

**Task 4.1: Config fields**

Files:

- Modify: `apps/cli/src/services/persistence/ConfigService.ts` (if not already in Task 3.5)

- [ ] Add `sync.anilist.enabled`, `sync.anilist.tracker`, `sync.anilist.list`, `sync.anilist.accessToken`, `sync.anilist.refreshToken`, `sync.anilist.tokenExpiresAt`
- [ ] Add `sync.tmdb.enabled`, `sync.tmdb.tracker`, `sync.tmdb.list`, `sync.tmdb.sessionId`, `sync.tmdb.accountId`
- [ ] All default to `false` / `undefined`
- [ ] Run `bun run typecheck`

---

**Task 4.2: Sync diff + banner UX polish**

Files:

- Modify: `apps/cli/src/app-shell/workflows.ts`

- [ ] Banner: shows per-item diff with action indicator (`new`, `Planning → Watching`, `remove`)
- [ ] `[Y]es / [n]o / [d]etails` flow — details expands to full list
- [ ] On completion: `Synced 3 items to AniList ✓`
- [ ] On failure: per-item failure with reason
- [ ] Run `bun run typecheck`

---

**Task 4.3: Documentation + roadmap**

Files:

- Modify: `.plans/roadmap.md`

- [ ] Add this plan to Planned Tracks
- [ ] Mark phases as they are completed

---

## Non-Goals

- No daemon or background service for auto-sync (manual trigger only except tracker auto-push)
- No IMDb sync (no public API)
- No cross-domain ID reconciliation (separate by media_kind enum)
- No CRDT or merge conflict resolution engine (local-first, push-wins, first-connect merge is one-time)
- No web UI. All interaction is terminal CLI.
- No changes to `history_progress` schema or existing history semantics
- No blocking the player on sync failures
- No heatmap for external services — purely local data aggregation
- No social features (sharing, leaderboards, public profiles)

---

## Failure Modes

| Failure                       | Behavior                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| Sync network error            | Log to diagnostics. Mark `sync_ledger` as failed. Turn header `sync✓` → `sync⚠` amber.  |
| Auth token expired            | Prompt for re-auth on next manual sync. Tracker push fails silently. `sync✗` in header. |
| Duplicate push                | Adapter checks remote existence before insert. Skips duplicates. No error surfaced.     |
| Queue item unavailable        | Advance to next item. Log warning to diagnostics. No blocking.                          |
| Smart queue picks wrong show  | User removes item manually. Refill happens on next dequeue.                             |
| Empty stats query             | Show action-links: `[/] Search [d] Discover [h] History`                                |
| First-connect merge conflict  | User picks per-item. Last write wins on auto-merge.                                     |
| mpv failure during queue play | Advance to next queue item. Failed item stays in queue marked as retryable.             |

---

## Key Files Map

| File                                                 | Action                         |
| ---------------------------------------------------- | ------------------------------ |
| `packages/storage/src/migrations.ts`                 | Add `009_data_lists` migration |
| `packages/storage/src/repositories/lists.ts`         | Create                         |
| `packages/storage/src/repositories/queue.ts`         | Create                         |
| `packages/storage/src/repositories/sync-ledger.ts`   | Create                         |
| `apps/cli/src/domain/lists/types.ts`                 | Create                         |
| `apps/cli/src/domain/lists/ListService.ts`           | Create                         |
| `apps/cli/src/domain/lists/QueueService.ts`          | Create                         |
| `apps/cli/src/domain/lists/StatsService.ts`          | Create                         |
| `apps/cli/src/domain/lists/StatsFormatter.ts`        | Create                         |
| `apps/cli/src/services/sync/types.ts`                | Create                         |
| `apps/cli/src/services/sync/SyncAdapter.ts`          | Create                         |
| `apps/cli/src/services/sync/AniListAdapter.ts`       | Create                         |
| `apps/cli/src/services/sync/TmdbAdapter.ts`          | Create                         |
| `apps/cli/src/services/sync/SyncService.ts`          | Create                         |
| `apps/cli/src/services/sync/SyncBanner.ts`           | Create                         |
| `apps/cli/src/app-shell/commands/list-commands.ts`   | Create                         |
| `apps/cli/src/app-shell/commands/queue-commands.ts`  | Create                         |
| `apps/cli/src/app-shell/commands/stats-commands.ts`  | Create                         |
| `apps/cli/src/app-shell/commands/sync-commands.ts`   | Create                         |
| `apps/cli/src/container.ts`                          | Modify                         |
| `apps/cli/src/services/persistence/ConfigService.ts` | Modify                         |
| `apps/cli/src/app-shell/workflows.ts`                | Modify                         |
| `apps/cli/src/app/PlaybackPhase.ts`                  | Modify                         |
| `apps/cli/src/app-shell/commands.ts`                 | Modify                         |
| `.plans/roadmap.md`                                  | Modify                         |
