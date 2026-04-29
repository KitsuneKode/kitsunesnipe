import { expect, test } from "bun:test";
import type { ProviderResolveResult, ResolveTrace } from "../src/index";

test("provider resolve result requires trace and immutable candidate arrays", () => {
  const trace: ResolveTrace = {
    id: "trace-1",
    startedAt: "2026-04-29T00:00:00.000Z",
    title: {
      id: "tmdb:1",
      kind: "movie",
      title: "Example",
    },
    cacheHit: false,
    steps: [],
    failures: [],
  };

  const result: ProviderResolveResult = {
    providerId: "vidking",
    streams: [],
    subtitles: [],
    trace,
    failures: [],
  };

  expect(result.trace.id).toBe("trace-1");
  expect(result.streams.length).toBe(0);
});
