import type {
  EpisodeIdentity,
  ProviderFailure,
  ProviderId,
  ProviderRuntime,
  ResolveTrace,
  ResolveTraceStep,
  TitleIdentity,
} from "@kunai/types";

export interface ResolveTraceInput {
  readonly title: TitleIdentity;
  readonly episode?: EpisodeIdentity;
  readonly providerId?: ProviderId;
  readonly streamId?: string;
  readonly cacheHit?: boolean;
  readonly runtime?: ProviderRuntime;
  readonly startedAt?: string;
  readonly endedAt?: string;
  readonly steps?: readonly ResolveTraceStep[];
  readonly failures?: readonly ProviderFailure[];
}

export function createResolveTrace(input: ResolveTraceInput): ResolveTrace {
  const startedAt = input.startedAt ?? new Date().toISOString();

  return {
    id: `trace:${crypto.randomUUID()}`,
    startedAt,
    endedAt: input.endedAt,
    title: input.title,
    episode: input.episode,
    selectedProviderId: input.providerId,
    selectedStreamId: input.streamId,
    cacheHit: input.cacheHit ?? false,
    runtime: input.runtime,
    steps: input.steps ?? [],
    failures: input.failures ?? [],
  };
}

export function createTraceStep(
  stage: ResolveTraceStep["stage"],
  message: string,
  attributes: Omit<ResolveTraceStep, "at" | "stage" | "message"> = {},
): ResolveTraceStep {
  return {
    at: new Date().toISOString(),
    stage,
    message,
    ...attributes,
  };
}
