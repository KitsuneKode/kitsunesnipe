import type { StreamInfo, SubtitleTrack } from "@/domain/types";
import { selectSubtitle } from "@/subtitle";
import type { ProviderResolveResult, SubtitleCandidate } from "@kunai/types";

export interface ProviderResultAdapterInput {
  readonly result: ProviderResolveResult;
  readonly title: string;
  readonly subtitlePreference: string;
}

export function providerResolveResultToStreamInfo(
  input: ProviderResultAdapterInput,
): StreamInfo | null {
  const { result, title, subtitlePreference } = input;

  if (!result.streams.length) {
    return null;
  }

  const selected =
    result.streams.find((stream) => stream.id === result.selectedStreamId) ?? result.streams[0];
  if (!selected?.url) {
    return null;
  }

  const subtitleList = result.subtitles.map(subtitleCandidateToTrack);
  const pickedSubtitle =
    subtitlePreference === "none" ? null : selectSubtitle(subtitleList, subtitlePreference);

  return {
    url: selected.url,
    headers: selected.headers ?? {},
    subtitle: pickedSubtitle?.url,
    subtitleList,
    subtitleSource: subtitleList.length > 0 ? "provider" : "none",
    subtitleEvidence: {
      directSubtitleObserved: subtitleList.length > 0,
      wyzieSearchObserved: false,
      reason: subtitleList.length > 0 ? "provider-default" : "not-observed",
    },
    title,
    timestamp: Date.now(),
    providerResolveResult: result,
  };
}

export function subtitleCandidateToTrack(candidate: SubtitleCandidate): SubtitleTrack {
  return {
    url: candidate.url,
    display: candidate.label,
    language: candidate.language,
    release: candidate.syncEvidence,
    sourceKind:
      candidate.source === "provider" || candidate.source === "embedded" ? "embedded" : "external",
    sourceName: candidate.source,
    isHearingImpaired: looksLikeHiSubtitle(candidate),
  };
}

export function looksLikeHiSubtitle(
  candidate: Pick<SubtitleCandidate, "label" | "syncEvidence">,
): boolean {
  const raw = `${candidate.label ?? ""} ${candidate.syncEvidence ?? ""}`.toLowerCase();
  return raw.includes("sdh") || /\bhi\b/.test(raw) || raw.includes("hearing");
}
