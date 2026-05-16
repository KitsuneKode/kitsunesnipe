import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { decideRecovery } from "@/domain/recovery/RecoveryPolicy";
import {
  classifyPlaybackFailureFromEvent,
  recoveryForPlaybackFailure,
} from "@/infra/player/playback-failure-classifier";
import { createPlaybackWatchdog } from "@/infra/player/playback-watchdog";
import type { PlayerPlaybackEvent } from "@/infra/player/PlayerService";

describe("playback recovery harness", () => {
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const originalDateNow = Date.now;

  let timers: { id: number; callback: () => void }[] = [];
  let nowMs = 0;
  let nextTimerId = 1;

  beforeEach(() => {
    timers = [];
    nowMs = 0;
    nextTimerId = 1;
    globalThis.setInterval = ((callback: (...args: unknown[]) => void) => {
      const id = nextTimerId++;
      timers.push({ id, callback: callback as () => void });
      return id as unknown as ReturnType<typeof setInterval>;
    }) as unknown as typeof setInterval;
    globalThis.clearInterval = ((id: ReturnType<typeof setInterval>) => {
      timers = timers.filter((timer) => timer.id !== Number(id as unknown as number));
    }) as unknown as typeof clearInterval;
    Date.now = () => nowMs;
  });

  afterEach(() => {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
    Date.now = originalDateNow;
  });

  const runTimers = () => {
    for (const timer of timers) timer.callback();
  };

  test("slow-but-moving streams surface wait guidance without provider fallback pressure", () => {
    const events: PlayerPlaybackEvent[] = [];
    const watchdog = createPlaybackWatchdog((event) => events.push(event), {
      intervalMs: 100,
      cacheStallAfterMs: 5_000,
      networkReadDeadAfterMs: 5_000,
      slowNetworkAfterMs: 500,
    });

    watchdog.observe({
      source: "ipc",
      observedAt: 0,
      positionSeconds: 42,
      durationSeconds: 1800,
      pausedForCache: true,
      demuxerViaNetwork: true,
      demuxerCacheUnderrun: true,
      demuxerRawInputRate: 256,
      demuxerCacheDurationSeconds: 0.2,
      cacheSpeedBytesPerSecond: 256,
    });
    nowMs = 600;
    runTimers();

    const slow = events.find(
      (event) => event.type === "stream-slow" && event.state === "slow-network-suspected",
    );
    expect(slow).toEqual(
      expect.objectContaining({ type: "stream-slow", state: "slow-network-suspected" }),
    );
    expect(classifyPlaybackFailureFromEvent(slow!)).toBe("slow-stream");
    expect(recoveryForPlaybackFailure("slow-stream").action).toBe("wait");
    expect(
      decideRecovery({
        mode: "guided",
        intent: "automatic",
        network: "online",
        cache: "none",
        slowResolveMs: 6_000,
        compatibleProviderAvailable: true,
      }).decision,
    ).toBe("ask-user");
    expect(events.filter((event) => event.type === "stream-stalled")).toHaveLength(0);

    watchdog.stop();
  });

  test("network-read-dead streams refresh first instead of penalizing local network", () => {
    const dead: PlayerPlaybackEvent = {
      type: "stream-stalled",
      stallKind: "network-read-dead",
      secondsWithoutProgress: 8,
    };

    const failureClass = classifyPlaybackFailureFromEvent(dead);
    expect(failureClass).toBe("expired-stream");
    expect(recoveryForPlaybackFailure(failureClass).action).toBe("refresh");
    expect(
      decideRecovery({
        mode: "guided",
        intent: "refresh",
        network: "limited",
        cache: "none",
        failureClass: "expired-stream",
        compatibleProviderAvailable: true,
      }).providerHealthPenalty,
    ).toBe(false);
  });

  test("long user pauses do not become recovery events", () => {
    const events: PlayerPlaybackEvent[] = [];
    const watchdog = createPlaybackWatchdog((event) => events.push(event), {
      intervalMs: 100,
      stallAfterMs: 500,
    });

    watchdog.observe({
      source: "ipc",
      observedAt: 0,
      positionSeconds: 100,
      durationSeconds: 1200,
      paused: true,
    });
    nowMs = 10_000;
    runTimers();

    expect(events.filter((event) => event.type === "stream-stalled")).toHaveLength(0);
    expect(events.filter((event) => event.type === "stream-slow")).toHaveLength(0);

    watchdog.stop();
  });
});
