// =============================================================================
// Session Controller
//
// Orchestrates the application lifecycle through phases.
// Outer loop: Search → Playback → (repeat or quit)
// =============================================================================

import type { Container } from "../container";
import type { Phase, PhaseResult, PhaseContext } from "./Phase";
import type { TitleInfo } from "../domain/types";

export type SessionOutcome = "quit" | "mode_switch";

export class SessionController {
  constructor(private container: Container) {}

  async run(): Promise<void> {
    const { logger, tracer, stateManager } = this.container;

    await tracer.span("session", async () => {
      try {
        while (true) {
          // Phase 1: Search
          const searchResult = await this.executePhase(
            null as unknown as void,
            new (await import("./SearchPhase")).SearchPhase(),
          );

          if (searchResult.status === "quit") break;
          if (searchResult.status === "cancelled") continue;
          if (searchResult.status === "error") {
            // Log error and continue to next iteration
            logger.error("Search phase failed", { error: searchResult.error });
            continue;
          }

          const title = searchResult.value;

          // Phase 2: Playback (inner loop for episodes)
          const playbackResult = await this.executePhase(
            title,
            new (await import("./PlaybackPhase")).PlaybackPhase(),
          );

          if (playbackResult.status === "quit") break;
          if (playbackResult.status === "cancelled") continue;
          if (playbackResult.status === "error") {
            logger.error("Playback phase failed", { error: playbackResult.error });
            continue;
          }

          // Playback completed (mode switch or back to search)
          const outcome = playbackResult.value;
          if (outcome === "quit") break;
          // "mode_switch" falls through to next iteration
        }
      } catch (e) {
        logger.error("Session fatal error", { error: String(e) });
        throw e;
      }
    });
  }

  private async executePhase<TInput, TOutput>(
    input: TInput,
    phase: Phase<TInput, TOutput>,
  ): Promise<PhaseResult<TOutput>> {
    const { tracer } = this.container;

    return tracer.span(phase.name, async () => {
      const context: PhaseContext = { container: this.container };
      return phase.execute(input, context);
    });
  }
}
