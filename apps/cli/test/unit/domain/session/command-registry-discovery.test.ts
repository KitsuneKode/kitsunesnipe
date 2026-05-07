import { describe, expect, test } from "bun:test";

import { parseCommand, resolveCommands } from "@/domain/session/command-registry";
import { createInitialState } from "@/domain/session/SessionState";

describe("discovery command", () => {
  test("exposes trending as an explicit browse command", () => {
    const state = createInitialState("vidking", "allanime");

    expect(parseCommand("/trending")?.id).toBe("trending");
    expect(parseCommand("/discover")?.id).toBe("discover");
    expect(resolveCommands(state, ["trending"])).toEqual([
      expect.objectContaining({
        id: "trending",
        label: "Trending",
        enabled: true,
      }),
    ]);
  });
});
