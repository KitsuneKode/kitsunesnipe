import { describe, expect, test } from "bun:test";

import { computeInProcessReconnectSeek } from "@/infra/player/mpv-in-process-reconnect";

describe("computeInProcessReconnectSeek", () => {
  test("does not seek when duration is unknown (live-style)", () => {
    expect(computeInProcessReconnectSeek(120, 0)).toEqual({
      seekSeconds: 120,
      shouldSeek: false,
    });
    expect(computeInProcessReconnectSeek(30, NaN)).toEqual({
      seekSeconds: 30,
      shouldSeek: false,
    });
  });

  test("seeks within reported duration for VOD-like durations", () => {
    expect(computeInProcessReconnectSeek(400, 2000)).toEqual({
      seekSeconds: 400,
      shouldSeek: true,
    });
    expect(computeInProcessReconnectSeek(1999.9, 2000)).toEqual({
      seekSeconds: 1999.5,
      shouldSeek: true,
    });
  });
});
