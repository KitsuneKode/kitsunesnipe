import { expect, test } from "bun:test";

import { PROVIDER_DEFINITIONS } from "@/services/providers/definitions";

test("cli provider definitions expose direct providers only", () => {
  expect(PROVIDER_DEFINITIONS.map((definition) => definition.id)).toEqual([
    "rivestream",
    "vidking",
    "allanime",
    "miruro",
  ]);
});

test("legacy browser providers stay out of the active registry", () => {
  const legacyIds = ["cineby", "bitcine", "braflix", "cineby-anime"];

  for (const id of legacyIds) {
    expect(PROVIDER_DEFINITIONS.some((candidate) => candidate.id === id)).toBe(false);
  }
});
