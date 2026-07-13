export type FreshnessAlertKind = 'earthquake' | 'traffic-camera' | 'wildfire' | 'volcano' | 'severe-weather';

const MAX_AGE_MS: Record<FreshnessAlertKind, number> = {
  earthquake: 24 * 60 * 60 * 1000,
  'traffic-camera': 15 * 60 * 1000,
  wildfire: 48 * 60 * 60 * 1000,
  volcano: 7 * 24 * 60 * 60 * 1000,
  'severe-weather': 24 * 60 * 60 * 1000,
};

const TIMESTAMP_KEYS = ['observedAt', 'updatedAt', 'updated_at', 'timestamp', 'time', 'date', 'start'] as const;

export function parseAlertTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const milliseconds = value < 10_000_000_000 ? value * 1000 : value;
    return milliseconds > 0 ? milliseconds : null;
  }

  if (typeof value !== 'string' || !value.trim()) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return parseAlertTimestamp(numeric);

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getAlertObservedAt(entity: Record<string, unknown>): number | null {
  for (const key of TIMESTAMP_KEYS) {
    const parsed = parseAlertTimestamp(entity[key]);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function isRouteAlertFresh(
  kind: FreshnessAlertKind,
  observedAt: number | null,
  now = Date.now(),
): boolean {
  if (observedAt === null) return true;
  const age = now - observedAt;
  return age >= -5 * 60 * 1000 && age <= MAX_AGE_MS[kind];
}

export function formatRouteAlertAge(observedAt: number | null, now = Date.now()): string {
  if (observedAt === null) return 'Hora no disponible';

  const ageMs = Math.max(0, now - observedAt);
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'Verificado ahora';
  if (minutes < 60) return `Hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;

  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}
