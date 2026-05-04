/**
 * Same-URL in-process stream reload (persistent mpv): seek policy after `loadfile`.
 * When duration is unknown (≤0), we reload only — typical live / open-ended HLS.
 */
export function computeInProcessReconnectSeek(
  positionSeconds: number,
  durationSeconds: number,
): { seekSeconds: number; shouldSeek: boolean } {
  const pos = Math.max(0, positionSeconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { seekSeconds: pos, shouldSeek: false };
  }
  const seekSeconds = Math.min(pos, Math.max(durationSeconds - 0.5, 0));
  return { seekSeconds, shouldSeek: seekSeconds >= 0.25 };
}
