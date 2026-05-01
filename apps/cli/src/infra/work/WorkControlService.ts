export interface ActiveWorkControl {
  readonly id: string;
  readonly label: string;
  cancel(reason?: string): void;
}

export interface WorkControlService {
  setActive(control: ActiveWorkControl | null): void;
  getActive(): ActiveWorkControl | null;
  cancelActive(reason?: string): boolean;
}
