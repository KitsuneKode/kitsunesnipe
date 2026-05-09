import type { ShellMode } from "@/domain/types";

/** Maps session/profile language fields into columns stored on download_jobs for re-resolve. */
export function persistLanguageHintsFromEnqueueInput(input: {
  readonly mode?: ShellMode;
  readonly audioPreference?: string;
  readonly subtitlePreference?: string;
}): { readonly subLang?: string; readonly animeLang?: "sub" | "dub" } {
  const subtitle = input.subtitlePreference?.trim();
  const subLang = subtitle && subtitle.length > 0 ? subtitle : "eng";
  if (input.mode === "anime") {
    const audio = input.audioPreference?.trim().toLowerCase() ?? "";
    return { subLang, animeLang: audio === "dub" ? "dub" : "sub" };
  }
  return { subLang };
}
