export type GpsVisualQuality = 'precise' | 'usable' | 'weak' | 'unknown';

export interface GpsPulseFrame {
  quality: GpsVisualQuality;
  color: string;
  pulseRadius: number;
  pulseOpacity: number;
  accuracyRadius: number;
}

export function getGpsPulseFrame(elapsedMs: number, accuracyMeters: number | null): GpsPulseFrame {
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const cycle = (safeElapsed % 1800) / 1800;
  const quality = accuracyMeters === null || !Number.isFinite(accuracyMeters)
    ? 'unknown'
    : accuracyMeters <= 15
      ? 'precise'
      : accuracyMeters <= 45
        ? 'usable'
        : 'weak';
  const color = quality === 'precise'
    ? '#22D3EE'
    : quality === 'usable'
      ? '#34D399'
      : quality === 'weak'
        ? '#FBBF24'
        : '#94A3B8';

  return {
    quality,
    color,
    pulseRadius: 10 + cycle * 18,
    pulseOpacity: Math.max(0, 0.5 * (1 - cycle)),
    accuracyRadius: accuracyMeters === null || !Number.isFinite(accuracyMeters)
      ? 14
      : Math.max(12, Math.min(42, 10 + accuracyMeters * 0.35)),
  };
}
