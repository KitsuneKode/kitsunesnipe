// =============================================================================
// VidKing Provider Adapter
// =============================================================================

import type { ProviderCapabilities, ProviderMetadata, StreamInfo, TitleInfo } from "@/domain/types";
import { adaptCliStreamResult, createProviderCachePolicy, vidkingManifest } from "@kunai/core";
import type { Provider, ProviderDeps, StreamRequest } from "../Provider";
import {
  episodeToCoreIdentity,
  manifestToProviderCapabilities,
  manifestToProviderMetadata,
  titleToCoreIdentity,
} from "../core-manifest-adapter";

export class VidKingProvider implements Provider {
  readonly metadata: ProviderMetadata = manifestToProviderMetadata(vidkingManifest);

  readonly capabilities: ProviderCapabilities = manifestToProviderCapabilities(vidkingManifest);

  constructor(private deps: ProviderDeps) {}

  canHandle(title: TitleInfo): boolean {
    return title.type === "movie" || title.type === "series";
  }

  async resolveStream(request: StreamRequest, signal?: AbortSignal): Promise<StreamInfo | null> {
    const url =
      request.title.type === "movie"
        ? `https://www.vidking.net/embed/movie/${request.title.id}?autoPlay=true`
        : `https://www.vidking.net/embed/tv/${request.title.id}/${request.episode!.season}/${request.episode!.episode}?autoPlay=true&episodeSelector=false&nextEpisode=false`;

    const stream = await this.deps.browser.scrape({
      url,
      needsClick: false, // autoPlay=true handles it
      subLang: request.subLang,
      signal,
      tmdbId: request.title.id,
      titleType: request.title.type,
      season: request.episode?.season,
      episode: request.episode?.episode,
      playerDomains: this.deps.playerDomains,
    });

    if (!stream) {
      return null;
    }

    const title = titleToCoreIdentity(request.title, "series");
    const episode = episodeToCoreIdentity(request.episode);
    const cachePolicy = createProviderCachePolicy({
      providerId: vidkingManifest.id,
      title,
      episode,
      subtitleLanguage: request.subLang,
    });

    return {
      ...stream,
      providerResolveResult: adaptCliStreamResult({
        providerId: vidkingManifest.id,
        title,
        episode,
        stream,
        cachePolicy,
        runtime: "playwright-lease",
      }),
    };
  }
}

// Factory for registry
export function createVidKingProvider(deps: ProviderDeps): Provider {
  return new VidKingProvider(deps);
}
