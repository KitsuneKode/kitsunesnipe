import { describe, expect, test } from "bun:test";

import { resolvePersistentStartSeekTarget } from "@/infra/player/PersistentMpvSession";

describe("persistent mpv start policy", () => {
  test("seeks directly for explicit continue/resume intents", () => {
    expect(resolvePersistentStartSeekTarget({ startAt: 562 })).toBe(562);
  });

  test("does not seek while offering a start-over prompt unless the user chooses resume", () => {
    const options = {
      startAt: 0,
      resumePromptAt: 562,
      offerResumeStartChoice: true,
    };

    expect(resolvePersistentStartSeekTarget(options)).toBeUndefined();
    expect(resolvePersistentStartSeekTarget(options, "start")).toBeUndefined();
    expect(resolvePersistentStartSeekTarget(options, "resume")).toBe(562);
  });

  test("keeps navigation start-at-zero when no prompt is available", () => {
    expect(
      resolvePersistentStartSeekTarget({
        startAt: 0,
        resumePromptAt: 562,
        offerResumeStartChoice: false,
      }),
    ).toBeUndefined();
  });
});
