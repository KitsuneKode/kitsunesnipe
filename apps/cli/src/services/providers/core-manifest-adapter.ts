import type { CoreProviderManifest } from "@kunai/core";
import type { ContentType, ProviderCapabilities, ProviderMetadata } from "@/domain/types";

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

function isCliContentType(kind: string): kind is ContentType {
  return kind === "movie" || kind === "series";
}
