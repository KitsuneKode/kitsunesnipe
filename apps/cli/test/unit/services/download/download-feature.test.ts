import { describe, expect, test } from "bun:test";

import { resolveDownloadFeatureState } from "@/services/download/DownloadFeature";

describe("download feature gate", () => {
  test("stays off by default without requiring yt-dlp", () => {
    expect(
      resolveDownloadFeatureState({
        config: { downloadsEnabled: false, downloadPath: "" },
        capabilities: { ytDlp: false },
      }),
    ).toEqual({
      enabled: false,
      usable: false,
      status: "off",
      detail: "off",
      downloadPath: null,
    });
  });

  test("reports missing yt-dlp only after downloads are enabled", () => {
    expect(
      resolveDownloadFeatureState({
        config: { downloadsEnabled: true, downloadPath: "~/Videos/Kunai" },
        capabilities: { ytDlp: false },
      }),
    ).toEqual({
      enabled: true,
      usable: false,
      status: "missing-yt-dlp",
      detail: "enabled but yt-dlp is not available",
      downloadPath: "~/Videos/Kunai",
    });
  });

  test("marks enabled downloads ready when yt-dlp exists", () => {
    expect(
      resolveDownloadFeatureState({
        config: { downloadsEnabled: true, downloadPath: "" },
        capabilities: { ytDlp: true },
      }).status,
    ).toBe("ready");
  });
});
