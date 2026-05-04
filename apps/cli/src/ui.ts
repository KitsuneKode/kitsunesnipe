import { existsSync } from "node:fs";

import { log } from "@clack/prompts";

// ── Dependency check ───────────────────────────────────────────────────────

export type DepStatus = { mpv: boolean; chromiumForEmbeds: boolean };

export async function checkDeps(): Promise<DepStatus> {
  const mpv = Boolean(Bun.which("mpv"));

  if (!mpv) {
    log.error("mpv not found — required for playback.");
    log.message(
      "Install:\n" +
        "  Arch:   sudo pacman -S mpv\n" +
        "  Debian: sudo apt install mpv\n" +
        "  macOS:  brew install mpv",
    );
    process.exit(1);
  }

  let chromiumForEmbeds = false;
  try {
    const { chromium } = await import("playwright");
    const executablePath = chromium.executablePath();
    chromiumForEmbeds = existsSync(executablePath);
  } catch {
    chromiumForEmbeds = false;
  }

  if (!chromiumForEmbeds) {
    log.warn(
      "Playwright Chromium is missing — embedded (browser) providers will fail until Chromium is installed.",
    );
    log.message(
      "Install browsers for this checkout:\n" +
        "  bunx playwright install chromium\n" +
        "Or from the repo root after dependencies are installed:\n" +
        "  cd apps/cli && bunx playwright install chromium",
    );
  }

  return { mpv, chromiumForEmbeds };
}
