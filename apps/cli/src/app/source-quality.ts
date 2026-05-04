import type { StreamInfo } from "@/domain/types";

type SourceOption = {
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
};

type QualityOption = {
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
};

export function buildSourcePickerOptions(stream: StreamInfo): readonly SourceOption[] {
  const result = stream.providerResolveResult;
  if (!result) return [];

  if (result.sources && result.sources.length > 0) {
    return result.sources.map((source) => ({
      value: source.id,
      label:
        source.status === "selected"
          ? `${source.label ?? source.host ?? source.id}  ·  current`
          : (source.label ?? source.host ?? source.id),
      detail: [source.kind, source.status, source.host].filter(Boolean).join("  ·  "),
    }));
  }

  const sourceIds = new Set<string>();
  const options: SourceOption[] = [];
  for (const candidate of result.streams) {
    const sourceId = candidate.sourceId;
    if (!sourceId || sourceIds.has(sourceId)) continue;
    sourceIds.add(sourceId);
    const selected = candidate.id === result.selectedStreamId;
    options.push({
      value: sourceId,
      label: selected ? `${sourceId}  ·  current` : sourceId,
      detail: candidate.protocol,
    });
  }
  return options;
}

export function buildQualityPickerOptions(stream: StreamInfo): readonly QualityOption[] {
  const result = stream.providerResolveResult;
  if (!result) return [];

  const options = result.streams
    .filter((candidate) => typeof candidate.url === "string" && candidate.url.length > 0)
    .map((candidate) => ({
      value: candidate.id,
      label:
        candidate.id === result.selectedStreamId
          ? `${candidate.qualityLabel ?? candidate.container ?? candidate.id}  ·  current`
          : (candidate.qualityLabel ?? candidate.container ?? candidate.id),
      detail: [candidate.protocol, candidate.audioLanguage, candidate.hardSubLanguage]
        .filter(Boolean)
        .join("  ·  "),
      rank: candidate.qualityRank ?? 0,
    }))
    .sort((left, right) => right.rank - left.rank);

  return options.map(({ rank: _rank, ...option }) => option);
}

export function applyPreferredStreamSelection(
  stream: StreamInfo,
  preferences: {
    readonly preferredSourceId?: string | null;
    readonly preferredStreamId?: string | null;
  },
): StreamInfo {
  const result = stream.providerResolveResult;
  if (!result || result.streams.length === 0) return stream;

  let selected =
    (preferences.preferredStreamId
      ? result.streams.find((candidate) => candidate.id === preferences.preferredStreamId)
      : null) ?? null;

  if (!selected && preferences.preferredSourceId) {
    selected =
      [...result.streams]
        .filter((candidate) => candidate.sourceId === preferences.preferredSourceId)
        .sort((left, right) => (right.qualityRank ?? 0) - (left.qualityRank ?? 0))[0] ?? null;
  }

  if (!selected?.url) return stream;
  if (selected.id === result.selectedStreamId && selected.url === stream.url) return stream;

  return {
    ...stream,
    url: selected.url,
    headers: selected.headers ?? {},
    providerResolveResult: {
      ...result,
      selectedStreamId: selected.id,
    },
  };
}
