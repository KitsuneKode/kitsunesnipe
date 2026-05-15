import { expect, test } from "bun:test";

import { loadCalendarResults } from "@/app/calendar-results";

test("loadCalendarResults maps releasing-today items into playable browse candidates", async () => {
  const results = await loadCalendarResults({
    stateManager: { getState: () => ({ mode: "anime" }) },
    timelineService: {
      loadReleasingToday: async () => [
        {
          source: "anilist",
          titleId: "21",
          titleName: "Frieren",
          type: "anime",
          episode: 29,
          episodeTitle: "A new journey",
          releaseAt: "2026-05-15T12:00:00.000Z",
          releasePrecision: "timestamp",
          status: "upcoming",
          posterPath: "https://img.example/frieren.jpg",
        },
      ],
    },
  } as never);

  expect(results.subtitle).toBe("1 airing today · 0 released · anime schedule");
  expect(results.results[0]).toMatchObject({
    id: "21",
    type: "series",
    title: "Frieren",
    year: "2026",
    metadataSource: "AniList calendar · airs today · timestamp",
    episodeCount: 29,
    posterPath: "https://img.example/frieren.jpg",
  });
  expect(results.results[0]?.overview).toContain("Episode 29 · A new journey");
  expect(results.results[0]?.overview).toContain("airs today at");
  expect(results.results[0]?.overview).toContain("Availability is checked only when you choose");
});

test("loadCalendarResults distinguishes already released rows from timed upcoming rows", async () => {
  const results = await loadCalendarResults({
    stateManager: { getState: () => ({ mode: "series" }) },
    timelineService: {
      loadReleasingToday: async () => [
        {
          source: "tmdb",
          titleId: "tv-1",
          titleName: "Slow Horses",
          type: "series",
          season: 5,
          episode: 3,
          episodeTitle: "Signals",
          releaseAt: "2026-05-15",
          releasePrecision: "date",
          status: "released",
          posterPath: null,
        },
      ],
    },
  } as never);

  expect(results.subtitle).toBe("0 airing today · 1 released · series schedule");
  expect(results.results[0]?.metadataSource).toBe("TMDB calendar · new today · date");
  expect(results.results[0]?.overview).toContain("S05E03");
  expect(results.results[0]?.overview).toContain("available today");
});
