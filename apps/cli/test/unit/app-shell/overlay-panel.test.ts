import { expect, test } from "bun:test";

import { formatPickerDisplayRow, formatPickerOptionRow } from "@/app-shell/overlay-panel";

test("formatPickerOptionRow keeps settings rows within the available width", () => {
  const row = formatPickerOptionRow({
    label: "Resume/start prompt before playback",
    detail: "Ask before continuing long-running episode history",
    badge: "current",
    width: 32,
  });

  expect(row.text).not.toContain("\n");
  expect(row.text.length + row.badgeSuffix.length).toBeLessThanOrEqual(32);
  expect(row.text.endsWith("…")).toBe(true);
});

test("formatPickerOptionRow reserves badge width before truncating text", () => {
  const row = formatPickerOptionRow({
    label: "Auto next episode",
    detail: "Play the next available item",
    badge: "on",
    width: 24,
  });

  expect(row.badgeSuffix).toBe("  on");
  expect(row.text.length + row.badgeSuffix.length).toBeLessThanOrEqual(24);
});

test("formatPickerDisplayRow reserves prefix width before truncating episode rows", () => {
  const row = formatPickerDisplayRow({
    label: "Episode 5  ·  Shotgun",
    detail:
      "2011-08-14  ·  When Jesse goes missing, Walt fears the worst. Skyler has an unlikely reunion.",
    badge: "watched",
    width: 64,
    selected: true,
  });

  expect(row.prefix).toBe("> ");
  expect(row.prefix.length + row.text.length + row.badgeSuffix.length).toBeLessThanOrEqual(64);
});
