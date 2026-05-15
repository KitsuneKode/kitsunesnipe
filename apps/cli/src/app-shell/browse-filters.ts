import type {
  ReleaseFilter,
  SearchIntentMode,
  SearchSort,
  SearchIntentTypeFilter,
  WatchFilter,
} from "@/domain/search/SearchIntent";
import {
  describeSearchIntentFilters,
  parseSearchIntentText,
} from "@/domain/search/SearchIntentParser";

import type { BrowseShellOption } from "./types";

export type BrowseResultTypeFilter = SearchIntentTypeFilter;

export type BrowseResultFilters = {
  readonly type: BrowseResultTypeFilter;
  readonly genres?: readonly string[];
  readonly year?: string;
  readonly minRating?: number;
  readonly mode?: SearchIntentMode;
  readonly provider?: string;
  readonly downloaded?: boolean;
  readonly watched?: WatchFilter;
  readonly release?: ReleaseFilter;
  readonly sort?: SearchSort;
  readonly ignoredFilterCount?: number;
};

export type ParsedBrowseFilterQuery = {
  readonly searchQuery: string;
  readonly filters: BrowseResultFilters;
};

export function parseBrowseFilterQuery(query: string): ParsedBrowseFilterQuery {
  const parsedIntent = parseSearchIntentText(query);
  const type = parsedIntent.filters.type ?? "all";
  const minRating = parsedIntent.filters.minRating;
  let year: string | undefined;
  if (typeof parsedIntent.filters.year === "number") {
    year = String(parsedIntent.filters.year);
  }

  return {
    searchQuery: parsedIntent.query,
    filters: {
      type,
      ...(parsedIntent.filters.genres?.length ? { genres: parsedIntent.filters.genres } : {}),
      ...(year ? { year } : {}),
      ...(typeof minRating === "number" ? { minRating } : {}),
      ...(parsedIntent.mode ? { mode: parsedIntent.mode } : {}),
      ...(parsedIntent.filters.provider ? { provider: parsedIntent.filters.provider } : {}),
      ...(typeof parsedIntent.filters.downloaded === "boolean"
        ? { downloaded: parsedIntent.filters.downloaded }
        : {}),
      ...(parsedIntent.filters.watched ? { watched: parsedIntent.filters.watched } : {}),
      ...(parsedIntent.filters.release ? { release: parsedIntent.filters.release } : {}),
      ...(parsedIntent.sort ? { sort: parsedIntent.sort } : {}),
      ...(parsedIntent.errors.length ? { ignoredFilterCount: parsedIntent.errors.length } : {}),
    },
  };
}

export function applyBrowseResultFilters<T>(
  options: readonly BrowseShellOption<T>[],
  filters: BrowseResultFilters,
): readonly BrowseShellOption<T>[] {
  return options.filter((option) => {
    if (filters.type !== "all" && getOptionType(option) !== filters.type) return false;
    if (filters.year && !option.previewMeta?.includes(filters.year)) return false;
    if (filters.provider && !matchesProviderFilter(option, filters.provider)) return false;
    if (
      typeof filters.downloaded === "boolean" &&
      matchesDownloadedFilter(option) !== filters.downloaded
    ) {
      return false;
    }
    if (filters.watched && !matchesWatchedFilter(option, filters.watched)) return false;
    if (filters.release && !matchesReleaseFilter(option, filters.release)) return false;
    if (typeof filters.minRating === "number") {
      const rating = parseOptionRating(option);
      if (rating === null || rating < filters.minRating) return false;
    }
    return true;
  });
}

export function describeBrowseResultFilters(filters: BrowseResultFilters): readonly string[] {
  const intentBadges = describeSearchIntentFilters({
    sort: filters.sort,
    filters: {
      provider: filters.provider,
      downloaded: filters.downloaded,
      watched: filters.watched,
      release: filters.release,
    },
  });

  return [
    filters.mode ? `mode ${filters.mode}` : null,
    filters.type !== "all" ? `type ${filters.type}` : null,
    filters.genres?.length ? `genre ${filters.genres.join(",")}` : null,
    filters.year ? `year ${filters.year}` : null,
    typeof filters.minRating === "number" ? `rating >= ${filters.minRating}` : null,
    ...intentBadges,
    filters.ignoredFilterCount ? `${filters.ignoredFilterCount} ignored` : null,
  ].filter((value): value is string => Boolean(value));
}

export function hasBrowseResultFilters(filters: BrowseResultFilters): boolean {
  return describeBrowseResultFilters(filters).length > 0;
}

function getOptionType<T>(option: BrowseShellOption<T>): BrowseResultTypeFilter {
  const type = option.previewMeta?.find((value) => value === "Movie" || value === "Series");
  return type === "Movie" ? "movie" : type === "Series" ? "series" : "all";
}

function parseOptionRating<T>(option: BrowseShellOption<T>): number | null {
  const rating = option.previewRating ?? option.previewMeta?.find((value) => value.includes("/10"));
  if (!rating) return null;
  const parsed = Number.parseFloat(rating);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesProviderFilter<T>(option: BrowseShellOption<T>, provider: string): boolean {
  return getOptionSearchText(option).includes(provider.trim().toLowerCase());
}

function matchesDownloadedFilter<T>(option: BrowseShellOption<T>): boolean {
  const text = getOptionSearchText(option);
  return (
    hasAny(text, ["downloaded", "offline ready", "offline downloaded", "local file"]) &&
    !hasAny(text, ["not downloaded", "no download"])
  );
}

function matchesWatchedFilter<T>(option: BrowseShellOption<T>, watched: WatchFilter): boolean {
  const text = getOptionSearchText(option);
  const completed = hasAny(text, ["watched", "completed", "finished"]);
  const watching = hasAny(text, ["continue", "resume", "started", "in progress"]);

  if (watched === "completed") return completed;
  if (watched === "watching") return watching;
  if (watched === "unwatched") return !completed && !watching;
  return completed || watching;
}

function matchesReleaseFilter<T>(option: BrowseShellOption<T>, release: ReleaseFilter): boolean {
  const text = getOptionSearchText(option);
  if (release === "today") {
    return hasAny(text, ["release today", "releasing today", "airing today"]);
  }
  if (release === "upcoming") {
    return hasAny(text, ["release upcoming", "upcoming", "coming soon"]);
  }
  if (release === "this-week") {
    return hasAny(text, ["release this week", "this week", "this-week"]);
  }
  return false;
}

function getOptionSearchText<T>(option: BrowseShellOption<T>): string {
  const facts =
    option.previewFacts?.flatMap((fact) => [fact.label, fact.detail]).filter(Boolean) ?? [];
  return [
    option.label,
    option.detail,
    option.previewTitle,
    option.previewBody,
    option.previewNote,
    option.previewRating,
    ...(option.previewMeta ?? []),
    ...facts,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}

function hasAny(text: string, needles: readonly string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}
