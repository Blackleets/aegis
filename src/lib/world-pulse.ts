/** Ranked global catastrophe / natural-event pulse (Orbital / GlobalAlert inspired). */

export type WorldPulseKind =
  | 'earthquake'
  | 'wildfire'
  | 'volcano'
  | 'storm'
  | 'flood'
  | 'conflict'
  | 'other';

export type WorldPulseSeverity = 'info' | 'watch' | 'elevated' | 'critical';

export interface WorldPulseEvent {
  id: string;
  kind: WorldPulseKind;
  title: string;
  detail: string;
  severity: WorldPulseSeverity;
  latitude: number;
  longitude: number;
  observedAt: number;
  source: string;
  sourceUrl?: string;
  score: number;
}

export interface WorldPulseSourceInput {
  name: string;
  status: 'ok' | 'error' | 'empty';
  events: Array<Omit<WorldPulseEvent, 'score'>>;
}

export interface WorldPulseSnapshot {
  status: 'ok' | 'degraded' | 'unavailable';
  fetchedAt: number;
  sources: Array<{ name: string; status: WorldPulseSourceInput['status']; count: number }>;
  events: WorldPulseEvent[];
}

const SEVERITY_WEIGHT: Record<WorldPulseSeverity, number> = {
  critical: 400,
  elevated: 240,
  watch: 120,
  info: 40,
};

const KIND_WEIGHT: Record<WorldPulseKind, number> = {
  earthquake: 30,
  volcano: 28,
  storm: 22,
  flood: 20,
  wildfire: 18,
  conflict: 16,
  other: 8,
};

