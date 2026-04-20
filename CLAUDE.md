# KitsuneSnipe — Project Context

## What this project is

KitsuneSnipe is a terminal-first CLI streaming engine. It uses Playwright to scrape `.m3u8` stream URLs from video-hosting embeds, then pipes them to `mpv` for playback. No API keys. No accounts. Pure network interception.

**Website:** `kitsune-snipe.kitsunelabs.xyz`  
**Package:** `kitsune-snipe` on npm  
**Author:** kitsunekode

## Run it

```sh
bun run index.ts             # fully interactive
bun run index.ts -S "Dune"  # pre-fill search
bun run index.ts -i 438631 -t movie  # direct TMDB ID
```

## Module map

```
index.ts          — entry point + main playback loop (orchestration only)
lib/
  config.ts       — persisted user preferences (~/.config/kitsunesnipe/config.json)
  urls.ts         — URL builders for VidKing and Cineby embeds
  cache.ts        — stream URL disk cache (1-hour TTL) + scrape log
  scraper.ts      — Playwright browser automation (stream + subtitle capture)
  subtitle.ts     — wyzie subtitle API (fetch + language selection)
  search.ts       — db.videasy.net search (TMDB-format, no API key)
  mpv.ts          — MPV launcher + Lua IPC for playback position
  history.ts      — watch history (~/.local/share/kitsunesnipe/history.json)
  image.ts        — Kitty/Ghostty inline poster via graphics protocol
  menu.ts         — post-episode menu, settings prompt, raw-mode key reader, ANSI colors
  ui.ts           — dep checks (mpv, fzf), fzf picker with @clack fallback
```

## External services

| Service | URL | Purpose |
|---------|-----|---------|
| db.videasy.net | `https://db.videasy.net/3/search/multi` | TMDB-format search proxy, no key needed |
| sub.wyzie.io | `https://sub.wyzie.io/search` | Subtitle search (API key embedded in URL by player) |
| image.tmdb.org | `https://image.tmdb.org/t/p/w300{path}` | Poster images |
| vidking.net | `https://www.vidking.net/embed/{movie|tv}/...` | Primary streaming provider |
| cineby.sc | `https://www.cineby.sc/{movie|tv}/...` | Fallback streaming provider |

## Key architecture decisions

- **Playwright over fetch**: Providers use lazy JS players that only emit the `.m3u8` URL after rendering. fetch() cannot execute JS. Chromium is required.
- **Headless by default**: `headless: true` saves ~100 MB RAM. VidKing's `autoPlay=true` param makes it work without mouse interaction.
- **Subtitle URL capture**: Wyzie's API key is embedded in the player's own search request URL. We capture the request (not response) and make an independent `fetch()` to it — avoids body-consumed errors.
- **Raw-mode key reader**: MPV runs with `stdio: "inherit"`, which can leave stdin in an undefined state. A persistent readline interface breaks. `readSingleKey()` in `menu.ts` creates a fresh raw-mode listener per invocation.
- **Pre-fetch**: While MPV plays episode N, episode N+1 is scraped headlessly in the background. Pressing `[n]` is instant.
- **Config vs flags**: Flags always win. Config provides saved defaults so users don't reprompt on every run.

## User-facing file locations

| File | Path |
|------|------|
| Config | `~/.config/kitsunesnipe/config.json` |
| Watch history | `~/.local/share/kitsunesnipe/history.json` |
| Stream cache | `./stream_cache.json` (project dir, .gitignored) |
| Scrape log | `./logs.txt` (project dir, .gitignored) |

## Provider URL params that matter

| Param | Provider | Effect |
|-------|----------|--------|
| `autoPlay=true` | VidKing | Player fires on load, no mouse click needed |
| `episodeSelector=false` | VidKing | Hides built-in episode picker |
| `nextEpisode=false` | VidKing | Hides overlay next-ep button |
| `play=true` | Cineby | Wakes the player (Cineby still needs a click at 500,500) |

## Subtitle flow

1. Playwright intercepts `sub.wyzie.io/search?id=...&key=...` request URL
2. We fetch that URL directly with the preferred language
3. Selection priority: preferred lang → English fallback → first in list
4. If wyzie hasn't fired 2 s after the m3u8, we wait an extra 1.5 s
5. Direct `.vtt`/`.srt` URLs are also captured as a simpler fallback

## Terminal capabilities and limitations

**What works in terminal (implemented):**
- ANSI colors + bold/dim — `lib/menu.ts` color helpers
- Box drawing with Unicode — post-episode menu separator
- Raw-mode single-keypress menus — `readSingleKey()`
- Inline poster images — Kitty/Ghostty graphics protocol in `lib/image.ts`
- Memory display — `process.memoryUsage()` shown in menu

**What requires a web UI (future scope at kitsune-snipe.kitsunelabs.xyz):**
- SVG/canvas animations, shimeji fox, isometric design
- Interactive usage graphs (ASCII bars are possible but limited)
- Settings GUI

## Development workflow

```sh
bun install                       # install deps
bunx playwright install chromium  # download browser (one-time)
bun run index.ts                  # run
bun test                          # unit tests
bun run lint                      # oxlint
bun run format                    # oxfmt
```

## Testing strategy

Unit test only pure functions (no browser, no network):
- `lib/history.ts` — `formatTimestamp`, `isFinished`
- `lib/urls.ts` — `buildUrl`
- `lib/search.ts` — result mapping (with mocked fetch)
- `lib/cache.ts` — TTL logic (with mocked fs)

Do NOT unit test `scrapeStream` — it requires a live browser and network. Integration tests for the scraper would need a local mock server.

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## Bun APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing with Bun

```ts
import { test, expect } from "bun:test";

test("example", () => {
  expect(1).toBe(1);
});
```
