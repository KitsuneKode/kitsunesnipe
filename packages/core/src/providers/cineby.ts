import { defineProviderManifest } from "./factory";

export const CINEBY_PROVIDER_ID = "cineby" as const;

export const cinebyManifest = defineProviderManifest({
  id: CINEBY_PROVIDER_ID,
  displayName: "Cineby",
  description: "Cineby legacy wrapper provider",
  domain: "cineby.sc",
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
      CINEBY_PROVIDER_ID,
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
    "Keep available as a fallback while provider migration is in progress, but do not use it as the model for the SDK provider shape.",
  ],
});
