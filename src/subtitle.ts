// Wyzie subtitle API: the player makes a search request to sub.wyzie.io with an
// embedded API key. We capture the request URL, then fetch it ourselves so we
// control language selection instead of relying on what the player auto-picks.

import { dbg, dbgErr } from "@/logger";

export type SubtitleEntry = {
  id: string;
  url: string;
  display: string;
  language: string;
  release: string;
};

export async function fetchSubtitlesFromWyzie(
  searchUrl: string,
  preferredLang: string,
  requestHeaders?: Record<string, string>,
): Promise<{ list: SubtitleEntry[]; selected: string | null; failed: boolean }> {
  try {
    const headers = buildWyzieHeaders(requestHeaders);
    dbg("subtitle", "fetch wyzie subtitles", {
      preferredLang,
      url: redactWyzieKey(searchUrl),
      headerKeys: Object.keys(headers),
    });

    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(8000),
      headers,
    });
    dbg("subtitle", "wyzie response", {
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type"),
    });

    if (!res.ok) {
      return { list: [], selected: null, failed: true };
    }

    const list = (await res.json()) as SubtitleEntry[];
    if (!Array.isArray(list) || list.length === 0) {
      dbg("subtitle", "wyzie empty result", {
        preferredLang,
        url: redactWyzieKey(searchUrl),
      });
      return { list: [], selected: null, failed: false };
    }

    const pick =
      list.find((s) => s.language === preferredLang) ||
      (preferredLang !== "en" ? list.find((s) => s.language === "en") : null) ||
      list[0];

    dbg("subtitle", "wyzie selected subtitle", {
      preferredLang,
      selectedLanguage: pick?.language ?? null,
      selectedDisplay: pick?.display ?? null,
      total: list.length,
    });

    return { list, selected: pick?.url ?? null, failed: false };
  } catch (error) {
    dbgErr("subtitle", "wyzie fetch failed", error);
    return { list: [], selected: null, failed: true };
  }
}

function buildWyzieHeaders(requestHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json, text/plain, */*",
    "user-agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  };

  for (const key of ["user-agent", "referer", "origin", "accept", "accept-language"]) {
    const value = requestHeaders?.[key];
    if (value) headers[key] = value;
  }

  return headers;
}

function redactWyzieKey(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("key")) parsed.searchParams.set("key", "<redacted>");
    return parsed.toString();
  } catch {
    return url.replace(/key=[^&]+/, "key=<redacted>");
  }
}
