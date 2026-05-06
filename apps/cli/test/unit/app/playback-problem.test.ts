import { describe, expect, test } from "bun:test";

import {
  buildPlayerFailureProblem,
  buildProviderResolveProblem,
} from "@/domain/playback/playback-problem";

describe("playback problem model", () => {
  test("maps runtime dependency failures to blocking diagnostics", () => {
    const problem = buildProviderResolveProblem({
      attempts: [{ failure: { code: "RUNTIME_MISSING", message: "runtime dependency missing" } }],
      capabilitySnapshot: null,
    });

    expect(problem.cause).toBe("runtime-missing");
    expect(problem.severity).toBe("blocking");
    expect(problem.recommendedAction).toBe("diagnostics");
  });

  test("maps player exit to relaunch before provider fallback", () => {
    const problem = buildPlayerFailureProblem("player-exited");

    expect(problem.stage).toBe("mpv");
    expect(problem.recommendedAction).toBe("relaunch");
    expect(problem.secondaryActions).toContain("try-next-provider");
  });
});
