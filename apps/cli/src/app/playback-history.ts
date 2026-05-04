import {
  didPlaybackReachCompletionThreshold,
  type QuitNearEndThresholdMode,
} from "@/app/playback-policy";
import type { PlaybackResult, PlaybackTimingMetadata } from "@/domain/types";

export function shouldPersistHistory(
  result: PlaybackResult,
  timing?: PlaybackTimingMetadata | null,
  thresholdMode: QuitNearEndThresholdMode = "credits-or-90-percent",
): boolean {
  return (
    result.watchedSeconds > 10 ||
    didPlaybackReachCompletionThreshold(result, timing, thresholdMode) ||
    (result.endReason === "eof" && result.duration > 0)
  );
}

export function toHistoryTimestamp(
  result: PlaybackResult,
  timing?: PlaybackTimingMetadata | null,
  thresholdMode: QuitNearEndThresholdMode = "credits-or-90-percent",
): number {
  if (
    (didPlaybackReachCompletionThreshold(result, timing, thresholdMode) ||
      (result.endReason === "eof" && result.duration > 0)) &&
    result.duration > 0
  ) {
    return Math.max(result.watchedSeconds, result.duration);
  }

  const lastNon = result.lastNonZeroPositionSeconds ?? 0;
  if (result.watchedSeconds <= 0 && lastNon > 0) {
    return lastNon;
  }

  return result.watchedSeconds;
}
