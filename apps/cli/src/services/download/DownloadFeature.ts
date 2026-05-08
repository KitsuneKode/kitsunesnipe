import type { KitsuneConfig } from "@/services/persistence/ConfigService";
import type { CapabilitySnapshot } from "@/ui";

export type DownloadFeatureState = {
  readonly enabled: boolean;
  readonly usable: boolean;
  readonly status: "off" | "ready" | "missing-ffmpeg";
  readonly detail: string;
  readonly downloadPath: string | null;
};

export function resolveDownloadFeatureState({
  config,
  capabilities,
}: {
  readonly config: Pick<KitsuneConfig, "downloadsEnabled" | "downloadPath">;
  readonly capabilities?: Pick<CapabilitySnapshot, "ffmpeg"> | null;
}): DownloadFeatureState {
  if (!config.downloadsEnabled) {
    return {
      enabled: false,
      usable: false,
      status: "off",
      detail: "off",
      downloadPath: null,
    };
  }

  if (capabilities && !capabilities.ffmpeg) {
    return {
      enabled: true,
      usable: false,
      status: "missing-ffmpeg",
      detail: "enabled but ffmpeg is not available",
      downloadPath: normalizedDownloadPath(config.downloadPath),
    };
  }

  return {
    enabled: true,
    usable: true,
    status: "ready",
    detail: "ready for offline queue integration",
    downloadPath: normalizedDownloadPath(config.downloadPath),
  };
}

function normalizedDownloadPath(path: string): string | null {
  const trimmed = path.trim();
  return trimmed.length > 0 ? trimmed : null;
}
