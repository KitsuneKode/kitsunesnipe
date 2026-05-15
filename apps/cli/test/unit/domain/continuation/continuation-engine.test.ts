import { describe, expect, test } from "bun:test";

import { createContinuationEngine } from "@/domain/continuation/ContinuationEngine";

describe("ContinuationEngine", () => {
  test("prefers local next episode when it is available", () => {
    const result = createContinuationEngine().decide({
      titleName: "Solo Leveling",
      localEpisodes: [
        { season: 1, episode: 1, playable: true, completed: true },
        { season: 1, episode: 2, playable: true, completed: false },
      ],
      networkAvailable: true,
    });

    expect(result.primary?.kind).toBe("play-local");
    expect(result.primary?.label).toBe("Continue offline S01E02");
    expect(result.options.map((option) => option.kind)).toEqual(["play-local", "download-more"]);
  });

  test("offers explicit online continuation after local episodes are exhausted", () => {
    const result = createContinuationEngine().decide({
      titleName: "Solo Leveling",
      localEpisodes: [{ season: 1, episode: 1, playable: true, completed: true }],
      networkAvailable: true,
    });

    expect(result.primary?.kind).toBe("watch-online");
    expect(result.primary?.label).toBe("Find the next episode online");
    expect(result.note).toContain("local episodes are complete");
  });

  test("stays local-only when network is unavailable", () => {
    const result = createContinuationEngine().decide({
      titleName: "Solo Leveling",
      localEpisodes: [{ season: 1, episode: 1, playable: true, completed: true }],
      networkAvailable: false,
    });

    expect(result.options.map((option) => option.kind)).toEqual(["browse-offline"]);
  });
});
