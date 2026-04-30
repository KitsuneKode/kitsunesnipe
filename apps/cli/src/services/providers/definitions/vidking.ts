// =============================================================================
// VidKing Provider Adapter
// =============================================================================

import type { ProviderCapabilities, ProviderMetadata, StreamInfo, TitleInfo } from "@/domain/types";
import { buildVidkingEmbedUrl, vidkingManifest } from "@kunai/core";
import { resolveSubtitlesByTmdbId } from "@/subtitle";
import type { Provider, ProviderDeps, StreamRequest } from "../Provider";
import {
  attachProviderResolveResult,
  manifestToProviderCapabilities,
  manifestToProviderMetadata,
} from "../core-manifest-adapter";
import { resolveVidkingDirect } from "./vidking-direct";

export class VidKingProvider implements Provider {
  readonly metadata: ProviderMetadata = manifestToProviderMetadata(vidkingManifest);

  readonly capabilities: ProviderCapabilities = manifestToProviderCapabilities(vidkingManifest);

  constructor(
    private deps: ProviderDeps,
    private internals: {
      resolveDirect?: typeof resolveVidkingDirect;
      resolveWyzie?: typeof resolveSubtitlesByTmdbId;
    } = {},
  ) {}

  canHandle(title: TitleInfo): boolean {
    return title.type === "movie" || title.type === "series";
  }

  async resolveStream(request: StreamRequest, signal?: AbortSignal): Promise<StreamInfo | null> {
    const resolveDirect = this.internals.resolveDirect ?? resolveVidkingDirect;
    const resolveWyzie = this.internals.resolveWyzie ?? resolveSubtitlesByTmdbId;
    const url = buildVidkingEmbedUrl({
      id: request.title.id,
      mediaKind: request.title.type,
      season: request.episode?.season,
      episode: request.episode?.episode,
    });

    let stream = await resolveDirect({
      title: request.title,
      episode: request.episode,
      preferredSubLang: request.subLang,
      signal,
    });
    const resolvedDirect = Boolean(stream);

    if (
      stream &&
      request.subLang !== "none" &&
      (!stream.subtitleList?.length || !stream.subtitle)
    ) {
      const wyzie = await resolveWyzie({
        tmdbId: request.title.id,
        type: request.title.type,
        season: request.episode?.season,
        episode: request.episode?.episode,
        preferredLang: request.subLang,
      });

      if (wyzie.list.length > 0) {
        stream = {
          ...stream,
          subtitle: wyzie.selected ?? stream.subtitle,
          subtitleList: wyzie.list,
          subtitleSource: "wyzie",
          subtitleEvidence: {
            directSubtitleObserved: Boolean(stream.subtitleList?.length),
            wyzieSearchObserved: true,
            reason: wyzie.selected ? "wyzie-selected" : "wyzie-empty",
          },
        };
      }
    }

    if (!stream) {
      stream = await this.deps.browser.scrape({
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
    }

    if (!stream) {
      return null;
    }

    const runtime = resolvedDirect ? "node-fetch" : "playwright-lease";

    return attachProviderResolveResult({
      manifest: vidkingManifest,
      request,
      stream,
      mode: "series",
      runtime,
    });
  }
}

// Factory for registry
export function createVidKingProvider(
  deps: ProviderDeps,
  internals?: ConstructorParameters<typeof VidKingProvider>[1],
): Provider {
  return new VidKingProvider(deps, internals);
}
