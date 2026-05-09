import { expect, test } from "bun:test";

import { PlaybackPhase } from "@/app/PlaybackPhase";

test("PlaybackPhase describes mpv track-changed events for user feedback", () => {
  const phase = new PlaybackPhase();
  const describe = (
    phase as unknown as {
      describePlayerEvent: (event: {
        type: "track-changed";
        trackType: "audio" | "sub";
        id: number;
      }) => {
        detail?: string | null;
        note?: string | null;
      };
    }
  ).describePlayerEvent.bind(phase);

  expect(describe({ type: "track-changed", trackType: "audio", id: 2 }).note).toContain(
    "Audio track switched in mpv",
  );
  expect(describe({ type: "track-changed", trackType: "sub", id: 0 }).note).toContain(
    "Subtitle track switched in mpv",
  );
});
