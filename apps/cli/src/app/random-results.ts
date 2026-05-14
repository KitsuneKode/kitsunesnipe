import type { SearchResult } from "@/domain/types";

import { loadDiscoverResults, type DiscoverResultBundle } from "./discover-results";

export type RandomResultOptions = {
  readonly count?: number;
  readonly random?: () => number;
};

export async function loadRandomResults(
  container: Parameters<typeof loadDiscoverResults>[0],
  options: RandomResultOptions = {},
): Promise<DiscoverResultBundle> {
  const discover = await loadDiscoverResults(container, { refresh: true });
  const results = buildRandomResultTray(discover.results, options);

  return {
    results,
    subtitle:
      results.length > 0
        ? `${results.length} random picks · rerun /random to spin again`
        : "No random picks available yet",
    emptyMessage:
      discover.emptyMessage ||
      "Random needs search, trending, or history signals before it can suggest anything.",
  };
}

export function buildRandomResultTray(
  results: readonly SearchResult[],
  options: RandomResultOptions = {},
): readonly SearchResult[] {
  const count = Math.max(1, Math.min(5, options.count ?? 5));
  const random = options.random ?? Math.random;
  const shuffled = [...results];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    const replacement = shuffled[target];
    if (!current || !replacement) continue;
    shuffled[index] = replacement;
    shuffled[target] = current;
  }

  return shuffled.slice(0, count).map((result) => ({
    ...result,
    metadataSource: ["Random pick", result.metadataSource].filter(Boolean).join(" · "),
  }));
}
