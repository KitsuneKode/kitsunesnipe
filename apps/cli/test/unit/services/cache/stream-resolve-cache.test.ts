import { expect, test } from "bun:test";

import {
  buildApiStreamResolveCacheKey,
  buildEmbedStreamCacheKey,
} from "@/services/cache/stream-resolve-cache";

test("buildApiStreamResolveCacheKey is stable and encodes prefs", () => {
  const title = { id: "abc", type: "series" as const, name: "X", year: "2020" };
  const episode = { season: 1, episode: 3 };
  const a = buildApiStreamResolveCacheKey({
    providerId: "allanime",
    title,
    episode,
    mode: "anime",
    subLang: "en",
    animeLang: "sub",
  });
  const b = buildApiStreamResolveCacheKey({
    providerId: "allanime",
    title,
    episode,
    mode: "anime",
    subLang: "en",
    animeLang: "dub",
  });
  expect(a).toContain("anime:en:sub");
  expect(b).toContain("anime:en:dub");
  expect(a).not.toEqual(b);
});

test("buildEmbedStreamCacheKey preserves embed URL", () => {
  const url = "https://example.com/embed/123";
  expect(buildEmbedStreamCacheKey(url)).toBe(url);
});
