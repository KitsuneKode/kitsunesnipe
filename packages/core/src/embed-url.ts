import type { MediaKind } from "@kunai/types";

type PlayableMediaKind = Extract<MediaKind, "movie" | "series">;

export interface ProviderEmbedUrlInput {
  readonly id: string;
  readonly mediaKind: PlayableMediaKind;
  readonly season?: number;
  readonly episode?: number;
}

function requireSeriesEpisode(input: ProviderEmbedUrlInput, providerName: string) {
  if (input.mediaKind !== "series") return null;
  if (input.season === undefined || input.episode === undefined) {
    throw new Error(`${providerName} requires season and episode for series embeds`);
  }

  return {
    season: input.season,
    episode: input.episode,
  };
}

export function buildVidkingEmbedUrl(input: ProviderEmbedUrlInput): string {
  const base = "https://www.vidking.net";
  const seriesEpisode = requireSeriesEpisode(input, "VidKing");

  if (!seriesEpisode) {
    return `${base}/embed/movie/${input.id}?autoPlay=true`;
  }

  return `${base}/embed/tv/${input.id}/${seriesEpisode.season}/${seriesEpisode.episode}?autoPlay=true&episodeSelector=false&nextEpisode=false`;
}

export function buildCinebyEmbedUrl(input: ProviderEmbedUrlInput): string {
  const base = "https://www.cineby.sc";
  const seriesEpisode = requireSeriesEpisode(input, "Cineby");

  if (!seriesEpisode) {
    return `${base}/movie/${input.id}?play=true`;
  }

  return `${base}/tv/${input.id}/${seriesEpisode.season}/${seriesEpisode.episode}?play=true`;
}

export function buildBitcineEmbedUrl(input: ProviderEmbedUrlInput): string {
  const base = "https://www.bitcine.net";
  const seriesEpisode = requireSeriesEpisode(input, "BitCine");

  if (!seriesEpisode) {
    return `${base}/movie/${input.id}?play=true`;
  }

  return `${base}/tv/${input.id}/${seriesEpisode.season}/${seriesEpisode.episode}?play=true`;
}
