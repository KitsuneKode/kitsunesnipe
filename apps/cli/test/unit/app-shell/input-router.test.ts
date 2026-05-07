import { expect, test } from "bun:test";

import { routeShellInput } from "@/app-shell/input-router";

test("ctrl-c always routes to the hard global owner", () => {
  expect(
    routeShellInput("c", { ctrl: true }, { commandPaletteOpen: true, modalOpen: true }),
  ).toEqual({
    owner: "hard-global",
    command: "quit",
  });
});

test("command palette owns input before modal and surface shortcuts", () => {
  expect(routeShellInput("/", {}, { commandPaletteOpen: true, modalOpen: true })).toEqual({
    owner: "command-palette",
    command: null,
  });
});

test("modal owns slash when command palette is closed", () => {
  expect(routeShellInput("/", {}, { modalOpen: true })).toEqual({
    owner: "modal",
    command: null,
  });
});

test("picker filter keeps slash inside the modal owner", () => {
  expect(routeShellInput("/", {}, { modalOpen: true, textInputFocused: true })).toEqual({
    owner: "modal",
    command: null,
  });
});

test("search input can request command palette without swallowing slash locally", () => {
  expect(routeShellInput("/", {}, { textInputFocused: true })).toEqual({
    owner: "text-input",
    command: "open-command-palette",
  });
});

test("playback surface slash opens command palette", () => {
  expect(routeShellInput("/", {}, {})).toEqual({
    owner: "surface",
    command: "open-command-palette",
  });
});
