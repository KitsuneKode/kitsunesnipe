#!/usr/bin/env bun
import { intro, outro, text, select, spinner, log, isCancel, cancel } from "@clack/prompts";
import { parseArgs } from "util";

import { searchVideasy, type SearchResult }                               from "@/search";
import { displayPoster, isKittyCompatible }                               from "@/image";
import { getHistory, saveHistory, isFinished, formatTimestamp, type HistoryEntry } from "@/history";
import { getCachedStream, cacheStream }                                   from "@/cache";
import {
  buildUrl, buildUrlById, getProvider, PROVIDER_LIST,
  PLAYWRIGHT_PROVIDERS, ANIME_PROVIDERS,
  isPlaywright, isApi,
  type Provider, type PlaywrightProvider, type ApiProvider, type ApiSearchResult,
} from "@/providers";
import { scrapeStream, type StreamData }                                  from "@/scraper";
import { launchMpv }                                                      from "@/mpv";
import { checkDeps, pickWithFzf, pickSubtitleWithFzf }                    from "@/ui";
import { loadConfig, saveConfig, loadDomainOverrides, applyDomainOverrides, type KitsuneConfig } from "@/config";
import { drawMenu, openSettings, readSingleKey, bold, cyan, dim, green, yellow } from "@/menu";
import { initLogger, dbg }                                                from "@/logger";

// =============================================================================
// 1. FLAGS
// =============================================================================
const { values } = parseArgs({
  args: Bun.argv,
  options: {
    id:            { type: "string",  short: "i" }, // TMDB / provider ID (skip search)
    search:        { type: "string",  short: "S" }, // pre-fill search query
    title:         { type: "string",  short: "T" }, // override display title in MPV
    season:        { type: "string",  short: "s" },
    episode:       { type: "string",  short: "e" },
    provider:      { type: "string",  short: "p" }, // provider ID
    type:          { type: "string",  short: "t" }, // movie | series
    "sub-lang":    { type: "string",  short: "l" }, // en | ar | fzf | none
    "no-headless": { type: "boolean", short: "H" }, // force visible browser
    "debug":       { type: "boolean", short: "d" }, // verbose debug to stderr
    "anime":       { type: "boolean", short: "a" }, // anime mode (AllAnime search)
    "attach":      { type: "boolean" },             // attach MPV to terminal (no detach)
  },
  strict: true,
  allowPositionals: true,
});

// =============================================================================
// 2. SESSION STATE
// =============================================================================
let currentId:       string;
let currentTitle:    string;
let currentSeason:   number;
let currentEpisode:  number;
let currentProvider: string;   // provider ID (resolved from config/flags)
let currentType:     "movie" | "series";
let currentSubLang:  string;
let useHeadless:     boolean;
let isAnime:         boolean;  // true → anime provider flow
let config:          KitsuneConfig;

// Pre-fetch slot — only active for Playwright providers
let prefetchedStream: { url: string; data: Promise<StreamData | null> } | null = null;

let hasFzf = true;

// =============================================================================
// 3. HELPERS
// =============================================================================

function cancelAndExit(): never { cancel("Cancelled."); process.exit(0); }
function guard<T>(v: T | symbol): T { if (isCancel(v)) cancelAndExit(); return v as T; }

process.on("SIGINT", () => { process.stdout.write("\n"); outro("See you next time 🦊"); process.exit(0); });

function buildDisplayTitle(): string {
  return currentType === "movie"
    ? currentTitle
    : `${currentTitle} - S${currentSeason}E${currentEpisode}`;
}

// Playwright embed scraper — injected into ApiProvider.resolveStream so
// hybrid providers (Braflix) can do the final embed extraction without
// importing scraper.ts themselves (avoids circular dependencies).
const EMBED_PROVIDER: PlaywrightProvider = {
  kind: "playwright", id: "embed", name: "Embed", description: "",
  domain: "", recommended: false,
  movieUrl:  () => "", seriesUrl: () => "",
  needsClick: false, titleSource: "page-title",
};

const embedScraper = (embedUrl: string): Promise<StreamData | null> =>
  scrapeStream(EMBED_PROVIDER, embedUrl, currentSubLang, useHeadless);

