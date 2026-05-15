import { describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { pruneOldDiagnosticFiles } from "@/services/diagnostics/retention";

describe("diagnostics retention", () => {
  test("keeps only the newest matching files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kunai-retention-"));
    try {
      for (let index = 0; index < 12; index += 1) {
        await writeFile(join(dir, `kunai-trace-${String(index).padStart(2, "0")}.jsonl`), "");
      }

      await pruneOldDiagnosticFiles({
        dir,
        prefix: "kunai-trace-",
        maxFiles: 10,
      });

      const files = (await readdir(dir)).sort();
      expect(files).toHaveLength(10);
      expect(files[0]).toBe("kunai-trace-02.jsonl");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
