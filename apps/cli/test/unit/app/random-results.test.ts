import { expect, test } from "bun:test";

import { buildRandomResultBundle, buildRandomResultTray } from "@/app/random-results";
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

test("buildRandomResultBundle keeps cached discover copy and names surprise rerolls", () => {
  const surpriseResults: SearchResult[] = [
    {
      id: "surprise-1",
      type: "movie",
      title: "Odd Little Movie",
      year: "1998",
      overview: "",
      posterPath: null,
      metadataSource: "TMDB surprise",
    },
  ];
  const bundle = buildRandomResultBundle(
    {
      results,
      subtitle: "6 recommendation picks",
      emptyMessage: "No recommendations available.",
    },
    surpriseResults,
    {
      count: 2,
      random: () => 0,
    },
  );

  expect(bundle.subtitle).toBe("2 surprise picks · rerun /random or /surprise to spin again");
  expect(bundle.results).toHaveLength(2);
  expect(bundle.emptyMessage).toBe(
    "Random needs search, trending, or history signals before it can suggest anything.",
  );
  expect(bundle.results.some((result) => result.title === "Odd Little Movie")).toBe(true);
});
