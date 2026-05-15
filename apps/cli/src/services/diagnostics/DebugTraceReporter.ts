import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import type { DiagnosticCategory, DiagnosticEventInput } from "./diagnostic-event";
import { normalizeDiagnosticEvent } from "./diagnostic-event";
import { redactDiagnosticValue } from "./redaction";

export type DebugTraceReporterOptions = {
  readonly filePath: string;
  readonly categories?: ReadonlySet<DiagnosticCategory | string>;
};

export class DebugTraceReporter {
  constructor(private readonly options: DebugTraceReporterOptions) {
    mkdirSync(dirname(options.filePath), { recursive: true });
  }

  record(event: DiagnosticEventInput): void {
    if (this.options.categories?.size && !this.options.categories.has(event.category)) {
      return;
    }

    const normalized = normalizeDiagnosticEvent(event);
    const redacted = redactDiagnosticValue(normalized, {
      homeDir: process.env.HOME,
    });
    appendFileSync(this.options.filePath, `${JSON.stringify(redacted)}\n`, "utf8");
  }
}

export function parseTraceCategories(value: string | undefined): ReadonlySet<string> | undefined {
  const categories = value
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return categories && categories.length > 0 ? new Set(categories) : undefined;
}
