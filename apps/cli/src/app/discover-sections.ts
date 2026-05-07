// =============================================================================
// Discover Sections Builder
//
// Single source of truth for the 3-section discover list composition.
// Used by both main.ts and PlaybackPhase.ts.
// =============================================================================

import type { Container } from "@/container";
import type { RecommendationSection } from "@/services/recommendations/RecommendationService";

/**
 * Builds the full discover section list from history and TMDB.
 * Fetches in parallel; null sections (no history, no genres) are filtered out.
 */
export async function buildDiscoverSections(
  container: Pick<Container, "historyStore" | "recommendationService" | "stateManager">,
): Promise<readonly RecommendationSection[]> {
  const history = await container.historyStore.getAll();

  const mostRecentCompleted = Object.entries(history)
    .filter(([, entry]) => entry.completed)
    .sort((a, b) => new Date(b[1].watchedAt).getTime() - new Date(a[1].watchedAt).getTime())[0];

  // SearchResult does not currently carry genreIds; genre affinity is skipped
  // until the field is added to the domain type.
  const topGenres: number[] = [];

  const results = await Promise.all([
    mostRecentCompleted
      ? container.recommendationService
          .getForTitle(mostRecentCompleted[0], mostRecentCompleted[1].type)
          .then((s) => ({ ...s, label: `Because you watched ${mostRecentCompleted[1].title}` }))
      : null,
    container.recommendationService
      .getTrending()
      .then((s) => ({ ...s, label: "Trending this week" })),
    topGenres.length > 0
      ? container.recommendationService
          .getGenreAffinity(topGenres)
          .then((s) => ({ ...s, label: "From your watch pattern" }))
      : null,
  ]);

  return results.filter((s): s is RecommendationSection => s !== null);
}
