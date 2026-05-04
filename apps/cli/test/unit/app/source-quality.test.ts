import { expect, test } from "bun:test";

import type { StreamInfo } from "@/domain/types";
import {
  applyPreferredStreamSelection,
  buildQualityPickerOptions,
  buildSourcePickerOptions,
} from "@/app/source-quality";

const streamWithCandidates: StreamInfo = {
  url: "https://cdn.example/1080.m3u8",
  headers: { referer: "https://example.com" },
  timestamp: Date.now(),
  providerResolveResult: {
    providerId: "vidking",
    selectedStreamId: "stream-1080",
    streams: [
      {
        id: "stream-1080",
        providerId: "vidking",
        sourceId: "source-a",
        protocol: "hls",
        qualityLabel: "1080p",
        qualityRank: 1080,
        url: "https://cdn.example/1080.m3u8",
        headers: { referer: "https://example.com" },
        confidence: 0.9,
        cachePolicy: {
          ttlClass: "stream-manifest",
          scope: "local",
          keyParts: [],
        },
      },
      {
        id: "stream-720",
        providerId: "vidking",
        sourceId: "source-a",
        protocol: "hls",
        qualityLabel: "720p",
        qualityRank: 720,
        url: "https://cdn.example/720.m3u8",
        headers: { referer: "https://example.com" },
        confidence: 0.9,
        cachePolicy: {
          ttlClass: "stream-manifest",
          scope: "local",
          keyParts: [],
        },
      },
      {
        id: "stream-480-source-b",
        providerId: "vidking",
        sourceId: "source-b",
        protocol: "hls",
        qualityLabel: "480p",
        qualityRank: 480,
        url: "https://cdn.example/source-b-480.m3u8",
        headers: { referer: "https://example.com" },
        confidence: 0.9,
        cachePolicy: {
          ttlClass: "stream-manifest",
          scope: "local",
          keyParts: [],
        },
      },
    ],
    sources: [
      {
        id: "source-a",
        providerId: "vidking",
        kind: "mirror",
        status: "selected",
        confidence: 0.9,
      },
      {
        id: "source-b",
        providerId: "vidking",
        kind: "mirror",
        status: "available",
        confidence: 0.8,
      },
    ],
    subtitles: [],
    trace: {
      id: "trace-1",
      startedAt: new Date().toISOString(),
      cacheHit: false,
      title: {
        id: "1",
        kind: "series",
        title: "Demo",
      },
      steps: [],
      failures: [],
    },
    failures: [],
  },
};

test("buildSourcePickerOptions includes current source label", () => {
  const options = buildSourcePickerOptions(streamWithCandidates);
  expect(options[0]?.label).toContain("current");
  expect(options.map((option) => option.value)).toEqual(["source-a", "source-b"]);
});

test("buildQualityPickerOptions sorts by highest quality first", () => {
  const options = buildQualityPickerOptions(streamWithCandidates);
  expect(options.map((option) => option.value)).toEqual([
    "stream-1080",
    "stream-720",
    "stream-480-source-b",
  ]);
});

test("applyPreferredStreamSelection prefers explicit stream id override", () => {
  const next = applyPreferredStreamSelection(streamWithCandidates, {
    preferredStreamId: "stream-720",
    preferredSourceId: "source-b",
  });
  expect(next.url).toBe("https://cdn.example/720.m3u8");
  expect(next.providerResolveResult?.selectedStreamId).toBe("stream-720");
});

test("applyPreferredStreamSelection falls back to best quality in preferred source", () => {
  const next = applyPreferredStreamSelection(streamWithCandidates, {
    preferredSourceId: "source-b",
  });
  expect(next.url).toBe("https://cdn.example/source-b-480.m3u8");
  expect(next.providerResolveResult?.selectedStreamId).toBe("stream-480-source-b");
});
