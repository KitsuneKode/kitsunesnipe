type PickerResolver = (value: string | null) => void;

let pendingResolver: PickerResolver | null = null;

export function waitForRootPicker(): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    pendingResolver = resolve;
  });
}

export function resolveRootPicker(value: string | null): void {
  const resolve = pendingResolver;
  pendingResolver = null;
  resolve?.(value);
}

export function hasPendingRootPicker(): boolean {
  return pendingResolver !== null;
}
