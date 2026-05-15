import { describe, expect, test } from "bun:test";

import {
  selectContinueHistoryEntry,
  selectLocalContinueCandidate,
  titleFromHistorySelection,
} from "@/app/launch-entry";
import type { HistoryEntry } from "@/services/persistence/HistoryStore";

function history(patch: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    title: "Demo Show",
    type: "series",
    season: 1,
    episode: 2,
    timestamp: 600,
    duration: 1800,
    completed: false,
    provider: "vidsrc",
    watchedAt: "2026-05-14T08:00:00.000Z",
    ...patch,
  };
}

describe("launch entry helpers", () => {
  test("selectContinueHistoryEntry picks the newest unfinished local history target", () => {
    const selected = selectContinueHistoryEntry({
      "finished-newer": history({
        title: "Finished",
        completed: true,
        watchedAt: "2026-05-14T10:00:00.000Z",
      }),
      "unfinished-older": history({
        title: "Older",
        watchedAt: "2026-05-14T07:00:00.000Z",
      }),
      "unfinished-newer": history({
        title: "Newer",
        watchedAt: "2026-05-14T09:00:00.000Z",
      }),
    });

    expect(selected).toEqual({
      titleId: "unfinished-newer",
      entry: expect.objectContaining({ title: "Newer" }),
    });
  });

  test("titleFromHistorySelection rebuilds a playback title without provider work", () => {
    expect(
      titleFromHistorySelection({
        titleId: "tmdb:1399",
        entry: history({ title: "Game of Thrones", type: "series" }),
      }),
    ).toEqual({
      id: "tmdb:1399",
      type: "series",
      name: "Game of Thrones",
    });
  });

  test("selectLocalContinueCandidate only picks an exact ready local episode", () => {
    const selection = {
      titleId: "solo",
      entry: history({ title: "Solo Leveling", season: 1, episode: 4 }),
    };

    const picked = selectLocalContinueCandidate(selection, [
      {
        status: "ready",
        job: {
          id: "wrong-episode",
          titleId: "solo",
          titleName: "Solo Leveling",
          mediaKind: "series",
          providerId: "allanime",
          streamUrl: "https://example/wrong.m3u8",
          headers: {},
          status: "completed",
          progressPercent: 100,
          outputPath: "/downloads/solo-s01e03.mp4",
          tempPath: "/downloads/solo.tmp",
          retryCount: 0,
          attempt: 1,
          maxAttempts: 3,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          season: 1,
          episode: 3,
        },
      },
      {
        status: "missing",
        job: {
          id: "broken",
          titleId: "solo",
          titleName: "Solo Leveling",
          mediaKind: "series",
          providerId: "allanime",
          streamUrl: "https://example/broken.m3u8",
          headers: {},
          status: "completed",
          progressPercent: 100,
          outputPath: "/downloads/solo-s01e04.mp4",
          tempPath: "/downloads/solo.tmp",
          retryCount: 0,
          attempt: 1,
          maxAttempts: 3,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          season: 1,
          episode: 4,
        },
      },
      {
        status: "ready",
        job: {
          id: "ready",
          titleId: "solo",
          titleName: "Solo Leveling",
          mediaKind: "series",
          providerId: "allanime",
          streamUrl: "https://example/ready.m3u8",
          headers: {},
          status: "completed",
          progressPercent: 100,
          outputPath: "/downloads/solo-s01e04-ready.mp4",
          tempPath: "/downloads/solo.tmp",
          retryCount: 0,
          attempt: 1,
          maxAttempts: 3,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          season: 1,
          episode: 4,
        },
      },
    ]);

    expect(picked?.job.id).toBe("ready");
  });
});
