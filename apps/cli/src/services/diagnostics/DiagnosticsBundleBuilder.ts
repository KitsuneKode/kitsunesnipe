import type { DiagnosticEvent } from "./diagnostic-event";
import { buildDiagnosticsSupportBundle, type DiagnosticsSupportBundle } from "./support-bundle";

export type DiagnosticsBundleBuilderInput = {
  readonly appVersion: string;
  readonly debug: boolean;
  readonly capabilities?: Record<string, unknown> | null;
  readonly events: readonly DiagnosticEvent[];
  readonly now?: () => Date;
};

export function buildDiagnosticsBundle(
  input: DiagnosticsBundleBuilderInput,
): DiagnosticsSupportBundle {
  return buildDiagnosticsSupportBundle(input);
}
