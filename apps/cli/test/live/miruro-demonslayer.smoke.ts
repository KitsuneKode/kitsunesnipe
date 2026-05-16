import type { TitleInfo } from "@/domain/types";

import {
  buildProviderSmokePayload,
  createProviderSmokeProfile,
  providerSmokeError,
  resolveProviderSmokeStream,
} from "./provider-smoke";

createProviderSmokeProfile("miruro");

const episode = Number(process.argv[2] ?? "1");
const clearCache = process.env.KITSUNE_CLEAR_CACHE === "1";

const { createContainer } = await import("@/container");
const container = await createContainer({ debug: true });
const provider = container.providerRegistry.get("miruro");

if (!provider) {
  console.error(JSON.stringify({ ok: false, stage: "provider", reason: "missing_miruro" }));
  process.exit(1);
}

if (clearCache) {
  await container.cacheStore.clear();
}

const title: TitleInfo = {
  id: "101922",
  type: "series",
  name: "Demon Slayer: Kimetsu no Yaiba",
};

let resolveError: unknown = null;
let failureCodes: readonly string[] = [];
const { stream } = await resolveProviderSmokeStream({
  container,
  providerId: "miruro",
  mode: "anime",
  request: {
    title,
    episode: { season: 1, episode },
    audioPreference: container.config.animeLanguageProfile.audio,
    subtitlePreference: container.config.animeLanguageProfile.subtitle,
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
    provider: "miruro",
    title,
    season: 1,
    episode,
    stream,
  }),
  ...(resolveError ? providerSmokeError(resolveError) : {}),
  failureCodes,
  animeLang: container.config.animeLang,
  cacheCleared: clearCache,
};

console.log(JSON.stringify(payload, null, 2));

if (!stream?.url) {
  process.exit(1);
}
