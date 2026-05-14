import { describe, expect, test } from "bun:test";

import { routePlaybackShellAction, routeSearchShellAction } from "@/app-shell/command-router";

describe("routePlaybackShellAction", () => {
  test("returns post-playback episode picker intent without opening a local picker", async () => {
    const result = await routePlaybackShellAction({
      action: "pick-episode",
      container: {} as never,
    });

    expect(result).toBe("pick-episode");
  });

  test("recommendation action during search is handled without mutation", async () => {
    const result = await routeSearchShellAction({
      action: "recommendation",
      container: {} as never,
    });

    expect(result).toBe("handled");
  });

  test("calendar and random actions during search are handled by the search phase", async () => {
    await expect(
      routeSearchShellAction({
        action: "calendar",
        container: {} as never,
      }),
    ).resolves.toBe("handled");
    await expect(
      routeSearchShellAction({
        action: "random",
        container: {} as never,
      }),
    ).resolves.toBe("handled");
  });
});
