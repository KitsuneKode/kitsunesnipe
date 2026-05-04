// =============================================================================
// Stream resolve cache keys
//
// Single place for SQLite stream cache preimages used by playback and browser
// scrape paths so providers do not duplicate keying policy.
// =============================================================================

import type { TitleInfo, EpisodeInfo } from "@/domain/types";

/** Preimage for API-style resolves (hashed by CacheStore implementation). */
export function buildApiStreamResolveCacheKey(input: {
  readonly providerId: string;
  readonly title: TitleInfo;
  readonly episode: EpisodeInfo;
  readonly mode: "series" | "anime";
  readonly subLang: string;
  readonly animeLang: "sub" | "dub";
}): string {
  const { providerId, title, episode, mode, subLang, animeLang } = input;
  return `api-resolve:${providerId}:${title.type}:${title.id}:${episode.season}:${episode.episode}:${mode}:${subLang}:${animeLang}`;
}

/** Embed scrapes key the cache by canonical embed page URL (unchanged behavior). */
export function buildEmbedStreamCacheKey(embedPageUrl: string): string {
  return embedPageUrl;
}
