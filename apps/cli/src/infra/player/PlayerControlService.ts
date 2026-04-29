export interface ActivePlayerControl {
  readonly id: string;
  stop(reason?: string): Promise<void>;
}

export interface PlayerControlService {
  setActive(control: ActivePlayerControl | null): void;
  getActive(): ActivePlayerControl | null;
  stopCurrentPlayback(reason?: string): Promise<boolean>;
}
