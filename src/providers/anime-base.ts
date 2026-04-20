// =============================================================================
// AnimeBase — reusable AllAnime/allanime.to GraphQL client
//
// All anime providers that use the allanime.day API share:
//   • GraphQL endpoint, Referer header, User-Agent
//   • Hex-decode cipher (ported from ani-cli provider_init)
//   • tobeparsed AES-256-CTR decryption (ported from ani-cli decode_tobeparsed)
//   • get_links resolution (wixmp, m3u8 master, direct mp4)
//
// To add a new anime provider that uses this API:
//   1. Create src/providers/myprovider.ts
//   2. Import createAnimeProvider and call it with your config.
//   3. Register in src/providers/index.ts — one line.
//
// Nothing else needs to change.
// =============================================================================

import type { ApiProvider, ApiSearchResult, ResolveOpts } from "./types";
import type { StreamData } from "@/scraper";
import { dbg, dbgErr } from "@/logger";

// ── Hex-decode cipher (ani-cli provider_init) ─────────────────────────────────

const HEX: Record<string, string> = {
  "79":"A","7a":"B","7b":"C","7c":"D","7d":"E","7e":"F","7f":"G","70":"H","71":"I","72":"J",
  "73":"K","74":"L","75":"M","76":"N","77":"O","68":"P","69":"Q","6a":"R","6b":"S","6c":"T",
  "6d":"U","6e":"V","6f":"W","60":"X","61":"Y","62":"Z","59":"a","5a":"b","5b":"c","5c":"d",
  "5d":"e","5e":"f","5f":"g","50":"h","51":"i","52":"j","53":"k","54":"l","55":"m","56":"n",
  "57":"o","48":"p","49":"q","4a":"r","4b":"s","4c":"t","4d":"u","4e":"v","4f":"w","40":"x",
  "41":"y","42":"z","08":"0","09":"1","0a":"2","0b":"3","0c":"4","0d":"5","0e":"6","0f":"7",
  "00":"8","01":"9","15":"-","16":".","67":"_","46":"~","02":":","17":"/","07":"?","1b":"#",
  "63":"[","65":"]","78":"@","19":"!","1c":"$","1e":"&","10":"(","11":")","12":"*","13":"+",
  "14":",","03":";","05":"=","1d":"%",
};

export function hexDecode(encoded: string): string {
  let out = "";
  for (let i = 0; i + 1 < encoded.length; i += 2) {
    const pair = encoded.slice(i, i + 2);
    out += HEX[pair] ?? pair;
  }
  return out.replace(/\/clock\b/g, "/clock.json");
}

// ── AES-256-CTR decryption (ani-cli decode_tobeparsed) ───────────────────────
//
// ani-cli: IV = first 12 bytes of base64 payload, counter = IV + "00000002"
//          key = SHA-256 of the allanime_key constant.
//
// This handles the "tobeparsed" field that the API returns for some episodes
// instead of the normal sourceUrls array.

const ALLANIME_KEY_RAW = "SimtVuagFbGR2K7P";

async function deriveKey(): Promise<CryptoKey> {
  const keyBytes  = new TextEncoder().encode(ALLANIME_KEY_RAW);
  const hashBuf   = await crypto.subtle.digest("SHA-256", keyBytes);
  return crypto.subtle.importKey("raw", hashBuf, { name: "AES-CTR" }, false, ["decrypt"]);
}

export async function decodeTobeparsed(
  blob: string,
): Promise<Array<{ sourceName: string; sourceUrl: string }>> {
  try {
    const raw  = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
    const iv   = raw.slice(0, 12);
    const data = raw.slice(12);

    // AES-CTR counter: IV bytes + 32-bit counter = 2
    const ctr = new Uint8Array(16);
    ctr.set(iv, 0);
    ctr[12] = 0; ctr[13] = 0; ctr[14] = 0; ctr[15] = 2;

    const key   = await deriveKey();
    const plain = await crypto.subtle.decrypt({ name: "AES-CTR", counter: ctr, length: 64 }, key, data);
    const text  = new TextDecoder().decode(plain);

    // Parse JSON-like chunks: {"sourceUrl":"--<hex>","sourceName":"<name>"}
    const results: Array<{ sourceName: string; sourceUrl: string }> = [];
    const re = /"sourceUrl"\s*:\s*"--([^"]+)"[^}]*"sourceName"\s*:\s*"([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      results.push({ sourceUrl: m[1]!, sourceName: m[2]! });
    }
    return results;
  } catch (e) {
    dbgErr("anime-base", "tobeparsed decryption failed", e);
    return [];
  }
}

// ── Stream link resolution (ani-cli get_links) ────────────────────────────────

export type StreamLink = {
  url:      string;
  quality:  string;
  referer?: string;
  subtitle?: string;
};

const KNOWN_SOURCES = new Set(["Default", "Yt-mp4", "S-mp4", "Luf-Mp4"]);

