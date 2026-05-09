import { expect, test } from "bun:test";

import { createVidKingProvider } from "@/services/providers/definitions/vidking";
import type { ProviderDeps } from "@/services/providers/Provider";
import { createVidkingResultFromPayload } from "@kunai/providers";

function createProviderDeps(): ProviderDeps {
  return {
    logger: {
      debug() {},
      info() {},
      warn() {},
      error() {},
      fatal() {},
      child() {
        return this;
      },
    },
    tracer: {
      async span(_name, fn) {
        return fn({
          id: "span-1",
          name: "test",
          startTime: 0,
          setAttribute() {},
          addEvent() {},
          end() {},
        });
      },
      getCurrentTrace() {
        return null;
      },
      getCurrentSpan() {
        return null;
      },
    },
    config: {
      defaultMode: "series",
      provider: "vidking",
      animeProvider: "allanime",
      subLang: "en",
      animeLang: "sub",
      animeLanguageProfile: { audio: "original", subtitle: "en" },
      seriesLanguageProfile: { audio: "original", subtitle: "none" },
      movieLanguageProfile: { audio: "original", subtitle: "en" },
      animeTitlePreference: "english",
      headless: true,
      showMemory: false,
      autoNext: true,
      resumeStartChoicePrompt: true,
      skipRecap: true,
      skipIntro: true,
      skipPreview: true,
      skipCredits: true,
      footerHints: "minimal",
      quitNearEndBehavior: "continue",
      quitNearEndThresholdMode: "credits-or-90-percent",
      mpvKunaiScriptPath: "",
      mpvKunaiScriptOpts: {},
      mpvInProcessStreamReconnect: true,
      mpvInProcessStreamReconnectMaxAttempts: 3,
      discoverShowOnStartup: false,
      discoverMode: "auto",
      discoverItemLimit: 24,
      recommendationRailEnabled: true,
      minimalMode: false,
      presenceProvider: "off",
      presencePrivacy: "full",
      presenceDiscordClientId: "",
      downloadsEnabled: false,
      onboardingVersion: 0,
      downloadPath: "",
      downloadOnboardingDismissed: false,
      getRaw() {
        return this;
      },
      async update() {},
      async save() {},
      async reset() {},
    },
  };
}

test("vidking fails fast when the direct resolver has no playable stream", async () => {
  const provider = createVidKingProvider(createProviderDeps(), {
    resolveDirect: async () => null,
  });

  await expect(
    provider.resolveStream({
      title: { id: "438631", type: "movie", name: "Dune" },
      audioPreference: "original",
      subtitlePreference: "english",
    }),
  ).rejects.toThrow("VidKing returned no direct resolve result");
});

test("vidking resolves through the direct decode path", async () => {
  const provider = createVidKingProvider(createProviderDeps(), {
    resolveDirect: async (input) =>
      createVidkingResultFromPayload({
        input,
        payload: {
          sources: [{ url: "https://fast.speedzy.net/example/index.m3u8", quality: "1080p" }],
          subtitles: [
            {
              url: "https://cc.boopigcdn.com/example/eng-2.vtt",
              language: "English",
              label: "English",
            },
            {
              url: "https://cc.boopigcdn.com/example/spa.vtt",
              language: "Spanish",
              label: "Spanish",
            },
          ],
        },
        server: "mb-flix",
      })!,
  });

  const stream = await provider.resolveStream({
    title: { id: "1668", type: "series", name: "Friends", year: "1994" },
    episode: { season: 1, episode: 1 },
    audioPreference: "original",
    subtitlePreference: "en",
  });

  expect(stream?.subtitleSource).toBe("provider");
  expect(stream?.subtitle).toBe("https://cc.boopigcdn.com/example/eng-2.vtt");
  expect(stream?.providerResolveResult?.subtitles).toHaveLength(2);
  expect(stream?.providerResolveResult?.trace.runtime).toBe("direct-http");
});
