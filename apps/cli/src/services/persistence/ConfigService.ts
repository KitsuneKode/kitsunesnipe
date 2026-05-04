// =============================================================================
// Config Service
//
// Manages user configuration and preferences.
// =============================================================================

export type QuitNearEndBehavior = "continue" | "pause";

export type QuitNearEndThresholdMode = "credits-or-90-percent" | "percent-only" | "seconds-only";

export interface KitsuneConfig {
  defaultMode: "series" | "anime";
  provider: string;
  animeProvider: string;
  subLang: string;
  animeLang: "sub" | "dub";
  headless: boolean;
  showMemory: boolean;
  autoNext: boolean;
  skipRecap: boolean;
  skipIntro: boolean;
  skipPreview: boolean;
  skipCredits: boolean;
  footerHints: "detailed" | "minimal";
  /** When user quits mpv near the natural end, whether auto-next may still advance. */
  quitNearEndBehavior: QuitNearEndBehavior;
  /** How “near the end” is detected for quit + completion thresholds. */
  quitNearEndThresholdMode: QuitNearEndThresholdMode;
}

export interface ConfigService extends KitsuneConfig {
  // Raw config access
  getRaw(): KitsuneConfig;
  update(partial: Partial<KitsuneConfig>): Promise<void>;
  save(): Promise<void>;
  reset(): Promise<void>;
}

export interface ConfigStore {
  load(): Promise<Partial<KitsuneConfig>>;
  save(config: KitsuneConfig): Promise<void>;
}
