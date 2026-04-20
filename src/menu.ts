import { note, select, confirm, log } from "@clack/prompts";
import { isCancel } from "@clack/prompts";
import { saveConfig, type KitsuneConfig } from "./config";
import { PROVIDER_LIST, PLAYWRIGHT_PROVIDERS, ANIME_PROVIDERS } from "./providers";
import { getAllHistory, clearEntry, clearAllHistory, isFinished, formatTimestamp } from "./history";

// =============================================================================
// ANSI COLOR / STYLE HELPERS
// =============================================================================

export const reset  = "\x1b[0m";
export const dim    = (s: string) => `\x1b[2m${s}${reset}`;
export const bold   = (s: string) => `\x1b[1m${s}${reset}`;
export const cyan   = (s: string) => `\x1b[36m${s}${reset}`;
export const green  = (s: string) => `\x1b[32m${s}${reset}`;
export const yellow = (s: string) => `\x1b[33m${s}${reset}`;
export const red    = (s: string) => `\x1b[31m${s}${reset}`;
export const key    = (k: string) => `\x1b[1m\x1b[36m${k}${reset}`;  // bold cyan

// Cursor / screen control
const CLEAR_SCREEN  = "\x1b[2J\x1b[H";   // clear + move to top-left
const HIDE_CURSOR   = "\x1b[?25l";
const SHOW_CURSOR   = "\x1b[?25h";

// =============================================================================
// RAW-MODE SINGLE-KEY READER
//
// Always creates a fresh raw-mode listener so it is safe to call after MPV
// exits (MPV can leave stdin in cooked mode with buffered bytes).
// =============================================================================

export async function readSingleKey(): Promise<string> {
  // Small settle delay — lets the terminal recover from MPV's stdio use.
  await Bun.sleep(80);

  return new Promise((resolve) => {
    const onData = (buf: Buffer) => {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
      const k = buf.toString();
      if (k === "\x03") { process.stdout.write("\n"); process.exit(0); } // Ctrl+C
      resolve(k.toLowerCase().trim() || "");
    };

    try {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        // Drain any leftover bytes before reading the user's real keypress.
        process.stdin.read();
      }
      process.stdin.resume();
      process.stdin.once("data", onData);
    } catch {
      // Non-TTY fallback (piped input, CI)
      process.stdin.once("data", (buf) => {
        process.stdin.pause();
        resolve(buf.toString().trim().toLowerCase().slice(0, 1) || "");
      });
    }
  });
}

// =============================================================================
// POST-EPISODE MENU
//
// Clears the screen and repaints in place — the terminal never accumulates
// repeated menu blocks in the scroll history.
// =============================================================================

export type MenuContext = {
  type:        "movie" | "series";
  title:       string;
  season:      number;
  episode:     number;
  provider:    string;
  showMemory:  boolean;
  isAnime?:    boolean;
};

const W   = 56;
const SEP = dim("  " + "─".repeat(W));

export function drawMenu(ctx: MenuContext): void {
  process.stdout.write(HIDE_CURSOR + CLEAR_SCREEN);

  // ── Header ─────────────────────────────────────────────────────────────────
  const typeIcon = ctx.type === "movie" ? "🎬" : (ctx.isAnime ? "🌸" : "📺");
  const loc = ctx.type === "series"
    ? `  ${cyan(`S${String(ctx.season).padStart(2,"0")}E${String(ctx.episode).padStart(2,"0")}`)}  ${dim("·")}`
    : "";

  console.log(`\n  ${typeIcon}  ${bold(ctx.title)}${loc}  ${dim(ctx.provider)}`);
  console.log(SEP);

  // ── Key bindings ────────────────────────────────────────────────────────────
  if (ctx.type === "series") {
    console.log(`
  ${key("n")}  next episode      ${key("p")}  previous
  ${key("s")}  next season       ${key("o")}  switch provider
  ${key("r")}  replay            ${key("c")}  settings
  ${key("q")}  quit
`);
  } else {
    console.log(`
  ${key("r")}  replay            ${key("c")}  settings
  ${key("q")}  quit
`);
  }

  // ── Memory ──────────────────────────────────────────────────────────────────
  if (ctx.showMemory) {
    const m  = process.memoryUsage();
    const mb = (b: number) => (b / 1_048_576).toFixed(1);
    console.log(SEP);
    console.log(`  ${dim(`Mem  RSS ${mb(m.rss)} MB · Heap ${mb(m.heapUsed)}/${mb(m.heapTotal)} MB`)}\n`);
  }

  console.log(SEP);
  process.stdout.write(`  ${dim("›")} `);
  process.stdout.write(SHOW_CURSOR);
}

// =============================================================================
// SETTINGS MENU
// =============================================================================

