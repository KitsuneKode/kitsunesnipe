import type { ListShellActionContext, ShellOption } from "@/app-shell/pickers/list-shell-types";

export async function chooseFromListShell<T>({
  title,
  subtitle,
  options,
  actionContext,
}: {
  title: string;
  subtitle: string;
  options: readonly ShellOption<T>[];
  actionContext?: ListShellActionContext;
}): Promise<T | null> {
  const { openListShell } = await import("@/app-shell/ink-shell");
  return openListShell({ title, subtitle, options, actionContext });
}
