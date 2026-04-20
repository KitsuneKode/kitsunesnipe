import { spawn } from "child_process";
import { log, select } from "@clack/prompts";

// ── Dependency check ───────────────────────────────────────────────────────

type DepStatus = { mpv: boolean; fzf: boolean };

async function which(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn("which", [cmd], { stdio: "pipe" });
    p.on("close", (code) => resolve(code === 0));
    p.on("error", () => resolve(false));
  });
}

export async function checkDeps(): Promise<DepStatus> {
  const [mpv, fzf] = await Promise.all([which("mpv"), which("fzf")]);

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

  if (!fzf) {
    log.warn("fzf not found — using arrow-key selection instead.");
    log.message(
      "For best experience, install fzf:\n" +
        "  Arch:   sudo pacman -S fzf\n" +
        "  Debian: sudo apt install fzf\n" +
        "  macOS:  brew install fzf",
    );
  }

  return { mpv, fzf };
}

// ── fzf picker ─────────────────────────────────────────────────────────────

// Picks one item from a list using fzf. Falls back to @clack select if fzf
// is unavailable. Returns null if the user cancels.
export async function pickWithFzf<T>(
  items: T[],
  format: (item: T) => string,
  { prompt = "Select", hasFzf = true }: { prompt?: string; hasFzf?: boolean } = {},
): Promise<T | null> {
  if (items.length === 0) return null;

  if (!hasFzf) {
    // @clack fallback
    const choice = await select({
      message: prompt,
      options: items.map((item) => ({ value: item as unknown, label: format(item) })),
    });
    return (choice as T) ?? null;
  }

  const lines = items.map(format);

  return new Promise((resolve) => {
    const fzf = spawn("fzf", ["--height=50%", "--reverse", "--border", `--prompt=${prompt}: `], {
      stdio: ["pipe", "pipe", "inherit"],
    });

    fzf.stdin.write(lines.join("\n"));
    fzf.stdin.end();

    let out = "";
    fzf.stdout.on("data", (d) => (out += d));
    fzf.on("close", (code) => {
      if (code !== 0) return resolve(null); // user pressed Escape
      const idx = lines.indexOf(out.trim());
      resolve(idx >= 0 ? (items[idx] ?? null) : null);
    });
    fzf.on("error", () => resolve(null));
  });
}

// ── Subtitle fzf picker ────────────────────────────────────────────────────

export async function pickSubtitleWithFzf(
  list: any[],
  { hasFzf = true }: { hasFzf?: boolean } = {},
): Promise<string | null> {
  if (!list.length) return null;

  const fmt = (s: any) =>
    `${(s.display ?? s.language ?? "?").padEnd(14)} [${s.language}]  ${s.release ?? ""}`;

  const picked = await pickWithFzf(list, fmt, { prompt: "Subtitle", hasFzf });
  return picked ? (picked as any).url : null;
}
