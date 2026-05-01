import { defineProviderManifest } from "./factory";

export const CINEBY_ANIME_PROVIDER_ID = "cineby-anime" as const;

export const cinebyAnimeManifest = defineProviderManifest({
  id: CINEBY_ANIME_PROVIDER_ID,
  displayName: "Cineby Anime",
  description: "Cineby Anime legacy wrapper provider",
  domain: "cineby.sc",
  recommended: false,
  mediaKinds: ["anime", "series"],
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
    keyParts: ["provider", CINEBY_ANIME_PROVIDER_ID, "anime", "title", "episode", "subtitle"],
    allowStale: true,
  },
  browserSafe: false,
  relaySafe: false,
  status: "experimental",
  notes: [
    "Dossier marks this path as superseded by stronger anime providers such as AllAnime and future Miruro/Anikai work.",
    "Keep available as a fallback while provider migration is in progress.",
  ],
});
