import type { Container } from "@/container";
import type { SearchResult } from "@/domain/types";

import { buildDiscoverSections } from "./discover-sections";

export type DiscoverResultBundle = {
  readonly results: readonly SearchResult[];
  readonly subtitle: string;
  readonly emptyMessage: string;
};

export async function loadDiscoverResults(
  container: Pick<
    Container,
    "recommendationService" | "stateManager" | "historyStore" | "providerRegistry"
  >,
  options?: { refresh?: boolean },
): Promise<DiscoverResultBundle> {
  if (options?.refresh) {
    await container.recommendationService.clearCache();
  }
  const sections = await buildDiscoverSections(container);
  const mode = container.stateManager.getState().mode;
  const flatten: SearchResult[] = [];
  const seen = new Set<string>();

  for (const section of sections) {
    for (const item of section.items) {
      // Keep discover mode-aligned: anime mode focuses on episodic picks first.
      if (mode === "anime" && item.type !== "series") {
        continue;
      }
      const key = `${item.type}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      flatten.push({
        ...item,
        metadataSource: [item.metadataSource, section.label || section.reason]
          .filter(Boolean)
          .join(" · "),
      });
    }
  }

  return {
    results: flatten,
    subtitle:
      flatten.length > 0
        ? `${flatten.length} discover picks · ${mode === "anime" ? "anime mode" : "series and movies"}`
        : "No discover picks yet",
    emptyMessage:
      mode === "anime"
        ? "No anime recommendations right now. Finish a few episodes, then retry /discover."
        : "No recommendations right now. Finish something from history, then retry /discover.",
  };
}
