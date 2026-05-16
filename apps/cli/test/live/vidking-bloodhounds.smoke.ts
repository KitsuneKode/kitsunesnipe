import type { TitleInfo } from "@/domain/types";

import {
  buildProviderSmokePayload,
  createProviderSmokeProfile,
  providerSmokeError,
  resolveProviderSmokeStream,
} from "./provider-smoke";

createProviderSmokeProfile("vidking");

const season = Number(process.argv[2] ?? "1");
const episode = Number(process.argv[3] ?? "2");
const clearCache = process.env.KITSUNE_CLEAR_CACHE === "1";

const { createContainer } = await import("@/container");
const container = await createContainer({ debug: true });
const provider = container.providerRegistry.get("vidking");

if (!provider) {
  console.error(JSON.stringify({ ok: false, stage: "provider", reason: "missing_vidking" }));
  process.exit(1);
}

if (clearCache) {
  await container.cacheStore.clear();
}

const title: TitleInfo = {
  id: "127529",
  type: "series",
  name: "Bloodhounds",
};

let resolveError: unknown = null;
let failureCodes: readonly string[] = [];
const { stream } = await resolveProviderSmokeStream({
  container,
  providerId: "vidking",
  mode: "series",
  request: {
    title,
    episode: { season, episode },
    audioPreference: container.config.seriesLanguageProfile.audio,
    subtitlePreference: container.config.seriesLanguageProfile.subtitle,
  },
})
  .then((resolved) => {
    failureCodes = resolved.result.failures.map((failure) => failure.code);
    return resolved;
  })
  .catch((error) => {
    resolveError = error;
    return { stream: null };
  });

const payload = {
  ...buildProviderSmokePayload({
    provider: "vidking",
    title,
    season,
    episode,
    stream,
  }),
  ...(resolveError ? providerSmokeError(resolveError) : {}),
  failureCodes,
  provider: "vidking",
  subtitleUrl: stream?.subtitle ?? null,
  subtitleSource: stream?.subtitleSource ?? null,
  subtitleEvidence: stream?.subtitleEvidence ?? null,
  cacheCleared: clearCache,
};

console.log(JSON.stringify(payload, null, 2));

if (!stream?.url) {
  process.exit(1);
}
