import type { EpisodeInfo, ShellMode, StreamInfo, TitleInfo } from "@/domain/types";

export type PresenceStatus = "disabled" | "idle" | "connecting" | "ready" | "unavailable" | "error";

export type PresenceClientIdSource = "off" | "config" | "environment" | "missing";

export type PresenceSnapshot = {
  readonly provider: "off" | "discord";
  readonly status: PresenceStatus;
  readonly privacy: "full" | "private";
  readonly clientIdSource: PresenceClientIdSource;
  readonly canConnect: boolean;
  readonly detail: string;
};

export type PresencePlaybackActivity = {
  readonly mode: ShellMode;
  readonly title: TitleInfo;
  readonly episode: EpisodeInfo;
  readonly providerId: string;
  readonly stream?: StreamInfo | null;
  readonly startedAtMs: number;
};

export interface PresenceService {
  getStatus(): PresenceStatus;
  getSnapshot(): PresenceSnapshot;
  connect(): Promise<PresenceSnapshot>;
  disconnect(reason: string): Promise<PresenceSnapshot>;
  updatePlayback(activity: PresencePlaybackActivity): Promise<void>;
  clearPlayback(reason: string): Promise<void>;
  shutdown(): Promise<void>;
}
