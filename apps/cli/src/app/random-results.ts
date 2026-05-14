import type { SearchResult } from "@/domain/types";

import { loadDiscoverResults, type DiscoverResultBundle } from "./discover-results";
import { loadSurpriseList } from "./discovery-lists";

export type RandomResultOptions = {
  readonly count?: number;
  readonly random?: () => number;
  readonly signal?: AbortSignal;
};

export async function loadRandomResults(
  container: Parameters<typeof loadDiscoverResults>[0],
  options: RandomResultOptions = {},
): Promise<DiscoverResultBundle> {
  // Random should feel like a cheap reroll, not a cache purge. The discover surface
  // already owns SWR refreshes; keeping cache warm avoids first-try transient empties.
  const mode = container.stateManager.getState().mode;
  const [discover, surprise] = await Promise.all([
    loadDiscoverResults(container),
    loadSurpriseList(mode, options.signal, { random: options.random }).catch(
      (): SearchResult[] => [],
    ),
  ]);
  return buildRandomResultBundle(discover, surprise, options);
}

export function buildRandomResultBundle(
  discover: DiscoverResultBundle,
  surpriseResults: readonly SearchResult[] = [],
  options: RandomResultOptions = {},
): DiscoverResultBundle {
  const rawResults = buildRandomResultTray(
    mixRandomCandidatePools(discover.results, surpriseResults),
    options,
  );
  const results = ensureSurpriseCandidate(rawResults, surpriseResults);

  return {
    results,
    subtitle:
      results.length > 0
        ? `${results.length} surprise picks · rerun /random or /surprise to spin again`
        : "No random picks available yet",
    emptyMessage:
      "Random needs search, trending, or history signals before it can suggest anything.",
  };
}

function ensureSurpriseCandidate(
  results: readonly SearchResult[],
  surpriseResults: readonly SearchResult[],
): readonly SearchResult[] {
  if (results.length === 0 || surpriseResults.length === 0) return results;
  const resultKeys = new Set(results.map((result) => `${result.type}:${result.id}`));
  const hasSurprise = surpriseResults.some((result) =>
    resultKeys.has(`${result.type}:${result.id}`),
  );
  if (hasSurprise) return results;

  const replacement = surpriseResults[0];
  if (!replacement) return results;
  return [
    ...results.slice(0, -1),
    {
      ...replacement,
      metadataSource: ["Random pick", replacement.metadataSource].filter(Boolean).join(" · "),
    },
  ];
}

export function mixRandomCandidatePools(
  discoverResults: readonly SearchResult[],
  surpriseResults: readonly SearchResult[],
): readonly SearchResult[] {
  const mixed: SearchResult[] = [];
  const seen = new Set<string>();
  const maxLength = Math.max(discoverResults.length, surpriseResults.length);

  for (let index = 0; index < maxLength; index += 1) {
    const surprise = surpriseResults[index];
    if (surprise) pushUnique(mixed, seen, surprise);
    const discover = discoverResults[index];
    if (discover) pushUnique(mixed, seen, discover);
  }

  return mixed;
}

function pushUnique(target: SearchResult[], seen: Set<string>, result: SearchResult): void {
  const key = `${result.type}:${result.id}`;
  if (seen.has(key)) return;
  seen.add(key);
  target.push(result);
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
