import { describe, expect, test } from "bun:test";

import { resolveNextHistoryEpisode } from "@/session-flow";

describe("resolveNextHistoryEpisode", () => {
  test("crosses into the next season when the current one is finished", async () => {
    const next = await resolveNextHistoryEpisode({
      currentId: "demo-series",
      isAnime: false,
      history: {
        title: "Demo Series",
        type: "series",
        season: 1,
        episode: 7,
        timestamp: 1200,
        duration: 1200,
        completed: true,
        provider: "vidking",
        watchedAt: "2026-04-30T00:00:00.000Z",
      },
      loaders: {
        loadSeasons: async () => ({
          seasons: [1, 2],
          episodes: [],
        }),
        loadEpisodes: async (_titleId, season) =>
          season === 1
            ? [
                { number: 6, name: "Six", airDate: "2024", overview: "Six" },
                { number: 7, name: "Seven", airDate: "2024", overview: "Seven" },
              ]
            : [{ number: 1, name: "Season Two", airDate: "2025", overview: "Return" }],
      },
    });

    expect(next).toEqual({ season: 2, episode: 1 });
  });

  test("uses anime catalog data before falling back to a blind increment", async () => {
    const next = await resolveNextHistoryEpisode({
      currentId: "demo-anime",
      isAnime: true,
      history: {
        title: "Demo Anime",
        type: "series",
        season: 1,
        episode: 11,
        timestamp: 1200,
        duration: 1200,
        completed: true,
        provider: "allanime",
        watchedAt: "2026-04-30T00:00:00.000Z",
      },
      animeEpisodeCount: 12,
      animeEpisodes: [
        { index: 1, label: "Episode 1" },
        { index: 11, label: "Episode 11" },
        { index: 12, label: "Episode 12" },
      ],
      loaders: {
        loadSeasons: async () => ({ seasons: [], episodes: [] }),
        loadEpisodes: async () => [],
      },
    });

    expect(next).toEqual({ season: 1, episode: 12 });
  });
});
