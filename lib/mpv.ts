import { spawn } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// =============================================================================
// LUA REPORTER
//
// Injected via --script into every MPV session. Responsibilities:
//   1. Write "seconds,duration,reason" to KITSUNE_POS_FILE on exit.
//   2. When reason === "eof" AND KITSUNE_AUTO_NEXT === "1":
//      - Keep MPV alive (it already is because we pass --keep-open=yes)
//      - Show an OSD countdown ("⏭ Next episode in 5 s · q to cancel")
//      - After 5 s, quit programmatically
//
// If the user presses q during the countdown, MPV fires "end-file" with
// reason="quit" instead of "eof", so the caller knows not to auto-advance.
// =============================================================================

const LUA_REPORTER = `
local written    = false
local auto_next  = os.getenv("KITSUNE_AUTO_NEXT") == "1"

-- end-file fires for every end: natural (eof), user quit, error, etc.
mp.register_event("end-file", function(event)
    if written then return end
    written = true

    local pos    = mp.get_property_number("playback-time") or 0
    local dur    = mp.get_property_number("duration") or 0
    local reason = (event and event.reason) or "unknown"

    -- Persist position + reason so the TS caller can read it
    local path = os.getenv("KITSUNE_POS_FILE")
    if path then
        local f = io.open(path, "w")
        if f then
            f:write(string.format("%d,%d,%s", math.floor(pos), math.floor(dur), reason))
            f:close()
        end
    end

    -- OSD countdown only on natural EOF when caller enabled auto-next.
    -- MPV stays alive because we launched with --keep-open=yes.
    if reason == "eof" and auto_next then
        local n = 5
        local function tick()
            if n <= 0 then
                mp.command("quit")
                return
            end
            mp.osd_message(
                string.format("\\xE2\\x8F\\xAD  Next episode in %d s  ·  q to cancel", n),
                1.5
            )
            n = n - 1
            mp.add_timeout(1, tick)
        end
        tick()
    end
end)
`;

// =============================================================================
// TYPES
// =============================================================================

export type EndReason = "eof" | "quit" | "error" | "unknown";

export type PlaybackResult = {
  watchedSeconds: number;
  duration:       number;
  endReason:      EndReason;
};

// =============================================================================
// LAUNCHER
// =============================================================================

export async function launchMpv(opts: {
  url:          string;
  headers:      Record<string, string>;
  subtitle:     string | null;
  displayTitle: string;
  startAt?:     number;  // seconds to seek to on open
  autoNext?:    boolean; // enable EOF countdown in MPV
}): Promise<PlaybackResult> {
  const scriptPath = join(tmpdir(), "kitsune-reporter.lua");
  const posPath    = join(tmpdir(), "kitsune-position");

  await writeFile(scriptPath, LUA_REPORTER, "utf-8");
  if (existsSync(posPath)) await unlink(posPath);

  const args: string[] = [opts.url];

  // Pass HTTP context MPV needs to authenticate with the CDN
  if (opts.headers["referer"])    args.push(`--referrer=${opts.headers["referer"]}`);
  if (opts.headers["user-agent"]) args.push(`--user-agent=${opts.headers["user-agent"]}`);
  if (opts.headers["origin"])     args.push(`--http-header-fields=Origin: ${opts.headers["origin"]}`);

  if (opts.subtitle)                     args.push(`--sub-file=${opts.subtitle}`);
  if (opts.startAt && opts.startAt > 5)  args.push(`--start=${opts.startAt}`);

  args.push(`--force-media-title=${opts.displayTitle}`);
  args.push(`--script=${scriptPath}`);

  // --keep-open=yes keeps MPV alive after the file ends so the Lua countdown
  // can run its 5-second timer before calling mp.command("quit").
  if (opts.autoNext) args.push("--keep-open=yes");

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    KITSUNE_POS_FILE:  posPath,
    KITSUNE_AUTO_NEXT: opts.autoNext ? "1" : "0",
  };

  await new Promise<void>((resolve) => {
    const mpv = spawn("mpv", args, { stdio: "inherit", env });
    mpv.on("close", () => resolve());
    mpv.on("error", (e) => {
      console.error("\n[!] mpv error:", e.message);
      resolve();
    });
  });

  // Parse the position file written by Lua
  if (existsSync(posPath)) {
    try {
      const raw    = await readFile(posPath, "utf-8");
      const parts  = raw.trim().split(",");
      const pos    = Number(parts[0]) || 0;
      const dur    = Number(parts[1]) || 0;
      const reason = (parts[2]?.trim() ?? "unknown") as EndReason;
      await unlink(posPath).catch(() => {});
      return { watchedSeconds: pos, duration: dur, endReason: reason };
    } catch {}
  }

  return { watchedSeconds: 0, duration: 0, endReason: "unknown" };
}
