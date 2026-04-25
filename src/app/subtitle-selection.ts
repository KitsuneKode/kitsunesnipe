import type { StreamInfo, SubtitleTrack } from "@/domain/types";

export type SubtitleDecision = {
  subtitle: string | null;
  reason:
    | "disabled"
    | "provider-default"
    | "interactive-picked"
    | "interactive-cancelled"
    | "no-tracks";
  availableTracks: number;
};

export async function choosePlaybackSubtitle({
  stream,
  subLang,
  pickSubtitle,
}: {
  stream: StreamInfo;
  subLang: string;
  pickSubtitle: (tracks: readonly SubtitleTrack[]) => Promise<string | null>;
}): Promise<SubtitleDecision> {
  if (subLang === "none") {
    return {
      subtitle: null,
      reason: "disabled",
      availableTracks: stream.subtitleList?.length ?? 0,
    };
  }

  if (subLang === "fzf") {
    if (!stream.subtitleList?.length) {
      return {
        subtitle: stream.subtitle ?? null,
        reason: "no-tracks",
        availableTracks: 0,
      };
    }

    const selected = await pickSubtitle(stream.subtitleList);
    return {
      subtitle: selected,
      reason: selected ? "interactive-picked" : "interactive-cancelled",
      availableTracks: stream.subtitleList.length,
    };
  }

  return {
    subtitle: stream.subtitle ?? null,
    reason: stream.subtitle ? "provider-default" : "no-tracks",
    availableTracks: stream.subtitleList?.length ?? 0,
  };
}
