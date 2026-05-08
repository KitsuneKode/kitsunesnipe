import { describe, expect, test } from "bun:test";

import { resolveDownloadFeatureState } from "@/services/download/DownloadFeature";

describe("download feature gate", () => {
  test("stays off by default without requiring ffmpeg", () => {
    expect(
      resolveDownloadFeatureState({
        config: { downloadsEnabled: false, downloadPath: "" },
        capabilities: { ffmpeg: false },
      }),
    ).toEqual({
      enabled: false,
      usable: false,
      status: "off",
      detail: "off",
      downloadPath: null,
    });
  });

  test("reports missing ffmpeg only after downloads are enabled", () => {
    expect(
      resolveDownloadFeatureState({
        config: { downloadsEnabled: true, downloadPath: "~/Videos/Kunai" },
        capabilities: { ffmpeg: false },
      }),
    ).toEqual({
      enabled: true,
      usable: false,
      status: "missing-ffmpeg",
      detail: "enabled but ffmpeg is not available",
      downloadPath: "~/Videos/Kunai",
    });
  });

  test("marks enabled downloads ready when ffmpeg exists", () => {
    expect(
      resolveDownloadFeatureState({
        config: { downloadsEnabled: true, downloadPath: "" },
        capabilities: { ffmpeg: true },
      }).status,
    ).toBe("ready");
  });
});
