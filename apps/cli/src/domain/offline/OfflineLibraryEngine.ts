import {
  formatOfflineLibraryGroupDetail,
  formatOfflineShelfBadge,
  formatOfflineShelfDetail,
  groupOfflineLibraryEntries,
  type OfflineLibraryEntry,
} from "@/services/offline/offline-library";

export type OfflineLibraryShelfEntry = {
  readonly jobId: string;
  readonly episodeLabel: string;
  readonly badge: string;
  readonly detail: string;
  readonly previewImageUrl?: string;
  readonly playable: boolean;
};

export type OfflineLibraryShelfGroup = {
  readonly key: string;
  readonly titleId: string;
  readonly titleName: string;
  readonly label: string;
  readonly detail: string;
  readonly nextPlayableEpisodeLabel?: string;
  readonly actionSummary: string;
  readonly artifactSummary: string;
  readonly readyCount: number;
  readonly issueCount: number;
  readonly previewImageUrl?: string;
  readonly entries: readonly OfflineLibraryShelfEntry[];
};

export type OfflineLibraryShelf = {
  readonly summary: string;
  readonly groups: readonly OfflineLibraryShelfGroup[];
  readonly emptyActions: readonly string[];
};

export type OfflineLibraryEngine = {
  buildShelf(entries: readonly OfflineLibraryEntry[]): OfflineLibraryShelf;
};

export function createOfflineLibraryEngine(): OfflineLibraryEngine {
  return {
    buildShelf(entries) {
      const groups = groupOfflineLibraryEntries(entries).map((group) => {
        const shelfEntries = group.entries.map((entry) => ({
          jobId: entry.job.id,
          episodeLabel: formatEpisodeLabel(entry),
          badge: formatOfflineShelfBadge(entry.job, entry.status),
          detail: formatOfflineShelfDetail(entry.job, entry.status),
          previewImageUrl: entry.job.thumbnailPath ?? entry.job.posterUrl,
          playable: entry.status === "ready",
        }));
        const nextPlayableEpisodeLabel = shelfEntries.find((entry) => entry.playable)?.episodeLabel;

        return {
          key: group.key,
          titleId: group.titleId,
          titleName: group.titleName,
          label: group.titleName,
          detail: formatOfflineLibraryGroupDetail(group),
          nextPlayableEpisodeLabel,
          actionSummary: formatActionSummary({
            nextPlayableEpisodeLabel,
            issueCount: group.issueCount,
            entryCount: group.entries.length,
            mediaKind: group.mediaKind,
          }),
          artifactSummary: formatArtifactSummary(group.entries),
          readyCount: group.readyCount,
          issueCount: group.issueCount,
          previewImageUrl: group.previewImageUrl,
          entries: shelfEntries,
        };
      });

      return {
        summary:
          entries.length > 0
            ? `${groups.length} ${groups.length === 1 ? "title" : "titles"} · ${
                entries.length
              } local ${entries.length === 1 ? "item" : "items"} · local-only`
            : "No completed local videos yet",
        groups,
        emptyActions: ["Open downloads queue", "Search online"],
      };
    },
  };
}

function formatEpisodeLabel(entry: OfflineLibraryEntry): string {
  const { job } = entry;
  if (job.season !== undefined && job.episode !== undefined) {
    return `S${String(job.season).padStart(2, "0")}E${String(job.episode).padStart(2, "0")}`;
  }
  return job.mediaKind === "movie" ? "movie" : "episode";
}

function formatActionSummary(input: {
  readonly nextPlayableEpisodeLabel?: string;
  readonly issueCount: number;
  readonly entryCount: number;
  readonly mediaKind: OfflineLibraryEntry["job"]["mediaKind"];
}): string {
  const itemLabel =
    input.mediaKind === "movie"
      ? input.entryCount === 1
        ? "movie"
        : "movies"
      : input.entryCount === 1
        ? "episode"
        : "episodes";
  const parts = [
    input.nextPlayableEpisodeLabel ? `Play ${input.nextPlayableEpisodeLabel}` : "No playable files",
    `inspect ${input.entryCount} ${itemLabel}`,
    input.issueCount > 0
      ? `repair ${input.issueCount} ${input.issueCount === 1 ? "issue" : "issues"}`
      : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function formatArtifactSummary(entries: readonly OfflineLibraryEntry[]): string {
  const hasArtwork = entries.some((entry) => entry.job.thumbnailPath || entry.job.posterUrl);
  const hasSubtitles = entries.some((entry) => entry.job.subtitlePath);
  const hasTiming = entries.some((entry) => entry.job.introSkipJson);

  return [
    hasArtwork ? "artwork ready" : "artwork missing",
    hasSubtitles ? "subtitles cached" : "subtitles missing",
    hasTiming ? "timing cached" : "timing missing",
  ].join(" · ");
}
