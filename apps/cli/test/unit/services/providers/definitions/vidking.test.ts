import { expect, test } from "bun:test";

import type { ProviderDeps } from "@/services/providers/Provider";
import { createVidKingProvider } from "@/services/providers/definitions/vidking";

test("vidking resolves through the core provider result adapter", async () => {
  const deps: ProviderDeps = {
    browser: {
      async scrape() {
        return {
          url: "https://cdn.example/master.m3u8",
          headers: { referer: "https://www.vidking.net" },
          subtitleList: [{ url: "https://cdn.example/en.vtt", language: "en" }],
          subtitleSource: "provider",
          timestamp: 1,
        };
      },
      async isAvailable() {
        return true;
      },
    },
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
      subLang: "english",
      animeLang: "sub",
      headless: true,
      showMemory: false,
      autoNext: true,
      footerHints: "minimal",
      getRaw() {
        return this;
      },
      async update() {},
      async save() {},
      async reset() {},
    },
    playerDomains: ["vidking.net"],
  };
  const provider = createVidKingProvider(deps);

  const stream = await provider.resolveStream({
    title: { id: "438631", type: "movie", name: "Dune" },
    subLang: "english",
  });

  expect(stream?.providerResolveResult?.providerId).toBe("vidking");
  expect(stream?.providerResolveResult?.streams[0]?.protocol).toBe("hls");
  expect(stream?.providerResolveResult?.subtitles[0]?.language).toBe("en");
  expect(stream?.providerResolveResult?.trace.runtime).toBe("playwright-lease");
  expect(stream?.providerResolveResult?.cachePolicy?.keyParts).toContain("english");
});
