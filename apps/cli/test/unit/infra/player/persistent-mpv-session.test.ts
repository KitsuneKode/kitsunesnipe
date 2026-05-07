import { describe, expect, test } from "bun:test";

import {
  buildPersistentLoadfileCommand,
  resolvePersistentStartSeekTarget,
} from "@/infra/player/PersistentMpvSession";

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

  test("builds file-local loadfile start options for every persistent replacement", () => {
    expect(buildPersistentLoadfileCommand("https://cdn.example/next.m3u8")).toEqual([
      "loadfile",
      "https://cdn.example/next.m3u8",
      "replace",
      -1,
      { start: "0" },
    ]);

    expect(buildPersistentLoadfileCommand("https://cdn.example/resume.m3u8", 562)).toEqual([
      "loadfile",
      "https://cdn.example/resume.m3u8",
      "replace",
      -1,
      { start: "562" },
    ]);
  });
});
