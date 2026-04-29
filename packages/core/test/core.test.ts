import { expect, test } from "bun:test";

import {
  adaptCliStreamResult,
  assertManifestHasRuntimePort,
  createProviderCachePolicy,
  vidkingManifest,
} from "../src/index";

test("vidking manifest declares capability, cache, and runtime boundaries", () => {
  expect(vidkingManifest.id).toBe("vidking");
  expect(vidkingManifest.mediaKinds).toContain("movie");
  expect(vidkingManifest.mediaKinds).toContain("series");
  expect(vidkingManifest.capabilities).toContain("source-resolve");
  expect(vidkingManifest.cachePolicy.ttlClass).toBe("stream-manifest");

  const port = assertManifestHasRuntimePort(vidkingManifest, "playwright-lease");
  expect(port.localOnly).toBe(true);
  expect(port.browserSafe).toBe(false);
});

test("provider cache policy normalizes deterministic key parts", () => {
  const policy = createProviderCachePolicy({
    providerId: "VidKing",
    title: { id: "TMDB 438631", kind: "movie" },
    subtitleLanguage: "English",
    qualityPreference: "1080p",
  });

  expect(policy.keyParts).toEqual([
    "provider",
    "vidking",
    "movie",
    "tmdb-438631",
    "none",
    "none",
    "none",
    "english",
    "1080p",
  ]);
  expect(policy.allowStale).toBe(true);
});

test("cli stream adapter returns shared provider resolve result with trace evidence", () => {
  const cachePolicy = createProviderCachePolicy({
    providerId: "vidking",
    title: { id: "438631", kind: "movie" },
  });

  const result = adaptCliStreamResult({
    providerId: "vidking",
    title: { id: "438631", kind: "movie", title: "Dune" },
    stream: {
      url: "https://cdn.example/master.m3u8",
      headers: { referer: "https://vidking.net" },
      subtitle: "https://cdn.example/en.vtt",
      subtitleList: [{ url: "https://cdn.example/en.vtt", language: "en", display: "English" }],
      subtitleSource: "provider",
    },
    cachePolicy,
    runtime: "playwright-lease",
    cacheHit: true,
  });

  expect(result.providerId).toBe("vidking");
  expect(result.streams[0]?.protocol).toBe("hls");
  expect(result.subtitles[0]?.language).toBe("en");
  expect(result.trace.cacheHit).toBe(true);
  expect(result.trace.runtime).toBe("playwright-lease");
  expect(result.trace.steps.map((step) => step.stage)).toContain("runtime");
});
