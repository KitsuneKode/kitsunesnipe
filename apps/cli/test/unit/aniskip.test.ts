import { expect, test } from "bun:test";

import { mapAniSkipTypeToTimingField } from "@/aniskip";

test("mapAniSkipTypeToTimingField only accepts playback skip categories we intentionally support", () => {
  expect(mapAniSkipTypeToTimingField("op")).toBe("intro");
  expect(mapAniSkipTypeToTimingField("mixed-op")).toBe("intro");
  expect(mapAniSkipTypeToTimingField("ed")).toBe("credits");
  expect(mapAniSkipTypeToTimingField("mixed-ed")).toBe("credits");
  expect(mapAniSkipTypeToTimingField("recap")).toBe("recap");

  expect(mapAniSkipTypeToTimingField("prologue")).toBeNull();
  expect(mapAniSkipTypeToTimingField("epilogue")).toBeNull();
  expect(mapAniSkipTypeToTimingField("preview")).toBeNull();
});
