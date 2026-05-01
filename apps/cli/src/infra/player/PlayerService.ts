// =============================================================================
// Player Service Interface
//
// MPV abstraction for media playback.
// =============================================================================

import type { StreamInfo, PlaybackResult } from "@/domain/types";
import type { PlaybackTimingMetadata } from "@/domain/types";

export interface PlayerOptions {
  url: string;
  headers?: Record<string, string>;
  subtitle?: string;
  subtitleStatus?: string;
  displayTitle: string;
  startAt?: number;
  attach?: boolean;
  playbackMode?: "manual" | "autoplay-chain";
  timing?: PlaybackTimingMetadata | null;
  skipRecap?: boolean;
  skipIntro?: boolean;
  skipPreview?: boolean;
  onProgress?: (seconds: number) => void;
  onPlayerReady?: () => void;
}

export interface PlayerService {
  play(stream: StreamInfo, options: PlayerOptions): Promise<PlaybackResult>;
  releasePersistentSession(): Promise<void>;
  isAvailable(): Promise<boolean>;
}
