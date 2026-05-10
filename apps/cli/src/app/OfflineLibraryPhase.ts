import type { Phase, PhaseContext, PhaseResult } from "@/app/Phase";

/** CLI `--offline`: opens the same flow as `/library`; mpv inherits stdio when stdin is a TTY. */
export class OfflineLibraryPhase implements Phase<void, "back"> {
  readonly name = "offline-library";

  async execute(_input: void, context: PhaseContext): Promise<PhaseResult<"back">> {
    const { stateManager } = context.container;
    stateManager.dispatch({ type: "OPEN_OVERLAY", overlay: { type: "downloads" } });

    await new Promise<void>((resolve) => {
      const unsubscribe = stateManager.subscribe((state) => {
        const top = state.activeModals.at(-1);
        if (!top || top.type !== "downloads") {
          unsubscribe();
          resolve();
        }
      });
    });

    return { status: "success", value: "back" };
  }
}
