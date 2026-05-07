import { describe, expect, test } from "bun:test";

import { routePlaybackShellAction } from "@/app-shell/command-router";

describe("routePlaybackShellAction", () => {
  test("returns post-playback episode picker intent without opening a local picker", async () => {
    const result = await routePlaybackShellAction({
      action: "pick-episode",
      container: {} as never,
    });

    expect(result).toBe("pick-episode");
  });
});
