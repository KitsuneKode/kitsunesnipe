import type { LoadingShellState } from "./types";
import type { ShellStatusTone } from "./types";

export type LoadingShellTimerPolicy = {
  readonly animate: boolean;
  readonly trackElapsed: boolean;
  readonly memoryRefreshMs: number | null;
  readonly runtimeHealthRefreshMs: number | null;
};

export function isPlaybackSupervisionOperation(operation: LoadingShellState["operation"]): boolean {
  return operation === "playing";
}

export function shouldShowLoadingElapsed(
  operation: LoadingShellState["operation"],
  elapsedSeconds: number,
): boolean {
  return !isPlaybackSupervisionOperation(operation) && elapsedSeconds >= 10;
}

export function getLoadingShellTimerPolicy(input: {
  operation: LoadingShellState["operation"];
  memoryPanelVisible?: boolean;
  runtimeHealthVisible?: boolean;
}): LoadingShellTimerPolicy {
  const supervisingPlayback = isPlaybackSupervisionOperation(input.operation);
  return {
    animate: !supervisingPlayback,
    trackElapsed: !supervisingPlayback,
    memoryRefreshMs: input.memoryPanelVisible ? 2_000 : null,
    runtimeHealthRefreshMs: input.runtimeHealthVisible ? 2_000 : null,
  };
}

export type ProviderResolveWaitPresentation = {
  readonly message: string;
  readonly tone: ShellStatusTone;
  readonly footerTask: string;
};

export function getProviderResolveWaitPresentation(input: {
  readonly elapsedSeconds: number;
  readonly fallbackAvailable?: boolean;
  readonly latestIssue?: string | null;
}): ProviderResolveWaitPresentation {
  const fallbackHint = input.fallbackAvailable ? "f fallback · " : "";
  if (input.elapsedSeconds >= 30) {
    return {
      message: "Provider/CDN may be degraded. Try fallback or open diagnostics.",
      tone: "warning",
      footerTask: `Provider/CDN degraded  ·  ${fallbackHint}Esc cancel · d diagnostics`,
    };
  }

  if (input.latestIssue) {
    return {
      message: `Latest issue: ${input.latestIssue}`,
      tone: "warning",
      footerTask: `Playback bootstrap  ·  ${fallbackHint}q / Esc cancel`,
    };
  }

  return {
    message: "Preparing playback context...",
    tone: "info",
    footerTask: `Playback bootstrap  ·  ${fallbackHint}q / Esc cancel`,
  };
}
