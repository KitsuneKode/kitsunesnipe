import { useStdout } from "ink";

import {
  getShellViewportPolicy,
  type ShellViewportKind,
  type ShellViewportPolicy,
} from "./layout-policy";

/**
 * Returns a live viewport policy that re-evaluates on every terminal resize.
 * Ink re-renders when terminal size changes, so this hook is automatically reactive.
 */
export function useViewportPolicy(
  kind: ShellViewportKind,
  options: { forceCompact?: boolean } = {},
): ShellViewportPolicy {
  const { stdout } = useStdout();
  return getShellViewportPolicy(kind, stdout.columns ?? 80, stdout.rows ?? 24, options);
}
