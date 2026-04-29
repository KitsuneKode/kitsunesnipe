import { z } from "zod";
import type {
  CachePolicy,
  ProviderFailure,
  ProviderHealth,
  ResolveTrace,
  StreamCandidate,
  SubtitleCandidate,
} from "@kunai/types";

export const mediaKindSchema = z.enum(["movie", "series", "anime"]);
export const providerRuntimeSchema = z.enum([
  "browser-safe-fetch",
  "node-fetch",
  "playwright-lease",
  "yt-dlp",
  "debrid",
]);
export const providerOperationSchema = z.enum([
  "search",
  "list-episodes",
  "resolve-stream",
  "resolve-subtitles",
  "refresh-source",
  "health-check",
]);
export const cacheTtlClassSchema = z.enum([
  "never-cache",
  "session",
  "stream-manifest",
  "direct-media-url",
  "subtitle-list",
  "episode-list",
  "catalog-static",
  "catalog-trending",
  "provider-health",
]);
export const resolveErrorCodeSchema = z.enum([
  "provider-unavailable",
  "unsupported-title",
  "not-found",
  "network-error",
  "rate-limited",
  "blocked",
  "expired",
  "parse-failed",
  "runtime-missing",
  "timeout",
  "cancelled",
  "unknown",
]);

export const cachePolicySchema = z.object({
  ttlClass: cacheTtlClassSchema,
  ttlMs: z.number().int().nonnegative().optional(),
  staleWhileRevalidateMs: z.number().int().nonnegative().optional(),
  scope: z.enum(["memory", "local", "browser", "edge-metadata", "account-sync"]),
  keyParts: z.array(z.string().min(1)),
  allowStale: z.boolean().optional(),
}) satisfies z.ZodType<CachePolicy>;

export const titleIdentitySchema = z.object({
  id: z.string().min(1),
  kind: mediaKindSchema,
  title: z.string().min(1),
  year: z.number().int().optional(),
  anilistId: z.string().min(1).optional(),
  tmdbId: z.string().min(1).optional(),
  imdbId: z.string().min(1).optional(),
  malId: z.string().min(1).optional(),
});

export const episodeIdentitySchema = z.object({
  season: z.number().int().positive().optional(),
  episode: z.number().int().positive().optional(),
  absoluteEpisode: z.number().int().positive().optional(),
  title: z.string().min(1).optional(),
  airDate: z.string().min(1).optional(),
});

export const streamCandidateSchema = z.object({
  id: z.string().min(1),
  providerId: z.string().min(1),
  url: z.url().optional(),
  deferredLocator: z.string().min(1).optional(),
  protocol: z.enum(["hls", "dash", "mp4", "iframe", "unknown"]),
  container: z.enum(["m3u8", "mpd", "mp4", "webm", "unknown"]).optional(),
  qualityLabel: z.string().min(1).optional(),
  qualityRank: z.number().int().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  expiresAt: z.iso.datetime().optional(),
  confidence: z.number().min(0).max(1),
  cachePolicy: cachePolicySchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
}) satisfies z.ZodType<StreamCandidate>;

export const subtitleCandidateSchema = z.object({
  id: z.string().min(1),
  providerId: z.string().min(1),
  url: z.url(),
  language: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  format: z.enum(["srt", "vtt", "ass", "unknown"]).optional(),
  source: z.enum(["provider", "wyzie", "manual", "embedded", "unknown"]),
  confidence: z.number().min(0).max(1),
  syncEvidence: z.string().min(1).optional(),
  cachePolicy: cachePolicySchema,
}) satisfies z.ZodType<SubtitleCandidate>;

export const providerFailureSchema = z.object({
  providerId: z.string().min(1),
  code: resolveErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
  at: z.iso.datetime(),
}) satisfies z.ZodType<ProviderFailure>;

export const resolveTraceStepSchema = z.object({
  at: z.iso.datetime(),
  stage: z.enum(["cache", "provider", "runtime", "subtitle", "fallback", "player", "health"]),
  message: z.string(),
  providerId: z.string().min(1).optional(),
  durationMs: z.number().nonnegative().optional(),
  attributes: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export const resolveTraceSchema = z.object({
  id: z.string().min(1),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().optional(),
  title: titleIdentitySchema,
  episode: episodeIdentitySchema.optional(),
  selectedProviderId: z.string().min(1).optional(),
  selectedStreamId: z.string().min(1).optional(),
  cacheHit: z.boolean(),
  runtime: providerRuntimeSchema.optional(),
  steps: z.array(resolveTraceStepSchema),
  failures: z.array(providerFailureSchema),
}) satisfies z.ZodType<ResolveTrace>;

export const providerHealthSchema = z.object({
  providerId: z.string().min(1),
  status: z.enum(["healthy", "degraded", "down", "unknown"]),
  checkedAt: z.iso.datetime(),
  medianResolveMs: z.number().nonnegative().optional(),
  recentFailureRate: z.number().min(0).max(1).optional(),
  subtitleSuccessRate: z.number().min(0).max(1).optional(),
  streamSurvivalRate: z.number().min(0).max(1).optional(),
}) satisfies z.ZodType<ProviderHealth>;