// =============================================================================
// 4. STREAM RESOLUTION
// =============================================================================

// Playwright path: pre-fetch → disk cache → fresh scrape.
async function resolvePlaywrightStream(
  provider:  PlaywrightProvider,
  targetUrl: string,
): Promise<StreamData | null> {
  if (prefetchedStream?.url === targetUrl) {
    const s = spinner();
    s.start("Awaiting pre-fetched stream…");
    const data = await prefetchedStream.data;
    prefetchedStream = null;
    s.stop(data ? "Stream ready." : "Pre-fetch missed — scraping fresh.");
    if (data) return data;
  } else if (prefetchedStream) {
    prefetchedStream = null; // stale
  }

  const cached = await getCachedStream(targetUrl);
  if (cached) { log.success("Cache hit — skipping scraper."); return cached; }

  const s = spinner();
  s.start("Scraping stream…");
  const data = await scrapeStream(provider, targetUrl, currentSubLang, useHeadless);
  s.stop(data ? "Stream found." : "Failed to find stream.");
  return data;
}

// API path: provider owns the full pipeline.
async function resolveApiStream(provider: ApiProvider): Promise<StreamData | null> {
  const s = spinner();
  s.start(`Resolving via ${provider.name}…`);
  const data = await provider.resolveStream(
    currentId, currentType, currentSeason, currentEpisode,
    { subLang: currentSubLang, animeLang: config.animeLang, embedScraper },
  );
  s.stop(data ? "Stream found." : `${provider.name} could not resolve a stream.`);
  return data;
}

// Top-level dispatcher — routes by provider kind.
async function resolveStream(): Promise<StreamData | null> {
  const provider = getProvider(currentProvider);

  if (isPlaywright(provider)) {
    const url = buildUrl(provider, currentId, currentType, currentSeason, currentEpisode);
    return resolvePlaywrightStream(provider, url);
  }
  return resolveApiStream(provider as ApiProvider);
}

function startPrefetch() {
  const provider = getProvider(currentProvider);
  if (!isPlaywright(provider)) return; // API providers don't use URL-based pre-fetch
  const nextUrl = buildUrl(provider, currentId, currentType, currentSeason, currentEpisode + 1);
  if (prefetchedStream?.url === nextUrl) return;
  prefetchedStream = { url: nextUrl, data: scrapeStream(provider, nextUrl, currentSubLang, true) };
}

