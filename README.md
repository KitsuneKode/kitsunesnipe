# KitsuneSnipe 🦊🎯

A fast, interactive CLI streaming engine for your terminal. Zero config — just run it and follow the prompts.

Supports **VidKing** and **Cineby** as providers. No API keys required.

## ✨ Features

- **Fully interactive** — zero flags needed; guided prompts + fzf fuzzy search
- **Watch history** — remembers where you stopped, offers to resume or jump to next episode
- **Background pre-fetch** — next episode scrapes while you watch the current one; `[n]` is instant
- **Poster preview** — shows the TMDB poster inline (Kitty / Ghostty only, no extra tools needed)
- **fzf integration** — fuzzy pick titles and subtitle tracks; falls back to arrow-key select if fzf is absent
- **Subtitle support** — wyzie subtitle API with language selection or interactive fzf picker
- **Ad blocking** — 20+ ad/tracker domains blocked at the network level via Playwright `route()`
- **Headless by default** — runs the browser invisibly; use `--no-headless` if a provider blocks it
- **Auto-provider fallback** — if the primary provider fails, silently tries the other
- **1-hour stream cache** — re-watching or resuming skips the scraper entirely
- **Smart caching** — in-session search results cached to avoid rate-limiting on repeated queries

## 🚀 Prerequisites

| Tool | Required | Notes |
|------|----------|-------|
| [Bun](https://bun.sh/) | ✅ | Runtime and package manager |
| [mpv](https://mpv.io/) | ✅ | Media player |
| [fzf](https://github.com/junegunn/fzf) | Optional | Fuzzy picker — falls back to arrow-key select |
| Kitty / Ghostty terminal | Optional | Poster image preview |

Install mpv and fzf:
```bash
# Arch
sudo pacman -S mpv fzf

# Debian/Ubuntu
sudo apt install mpv fzf

# macOS
brew install mpv fzf
```

## 📦 Installation

```bash
git clone https://github.com/kitsunekode/kitsunesnipe.git
cd kitsunesnipe
bun install
bunx playwright install chromium
```

## 💻 Usage

### Fully interactive (recommended)

```bash
bun run index.ts
```

You'll be guided through:
1. Search by title (fuzzy pick from results with fzf)
2. Poster preview (Kitty/Ghostty only)
3. Provider: VidKing (recommended) or Cineby
4. Subtitle language (or fzf to pick interactively)
5. Season / episode — with history-aware resume prompts

### Skip prompts with flags

All flags are optional — mix and match to pre-fill any step:

```bash
bun run index.ts -S "Breaking Bad"               # pre-fill search query
bun run index.ts -S "Inception" -t movie         # force movie type
bun run index.ts -i 1396 -s 3 -e 5              # jump to S3E5 by TMDB ID
bun run index.ts -S "The Boys" -l fzf            # pick subtitle with fzf
bun run index.ts -S "Breaking Bad" -l ar         # Arabic subtitles
bun run index.ts -S "Oppenheimer" -p cineby      # force Cineby
bun run index.ts -S "Breaking Bad" -H            # visible browser (debug)
```

### All flags

| Short | Long | Description |
|-------|------|-------------|
| `-S` | `--search` | Pre-fill the search query |
| `-i` | `--id` | Use a known TMDB ID (skip search entirely) |
| `-T` | `--title` | Override the display title shown in MPV |
| `-t` | `--type` | `movie` or `series` (used with `--id`) |
| `-s` | `--season` | Starting season |
| `-e` | `--episode` | Starting episode |
| `-p` | `--provider` | `vidking` (default) or `cineby` |
| `-l` | `--sub-lang` | `en`, `ar`, `fr`, `de`, `es`, `ja`, `fzf`, `none` |
| `-H` | `--no-headless` | Force visible browser window |

## 🎮 Playback menu

After each episode or movie, a one-key menu appears:

**Series:**
```
  [n] next   [p] prev   [s] next season   [o] other provider   [q] quit
```

**Movie:**
```
  [r] replay   [q] quit
```

Any other key exits.

## 📼 Watch History

History is stored at `~/.local/share/kitsunesnipe/history.json`, keyed by TMDB ID.

- **Unfinished episode** → prompted to resume from exact timestamp or restart
- **Finished episode** (>85% watched) → prompted to jump to next episode
- **No history** → starts from S1E1

## 🗂️ Project Structure

```
index.ts          — main entry: prompts, playback loop, orchestration
lib/
  search.ts       — db.videasy.net search (no API key needed)
  scraper.ts      — Playwright scraper: stream + subtitle extraction, cache
  mpv.ts          — MPV launcher with Lua position IPC
  history.ts      — watch history read/write
  image.ts        — Kitty/Ghostty poster preview via graphics protocol
  subtitle.ts     — wyzie subtitle API
  ui.ts           — dep check, fzf wrapper, @clack fallback
stream_cache.json — 1-hour stream URL cache
logs.txt          — scrape log (auto-appended)
```

## 🌐 Provider URL Patterns

| Provider | Type | Pattern |
|----------|------|---------|
| VidKing | Movie | `https://www.vidking.net/embed/movie/{id}?autoPlay=true` |
| VidKing | Series | `https://www.vidking.net/embed/tv/{id}/{s}/{e}?autoPlay=true&episodeSelector=false&nextEpisode=false` |
| Cineby | Movie | `https://www.cineby.sc/movie/{id}?play=true` |
| Cineby | Series | `https://www.cineby.sc/tv/{id}/{s}/{e}?play=true` |

## ⚠️ Disclaimer

Built for educational and research purposes — network interception, API reverse-engineering, and frontend bypass techniques. The author does not host, provide, or condone piracy of copyrighted media.
