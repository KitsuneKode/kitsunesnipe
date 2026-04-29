import type { CoreProviderManifest } from "../provider-manifest";

export const VIDKING_PROVIDER_ID = "vidking" as const;

export const vidkingManifest = {
  id: VIDKING_PROVIDER_ID,
  displayName: "VidKing",
  description: "VidKing (recommended)",
  domain: "vidking.net",
  recommended: true,
  mediaKinds: ["movie", "series"],
  capabilities: ["source-resolve", "subtitle-resolve", "multi-source", "quality-ranked"],
  runtimePorts: [
    {
      runtime: "playwright-lease",
      operations: ["resolve-stream", "resolve-subtitles", "refresh-source", "health-check"],
      browserSafe: false,
      relaySafe: false,
      localOnly: true,
    },
  ],
  cachePolicy: {
    ttlClass: "stream-manifest",
    scope: "local",
    keyParts: [
      "provider",
      VIDKING_PROVIDER_ID,
      "media-kind",
      "title",
      "season",
      "episode",
      "subtitle",
    ],
    allowStale: true,
  },
  browserSafe: false,
  relaySafe: false,
  status: "production",
  notes: [
    "Current CLI implementation resolves VidKing through the browser scraper adapter.",
    "Do not mark browser-safe until a real 0-RAM implementation is wired into production.",
  ],
} satisfies CoreProviderManifest;