export async function openSettings(current: KitsuneConfig): Promise<KitsuneConfig | null> {
  // Settings uses @clack — restore scroll-based output while prompting.
  console.log();
  note("Changes apply immediately and save as new defaults.", "Settings 🦊");

  const guard = <T>(v: T | symbol): T | null => (isCancel(v) ? null : (v as T));

  const section = guard(await select({
    message: "Section:",
    options: [
      { value: "preferences", label: "Preferences  (provider, subtitles, browser, display)" },
      { value: "history",     label: "History  (view & manage watch history)" },
    ],
  })) as "preferences" | "history" | null;
  if (section === null) return null;

  if (section === "history") {
    await manageHistory();
    return current;
  }

  // ── Provider ────────────────────────────────────────────────────────────────
  const newProvider = guard(await select({
    message: "Default provider  (movies & series):",
    options: PLAYWRIGHT_PROVIDERS.map((p) => ({ value: p.id, label: p.description })),
    initialValue: current.provider,
  })) as string | null;
  if (newProvider === null) return null;

  // ── Anime provider ──────────────────────────────────────────────────────────
  const newAnimeProvider = guard(await select({
    message: "Default anime provider:",
    options: ANIME_PROVIDERS.map((p) => ({ value: p.id, label: p.description })),
    initialValue: current.animeProvider,
  })) as string | null;
  if (newAnimeProvider === null) return null;

  // ── Subtitles ───────────────────────────────────────────────────────────────
  const newSubLang = guard(await select({
    message: "Default subtitles:",
    options: [
      { value: "en",   label: "English" },
      { value: "fzf",  label: "Pick interactively with fzf" },
      { value: "none", label: "None" },
      { value: "ar",   label: "Arabic" },
      { value: "fr",   label: "French" },
      { value: "de",   label: "German" },
      { value: "es",   label: "Spanish" },
      { value: "ja",   label: "Japanese" },
    ],
    initialValue: current.subLang,
  })) as string | null;
  if (newSubLang === null) return null;

  // ── Anime audio ─────────────────────────────────────────────────────────────
  const newAnimeLang = guard(await select({
    message: "Anime audio preference:",
    options: [
      { value: "sub", label: "Sub  (original audio + subtitles)" },
      { value: "dub", label: "Dub  (dubbed audio)" },
    ],
    initialValue: current.animeLang,
  })) as "sub" | "dub" | null;
  if (newAnimeLang === null) return null;

  // ── Browser ─────────────────────────────────────────────────────────────────
  const newHeadless = guard(await confirm({
    message:      "Run browser headless?  (saves ~100 MB RAM — Playwright providers only)",
    initialValue: current.headless,
  })) as boolean | null;
  if (newHeadless === null) return null;

  const newShowMem = guard(await confirm({
    message:      "Show memory usage in menu?",
    initialValue: current.showMemory,
  })) as boolean | null;
  if (newShowMem === null) return null;

  const newAutoNext = guard(await confirm({
    message:      "Auto-advance to next episode?  (5-second OSD countdown)",
    initialValue: current.autoNext,
  })) as boolean | null;
  if (newAutoNext === null) return null;

  const updated: KitsuneConfig = {
    provider:      newProvider,
    animeProvider: newAnimeProvider,
    subLang:       newSubLang,
    animeLang:     newAnimeLang,
    headless:      newHeadless,
    showMemory:    newShowMem,
    autoNext:      newAutoNext,
  };

  await saveConfig(updated);
  log.success(`Saved  ${green(newProvider)}  ·  ${newSubLang} subs  ·  ${newAnimeLang} anime  ·  ${newHeadless ? "headless" : "visible"}`);
  return updated;
}

// =============================================================================
// HISTORY VIEWER
// =============================================================================

async function manageHistory(): Promise<void> {
  const all     = await getAllHistory();
  const entries = Object.entries(all);

  if (entries.length === 0) { log.info("No watch history yet."); return; }

  entries.sort((a, b) => new Date(b[1].watchedAt).getTime() - new Date(a[1].watchedAt).getTime());

  const label = ([, e]: [string, (typeof all)[string]]) => {
    const pct     = e.duration ? `${Math.round((e.timestamp / e.duration) * 100)}%` : formatTimestamp(e.timestamp);
    const where   = e.type === "series"
      ? `S${String(e.season).padStart(2,"0")}E${String(e.episode).padStart(2,"0")}  ${pct}`
      : `movie  ${pct}`;
    const done = isFinished(e) ? dim(" ✓") : "";
    return `${e.title.padEnd(30)}  ${where.padEnd(14)}  ${dim(new Date(e.watchedAt).toLocaleDateString())}${done}`;
  };

  const guard = <T>(v: T | symbol): T | null => (isCancel(v) ? null : (v as T));

  const action = guard(await select({
    message: "History:",
    options: [
      ...entries.map(([id, e]) => ({ value: `entry:${id}`, label: label([id, e]) })),
      { value: "clear-all", label: dim("── Clear all history ──") },
    ],
  })) as string | null;
  if (action === null) return;

  if (action === "clear-all") {
    const sure = guard(await confirm({ message: "Delete all watch history?", initialValue: false })) as boolean | null;
    if (sure) { await clearAllHistory(); log.success("Watch history cleared."); }
    return;
  }

  if (action.startsWith("entry:")) {
    const tmdbId = action.slice(6);
    const entry  = all[tmdbId];
    if (!entry) return;

    const act = guard(await select({
      message: `${entry.title}:`,
      options: [
        { value: "remove", label: "Remove from history" },
        { value: "back",   label: "Back" },
      ],
    })) as "remove" | "back" | null;

    if (act === "remove") {
      await clearEntry(tmdbId);
      log.success(`Removed "${entry.title}" from history.`);
    }
  }
}
