import type { PlaybackTimingMetadata } from "@/domain/types";

export function mergeTimingMetadata(
  primary: PlaybackTimingMetadata | null,
  secondary: PlaybackTimingMetadata | null,
): PlaybackTimingMetadata | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary;
  if (!secondary) return primary;

  return {
    tmdbId: primary.tmdbId,
    type: primary.type,
    intro: primary.intro.length ? primary.intro : secondary.intro,
    recap: primary.recap.length ? primary.recap : secondary.recap,
    credits: primary.credits.length ? primary.credits : secondary.credits,
    preview: primary.preview.length ? primary.preview : secondary.preview,
  };
}
