import { expect, test } from "bun:test";

import {
  providerFailureSchema,
  providerHealthSchema,
  resolveTraceSchema,
  streamCandidateSchema,
} from "../src/index";

const cachePolicy = {
  ttlClass: "stream-manifest",
  ttlMs: 120_000,
  scope: "local",
  keyParts: ["vidking", "movie", "tmdb:1"],
} as const;

test("stream candidate schema accepts serialized cache-safe shape", () => {
  const parsed = streamCandidateSchema.parse({
    id: "stream-1",
    providerId: "vidking",
    url: "https://example.com/master.m3u8",
    protocol: "hls",
    container: "m3u8",
    confidence: 0.92,
    cachePolicy,
  });

  expect(parsed.protocol).toBe("hls");
  expect(parsed.cachePolicy.ttlClass).toBe("stream-manifest");
});

test("stream candidate schema rejects impossible confidence", () => {
  expect(() =>
    streamCandidateSchema.parse({
      id: "stream-1",
      providerId: "vidking",
      protocol: "hls",
      confidence: 2,
      cachePolicy,
    }),
  ).toThrow();
});

test("resolve trace schema validates provider failures", () => {
  const failure = providerFailureSchema.parse({
    providerId: "anikai",
    code: "blocked",
    message: "Cloudflare challenge blocked raw fetch",
    retryable: true,
    at: "2026-04-29T00:00:00.000Z",
  });

  const trace = resolveTraceSchema.parse({
    id: "trace-1",
    startedAt: "2026-04-29T00:00:00.000Z",
    title: {
      id: "anilist:1",
      kind: "anime",
      title: "Example",
    },
    cacheHit: false,
    steps: [],
    failures: [failure],
  });

  expect(trace.failures[0]?.code).toBe("blocked");
});

test("provider health schema keeps rates bounded", () => {
  expect(() =>
    providerHealthSchema.parse({
      providerId: "vidking",
      status: "healthy",
      checkedAt: "2026-04-29T00:00:00.000Z",
      recentFailureRate: 1.4,
    }),
  ).toThrow();
});