function assertFiniteCoord(lat: number, lng: number) {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90
    && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

/** Fail-closed: drop events without identity, coords, source, or timestamp. */
export function sanitizeWorldPulseEvent(
  event: Omit<WorldPulseEvent, 'score'> | null | undefined,
): Omit<WorldPulseEvent, 'score'> | null {
  if (!event) return null;
  const id = typeof event.id === 'string' ? event.id.trim() : '';
  const title = typeof event.title === 'string' ? event.title.trim() : '';
  const source = typeof event.source === 'string' ? event.source.trim() : '';
  if (!id || !title || !source) return null;
  if (!assertFiniteCoord(event.latitude, event.longitude)) return null;
  if (!Number.isFinite(event.observedAt)) return null;
  const detail = typeof event.detail === 'string' ? event.detail.trim() : '';
  const cleaned: Omit<WorldPulseEvent, 'score'> = {
    id,
    kind: event.kind,
    title,
    detail: detail || title,
    severity: event.severity,
    latitude: event.latitude,
    longitude: event.longitude,
    observedAt: event.observedAt,
    source,
  };
  if (typeof event.sourceUrl === 'string' && event.sourceUrl.trim()) {
    cleaned.sourceUrl = event.sourceUrl.trim();
  }
  return cleaned;
}

export function scoreWorldPulseEvent(
  event: Omit<WorldPulseEvent, 'score'>,
  now = Date.now(),
): number {
  const ageHours = Math.max(0, (now - event.observedAt) / 3_600_000);
  const freshness = Math.max(0, 120 - ageHours * 4);
  return SEVERITY_WEIGHT[event.severity] + KIND_WEIGHT[event.kind] + freshness;
}

export function buildWorldPulseSnapshot(
  inputs: WorldPulseSourceInput[],
  options: { limit?: number; now?: number } = {},
): WorldPulseSnapshot {
  const limit = options.limit ?? 24;
  const now = options.now ?? Date.now();
  const sources = inputs.map((input) => ({
    name: input.name,
    status: input.status,
    count: input.events.length,
  }));

  const scored: WorldPulseEvent[] = [];
  for (const input of inputs) {
    for (const raw of input.events) {
      const clean = sanitizeWorldPulseEvent(raw);
      if (!clean) continue;
      scored.push({ ...clean, score: scoreWorldPulseEvent(clean, now) });
    }
  }

  scored.sort((left, right) => right.score - left.score || right.observedAt - left.observedAt);

  const okCount = sources.filter((source) => source.status === 'ok').length;
  const status: WorldPulseSnapshot['status'] = scored.length === 0
    ? (okCount === 0 ? 'unavailable' : 'degraded')
    : okCount < inputs.length
      ? 'degraded'
      : 'ok';

  return {
    status,
    fetchedAt: now,
    sources,
    events: scored.slice(0, Math.max(1, limit)),
  };
}

export function earthquakeToPulseEvent(input: {
  id: string;
  magnitude: number;
  place: string;
  lat: number;
  lng: number;
  time: number;
  tsunami?: boolean;
  url?: string;
}): Omit<WorldPulseEvent, 'score'> {
  const severity: WorldPulseSeverity = input.tsunami || input.magnitude >= 6
    ? 'critical'
    : input.magnitude >= 4.5
      ? 'elevated'
      : input.magnitude >= 3.5
        ? 'watch'
        : 'info';
  return {
    id: `quake:${input.id}`,
    kind: 'earthquake',
    title: `M${input.magnitude.toFixed(1)} · ${input.place}`,
    detail: input.tsunami ? 'Alerta de tsunami asociada' : `Magnitud ${input.magnitude.toFixed(1)}`,
    severity,
    latitude: input.lat,
    longitude: input.lng,
    observedAt: input.time,
    source: 'USGS',
    sourceUrl: input.url,
  };
}

export function fireToPulseEvent(input: {
  id: string;
  lat: number;
  lng: number;
  brightness?: number;
  frp?: number;
  date?: string;
  time?: string;
  type?: 'fire' | 'volcano';
  title?: string;
  source?: string;
}): Omit<WorldPulseEvent, 'score'> {
  const frp = Number(input.frp) || 0;
  const brightness = Number(input.brightness) || 0;
  const severity: WorldPulseSeverity = frp >= 40 || brightness >= 400
    ? 'critical'
    : frp >= 15 || brightness >= 320
      ? 'elevated'
      : 'watch';
  const observedAt = Date.parse(`${input.date || ''}T${(input.time || '0000').padStart(4, '0').replace(/(..)(..)/, '$1:$2')}:00Z`);
  return {
    id: input.id,
    kind: input.type === 'volcano' ? 'volcano' : 'wildfire',
    title: input.title || (input.type === 'volcano' ? 'Actividad volcánica' : 'Fuego activo'),
    detail: frp > 0 ? `FRP ${frp.toFixed(1)}` : brightness > 0 ? `Brillo ${Math.round(brightness)}` : 'Detección satelital',
    severity,
    latitude: input.lat,
    longitude: input.lng,
    observedAt: Number.isFinite(observedAt) ? observedAt : Date.now(),
    source: input.source || 'NASA FIRMS',
  };
}

export function eonetToPulseEvent(input: {
  id: string;
  title: string;
  category?: string;
  lat: number;
  lng: number;
  date?: string | null;
  source?: string;
  source_url?: string | null;
  link?: string | null;
}): Omit<WorldPulseEvent, 'score'> {
  const category = (input.category || '').toLowerCase();
  let kind: WorldPulseKind = 'other';
  if (category.includes('volcano')) kind = 'volcano';
  else if (category.includes('wildfire') || category.includes('fire')) kind = 'wildfire';
  else if (category.includes('storm') || category.includes('cyclone') || category.includes('hurricane')) kind = 'storm';
  else if (category.includes('flood')) kind = 'flood';
  else if (category.includes('quake') || category.includes('seism')) kind = 'earthquake';

  const observedAt = input.date ? Date.parse(input.date) : Date.now();
  return {
    id: `eonet:${input.id}`,
    kind,
    title: input.title,
    detail: input.category || 'Evento natural abierto',
    severity: kind === 'volcano' || kind === 'storm' ? 'elevated' : 'watch',
    latitude: input.lat,
    longitude: input.lng,
    observedAt: Number.isFinite(observedAt) ? observedAt : Date.now(),
    source: input.source || 'NASA EONET',
    sourceUrl: input.source_url || input.link || undefined,
  };
}
