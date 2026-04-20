// db.videasy.net is the same TMDB-format API that powers cineby + vidking.
// No API key needed. Response is identical to TMDB /search/multi.

export type SearchResult = {
  id: string;
  type: "movie" | "series";
  title: string;
  year: string;
  overview: string;
  posterPath: string | null;
};

const cache = new Map<string, SearchResult[]>();

export async function searchVideasy(query: string): Promise<SearchResult[]> {
  const key = query.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key)!;

  const url = `https://db.videasy.net/3/search/multi?language=en&page=1&query=${encodeURIComponent(query)}`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);

  const data = (await res.json()) as any;
  const results: SearchResult[] = ((data.results as any[]) ?? [])
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 12)
    .map((r) => ({
      id:         String(r.id),
      type:       (r.media_type === "tv" ? "series" : "movie") as "movie" | "series",
      title:      r.title || r.name || "Unknown",
      year:       (r.release_date || r.first_air_date || "").split("-")[0] || "?",
      overview:   (r.overview || "").slice(0, 120),
      posterPath: r.poster_path || null,
    }));

  cache.set(key, results);
  return results;
}