function isDirectStream(url: string): boolean {
  const l = url.toLowerCase();
  return l.includes(".m3u8") || l.includes(".mp4") || l.includes(".mkv")
      || l.includes("repackager.wixmp.com") || l.includes("tools.fast4speed.rsvp");
}

async function fetchStreamLinks(apiPath: string, referer: string, ua: string): Promise<StreamLink[]> {
  const res = await fetch(`https://allanime.day${apiPath}`, {
    headers: { "Referer": referer, "User-Agent": ua },
  });
  if (!res.ok) return [];

  let body = await res.text();
  body = body.replace(/\\u002F/g, "/").replace(/\\\//g, "/");

  const links: StreamLink[] = [];

  // ── JSON structured response ──────────────────────────────────────────────
  try {
    const j = JSON.parse(body) as {
      links?: Array<{ link: string; resolutionStr?: string; hls?: boolean }>;
      subtitles?: Array<{ lang: string; src: string }>;
    };

    const sub = j.subtitles?.find((s) => s.lang?.toLowerCase().startsWith("en"))?.src;

    if (j.links?.length) {
      for (const l of j.links) {
        if (!l.link) continue;

        // wixmp repackager — extract quality variants (ani-cli get_links wixmp branch)
        if (l.link.includes("repackager.wixmp.com")) {
          const base    = l.link.replace(/repackager\.wixmp\.com\//g, "").replace(/\.urlset.*/, "");
          const qRe     = /\/,([^/]*),\/mp4/;
          const qMatch  = qRe.exec(l.link);
          const variants = qMatch?.[1]?.split(",").filter(Boolean) ?? [];
          for (const q of variants) {
            links.push({ url: base.replace(/,[^/]*/, q), quality: q, subtitle: sub });
          }
          if (variants.length === 0) links.push({ url: l.link, quality: l.resolutionStr ?? "", subtitle: sub });
          continue;
        }

        // master.m3u8 — resolve quality variants (ani-cli get_links m3u8 branch)
        if (l.link.includes("master.m3u8")) {
          const m3uRes = await fetch(l.link, { headers: { "Referer": referer, "User-Agent": ua } });
          if (m3uRes.ok) {
            const m3u   = await m3uRes.text();
            const urlOf = new URL(l.link);
            const base2 = `${urlOf.protocol}//${urlOf.host}${urlOf.pathname.replace(/[^/]*$/, "")}`;

            // Extract quality + URL pairs from #EXT-X-STREAM-INF lines
            const streamRe = /RESOLUTION=\d+x(\d+).*\n([^\n]+)/g;
            let sm: RegExpExecArray | null;
            while ((sm = streamRe.exec(m3u)) !== null) {
              const quality = sm[1] ?? "unknown";
              const href    = sm[2]?.trim() ?? "";
              const url2    = href.startsWith("http") ? href : base2 + href;
              links.push({ url: url2, quality, referer, subtitle: sub });
            }
          }
          continue;
        }

        links.push({ url: l.link, quality: l.resolutionStr ?? "", subtitle: sub });
      }
      return links;
    }
  } catch { /* fall through to regex */ }

  // ── Regex fallback (matches ani-cli sed patterns) ─────────────────────────
  const linkRe = /"link"\s*:\s*"([^"]+)"/g;
  const resRe  = /"resolutionStr"\s*:\s*"([^"]*)"/;
  for (const chunk of body.split("},{")) {
    const lm = linkRe.exec(chunk);
    if (!lm?.[1]) continue;
    links.push({ url: lm[1], quality: resRe.exec(chunk)?.[1] ?? "" });
  }
  return links;
}

// ── GraphQL helpers ───────────────────────────────────────────────────────────

