import type { Logger } from "@/infra/logger/Logger";
import type { DiagnosticsStore } from "@/services/diagnostics/DiagnosticsStore";
import type { ActivePlayerControl, PlayerControlService } from "./PlayerControlService";

export class PlayerControlServiceImpl implements PlayerControlService {
  private active: ActivePlayerControl | null = null;

  constructor(
    private readonly deps: {
      logger: Logger;
      diagnosticsStore: DiagnosticsStore;
    },
  ) {}

  setActive(control: ActivePlayerControl | null): void {
    this.active = control;
  }

  getActive(): ActivePlayerControl | null {
    return this.active;
  }

  async stopCurrentPlayback(reason = "user-requested"): Promise<boolean> {
    const active = this.active;
    if (!active) {
      this.deps.diagnosticsStore.record({
        category: "playback",
        message: "Playback stop requested without active player",
        context: { reason },
      });
      return false;
    }

    this.deps.logger.info("Stopping active playback", { id: active.id, reason });
    this.deps.diagnosticsStore.record({
      category: "playback",
      message: "Stopping active playback",
      context: { id: active.id, reason },
    });
    await active.stop(reason);
    return true;
  }
}
