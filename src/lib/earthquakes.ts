export interface EarthquakeEvent {
  id: string;
  lat: number;
  lng: number;
  depth: number;
  magnitude: number;
  place: string;
  time: number;
  updated?: number;
  url?: string;
  tsunami: boolean;
  felt?: number | null;
  alert?: string | null;
}

export type EarthquakeSeverity = 'low' | 'moderate' | 'high' | 'critical';

export function getEarthquakeSeverity(event: Pick<EarthquakeEvent, 'magnitude' | 'depth' | 'tsunami'>): EarthquakeSeverity {
  if (event.tsunami || event.magnitude >= 6) return 'critical';
  if (event.magnitude >= 4.5 || (event.magnitude >= 4 && event.depth <= 30)) return 'high';
  if (event.magnitude >= 3.5) return 'moderate';
  return 'low';
}

export function isRecentEarthquake(eventTime: number, now = Date.now(), windowMs = 120_000) {
  return Number.isFinite(eventTime) && eventTime <= now + 30_000 && now - eventTime <= windowMs;
}

export function findNewEarthquakes<T extends { id?: unknown }>(events: T[], seenIds: Set<string>): T[] {
  return events.filter((event) => {
    const id = typeof event.id === 'string' ? event.id : '';
    return id.length > 0 && !seenIds.has(id);
  });
}
