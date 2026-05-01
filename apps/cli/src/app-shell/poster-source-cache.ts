type PosterSourceEntry = {
  readonly url: string;
  readonly data: ArrayBuffer;
};

const sourceCache = new Map<string, PosterSourceEntry>();
const sourceInflight = new Map<string, Promise<PosterSourceEntry | null>>();
const MAX_SOURCE_CACHE = 24;

const TMDB_BASE = "https://image.tmdb.org/t/p";

function getTmdbSize(cols: number, variant: "preview" | "detail"): string {
  if (variant === "detail") return "original";
  if (cols <= 18) return "w342";
  if (cols <= 28) return "w500";
  return "original";
}

export function resolvePosterUrl(
  url: string,
  { cols = 18, variant = "preview" }: { cols?: number; variant?: "preview" | "detail" } = {},
): string {
  if (!url.startsWith("/")) return url;
  return `${TMDB_BASE}/${getTmdbSize(cols, variant)}${url}`;
}

export function clearPosterSourceCache(): void {
  sourceCache.clear();
  sourceInflight.clear();
}

function evictSourceCacheEntry(key: string): void {
  sourceCache.delete(key);
}

export async function fetchPosterSource(
  url: string | undefined,
  { cols = 18, variant = "preview" }: { cols?: number; variant?: "preview" | "detail" } = {},
): Promise<PosterSourceEntry | null> {
  if (!url) return null;
  const resolved = resolvePosterUrl(url, { cols, variant });
  const cached = sourceCache.get(resolved);
  if (cached) return cached;

  const inflight = sourceInflight.get(resolved);
  if (inflight) return inflight;

  const task = (async (): Promise<PosterSourceEntry | null> => {
    try {
      const res = await fetch(resolved, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const entry = {
        url: resolved,
        data: await res.arrayBuffer(),
      } satisfies PosterSourceEntry;
      if (sourceCache.size >= MAX_SOURCE_CACHE) {
        const first = sourceCache.keys().next().value;
        if (first) evictSourceCacheEntry(first);
      }
      sourceCache.set(resolved, entry);
      return entry;
    } catch {
      return null;
    }
  })();

  sourceInflight.set(resolved, task);
  try {
    return await task;
  } finally {
    sourceInflight.delete(resolved);
  }
}