// =============================================================================
// 5. MAIN
// =============================================================================
(async () => {
  intro(`${bold("KitsuneSnipe")} 🦊`);

  // ── Debug ─────────────────────────────────────────────────────────────────
  const debugEnabled = !!(values.debug) || process.env.KITSUNE_DEBUG === "1";
  initLogger(debugEnabled);
  if (debugEnabled) log.warn("Debug mode on — verbose JSON lines to stderr  (pipe: 2>&1 | jq)");
  dbg("main", "session start", { debugEnabled });

  // ── Deps ──────────────────────────────────────────────────────────────────
  const deps = await checkDeps();
  hasFzf = deps.fzf;

  // ── Config + domain overrides ─────────────────────────────────────────────
  config = await loadConfig();
  applyDomainOverrides(await loadDomainOverrides());

  isAnime        = !!(values.anime);
  currentSubLang = (values["sub-lang"] as string) ?? config.subLang;
  useHeadless    = values["no-headless"] ? false : config.headless;

  // Anime mode defaults to the anime provider; normal mode to the regular provider.
  if (values.provider) {
    currentProvider = values.provider as string;
    isAnime = isAnime || (getProvider(currentProvider).kind === "api");
  } else {
    currentProvider = isAnime ? config.animeProvider : config.provider;
  }

  // Validate — throws early with a clear message if ID is wrong.
  getProvider(currentProvider);

  const needsChromium = isPlaywright(getProvider(currentProvider));
  log.info(
    `${dim("Provider")} ${cyan(currentProvider)}` +
    (needsChromium ? "" : `  ${dim("(no browser needed)")}`) +
    `  ${dim("Subs")} ${cyan(currentSubLang)}` +
    (isAnime ? `  ${dim("Anime")} ${cyan(config.animeLang)}` : "") +
    `  ${dim("· [c] to change")}`,
  );

  // ── Search / direct ID ────────────────────────────────────────────────────
  let picked: SearchResult | null         = null;
  let apiPicked: ApiSearchResult | null   = null;

  if (values.id) {
    currentId    = values.id as string;
    currentType  = (values.type as "movie" | "series") ?? "series";
    currentTitle = (values.title as string) ?? "Unknown";
    picked = { id: currentId, type: currentType, title: currentTitle, year: "?", overview: "", posterPath: null };
  } else if (isAnime) {
    // ── Anime search (provider-native GraphQL) ───────────────────────────────
    const rawQuery = (values.search as string) ||
      (guard(await text({ message: "Search anime:", placeholder: "Demon Slayer" })) as string);

    const provider = getProvider(currentProvider);
    if (!isApi(provider)) throw new Error(`${currentProvider} is not an API provider`);

    const s = spinner();
    s.start("Searching AllAnime…");
    let animeResults: ApiSearchResult[] = [];
    try {
      animeResults = await provider.search(rawQuery, { animeLang: config.animeLang });
      s.stop(`${animeResults.length} results`);
    } catch {
      s.stop("Search failed.");
      log.error("Could not reach AllAnime API. Check your connection.");
      process.exit(1);
    }

    if (animeResults.length === 0) { log.error("No results found."); process.exit(1); }

    const fmt = (r: ApiSearchResult) =>
      `${r.title}${r.epCount ? ` (${r.epCount} eps)` : ""}${r.year ? ` · ${r.year}` : ""}`;

    apiPicked = await pickWithFzf(animeResults, fmt, { prompt: "Select anime", hasFzf });
    if (!apiPicked) cancelAndExit();

    currentId    = apiPicked.id;
    currentType  = apiPicked.type;
    currentTitle = (values.title as string) || apiPicked.title;
  } else {
    // ── TMDB search (videasy) ────────────────────────────────────────────────
    const rawQuery = (values.search as string) ||
      (guard(await text({ message: "Search:", placeholder: "Breaking Bad" })) as string);

    const s = spinner();
    s.start("Searching…");
    let results: SearchResult[] = [];
    try {
      results = await searchVideasy(rawQuery);
      s.stop(`${results.length} results`);
    } catch {
      s.stop("Search failed.");
      log.error("Could not reach search API. Check your connection.");
      process.exit(1);
    }

    if (results.length === 0) { log.error("No results found."); process.exit(1); }

    const fmt = (r: SearchResult) =>
      `${r.title} (${r.year}) — ${r.type === "series" ? "Series" : "Movie"}  [${r.overview}]`;

    picked = await pickWithFzf(results, fmt, { prompt: "Select title", hasFzf });
    if (!picked) cancelAndExit();

    currentId    = picked.id;
    currentType  = picked.type;
    currentTitle = (values.title as string) || picked.title;
  }

  // ── Show what was picked ──────────────────────────────────────────────────
  const typeIcon  = currentType === "movie" ? "🎬" : (isAnime ? "🌸" : "📺");
  const typeLabel = currentType === "movie" ? "Movie" : (isAnime ? "Anime" : "Series");
  log.step(`${typeIcon}  ${bold(currentTitle)}  ${dim(`(${typeLabel} · ID ${currentId})`)}`);

  // ── Poster preview (Kitty / Ghostty) ──────────────────────────────────────
  if (picked?.posterPath && isKittyCompatible()) {
    await displayPoster(picked.posterPath);
  } else if (apiPicked?.posterUrl && isKittyCompatible()) {
    await displayPoster(apiPicked.posterUrl);
  }

  // ── Episode picker (series only) ──────────────────────────────────────────
  const validateNum = (label: string) => (v: string | undefined): string | undefined => {
    const t = (v ?? "").trim();
    if (!t) return `${label} is required`;
    if (!/^\d+$/.test(t)) return "Enter a whole number  (e.g. 1, 3, 12)";
    if (parseInt(t, 10) < 1) return "Must be 1 or higher";
    return undefined;
  };

  const pickEpisode = async (initSeason: string, initEpisode: string) => {
    const s = Number(guard(await text({ message: "Season:",  initialValue: initSeason,  validate: validateNum("Season")  })));
    const e = Number(guard(await text({ message: "Episode:", initialValue: initEpisode, validate: validateNum("Episode") })));
    return { season: s, episode: e };
  };

  if (currentType === "series") {
    if (values.season || values.episode) {
      const s = parseInt((values.season  as string) ?? "1", 10);
      const e = parseInt((values.episode as string) ?? "1", 10);
      currentSeason  = Number.isFinite(s) && s >= 1 ? s : 1;
      currentEpisode = Number.isFinite(e) && e >= 1 ? e : 1;
    } else {
      const hist = await getHistory(currentId);
      if (hist) {
        const finished = isFinished(hist);
        const nextEp   = hist.episode + 1;
        const pct      = hist.duration ? Math.round((hist.timestamp / hist.duration) * 100) : 0;
        const resumeAt = formatTimestamp(hist.timestamp);

        log.info(
          finished
            ? `Last finished: ${cyan(`S${hist.season}E${hist.episode}`)}`
            : `Last watched: ${cyan(`S${hist.season}E${hist.episode}`)}  stopped at ${yellow(resumeAt)}  ${dim(`(${pct}%)`)}`,
        );

        const choice = guard(await select({
          message: "Where to start?",
          options: [
            ...(!finished ? [
              { value: "resume",  label: `Resume S${hist.season}E${hist.episode} from ${resumeAt}` },
              { value: "restart", label: `Restart S${hist.season}E${hist.episode} from the beginning` },
            ] : []),
            { value: "next", label: `Next episode  S${hist.season}E${nextEp}` },
            { value: "pick", label: "Pick season & episode…" },
          ],
          initialValue: finished ? "next" : "resume",
        })) as "resume" | "restart" | "next" | "pick";

        if (choice === "resume")       { currentSeason = hist.season; currentEpisode = hist.episode; }
        else if (choice === "restart") { currentSeason = hist.season; currentEpisode = hist.episode; }
        else if (choice === "next")    { currentSeason = hist.season; currentEpisode = nextEp; }
        else {
          const ep = await pickEpisode(String(hist.season), String(hist.episode));
          currentSeason = ep.season; currentEpisode = ep.episode;
        }
      } else {
        const ep = await pickEpisode("1", "1");
        currentSeason = ep.season; currentEpisode = ep.episode;
      }
    }
  } else {
    currentSeason = 1; currentEpisode = 1;
  }

  // =============================================================================
  // 6. PLAYBACK LOOP
  // =============================================================================
  while (true) {
    const provider = getProvider(currentProvider);

    log.step(
      currentType === "movie"
        ? `🎬  ${bold(currentTitle)}  ${dim("[" + currentProvider + "]")}`
        : `${isAnime ? "🌸" : "📺"}  ${cyan(`S${currentSeason}E${currentEpisode}`)} — ${bold(currentTitle)}  ${dim("[" + currentProvider + "]")}`,
    );

    // ── Resolve stream ─────────────────────────────────────────────────────
    let streamInfo = await resolveStream();

    // ── Auto-fallback (Playwright providers only — same TMDB ID space) ────
    if (!streamInfo && isPlaywright(provider)) {
      const fallback = PLAYWRIGHT_PROVIDERS.find((p) => p.id !== currentProvider);
      if (fallback) {
        log.warn(`${currentProvider} failed — trying ${fallback.id}…`);
        const fbUrl = buildUrl(fallback, currentId, currentType, currentSeason, currentEpisode);
        const s = spinner();
        s.start(`Scraping via ${fallback.id}…`);
        streamInfo = await scrapeStream(fallback, fbUrl, currentSubLang, useHeadless);
        s.stop(streamInfo ? `Got stream via ${fallback.id}.` : `${fallback.id} also failed.`);
      }
    }

    if (!streamInfo) {
      log.error("Could not retrieve stream. The episode may not exist or the provider is blocked.");
    } else {
      // ── Subtitles ─────────────────────────────────────────────────────────
      let finalSubtitle = streamInfo.subtitle;
      if (currentSubLang === "fzf" && streamInfo.subtitleList?.length) {
        log.info(`${streamInfo.subtitleList.length} subtitle tracks available`);
        finalSubtitle = await pickSubtitleWithFzf(streamInfo.subtitleList, { hasFzf });
      } else if (currentSubLang === "none") {
        finalSubtitle = null;
      }

      // ── Pre-fetch next episode (Playwright only) ──────────────────────────
      if (currentType === "series") startPrefetch();

      // ── Resume position ───────────────────────────────────────────────────
      let startAt = 0;
      const hist = await getHistory(currentId);
      if (hist && hist.season === currentSeason && hist.episode === currentEpisode && !isFinished(hist)) {
        startAt = hist.timestamp;
        log.info(`Resuming from ${formatTimestamp(startAt)}`);
      }

      // ── Launch MPV ─────────────────────────────────────────────────────────
      const result = await launchMpv({
        url:          streamInfo.url,
        headers:      streamInfo.headers,
        subtitle:     finalSubtitle,
        displayTitle: buildDisplayTitle(),
        startAt,
        autoNext:     config.autoNext && currentType === "series",
        attach:       !!(values.attach),
      });

      // ── Persist history ───────────────────────────────────────────────────
      if (result.watchedSeconds > 10) {
        const entry: HistoryEntry = {
          title:     currentTitle,
          type:      currentType,
          season:    currentSeason,
          episode:   currentEpisode,
          timestamp: result.watchedSeconds,
          duration:  result.duration,
          provider:  currentProvider,
          watchedAt: new Date().toISOString(),
        };
        await saveHistory(currentId, entry);
        const pct = result.duration > 0 ? Math.round((result.watchedSeconds / result.duration) * 100) : 0;
        log.success(`Saved position: ${yellow(formatTimestamp(result.watchedSeconds))} ${dim(`(${pct}%)`)}`);
      }

      // ── Auto-advance (EOF → next episode) ─────────────────────────────────
      if (result.endReason === "eof" && config.autoNext && currentType === "series") {
        log.info(`Auto-advancing to ${cyan(`S${currentSeason}E${currentEpisode + 1}`)}…`);
        currentEpisode++;
        continue;
      }
    }

    // ── Post-playback menu ───────────────────────────────────────────────
    drawMenu({
      type:       currentType,
      title:      currentTitle,
      season:     currentSeason,
      episode:    currentEpisode,
      provider:   currentProvider,
      showMemory: config.showMemory,
      isAnime,
    });

    const k = await readSingleKey();
    process.stdout.write("\n");

    if (k === "q" || k === "\x1b") {
      outro("See you next time 🦊");
      process.exit(0);
    } else if (k === "c") {
      const updated = await openSettings(config);
      if (updated) {
        const provChanged = updated.provider !== currentProvider
          || updated.animeProvider !== config.animeProvider;
        config          = updated;
        currentProvider = isAnime ? updated.animeProvider : updated.provider;
        currentSubLang  = updated.subLang;
        useHeadless     = updated.headless;
        if (provChanged) prefetchedStream = null;
      }
    } else if (k === "r") {
      // replay — same episode, loop restarts
    } else if (k === "n" && currentType === "series") {
      currentEpisode++;
    } else if (k === "p" && currentType === "series") {
      prefetchedStream = null;
      if (currentEpisode > 1) currentEpisode--;
      else log.warn("Already at episode 1.");
    } else if (k === "s" && currentType === "series") {
      prefetchedStream = null;
      currentSeason++;
      currentEpisode = 1;
    } else if (k === "o") {
      // Cycle through providers of the same kind
      prefetchedStream = null;
      const pool = isAnime ? ANIME_PROVIDERS : PLAYWRIGHT_PROVIDERS;
      const idx = pool.findIndex((p) => p.id === currentProvider);
      currentProvider = (pool[(idx + 1) % pool.length] ?? pool[0])!.id;
      log.info(`Switched to ${green(currentProvider)}`);
    }
    // Any unrecognised key replays the current episode.
  }
})();
