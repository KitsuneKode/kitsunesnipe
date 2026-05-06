import { expect, test } from "bun:test";

import { formatPickerOptionRow } from "@/app-shell/overlay-panel";

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
