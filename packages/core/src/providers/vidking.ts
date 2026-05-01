import { defineProviderManifest } from "./factory";

export const VIDKING_PROVIDER_ID = "vidking" as const;

export const vidkingManifest = defineProviderManifest({
  id: VIDKING_PROVIDER_ID,
  displayName: "VidKing",
  description: "VidKing / Videasy direct resolver (recommended)",
  domain: "videasy.net",
  recommended: true,
  mediaKinds: ["movie", "series"],
  capabilities: ["source-resolve", "subtitle-resolve", "multi-source", "quality-ranked"],
  runtimePorts: [
    {
      runtime: "node-fetch",
      operations: ["resolve-stream", "resolve-subtitles", "health-check"],
      browserSafe: false,
      relaySafe: false,
      localOnly: true,
    },
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
  notes: [
    "Current CLI implementation tries the direct api.videasy.net payload/decryption path first.",
    "Playwright remains declared only as a fallback when direct payload extraction fails.",
    "Do not mark browser-safe because the implementation depends on local WASM assets and Node runtime behavior.",
  ],
});
