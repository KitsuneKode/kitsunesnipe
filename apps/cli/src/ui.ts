import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { log } from "@clack/prompts";

// ── Dependency check ───────────────────────────────────────────────────────

export type CapabilitySeverity = "fatal" | "degraded";

export interface CapabilityIssue {
  readonly id: "mpv-missing";
  readonly severity: CapabilitySeverity;
  readonly message: string;
  readonly remediation: readonly string[];
}

export interface CapabilitySnapshot {
  readonly mpv: boolean;
  readonly issues: readonly CapabilityIssue[];
}

type CapabilityNoticeState = {
  readonly version: string;
  readonly fingerprint: string;
};

const NOTICE_DIR = join(process.env.HOME ?? "~", ".config", "kunai");
const NOTICE_FILE = join(NOTICE_DIR, "capability-notice.json");

function capabilityFingerprint(snapshot: CapabilitySnapshot): string {
  const issueBits = [...snapshot.issues]
    .map((issue) => `${issue.id}:${issue.severity}`)
    .sort()
    .join(",");
  return `mpv:${snapshot.mpv ? "1" : "0"}|issues:${issueBits}`;
}

async function loadCapabilityNoticeState(): Promise<CapabilityNoticeState | null> {
  try {
    const file = Bun.file(NOTICE_FILE);
    if (!(await file.exists())) return null;
    const parsed = (await file.json()) as Partial<CapabilityNoticeState>;
    if (typeof parsed.version !== "string" || typeof parsed.fingerprint !== "string") {
      return null;
    }
    return { version: parsed.version, fingerprint: parsed.fingerprint };
  } catch {
    return null;
  }
}

async function saveCapabilityNoticeState(state: CapabilityNoticeState): Promise<void> {
  await mkdir(NOTICE_DIR, { recursive: true });
  await Bun.write(NOTICE_FILE, JSON.stringify(state, null, 2));
}

export async function checkDeps(appVersion = "2.0.0-beta"): Promise<CapabilitySnapshot> {
  const issues: CapabilityIssue[] = [];
  const mpv = Boolean(Bun.which("mpv"));

  if (!mpv) {
    const remediation = [
      "Arch:   sudo pacman -S mpv",
      "Debian: sudo apt install mpv",
      "macOS:  brew install mpv",
    ] as const;
    issues.push({
      id: "mpv-missing",
      severity: "fatal",
      message: "mpv not found — required for playback.",
      remediation,
    });
    log.error("mpv not found — required for playback.");
  }

  const snapshot: CapabilitySnapshot = { mpv, issues };
  const fingerprint = capabilityFingerprint(snapshot);
  const previous = await loadCapabilityNoticeState();
  const shouldShowRemediation =
    !previous || previous.version !== appVersion || previous.fingerprint !== fingerprint;

  if (shouldShowRemediation) {
    for (const issue of snapshot.issues) {
      log.message(`${issue.message}\nFix:\n  ${issue.remediation.join("\n  ")}`);
    }
    await saveCapabilityNoticeState({
      version: appVersion,
      fingerprint,
    });
  }

  if (!mpv) {
    process.exit(1);
  }

  return snapshot;
}
