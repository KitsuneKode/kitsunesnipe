import {
    createProviderCachePolicy,
    createResolveTrace,
    createTraceStep,
    type CoreProviderModule,
    braflixManifest,
  } from "@kunai/core";
  import type {
    ProviderResolveInput,
    ProviderResolveResult,
    ProviderRuntimeContext,
    ProviderTraceEvent,
    StreamCandidate,
    ProviderFailure,
    SubtitleCandidate,
  } from "@kunai/types";
  
  export const BRAFLIX_PROVIDER_ID = braflixManifest.id;
  const DEFAULT_BASE = "https://braflix.mov";
  
  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": `${DEFAULT_BASE}/`
  };
  
  // Regex parsing utilities ported from legacy code
  function all(html: string, re: RegExp): string[] {
    const out: string[] = [];
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : "g" + re.flags);
    while ((m = r.exec(html)) !== null) {
      if (m[1]) out.push(m[1]);
    }
    return out;
  }
  
  function first(html: string, re: RegExp): string {
    return all(html, re)[0] ?? "";
  }
  
  export const braflixProviderModule: CoreProviderModule = {
    providerId: BRAFLIX_PROVIDER_ID,
    manifest: braflixManifest,
    async resolve(input, context) {
      if (input.mediaKind !== "movie" && input.mediaKind !== "series") {
        return createExhaustedResult(input, context, {
          code: "unsupported-title",
          message: "Braflix only supports movies and series",
          retryable: false,
        });
      }
  
      // Braflix currently requires a browser to intercept the embedded player (Rabbitstream/Megacloud)
      if (!input.allowedRuntimes.includes("playwright-lease")) {
        return createExhaustedResult(input, context, {
          code: "runtime-missing",
          message: "Braflix requires playwright-lease runtime to extract embeds",
          retryable: false,
        });
      }
  
      // Braflix natively uses TMDB IDs
      const tmdbId = input.title.tmdbId ?? input.title.id.replace("tmdb:", "");
      if (!tmdbId || Number.isNaN(Number(tmdbId))) {
        return createExhaustedResult(input, context, {
          code: "unsupported-title",
          message: "Braflix requires a numeric TMDB ID",
          retryable: false,
        });
      }
  
      const startedAt = context.now();
      const events: ProviderTraceEvent[] = [];
      const failures: ProviderFailure[] = [];
      const cachePolicy = createProviderCachePolicy({
        providerId: BRAFLIX_PROVIDER_ID,
        title: input.title,
        episode: input.episode,
        subtitleLanguage: input.preferredSubtitleLanguage,
        qualityPreference: input.qualityPreference,
      });
  
      emit(events, context, {
        type: "provider:start",
        providerId: BRAFLIX_PROVIDER_ID,
        message: "Started Braflix Hybrid resolution",
      });
  
      try {
        let serverId = "";
        
        // 1. Resolve Server ID based on Media Type
        if (input.mediaKind === "movie") {
            const res = await fetch(`${DEFAULT_BASE}/ajax/episode/list/${tmdbId}`, { headers: HEADERS, signal: context.signal });
            const html = await res.text();
            serverId = first(html, /class="link-item[^"]*"[^>]*data-id="(\d+)"/) || first(html, /data-linkid="(\d+)"/);
        } else {
            const seasonNum = input.episode?.season ?? 1;
            const episodeNum = input.episode?.episode ?? 1;
            
            const sRes = await fetch(`${DEFAULT_BASE}/ajax/season/list/${tmdbId}`, { headers: HEADERS, signal: context.signal });
            const sIds = all(await sRes.text(), /class="ss-item[^"]*"[^>]*data-id="(\d+)"/);
            const seasonId = sIds[seasonNum - 1] || sIds[0];
            
            if (!seasonId) throw new Error("Season not found");
  
            const eRes = await fetch(`${DEFAULT_BASE}/ajax/season/episodes/${seasonId}`, { headers: HEADERS, signal: context.signal });
            const eIds = all(await eRes.text(), /class="eps-item[^"]*"[^>]*data-id="(\d+)"/);
            const episodeId = eIds[episodeNum - 1] || eIds[0];
  
            if (!episodeId) throw new Error("Episode not found");
  
            const srvRes = await fetch(`${DEFAULT_BASE}/ajax/episode/servers/${episodeId}`, { headers: HEADERS, signal: context.signal });
            serverId = first(await srvRes.text(), /class="link-item[^"]*"[^>]*data-id="(\d+)"/);
        }
  
        if (!serverId) {
            throw new Error("Failed to extract server ID from Braflix HTML");
        }
  
        // 2. Fetch the Source Link (The 3rd party Embed)
        const sourceRes = await fetch(`${DEFAULT_BASE}/ajax/episode/sources/${serverId}`, { headers: HEADERS, signal: context.signal });
        const sourceData = await sourceRes.json() as any;
        const embedUrl = sourceData.link;
  
        if (!embedUrl) {
            throw new Error("Failed to extract embed link");
        }
  
        emit(events, context, {
            type: "source:success",
            providerId: BRAFLIX_PROVIDER_ID,
            message: `Extracted Braflix Embed URL: ${embedUrl}`,
        });
  
        // 3. Fallback to Browser Lease to extract the actual .m3u8 from the embed
        if (!context.browserLease) {
            throw new Error("Browser Lease port not provided in runtime context");
        }
  
        emit(events, context, {
            type: "runtime:requested",
            providerId: BRAFLIX_PROVIDER_ID,
            message: "Requesting Browser Lease to intercept embed...",
        });
  
        const browserResult = await context.browserLease.capture({
            url: embedUrl,
            headers: HEADERS,
            timeoutMs: 15000,
        }, context.signal);
  
        if (browserResult.streams.length === 0) {
            throw new Error("Browser capture failed to intercept any streams from the embed");
        }
  
        // Merge the extracted streams and subtitles
        const streams = browserResult.streams.map(s => ({ ...s, providerId: BRAFLIX_PROVIDER_ID }));
        const subtitles = browserResult.subtitles.map(s => ({ ...s, providerId: BRAFLIX_PROVIDER_ID }));
        const selectedStream = streams[0];
  
        emit(events, context, {
          type: "provider:success",
          providerId: BRAFLIX_PROVIDER_ID,
          message: `Successfully resolved Braflix stream via Browser Lease`,
        });
  
        const endedAt = context.now();
  
        return {
          providerId: BRAFLIX_PROVIDER_ID,
          selectedStreamId: selectedStream!.id,
          sources: [
            {
              id: `source:${BRAFLIX_PROVIDER_ID}:embed`,
              providerId: BRAFLIX_PROVIDER_ID,
              kind: "embed",
              label: "Braflix Embed",
              host: new URL(embedUrl).hostname,
              status: "selected",
              confidence: 0.8,
              requiresRuntime: "playwright-lease",
              cachePolicy
            }
          ],
          streams,
          variants: [], // Browser result streams are flat for now
          subtitles,
          cachePolicy,
          trace: createResolveTrace({
            title: input.title,
            episode: input.episode,
            providerId: BRAFLIX_PROVIDER_ID,
            streamId: selectedStream!.id,
            cacheHit: false,
            runtime: "playwright-lease",
            startedAt,
            endedAt,
            steps: [
              createTraceStep("provider", "Resolved Braflix through Browser Interception", {
                providerId: BRAFLIX_PROVIDER_ID,
                attributes: { streams: streams.length }
              }),
            ],
            events,
            failures,
          }),
          failures,
        };
  
      } catch (error) {
        if (context.signal?.aborted) {
            return createExhaustedResult(input, context, {
              code: "cancelled",
              message: "Braflix resolution was cancelled",
              retryable: false,
            });
        }
  
        failures.push({
            providerId: BRAFLIX_PROVIDER_ID,
            code: "network-error",
            message: error instanceof Error ? error.message : "Braflix extraction failed",
            retryable: true,
            at: context.now()
        });
  
        return createExhaustedResult(input, context, failures[0]);
      }
    },
  };
  
  function createExhaustedResult(
    input: ProviderResolveInput,
    context: ProviderRuntimeContext,
    failure: Omit<ProviderFailure, "providerId" | "at">
  ): ProviderResolveResult {
    const at = context.now();
    const providerFailure: ProviderFailure = {
      providerId: BRAFLIX_PROVIDER_ID,
      at,
      ...failure,
    };
  
    const event: ProviderTraceEvent = {
      type: "provider:exhausted",
      at,
      providerId: BRAFLIX_PROVIDER_ID,
      message: providerFailure.message,
    };
    context.emit?.(event);
  
    return {
      providerId: BRAFLIX_PROVIDER_ID,
      streams: [],
      subtitles: [],
      trace: createResolveTrace({
        title: input.title,
        episode: input.episode,
        providerId: BRAFLIX_PROVIDER_ID,
        cacheHit: false,
        runtime: "playwright-lease",
        startedAt: at,
        endedAt: at,
        steps: [
          createTraceStep("provider", providerFailure.message, {
            providerId: BRAFLIX_PROVIDER_ID,
            attributes: { code: providerFailure.code },
          }),
        ],
        events: [event],
        failures: [providerFailure],
      }),
      failures: [providerFailure],
    };
  }
  
  function emit(
    events: ProviderTraceEvent[],
    context: ProviderRuntimeContext | undefined,
    event: Omit<ProviderTraceEvent, "at">,
  ): void {
    const fullEvent = {
      ...event,
      at: context?.now() ?? new Date().toISOString(),
    };
    events.push(fullEvent);
    context?.emit?.(fullEvent);
  }