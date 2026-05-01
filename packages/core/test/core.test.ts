import { expect, test } from "bun:test";

import {
  allanimeManifest,
  adaptCliStreamResult,
  assertRuntimeAllowed,
  assertManifestHasRuntimePort,
  bitcineManifest,
  buildBitcineEmbedUrl,
  buildCinebyEmbedUrl,
  buildVidkingEmbedUrl,
  braflixManifest,
  cinebyAnimeManifest,
  cinebyManifest,
  createProviderCachePolicy,
  createProviderRuntimeContext,
  createProviderTraceEvent,
  DEFAULT_PROVIDER_RETRY_POLICY,
  resolveWithFallback,
  vidkingManifest,
} from "../src/index";

test("vidking manifest declares capability, cache, and runtime boundaries", () => {
  expect(vidkingManifest.id).toBe("vidking");
  expect(vidkingManifest.mediaKinds).toContain("movie");
  expect(vidkingManifest.mediaKinds).toContain("series");
  expect(vidkingManifest.capabilities).toContain("source-resolve");
  expect(vidkingManifest.cachePolicy.ttlClass).toBe("stream-manifest");

  const directPort = assertManifestHasRuntimePort(vidkingManifest, "node-fetch");
  expect(directPort.operations).toContain("resolve-stream");
  expect(directPort.localOnly).toBe(true);
  expect(directPort.browserSafe).toBe(false);

  const fallbackPort = assertManifestHasRuntimePort(vidkingManifest, "playwright-lease");
  expect(fallbackPort.operations).toContain("refresh-source");
});

test("provider embed URL builders preserve production playback routes", () => {
  expect(buildVidkingEmbedUrl({ id: "438631", mediaKind: "movie" })).toBe(
    "https://www.vidking.net/embed/movie/438631?autoPlay=true",
  );
  expect(buildVidkingEmbedUrl({ id: "1396", mediaKind: "series", season: 1, episode: 5 })).toBe(
    "https://www.vidking.net/embed/tv/1396/1/5?autoPlay=true&episodeSelector=false&nextEpisode=false",
  );

  expect(buildCinebyEmbedUrl({ id: "438631", mediaKind: "movie" })).toBe(
    "https://www.cineby.sc/movie/438631?play=true",
  );
  expect(buildCinebyEmbedUrl({ id: "1396", mediaKind: "series", season: 1, episode: 5 })).toBe(
    "https://www.cineby.sc/tv/1396/1/5?play=true",
  );

  expect(buildBitcineEmbedUrl({ id: "438631", mediaKind: "movie" })).toBe(
    "https://www.bitcine.net/movie/438631?play=true",
  );
  expect(buildBitcineEmbedUrl({ id: "1396", mediaKind: "series", season: 1, episode: 5 })).toBe(
    "https://www.bitcine.net/tv/1396/1/5?play=true",
  );
});

test("provider embed URL builders reject incomplete series inputs", () => {
  expect(() => buildVidkingEmbedUrl({ id: "1396", mediaKind: "series", season: 1 })).toThrow(
    "VidKing requires season and episode",
  );
  expect(() => buildCinebyEmbedUrl({ id: "1396", mediaKind: "series", episode: 5 })).toThrow(
    "Cineby requires season and episode",
  );
  expect(() => buildBitcineEmbedUrl({ id: "1396", mediaKind: "series" })).toThrow(
    "BitCine requires season and episode",
  );
});

test("all production providers declare cache and runtime boundaries", () => {
  const manifests = [
    vidkingManifest,
    cinebyManifest,
    bitcineManifest,
    braflixManifest,
    allanimeManifest,
    cinebyAnimeManifest,
  ];

  expect(manifests.map((manifest) => manifest.id)).toEqual([
    "vidking",
    "cineby",
    "bitcine",
    "braflix",
    "allanime",
    "cineby-anime",
  ]);

  for (const manifest of manifests) {
    expect(manifest.cachePolicy.ttlClass).toBe("stream-manifest");
    expect(manifest.cachePolicy.keyParts).toContain("provider");
    expect(manifest.runtimePorts.length).toBeGreaterThan(0);
    expect(manifest.browserSafe).toBe(false);
  }
});

test("anime manifests stay visible to CLI series mode while marked as anime-capable", () => {
  expect(allanimeManifest.mediaKinds).toContain("anime");
  expect(allanimeManifest.mediaKinds).toContain("series");
  expect(cinebyAnimeManifest.mediaKinds).toContain("anime");
  expect(cinebyAnimeManifest.mediaKinds).toContain("series");
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

test("provider sdk helpers create runtime context and typed trace events", () => {
  const events: ReturnType<typeof createProviderTraceEvent>[] = [];
  const context = createProviderRuntimeContext({
    now: () => "2026-05-01T00:00:00.000Z",
    emit(event) {
      events.push(event);
    },
  });

  expect(context.retryPolicy).toEqual(DEFAULT_PROVIDER_RETRY_POLICY);

  context.emit?.(
    createProviderTraceEvent({
      now: context.now,
      type: "runtime:requested",
      providerId: "vidking",
      message: "Provider requested browser lease",
    }),
  );

  expect(events[0]).toMatchObject({
    type: "runtime:requested",
    at: "2026-05-01T00:00:00.000Z",
    providerId: "vidking",
  });
});

test("provider sdk helpers reject unavailable runtimes before provider work starts", () => {
  expect(() =>
    assertRuntimeAllowed({
      providerId: "vidking",
      runtime: "playwright-lease",
      allowedRuntimes: ["node-fetch"],
    }),
  ).toThrow("vidking requires playwright-lease");
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

test("resolveWithFallback returns the first successful provider and preserves attempts", async () => {
  const resolved = await resolveWithFallback({
    candidates: [
      {
        providerId: "first",
        preferred: true,
        async resolve() {
          return null;
        },
      },
      {
        providerId: "second",
        async resolve() {
          return {
            url: "https://cdn.example/master.m3u8",
            providerResolveResult: adaptCliStreamResult({
              providerId: "second",
              title: { id: "1", kind: "movie", title: "Example" },
              stream: { url: "https://cdn.example/master.m3u8" },
              cachePolicy: createProviderCachePolicy({
                providerId: "second",
                title: { id: "1", kind: "movie" },
              }),
              runtime: "node-fetch",
            }),
          };
        },
      },
    ],
  });

  expect(resolved.providerId).toBe("second");
  expect(resolved.stream?.url).toContain("master.m3u8");
  expect(resolved.result?.providerId).toBe("second");
  expect(resolved.attempts.map((attempt) => attempt.providerId)).toEqual(["first", "second"]);
});

test("resolveWithFallback converts thrown provider errors into structured attempts", async () => {
  const resolved = await resolveWithFallback({
    now: () => "2026-04-30T00:00:00.000Z",
    candidates: [
      {
        providerId: "broken",
        preferred: true,
        async resolve() {
          throw new Error("provider exploded");
        },
      },
    ],
  });

  expect(resolved.stream).toBeNull();
  expect(resolved.attempts[0]?.failure).toMatchObject({
    providerId: "broken",
    code: "unknown",
    message: "provider exploded",
    retryable: true,
    at: "2026-04-30T00:00:00.000Z",
  });
});
