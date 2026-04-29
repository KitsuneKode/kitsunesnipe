import type { CoreProviderManifest } from "@kunai/core";
import type { EpisodeIdentity, TitleIdentity } from "@kunai/types";
import type {
  ContentType,
  EpisodeInfo,
  ProviderCapabilities,
  ProviderMetadata,
  ShellMode,
  TitleInfo,
} from "@/domain/types";

export function manifestToProviderMetadata(
  manifest: CoreProviderManifest,
  overrides: Partial<ProviderMetadata> = {},
): ProviderMetadata {
  return {
    id: manifest.id,
    name: manifest.displayName,
    description: manifest.description,
    recommended: manifest.recommended,
    isAnimeProvider: manifest.mediaKinds.includes("anime"),
    domain: manifest.domain,
    ...overrides,
  };
}

export function manifestToProviderCapabilities(
  manifest: CoreProviderManifest,
): ProviderCapabilities {
  return {
    contentTypes: manifest.mediaKinds.filter(isCliContentType),
  };
}

export function titleToCoreIdentity(title: TitleInfo, mode: ShellMode): TitleIdentity {
  const kind = mode === "anime" ? "anime" : title.type;

  return {
    id: title.id,
    kind,
    title: title.name,
    year: title.year ? Number.parseInt(title.year, 10) || undefined : undefined,
    tmdbId: kind === "anime" ? undefined : title.id,
    anilistId: kind === "anime" ? title.id : undefined,
  };
}

export function episodeToCoreIdentity(
  episode: EpisodeInfo | undefined,
): EpisodeIdentity | undefined {
  if (!episode) {
    return undefined;
  }

  return {
    season: episode.season,
    episode: episode.episode,
    title: episode.name,
    airDate: episode.airDate,
  };
}

function isCliContentType(kind: string): kind is ContentType {
  return kind === "movie" || kind === "series";
}
