export type ContinuationEpisodeState = {
  readonly season: number;
  readonly episode: number;
  readonly playable: boolean;
  readonly completed: boolean;
};

export type ContinuationOptionKind =
  | "play-local"
  | "watch-online"
  | "download-more"
  | "browse-offline";

export type ContinuationOption = {
  readonly kind: ContinuationOptionKind;
  readonly label: string;
  readonly detail: string;
  readonly season?: number;
  readonly episode?: number;
};

export type ContinuationDecision = {
  readonly primary: ContinuationOption | null;
  readonly options: readonly ContinuationOption[];
  readonly note: string;
};

export type ContinuationEngine = {
  decide(input: {
    readonly titleName: string;
    readonly localEpisodes: readonly ContinuationEpisodeState[];
    readonly networkAvailable: boolean;
  }): ContinuationDecision;
};

export function createContinuationEngine(): ContinuationEngine {
  return {
    decide(input) {
      const sorted = [...input.localEpisodes].sort(compareEpisodeState);
      const nextLocal = sorted.find((episode) => episode.playable && !episode.completed);
      if (nextLocal) {
        const option = {
          kind: "play-local" as const,
          label: `Continue offline ${formatEpisode(nextLocal)}`,
          detail: `Play the downloaded ${input.titleName} episode without network`,
          season: nextLocal.season,
          episode: nextLocal.episode,
        };
        return {
          primary: option,
          options: [
            option,
            {
              kind: "download-more",
              label: "Download more episodes",
              detail: "Open downloads so you can extend the local shelf explicitly",
            },
          ],
          note: "Local continuation is available.",
        };
      }

      if (input.networkAvailable && sorted.length > 0) {
        const option = {
          kind: "watch-online" as const,
          label: "Find the next episode online",
          detail: "Local episodes are complete; search online only if you choose this action",
        };
        return {
          primary: option,
          options: [
            option,
            {
              kind: "download-more",
              label: "Download more episodes",
              detail: "Queue more local episodes instead of streaming now",
            },
          ],
          note: "All local episodes are complete or exhausted.",
        };
      }

      const browseOffline = {
        kind: "browse-offline" as const,
        label: "Browse other offline titles",
        detail: "Stay local-only and choose something already downloaded",
      };
      return {
        primary: browseOffline,
        options: [browseOffline],
        note:
          sorted.length > 0
            ? "Local episodes are complete; network continuation is unavailable."
            : "No local continuation is available yet.",
      };
    },
  };
}

function compareEpisodeState(
  left: ContinuationEpisodeState,
  right: ContinuationEpisodeState,
): number {
  const seasonDelta = left.season - right.season;
  if (seasonDelta !== 0) return seasonDelta;
  return left.episode - right.episode;
}

function formatEpisode(episode: ContinuationEpisodeState): string {
  return `S${String(episode.season).padStart(2, "0")}E${String(episode.episode).padStart(2, "0")}`;
}
