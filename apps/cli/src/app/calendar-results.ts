import type { Container } from "@/container";
import type { SearchResult } from "@/domain/types";
import type { CatalogScheduleItem } from "@/services/catalog/CatalogScheduleService";

export type CalendarResultBundle = {
  readonly results: readonly SearchResult[];
  readonly subtitle: string;
  readonly emptyMessage: string;
};

export async function loadCalendarResults(
  container: Pick<Container, "stateManager" | "timelineService">,
  signal?: AbortSignal,
): Promise<CalendarResultBundle> {
  const mode = container.stateManager.getState().mode;
  const items = await container.timelineService.loadReleasingToday(mode, signal);
  const results = items.map((item) => toCalendarSearchResult(item));
  const releasedCount = items.filter((item) => item.status === "released").length;
  const upcomingCount = items.filter((item) => item.status !== "released").length;

  return {
    results,
    subtitle:
      results.length > 0
        ? `${upcomingCount} airing today · ${releasedCount} released · ${
            mode === "anime" ? "anime" : "series"
          } schedule`
        : `No ${mode === "anime" ? "anime" : "series"} releases found for today`,
    emptyMessage:
      mode === "anime"
        ? "No anime releases found for today. Search and recommendations still work normally."
        : "No TV releases found for today. Search and recommendations still work normally.",
  };
}

function toCalendarSearchResult(item: CatalogScheduleItem): SearchResult {
  const releaseLabel = describeCalendarRelease(item);
  const badgeLabel = item.status === "released" ? "new today" : "airs today";
  const source = item.source === "anilist" ? "AniList" : "TMDB";
  const year = item.releaseAt ? String(new Date(item.releaseAt).getFullYear()) : "";
  const episodeLabel =
    typeof item.episode === "number"
      ? `${formatCalendarEpisodeCode(item)}${item.episodeTitle ? ` · ${item.episodeTitle}` : ""}`
      : "Scheduled release";

  return {
    id: item.titleId,
    type: item.type === "movie" ? "movie" : "series",
    title: item.titleName,
    year,
    overview: `${episodeLabel}. ${releaseLabel}. Availability is checked only when you choose playback.`,
    posterPath: item.posterPath ?? null,
    metadataSource: `${source} calendar · ${badgeLabel} · ${item.releasePrecision}`,
    episodeCount: item.episode,
  };
}

function describeCalendarRelease(item: CatalogScheduleItem): string {
  if (!item.releaseAt || item.releasePrecision === "unknown") {
    return item.status === "released" ? "available today" : "scheduled today";
  }

  if (item.releasePrecision === "timestamp") {
    const release = new Date(item.releaseAt);
    const time = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(release);
    return item.status === "released" ? `released today at ${time}` : `airs today at ${time}`;
  }

  return item.status === "released" ? "available today" : "scheduled for today";
}

function formatCalendarEpisodeCode(item: CatalogScheduleItem): string {
  if (typeof item.season === "number" && typeof item.episode === "number") {
    return `S${String(item.season).padStart(2, "0")}E${String(item.episode).padStart(2, "0")}`;
  }
  if (typeof item.episode === "number") return `Episode ${item.episode}`;
  return "Scheduled release";
}