export async function gqlPost(
  apiUrl:  string,
  referer: string,
  ua:      string,
  query:   string,
  vars:    Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(apiUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Referer": referer, "User-Agent": ua },
    body:    JSON.stringify({ query, variables: vars }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${apiUrl}`);
  return res.json();
}

// ── Full episode source resolution ────────────────────────────────────────────

export async function resolveEpisodeSources(opts: {
  apiUrl:    string;
  referer:   string;
  ua:        string;
  showId:    string;
  epStr:     string;
  mode:      "sub" | "dub";
}): Promise<StreamLink[]> {
  const { apiUrl, referer, ua, showId, epStr, mode } = opts;

  const Q = `query($id:String! $t:VaildTranslationTypeEnumType! $ep:String!){
    episode(showId:$id translationType:$t episodeString:$ep){episodeString sourceUrls tobeparsed}
  }`;

  const data = await gqlPost(apiUrl, referer, ua, Q, {
    id: showId, t: mode, ep: epStr,
  }) as {
    data: {
      episode: {
        sourceUrls?: Array<{ sourceUrl: string; sourceName: string }>;
        tobeparsed?: string;
      }
    }
  };

  const ep = data.data.episode;
  let rawSources: Array<{ sourceUrl: string; sourceName: string }> = [];

  // tobeparsed takes priority when present (AES-CTR encrypted blob)
  if (ep.tobeparsed) {
    rawSources = (await decodeTobeparsed(ep.tobeparsed)).map((s) => ({
      sourceUrl:  s.sourceUrl,
      sourceName: s.sourceName,
    }));
  } else {
    rawSources = ep.sourceUrls ?? [];
  }

  const all: StreamLink[] = [];

  for (const src of rawSources) {
    const raw     = src.sourceUrl.startsWith("--") ? src.sourceUrl.slice(2) : src.sourceUrl;
    const decoded = hexDecode(raw);
    if (!decoded) continue;

    if (isDirectStream(decoded)) {
      all.push({
        url:     decoded,
        quality: src.sourceName,
        referer: decoded.includes("tools.fast4speed.rsvp") ? referer : undefined,
      });
      continue;
    }

    if (!decoded.startsWith("/") || !KNOWN_SOURCES.has(src.sourceName)) continue;

    const links = await fetchStreamLinks(decoded, referer, ua);
    for (const l of links) {
      all.push({ ...l, quality: l.quality || src.sourceName });
    }
  }

  return all;
}

// ── Factory: createAnimeProvider ──────────────────────────────────────────────
//
// Builds an ApiProvider from a minimal config object.
// Adding a new allanime-compatible provider = call this function with
// a different endpoint/domain, no changes to anything else.

export type AnimeProviderConfig = {
  id:          string;
  name:        string;
  description: string;
  domain:      string;
  apiUrl:      string;    // GraphQL endpoint
  referer:     string;    // Referer header (e.g. "https://allmanga.to")
  ua?:         string;    // User-Agent (optional, defaults to Firefox)
  recommended?: boolean;
};

const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0";

export function createAnimeProvider(cfg: AnimeProviderConfig): ApiProvider {
  const ua = cfg.ua ?? DEFAULT_UA;

  return {
    kind:          "api",
    searchBackend: "allanime",
    id:            cfg.id,
    name:          cfg.name,
    description:   cfg.description,
    domain:        cfg.domain,
    recommended:   cfg.recommended,

    async search(query, opts) {
      dbg(cfg.id, "search", { query, mode: opts.animeLang });
      const Q = `query($s:SearchInput $l:Int $p:Int $t:VaildTranslationTypeEnumType){
        shows(search:$s limit:$l page:$p translationType:$t){
          edges{_id name availableEpisodes __typename}
        }
      }`;
      const data = await gqlPost(cfg.apiUrl, cfg.referer, ua, Q, {
        search: { allowAdult: false, allowUnknown: false, query },
        limit: 40, page: 1, translationType: opts.animeLang,
      }) as { data: { shows: { edges: Array<{ _id: string; name: string; availableEpisodes: Record<string,unknown> }> } } };

      return data.data.shows.edges.map((e): ApiSearchResult => {
        const epRaw  = (e.availableEpisodes as Record<string,unknown>)[opts.animeLang];
        const epCount = typeof epRaw === "number" ? epRaw : undefined;
        return { id: e._id, title: e.name, type: "series", epCount };
      });
    },

    async resolveStream(id, _type, _season, episode, opts) {
      const mode = opts.animeLang;
      dbg(cfg.id, "resolveStream", { id, episode, mode });

      try {
        // Fetch episode list to map index → episode string
        const listQ = `query($id:String!){show(_id:$id){availableEpisodesDetail}}`;
        const listData = await gqlPost(cfg.apiUrl, cfg.referer, ua, listQ, { id }) as {
          data: { show: { availableEpisodesDetail: Record<string, unknown[]> } }
        };
        const eps   = (listData.data.show.availableEpisodesDetail[mode] ?? []) as string[];
        const epStr = eps[episode - 1] ?? String(episode);
        dbg(cfg.id, "episode string", { epStr, total: eps.length });

        const links = await resolveEpisodeSources({
          apiUrl: cfg.apiUrl, referer: cfg.referer, ua,
          showId: id, epStr, mode,
        });
        dbg(cfg.id, "stream links", { count: links.length });

        // Quality preference: highest-numbered quality, or first m3u8
        const best =
          links.find((l) => l.url.includes("master.m3u8")) ??
          links.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0))[0];

        if (!best) return null;

        const streamData: StreamData = {
          url:          best.url,
          headers:      {
            ...(best.referer   ? { "Referer":    best.referer }   : {}),
            ...(cfg.referer    ? { "Referer":    cfg.referer }    : {}),
            "User-Agent": ua,
          },
          subtitle:     best.subtitle ?? null,
          subtitleList: best.subtitle ? [best.subtitle] : [],
          title:        "",
          timestamp:    Date.now(),
        };
        return streamData;
      } catch (e) {
        dbgErr(cfg.id, "resolveStream failed", e);
        return null;
      }
    },
  };
}
