export type DownloadStreamPolicy = {
  readonly headers: Record<string, string>;
};

/** Normalizes playback-style headers for subtitle fetches and any future download helpers. */
export function buildDownloadStreamPolicy(headers: Record<string, string>): DownloadStreamPolicy {
  return { headers: normalizeHeaders(headers) };
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(headers)) {
    if (!value) continue;
    const key = canonicalHeaderKey(rawKey);
    output[key] = value;
  }
  const referer = output["Referer"] ?? output["referer"];
  if (referer) output.Referer = referer;
  const userAgent = output["User-Agent"] ?? output["user-agent"];
  if (userAgent) output["User-Agent"] = userAgent;
  const origin = output.Origin ?? output.origin;
  if (origin) output.Origin = origin;
  return output;
}

function canonicalHeaderKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower === "user-agent") return "User-Agent";
  if (lower === "referer") return "Referer";
  if (lower === "origin") return "Origin";
  if (lower === "accept") return "Accept";
  if (lower === "accept-language") return "Accept-Language";
  return key;
}
