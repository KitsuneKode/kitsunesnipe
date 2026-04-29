export type MediaKind = "movie" | "series" | "anime";

export type ProviderId = string & { readonly __brand?: "ProviderId" };

export type ProviderRuntime =
  | "browser-safe-fetch"
  | "node-fetch"
  | "playwright-lease"
  | "yt-dlp"
  | "debrid";

export type ProviderCapability =
  | "search"
  | "episode-list"
  | "source-resolve"
  | "subtitle-resolve"
  | "multi-source"
  | "quality-ranked"
  | "debrid-lookup";

export type ProviderOperation =
  | "search"
  | "list-episodes"
  | "resolve-stream"
  | "resolve-subtitles"
  | "refresh-source"
  | "health-check";

export type CacheTtlClass =
  | "never-cache"
  | "session"
  | "stream-manifest"
  | "direct-media-url"
  | "subtitle-list"
  | "episode-list"
  | "catalog-static"
  | "catalog-trending"
  | "provider-health";

export interface CachePolicy {
  readonly ttlClass: CacheTtlClass;
  readonly ttlMs?: number;
  readonly staleWhileRevalidateMs?: number;
  readonly scope: "memory" | "local" | "browser" | "edge-metadata" | "account-sync";
  readonly keyParts: readonly string[];
  readonly allowStale?: boolean;
}

export interface TitleIdentity {
  readonly id: string;
  readonly kind: MediaKind;
  readonly title: string;
  readonly year?: number;
  readonly anilistId?: string;
  readonly tmdbId?: string;
  readonly imdbId?: string;
  readonly malId?: string;
}

export interface EpisodeIdentity {
  readonly season?: number;
  readonly episode?: number;
  readonly absoluteEpisode?: number;
  readonly title?: string;
  readonly airDate?: string;
}

export interface StreamCandidate {
  readonly id: string;
  readonly providerId: ProviderId;
  readonly url?: string;
  readonly deferredLocator?: string;
  readonly protocol: "hls" | "dash" | "mp4" | "iframe" | "unknown";
  readonly container?: "m3u8" | "mpd" | "mp4" | "webm" | "unknown";
  readonly qualityLabel?: string;
  readonly qualityRank?: number;
  readonly headers?: Record<string, string>;
  readonly expiresAt?: string;
  readonly confidence: number;
  readonly cachePolicy: CachePolicy;
}

export interface SubtitleCandidate {
  readonly id: string;
  readonly providerId: ProviderId;
  readonly url: string;
  readonly language?: string;
  readonly label?: string;
  readonly format?: "srt" | "vtt" | "ass" | "unknown";
  readonly source: "provider" | "wyzie" | "manual" | "embedded" | "unknown";
  readonly confidence: number;
  readonly syncEvidence?: string;
  readonly cachePolicy: CachePolicy;
}

export type ResolveErrorCode =
  | "provider-unavailable"
  | "unsupported-title"
  | "not-found"
  | "network-error"
  | "rate-limited"
  | "blocked"
  | "expired"
  | "parse-failed"
  | "runtime-missing"
  | "timeout"
  | "cancelled"
  | "unknown";

export interface ProviderFailure {
  readonly providerId: ProviderId;
  readonly code: ResolveErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly at: string;
}

export interface ResolveTraceStep {
  readonly at: string;
  readonly stage: "cache" | "provider" | "runtime" | "subtitle" | "fallback" | "player" | "health";
  readonly message: string;
  readonly providerId?: ProviderId;
  readonly durationMs?: number;
  readonly attributes?: Record<string, string | number | boolean | null>;
}

export interface ResolveTrace {
  readonly id: string;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly title: TitleIdentity;
  readonly episode?: EpisodeIdentity;
  readonly selectedProviderId?: ProviderId;
  readonly selectedStreamId?: string;
  readonly cacheHit: boolean;
  readonly runtime?: ProviderRuntime;
  readonly steps: readonly ResolveTraceStep[];
  readonly failures: readonly ProviderFailure[];
}

export interface ProviderHealth {
  readonly providerId: ProviderId;
  readonly status: "healthy" | "degraded" | "down" | "unknown";
  readonly checkedAt: string;
  readonly medianResolveMs?: number;
  readonly recentFailureRate?: number;
  readonly subtitleSuccessRate?: number;
  readonly streamSurvivalRate?: number;
}

export interface ProviderHealthDelta {
  readonly providerId: ProviderId;
  readonly outcome: "success" | "failure" | "timeout" | "blocked" | "stalled";
  readonly resolveMs?: number;
  readonly at: string;
}

export interface ProviderRuntimePort {
  readonly runtime: ProviderRuntime;
  readonly operations: readonly ProviderOperation[];
  readonly browserSafe: boolean;
  readonly relaySafe: boolean;
  readonly localOnly: boolean;
}

export interface ProviderResolveInput {
  readonly title: TitleIdentity;
  readonly episode?: EpisodeIdentity;
  readonly mediaKind: MediaKind;
  readonly preferredAudioLanguage?: string;
  readonly preferredSubtitleLanguage?: string;
  readonly qualityPreference?: string;
  readonly regionHint?: string;
  readonly intent: "browse" | "focused" | "prefetch" | "play" | "refresh" | "autoplay";
  readonly allowedRuntimes: readonly ProviderRuntime[];
}

export interface ProviderResolveResult {
  readonly providerId: ProviderId;
  readonly streams: readonly StreamCandidate[];
  readonly subtitles: readonly SubtitleCandidate[];
  readonly cachePolicy?: CachePolicy;
  readonly trace: ResolveTrace;
  readonly failures: readonly ProviderFailure[];
  readonly healthDelta?: ProviderHealthDelta;
}

export interface PlaybackRecoveryEvent {
  readonly id: string;
  readonly at: string;
  readonly reason:
    | "manifest-expired"
    | "segment-failure"
    | "buffering-timeout"
    | "provider-fallback"
    | "subtitle-fallback"
    | "manual-retry";
  readonly fromProviderId?: ProviderId;
  readonly toProviderId?: ProviderId;
  readonly resumeSeconds?: number;
  readonly traceId?: string;
}
