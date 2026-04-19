// VidKing embed URL params:
//   autoPlay=true         → fires immediately, no fake click needed
//   episodeSelector=false → hides built-in ep picker (we own navigation)
//   nextEpisode=false     → hides overlay next-ep button

export function buildUrl(
  provider: string,
  id: string,
  type: "movie" | "series",
  season: number,
  episode: number,
): string {
  if (type === "movie") {
    return provider === "vidking"
      ? `https://www.vidking.net/embed/movie/${id}?autoPlay=true`
      : `https://www.cineby.sc/movie/${id}?play=true`;
  }

  return provider === "vidking"
    ? `https://www.vidking.net/embed/tv/${id}/${season}/${episode}?autoPlay=true&episodeSelector=false&nextEpisode=false`
    : `https://www.cineby.sc/tv/${id}/${season}/${episode}?play=true`;
}
