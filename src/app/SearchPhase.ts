// =============================================================================
// Search Phase
//
// Handles search input → results → title selection.
// Returns the selected title or cancellation/quit signals.
// =============================================================================

import type { Phase, PhaseResult, PhaseContext } from "@/app/Phase";
import type { TitleInfo } from "@/domain/types";
import { searchTitles } from "@/app/search-routing";
import { resolveCommands } from "@/app-shell/commands";
import { openBrowseShell } from "@/app-shell/ink-shell";
import { handleShellAction } from "@/app-shell/workflows";

export type SearchPhaseInput = {
  initialQuery?: string;
};

export class SearchPhase implements Phase<SearchPhaseInput | void, TitleInfo> {
  name = "search";

  async execute(
    input: SearchPhaseInput | void,
    context: PhaseContext,
  ): Promise<PhaseResult<TitleInfo>> {
    const { container } = context;
    const { searchRegistry, stateManager, logger } = container;

    try {
      stateManager.dispatch({ type: "RESET_SEARCH" });
      if (input && "initialQuery" in input && input.initialQuery?.trim()) {
        stateManager.dispatch({ type: "SET_SEARCH_QUERY", query: input.initialQuery.trim() });
      }
      stateManager.dispatch({ type: "SET_SEARCH_STATE", state: "idle" });

      while (true) {
        const currentState = stateManager.getState();
        if (currentState.searchQuery.trim().length > 0 && currentState.searchResults.length === 0) {
          stateManager.dispatch({ type: "SET_SEARCH_STATE", state: "loading" });

          const search = await searchTitles(currentState.searchQuery, {
            mode: currentState.mode,
            providerId: currentState.provider,
            animeLang: currentState.animeLang,
            searchRegistry,
          });
          const results = search.results;

          logger.info("Bootstrap search complete", {
            query: currentState.searchQuery,
            count: results.length,
            strategy: search.strategy,
            source: search.sourceId,
          });

          stateManager.dispatch({ type: "SET_SEARCH_RESULTS", results });
          stateManager.dispatch({ type: "SET_SEARCH_STATE", state: "ready" });
        }

        stateManager.dispatch({
          type: "SET_VIEW",
          view: currentState.searchResults.length > 0 ? "results" : "search",
        });

        const outcome = await openBrowseShell({
          mode: currentState.mode,
          provider: currentState.provider,
          initialQuery: currentState.searchQuery,
          placeholder: currentState.mode === "anime" ? "Demon Slayer" : "Breaking Bad",
          commands: resolveCommands(currentState, [
            "settings",
            "toggle-mode",
            "history",
            "diagnostics",
            "help",
            "about",
            "quit",
          ]),
          onSearch: async (query) => {
            stateManager.dispatch({ type: "SET_SEARCH_QUERY", query });
            stateManager.dispatch({ type: "SET_SEARCH_STATE", state: "loading" });

            const search = await searchTitles(query, {
              mode: stateManager.getState().mode,
              providerId: stateManager.getState().provider,
              animeLang: stateManager.getState().animeLang,
              searchRegistry,
            });
            const results = search.results;

            logger.info("Search complete", {
              query,
              count: results.length,
              strategy: search.strategy,
              source: search.sourceId,
            });

            stateManager.dispatch({ type: "SET_SEARCH_RESULTS", results });

            return {
              options: results.map((result) => ({
                value: result,
                label: result.year ? `${result.title} (${result.year})` : result.title,
                detail: `${result.type === "series" ? "Series" : "Movie"}${
                  result.overview ? ` · ${result.overview}` : ""
                }`,
              })),
              subtitle: `${results.length} results · ${search.sourceName}`,
              emptyMessage: "No results found. Adjust the query and try again.",
            };
          },
        });

        if (outcome.type === "cancelled") {
          return { status: "cancelled" };
        }

        if (outcome.type === "action") {
          if (outcome.action === "quit") {
            return { status: "cancelled" };
          }

          if (outcome.action === "toggle-mode") {
            const nextState = stateManager.getState();
            const newMode = nextState.mode === "anime" ? "series" : "anime";
            stateManager.dispatch({
              type: "SET_MODE",
              mode: newMode,
              provider:
                newMode === "anime"
                  ? nextState.defaultProviders.anime
                  : nextState.defaultProviders.series,
            });
            stateManager.dispatch({ type: "RESET_SEARCH" });
            stateManager.dispatch({ type: "SET_SEARCH_STATE", state: "idle" });
            continue;
          }

          if (outcome.action === "settings") {
            await handleShellAction({
              action: "settings",
              container,
            });
            continue;
          }

          const actionResult = await handleShellAction({
            action: outcome.action,
            container,
          });
          if (actionResult === "quit") {
            return { status: "cancelled" };
          }
          if (actionResult === "handled") {
            continue;
          }

          logger.info("Browse shell action", { action: outcome.action });
          continue;
        }

        const selected = outcome.value;

        // Convert SearchResult to TitleInfo
        const title: TitleInfo = {
          id: selected.id,
          type: selected.type,
          name: selected.title,
          year: selected.year,
          overview: selected.overview,
          posterUrl: selected.posterPath ?? undefined,
          episodeCount: selected.episodeCount,
        };

        stateManager.dispatch({ type: "SELECT_TITLE", title });

        return { status: "success", value: title };
      }
    } catch (e) {
      logger.error("Search phase error", { error: String(e) });
      return {
        status: "error",
        error: {
          code: "NETWORK_ERROR",
          message: String(e),
          retryable: true,
          service: searchRegistry.getDefault()?.metadata.id,
        },
      };
    }
  }
}
