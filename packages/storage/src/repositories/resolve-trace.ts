import { resolveTraceSchema } from "@kunai/schemas";
import type { ResolveTrace } from "@kunai/types";

import type { KunaiDatabase } from "../sqlite";

interface ResolveTraceRow {
  readonly trace_json: string;
}

export class ResolveTraceRepository {
  constructor(private readonly db: KunaiDatabase) {}

  add(trace: ResolveTrace, maxEntries = 200): void {
    const parsed = resolveTraceSchema.parse(trace);
    const now = new Date().toISOString();

    const addAndPrune = this.db.transaction(() => {
      this.db
        .query(
          `
            INSERT INTO resolve_traces (trace_id, trace_json, started_at, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(trace_id) DO UPDATE SET
              trace_json = excluded.trace_json,
              started_at = excluded.started_at
          `,
        )
        .run(parsed.id, JSON.stringify(parsed), parsed.startedAt, now);

      this.db
        .query(
          `
            DELETE FROM resolve_traces
            WHERE trace_id IN (
              SELECT trace_id
              FROM resolve_traces
              ORDER BY started_at DESC
              LIMIT -1 OFFSET ?
            )
          `,
        )
        .run(maxEntries);
    });

    addAndPrune();
  }

  get(traceId: string): ResolveTrace | undefined {
    const row = this.db
      .query<ResolveTraceRow, [string]>("SELECT trace_json FROM resolve_traces WHERE trace_id = ?")
      .get(traceId);

    return row === null ? undefined : resolveTraceSchema.parse(JSON.parse(row.trace_json));
  }

  listRecent(limit = 20): readonly ResolveTrace[] {
    return this.db
      .query<ResolveTraceRow, [number]>(
        "SELECT trace_json FROM resolve_traces ORDER BY started_at DESC LIMIT ?",
      )
      .all(limit)
      .map((row) => resolveTraceSchema.parse(JSON.parse(row.trace_json)));
  }
}
