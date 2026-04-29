import { expect, test } from "bun:test";

import { PlayerControlServiceImpl } from "@/infra/player/PlayerControlServiceImpl";

test("PlayerControlServiceImpl stops the active player and clears no state implicitly", async () => {
  let stoppedReason = "";
  const service = new PlayerControlServiceImpl({
    logger: {
      debug() {},
      info() {},
      warn() {},
      error() {},
      fatal() {},
      child() {
        return this;
      },
    },
    diagnosticsStore: {
      record() {},
      getRecent() {
        return [];
      },
      clear() {},
    },
  });

  service.setActive({
    id: "player-1",
    async stop(reason) {
      stoppedReason = reason ?? "";
    },
  });

  expect(await service.stopCurrentPlayback("test-stop")).toBe(true);
  expect(stoppedReason).toBe("test-stop");
  expect(service.getActive()?.id).toBe("player-1");
});

test("PlayerControlServiceImpl reports false when no player is active", async () => {
  const service = new PlayerControlServiceImpl({
    logger: {
      debug() {},
      info() {},
      warn() {},
      error() {},
      fatal() {},
      child() {
        return this;
      },
    },
    diagnosticsStore: {
      record() {},
      getRecent() {
        return [];
      },
      clear() {},
    },
  });

  expect(await service.stopCurrentPlayback("nothing-active")).toBe(false);
});
