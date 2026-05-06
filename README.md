<div align="center">

# 🥷 Kunai

**The terminal-first streaming engine. Search, skip intros, and resume playback—without leaving your shell.**

[![License](https://img.shields.io/github/license/kitsunekode/kunai?style=flat-square&color=black)](LICENSE)
[![Bun](https://img.shields.io/badge/runtime-bun-f472b6?style=flat-square)](https://bun.sh)
[![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macOS%20%7C%20windows-555?style=flat-square)](#prerequisites)
[![Beta](https://img.shields.io/badge/status-beta-orange?style=flat-square)](#known-issues-beta)

![Kunai Terminal Demo](./apps/cli/test/vhs/browse-shell.gif)

*No browser tabs. No accounts. No bloat. Just the terminal and the stream.*
</div>

---

Kunai intercepts streams from providers headlessly and hands them off directly to `mpv`. It features a persistent, premium Ink shell that remembers your history, caches streams, and skips anime intros entirely automatically.

## ✨ The Moat (Why Kunai?)

- **Zero-Context Switching:** Search, pick, watch, and resume from a single, persistent UI.
- **Built-in AniSkip:** Seamless, auto-skipping of anime intros and credits natively integrated into the shell and `mpv`.
- **Background Pre-fetching:** The next episode is scraped silently in the background while you watch. Hitting "Next" is instantaneous.
- **Native Ad-Blocking:** Because it resolves streams headlessly, it intercepts `.m3u8` payloads directly and blocks 20+ tracker domains at the network level. No popups, no redirects.
- **Stateful Watch History:** SQLite-backed history that remembers exact timestamps and offers to resume exactly where you left off.
- **Auto-Heal:** If a stream dies or hits a rate limit, the resolver silently falls back to the next available provider.

---

## ⚡ Quick Start

```bash
git clone https://github.com/kitsunekode/kunai.git
cd kunai
bun install
bun run link:global
```

*Note: Playwright Chromium is optional but required for some browser-backed providers (`bunx playwright install chromium`).*

Then simply launch:

```bash
kunai
```

---

## 🎮 Interaction & Controls

Kunai is built for speed and immersion. The entire application is driven by a single global command palette and a handful of contextual keys.

### Global Navigation
| Key | Action |
|-----|--------|
| `/` | Open the global command palette (Settings, History, Diagnostics, etc.) |
| `Esc` | Go back or close the current overlay |
| `q` | Quit the application / Stop playback |

### Playback & `mpv` Bridge
When `mpv` is open, it acts as a slave to the terminal.
| Key | Action |
|-----|--------|
| `n` / `p` | Request next / previous episode |
| `k` | Open quality/streams picker |
| `o` | Open provider source picker |
| `b` | Skip active segment manually (if auto-skip is disabled) |
| `r` | Refresh/recover a stalled stream |
| `f` | Fallback to next provider |

---

## 🛠️ Developer Setup & Architecture

Kunai is a modern monorepo built on Turborepo and React (Ink).

```text
apps/cli        -> The persistent Ink shell and mpv handoff logic.
packages/core   -> Provider logic, headless scraping, and cache policies.
packages/storage-> SQLite connections for watch history and cache.
```

- **Run tests:** `bun test test/unit`
- **Lint/Format:** `bun run check`
- **Generate VHS Demo:** `bun run test:vhs:browse`

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## ⚖️ Disclaimer

Kunai is a client-side playback tool. It does not host, store, upload, mirror, or distribute video content. All streams, manifests, subtitles, posters, and metadata are served by non-affiliated third-party providers.

If you believe specific content is infringing, direct DMCA notices to the actual hosting provider, not this repository. Use responsibly and in accordance with the laws and terms applicable in your jurisdiction.
