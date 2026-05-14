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

  return {
    results,
    subtitle:
      results.length > 0
        ? `${results.length} airing today · ${mode === "anime" ? "anime" : "series"} schedule`
        : `No ${mode === "anime" ? "anime" : "series"} releases found for today`,
    emptyMessage:
      mode === "anime"
        ? "No anime releases found for today. Search and recommendations still work normally."
        : "No TV releases found for today. Search and recommendations still work normally.",
  };
}

function toCalendarSearchResult(item: CatalogScheduleItem): SearchResult {
  const badgeLabel = item.status === "released" ? "new today" : "airs today";
  const source = item.source === "anilist" ? "AniList" : "TMDB";
  const year = item.releaseAt ? String(new Date(item.releaseAt).getFullYear()) : "";
  const episodeLabel =
    typeof item.episode === "number"
      ? `Episode ${item.episode}${item.episodeTitle ? `: ${item.episodeTitle}` : ""}`
      : "Scheduled release";

  return {
    id: item.titleId,
    type: item.type === "movie" ? "movie" : "series",
    title: item.titleName,
    year,
    overview: `${episodeLabel}. ${badgeLabel}. Provider availability is checked only when you choose playback.`,
    posterPath: item.posterPath ?? null,
    metadataSource: `${source} calendar · ${badgeLabel}`,
    episodeCount: item.episode,
  };
}
