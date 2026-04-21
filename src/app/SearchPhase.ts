// =============================================================================
// Search Phase
//
// Handles search input → results → title selection.
// Returns the selected title or cancellation/quit signals.
// =============================================================================

import type { Phase, PhaseResult, PhaseContext } from "./Phase";
import type { TitleInfo } from "../domain/types";

export class SearchPhase implements Phase<void, TitleInfo> {
  name = "search";

  async execute(
    _input: void,
    context: PhaseContext,
  ): Promise<PhaseResult<TitleInfo>> {
    const { container } = context;
    const { shell, searchRegistry, stateManager, logger } = container;

    try {
      // Initialize search UI state
      stateManager.dispatch({ type: "RESET_SEARCH" });
      stateManager.dispatch({ type: "SET_SEARCH_STATE", state: "idle" });

      // Get search service based on current mode
      const searchService = searchRegistry.getDefault();
      logger.info("Using search service", {
        service: searchService.metadata.id,
      });

      // Show search-first UI and wait for selection
      // For now, delegate to the existing shell functions
      // TODO: Implement search-first Ink shell with live results

      // Use legacy flow for now:
      const { openHomeShell } = await import("../app-shell/ink-shell");
      const { openSearchShell } = await import("../app-shell/ink-shell");
      const { openListShell } = await import("../app-shell/ink-shell");
      const { searchVideasy } = await import("../search");

      // ── Home Gate: Show hotkeys [c]/[a]/[q] before search ─────────────────────
      let gating = true;
      while (gating) {
        const gateAction = await openHomeShell({
          mode: stateManager.getState().mode,
          provider: stateManager.getState().provider,
          subtitle: stateManager.getState().subLang,
          animeLang: "sub", // TODO: Get from config
          status: { label: "Ready", tone: "neutral" },
        });

        if (gateAction === "quit") {
          return { status: "cancelled" };
        }
        if (gateAction === "toggle-mode") {
          const newMode =
            stateManager.getState().mode === "anime" ? "series" : "anime";
          stateManager.dispatch({
            type: "SET_MODE",
            mode: newMode,
            provider: newMode === "anime" ? "allanime" : "vidking", // TODO: Get from config
          });
        } else if (gateAction === "settings") {
          // TODO: Open settings overlay
          logger.info("Settings - not implemented");
        } else {
          gating = false; // Proceed to search
        }
      }

      // Prompt for search query
      const query = await openSearchShell({
        mode: stateManager.getState().mode,
        provider: stateManager.getState().provider,
        placeholder:
          stateManager.getState().mode === "anime"
            ? "Demon Slayer"
            : "Breaking Bad",
      });

      if (!query) {
        return { status: "cancelled" };
      }

      // Search
      stateManager.dispatch({ type: "SET_SEARCH_QUERY", query });
      stateManager.dispatch({ type: "SET_SEARCH_STATE", state: "loading" });

      const results = await searchService.search(query);

      stateManager.dispatch({ type: "SET_SEARCH_RESULTS", results });

      if (results.length === 0) {
        return {
          status: "error",
          error: {
            code: "STREAM_NOT_FOUND",
            message: "No results found",
            retryable: false,
          },
        };
      }

      // Show results and wait for selection
      const selected = await openListShell<
        import("../domain/types").SearchResult
      >({
        title: "Choose title",
        subtitle: `${results.length} results · Search mode`,
        options: results.map((r: import("../domain/types").SearchResult) => ({
          value: r,
          label: `${r.title} (${r.year})`,
          detail: `${r.type === "series" ? "Series" : "Movie"}${
            r.overview ? ` · ${r.overview}` : ""
          }`,
        })),
      });

      if (!selected) {
        return { status: "cancelled" };
      }

      // Convert SearchResult to TitleInfo
      const title: TitleInfo = {
        id: selected.id,
        type: selected.type,
        name: selected.title,
        year: selected.year,
        overview: selected.overview,
        posterUrl: selected.posterPath ?? undefined,
      };

      stateManager.dispatch({ type: "SELECT_TITLE", title });

      return { status: "success", value: title };
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
