import { expect, test } from "bun:test";

import { buildRandomResultTray } from "@/app/random-results";
import type { SearchResult } from "@/domain/types";

const results: SearchResult[] = Array.from({ length: 6 }, (_, index) => ({
  id: String(index + 1),
  type: "series",
  title: `Pick ${index + 1}`,
  year: "2026",
  overview: "",
  posterPath: null,
  metadataSource: index % 2 === 0 ? "TMDB trending" : "History affinity",
}));

test("buildRandomResultTray returns a rerollable explained tray without mutating inputs", () => {
  const tray = buildRandomResultTray(results, {
    count: 3,
    random: () => 0,
  });

  expect(tray).toHaveLength(3);
  expect(tray.map((result) => result.title)).toEqual(["Pick 2", "Pick 3", "Pick 4"]);
  expect(tray.every((result) => result.metadataSource?.startsWith("Random pick · "))).toBe(true);
  expect(results[0]?.metadataSource).toBe("TMDB trending");
});
