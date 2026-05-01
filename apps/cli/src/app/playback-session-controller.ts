import type { PlaybackControlAction } from "@/infra/player/PlayerControlService";
import type { EpisodeInfo, PlaybackResult, TitleInfo } from "@/domain/types";
import { getAutoAdvanceEpisode, type EpisodeAvailability } from "@/app/playback-policy";

export type PlaybackAutoplayPauseReason = "user" | "interrupted" | null;

export type PostPlaybackSessionAction = "toggle-autoplay" | "resume" | "replay";

export interface PlaybackResultDecision {
  readonly autoplayPauseReason: PlaybackAutoplayPauseReason;
  readonly autoplayPaused: boolean;
  readonly shouldRefreshSource: boolean;
  readonly shouldFallbackProvider: boolean;
  readonly shouldTreatAsInterrupted: boolean;
}

export interface PlaybackActionDecision {
  readonly autoplayPauseReason: PlaybackAutoplayPauseReason;
  readonly autoplayPaused: boolean;
}

type PlaybackResultDecisionArgs = {
  result: PlaybackResult;
  controlAction: PlaybackControlAction | null;
  autoplayPauseReason: PlaybackAutoplayPauseReason;
};

type AutoAdvanceArgs = {
  result: PlaybackResult;
  title: TitleInfo;
  currentEpisode: EpisodeInfo;
  autoNextEnabled: boolean;
  autoplayPauseReason: PlaybackAutoplayPauseReason;
  availability: EpisodeAvailability;
};

export function resolvePlaybackResultDecision({
  result,
  controlAction,
  autoplayPauseReason,
}: PlaybackResultDecisionArgs): PlaybackResultDecision {
  const shouldTreatAsInterrupted = result.endReason === "quit" || controlAction === "stop";
  const nextPauseReason =
    shouldTreatAsInterrupted && autoplayPauseReason !== "user"
      ? "interrupted"
      : autoplayPauseReason;

  return {
    autoplayPauseReason: nextPauseReason,
    autoplayPaused: nextPauseReason !== null,
    shouldRefreshSource: controlAction === "refresh",
    shouldFallbackProvider: controlAction === "fallback",
    shouldTreatAsInterrupted,
  };
}

export function resolvePostPlaybackSessionAction(
  action: PostPlaybackSessionAction,
  autoplayPauseReason: PlaybackAutoplayPauseReason,
): PlaybackActionDecision {
  switch (action) {
    case "toggle-autoplay": {
      const nextPauseReason = autoplayPauseReason === null ? "user" : null;
      return {
        autoplayPauseReason: nextPauseReason,
        autoplayPaused: nextPauseReason !== null,
      };
    }
    case "resume":
    case "replay": {
      const nextPauseReason = autoplayPauseReason === "interrupted" ? null : autoplayPauseReason;
      return {
        autoplayPauseReason: nextPauseReason,
        autoplayPaused: nextPauseReason !== null,
      };
    }
  }
}

export async function resolveAutoplayAdvanceEpisode({
  result,
  title,
  currentEpisode,
  autoNextEnabled,
  autoplayPauseReason,
  availability,
}: AutoAdvanceArgs): Promise<EpisodeInfo | null> {
  return getAutoAdvanceEpisode(
    result,
    title,
    currentEpisode,
    autoNextEnabled && autoplayPauseReason === null,
    availability,
  );
}
