import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildDebugSessionInstructions,
  DebugTraceReporter,
  resolveTraceCategories,
} from "@/services/diagnostics/DebugTraceReporter";

describe("DebugTraceReporter", () => {
  test("writes redacted JSONL events for selected categories", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kunai-debug-trace-"));
    try {
      const filePath = join(dir, "trace.jsonl");
      const reporter = new DebugTraceReporter({
        filePath,
        categories: new Set(["provider"]),
      });

      reporter.record({
        category: "search",
        message: "ignored",
      });
      reporter.record({
        category: "provider",
        message: "provider event",
        context: {
          url: "https://cdn.example/stream.m3u8?token=secret",
        },
      });

      const lines = (await readFile(filePath, "utf8")).trim().split("\n");
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({
        category: "provider",
        message: "provider event",
        context: {
          url: "https://cdn.example/stream.m3u8?token=[redacted]",
        },
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("debug session provides default trace categories when KUNAI_TRACE is not set", () => {
    expect([...resolveTraceCategories({ debugSession: true })!]).toEqual([
      "provider",
      "playback",
      "cache",
      "network",
      "subtitle",
    ]);
  });

  test("explicit trace categories override debug session defaults", () => {
    expect([
      ...resolveTraceCategories({ explicit: "provider,cache", debugSession: true })!,
    ]).toEqual(["provider", "cache"]);
  });

  test("builds concise debug session instructions with exportable trace path", () => {
    const lines = buildDebugSessionInstructions({
      tracePath: "/tmp/kunai-trace.jsonl",
      categories: new Set(["provider", "playback"]),
    });

    expect(lines.join("\n")).toContain("/tmp/kunai-trace.jsonl");
    expect(lines.join("\n")).toContain("provider,playback");
    expect(lines.join("\n")).toContain("/export-diagnostics");
  });
});
