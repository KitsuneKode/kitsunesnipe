import { defineProviderManifest } from "./factory";

export const BITCINE_PROVIDER_ID = "bitcine" as const;

export const bitcineManifest = defineProviderManifest({
  id: BITCINE_PROVIDER_ID,
  displayName: "BitCine",
  description: "BitCine legacy Cineby mirror provider",
  domain: "bitcine.net",
  recommended: false,
  mediaKinds: ["movie", "series"],
  capabilities: ["source-resolve", "subtitle-resolve", "multi-source"],
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
      BITCINE_PROVIDER_ID,
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
  status: "experimental",
  notes: [
    "Dossier marks this as superseded by the VidKing/Videasy direct path.",
    "Keep runtime policy aligned with Cineby unless research proves divergence.",
  ],
});
