import { describe, expect, test } from "bun:test";

import { redactDiagnosticValue } from "@/services/diagnostics/redaction";

describe("diagnostics redaction", () => {
  test("keeps URL host and path shape while redacting sensitive values", () => {
    const redacted = redactDiagnosticValue({
      url: "https://cdn.example/stream.m3u8?token=secret&quality=1080p",
      headers: {
        Referer: "https://provider.example/watch/123",
        Authorization: "Bearer secret",
        Cookie: "session=secret",
        "User-Agent": "KunaiTest",
      },
      nested: {
        subtitleUrl: "https://subs.example/sub.vtt?sig=abc",
      },
    });

    expect(redacted).toEqual({
      url: "https://cdn.example/stream.m3u8?token=[redacted]&quality=1080p",
      headers: {
        Referer: "https://provider.example/watch/[redacted-id]",
        Authorization: "[redacted]",
        Cookie: "[redacted]",
        "User-Agent": "KunaiTest",
      },
      nested: {
        subtitleUrl: "https://subs.example/sub.vtt?sig=[redacted]",
      },
    });
  });

  test("redacts the home directory from local paths", () => {
    const redacted = redactDiagnosticValue(
      {
        outputPath: `${process.env.HOME}/Videos/Kunai/Show/S01E01.mp4`,
      },
      { homeDir: process.env.HOME },
    );

    expect(redacted).toEqual({
      outputPath: "~/Videos/Kunai/Show/S01E01.mp4",
    });
  });

  test("truncates long strings to keep diagnostic bundles bounded", () => {
    const redacted = redactDiagnosticValue({ detail: "a".repeat(1200) });

    expect(redacted).toEqual({ detail: `${"a".repeat(997)}...` });
  });
});
