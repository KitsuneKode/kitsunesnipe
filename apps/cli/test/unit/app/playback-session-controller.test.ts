import { describe, expect, test } from "bun:test";

import {
  resolveAutoplayAdvanceEpisode,
  resolvePlaybackResultDecision,
  resolvePostPlaybackSessionAction,
} from "@/app/playback-session-controller";
import type { EpisodeAvailability } from "@/app/playback-policy";
import type { PlaybackResult, TitleInfo } from "@/domain/types";

const seriesTitle: TitleInfo = {
  id: "1396",
  type: "series",
  name: "Breaking Bad",
};

const nextSeasonAvailability: EpisodeAvailability = {
  previousEpisode: { season: 2, episode: 4 },
  nextEpisode: { season: 3, episode: 1 },
  nextSeasonEpisode: { season: 3, episode: 1 },
};

const baseResult: PlaybackResult = {
  watchedSeconds: 1200,
  duration: 1210,
  endReason: "eof",
};

describe("resolvePlaybackResultDecision", () => {
  test("marks manual stop as interrupted autoplay pause unless the user already paused it", () => {
    expect(
      resolvePlaybackResultDecision({
        result: { ...baseResult, endReason: "quit" },
        controlAction: "stop",
        autoplayPauseReason: null,
      }),
    ).toEqual({
      autoplayPauseReason: "interrupted",
      autoplayPaused: true,
      shouldRefreshSource: false,
      shouldFallbackProvider: false,
      shouldTreatAsInterrupted: true,
    });

    expect(
      resolvePlaybackResultDecision({
        result: { ...baseResult, endReason: "quit" },
        controlAction: "stop",
        autoplayPauseReason: "user",
      }).autoplayPauseReason,
    ).toBe("user");
  });

  test("keeps refresh and fallback decisions explicit without forcing interruption", () => {
    expect(
      resolvePlaybackResultDecision({
        result: baseResult,
        controlAction: "refresh",
        autoplayPauseReason: null,
      }),
    ).toMatchObject({
      autoplayPauseReason: null,
      autoplayPaused: false,
      shouldRefreshSource: true,
      shouldFallbackProvider: false,
      shouldTreatAsInterrupted: false,
    });

    expect(
      resolvePlaybackResultDecision({
        result: baseResult,
        controlAction: "fallback",
        autoplayPauseReason: null,
      }),
    ).toMatchObject({
      autoplayPauseReason: null,
      autoplayPaused: false,
      shouldRefreshSource: false,
      shouldFallbackProvider: true,
      shouldTreatAsInterrupted: false,
    });
  });
});

describe("resolvePostPlaybackSessionAction", () => {
  test("toggle-autoplay flips between explicit user pause and active autoplay", () => {
    expect(resolvePostPlaybackSessionAction("toggle-autoplay", null)).toEqual({
      autoplayPauseReason: "user",
      autoplayPaused: true,
    });

    expect(resolvePostPlaybackSessionAction("toggle-autoplay", "user")).toEqual({
      autoplayPauseReason: null,
      autoplayPaused: false,
    });
  });

  test("resume and replay only clear interruption pauses", () => {
    expect(resolvePostPlaybackSessionAction("resume", "interrupted")).toEqual({
      autoplayPauseReason: null,
      autoplayPaused: false,
    });

    expect(resolvePostPlaybackSessionAction("replay", "user")).toEqual({
      autoplayPauseReason: "user",
      autoplayPaused: true,
    });
  });
});

describe("resolveAutoplayAdvanceEpisode", () => {
  test("advances across seasons when autoplay is active and playback finished near EOF", async () => {
    await expect(
      resolveAutoplayAdvanceEpisode({
        result: baseResult,
        title: seriesTitle,
        currentEpisode: { season: 2, episode: 5 },
        autoNextEnabled: true,
        autoplayPauseReason: null,
        availability: nextSeasonAvailability,
      }),
    ).resolves.toEqual({ season: 3, episode: 1 });
  });

  test("does not auto-advance when autoplay is paused for the session", async () => {
    await expect(
      resolveAutoplayAdvanceEpisode({
        result: baseResult,
        title: seriesTitle,
        currentEpisode: { season: 2, episode: 5 },
        autoNextEnabled: true,
        autoplayPauseReason: "interrupted",
        availability: nextSeasonAvailability,
      }),
    ).resolves.toBeNull();
  });
});
