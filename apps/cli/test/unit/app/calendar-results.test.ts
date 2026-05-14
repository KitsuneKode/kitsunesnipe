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

  expect(results.subtitle).toBe("1 airing today · anime schedule");
  expect(results.results[0]).toMatchObject({
    id: "21",
    type: "series",
    title: "Frieren",
    year: "2026",
    metadataSource: "AniList calendar · airs today",
    episodeCount: 29,
    posterPath: "https://img.example/frieren.jpg",
  });
  expect(results.results[0]?.overview).toContain("Episode 29: A new journey");
});
