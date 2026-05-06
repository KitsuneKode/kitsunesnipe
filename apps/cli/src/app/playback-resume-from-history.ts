import type { QuitNearEndThresholdMode } from "@/app/playback-policy";
import { resumeSecondsFromProgressPoint } from "@/app/playback-progress-policy";
import type { EpisodeInfo } from "@/domain/types";
import type { HistoryStore } from "@/services/persistence/HistoryStore";
import { isFinished } from "@/services/persistence/HistoryStore";

/**
 * Seconds to resume at for a specific episode from SQLite history, or 0 when we should
 * start from the beginning (no row, finished, too short, or near natural end).
 */
export async function resumeSecondsFromHistoryForEpisode(
  historyStore: HistoryStore,
  titleId: string,
  episode: EpisodeInfo,
  quitNearEndThresholdMode: QuitNearEndThresholdMode,
): Promise<number> {
  const entries = await historyStore.listByTitle(titleId);
  const entry = entries.find((e) => e.season === episode.season && e.episode === episode.episode);
  if (!entry) return 0;
  if (isFinished(entry)) return 0;

  const ts = entry.timestamp;
  return resumeSecondsFromProgressPoint(
    { positionSeconds: ts, durationSeconds: entry.duration },
    quitNearEndThresholdMode,
  );
}
