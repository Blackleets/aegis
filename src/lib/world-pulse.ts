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

/** Grid (degrees) used to collapse near-identical detections of the same kind (~55 km cells). */
export const WORLD_PULSE_DEDUPE_GRID_DEG = 0.5;

/** Max share of the ranked list a single feed may take, so one noisy feed cannot hide the rest. */
export const WORLD_PULSE_MAX_SOURCE_SHARE = 0.4;

/** Each feed with valid events is guaranteed its top-N (by rank) so no source disappears. */
export const WORLD_PULSE_MIN_PER_SOURCE = 2;

export function worldPulseDedupeKey(
  event: Pick<WorldPulseEvent, 'kind' | 'latitude' | 'longitude'>,
  gridDeg = WORLD_PULSE_DEDUPE_GRID_DEG,
): string {
  const lat = Math.round(event.latitude / gridDeg);
  const lng = Math.round(event.longitude / gridDeg);
  return `${event.kind}:${lat}:${lng}`;
}

/**
 * Rank, dedupe (kind + rounded coords, keep the highest-scored real event) and
 * cap each feed's share. Only fills beyond the cap when other feeds cannot fill
 * the list. Never invents or merges fields — every kept event is a real upstream row.
 */
export function buildWorldPulseSnapshot(
  inputs: WorldPulseSourceInput[],
  options: { limit?: number; now?: number; maxSourceShare?: number; minPerSource?: number; dedupeGridDeg?: number } = {},
): WorldPulseSnapshot {
  const limit = Math.max(1, options.limit ?? 24);
  const now = options.now ?? Date.now();
  const maxShare = options.maxSourceShare ?? WORLD_PULSE_MAX_SOURCE_SHARE;
  const perSourceCap = Math.max(1, Math.ceil(limit * maxShare));
  const minPerSource = Math.max(0, Math.min(options.minPerSource ?? WORLD_PULSE_MIN_PER_SOURCE, perSourceCap));
  const sources = inputs.map((input) => ({
    name: input.name,
    status: input.status,
    count: input.events.length,
  }));

  const scored: Array<{ event: WorldPulseEvent; feed: string }> = [];
  for (const input of inputs) {
    for (const raw of input.events) {
      const clean = sanitizeWorldPulseEvent(raw);
      if (!clean) continue;
      scored.push({ event: { ...clean, score: scoreWorldPulseEvent(clean, now) }, feed: input.name });
    }
  }

  scored.sort((left, right) => right.event.score - left.event.score || right.event.observedAt - left.event.observedAt);

  const seen = new Set<string>();
  const deduped: typeof scored = [];
  for (const entry of scored) {
    const key = worldPulseDedupeKey(entry.event, options.dedupeGridDeg);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }

  const selected: typeof deduped = [];
  const perFeed = new Map<string, number>();
  const taken = new Set<number>();
  const take = (index: number) => {
    const entry = deduped[index];
    perFeed.set(entry.feed, (perFeed.get(entry.feed) ?? 0) + 1);
    taken.add(index);
    selected.push(entry);
  };
  // Pass 1: guarantee each feed its top-N so a quieter source (e.g. GDACS) is not drowned out.
  deduped.forEach((entry, index) => {
    if (selected.length < limit && (perFeed.get(entry.feed) ?? 0) < minPerSource) take(index);
  });
  // Pass 2: fill by rank under the per-feed cap.
  deduped.forEach((entry, index) => {
    if (selected.length < limit && !taken.has(index) && (perFeed.get(entry.feed) ?? 0) < perSourceCap) take(index);
  });
  // Pass 3: only exceed the cap when other feeds cannot fill the list.
  deduped.forEach((_entry, index) => {
    if (selected.length < limit && !taken.has(index)) take(index);
  });
  selected.sort((left, right) => right.event.score - left.event.score || right.event.observedAt - left.event.observedAt);

  const okCount = sources.filter((source) => source.status === 'ok').length;
  const status: WorldPulseSnapshot['status'] = selected.length === 0
    ? (okCount === 0 ? 'unavailable' : 'degraded')
    : okCount < inputs.length
      ? 'degraded'
      : 'ok';

  return {
    status,
    fetchedAt: now,
    sources,
    events: selected.map((entry) => entry.event),
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

/** Fire radiative power (MW) above which a VIIRS hotspot is flagged elevated. */
export const FIRE_ELEVATED_FRP_MW = 300;

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
  // A single satellite hotspot carries no impact data, so it is never "critical" on its own
  // (that level is reserved for authoritative alerts: GDACS Red, USGS M6+/tsunami).
  // VIIRS bright_ti4 saturates ~367 K, so brightness is only a weak fallback signal.
  const severity: WorldPulseSeverity = frp >= FIRE_ELEVATED_FRP_MW || (frp <= 0 && brightness >= 360)
    ? 'elevated'
    : 'watch';
  const observedAt = input.date
    ? Date.parse(`${input.date}T${(input.time || '0000').padStart(4, '0').replace(/(..)(..)/, '$1:$2')}:00Z`)
    : Number.NaN;
  return {
    id: input.id,
    kind: input.type === 'volcano' ? 'volcano' : 'wildfire',
    title: input.title || (input.type === 'volcano' ? 'Actividad volcánica' : 'Fuego activo'),
    detail: frp > 0 ? `FRP ${frp.toFixed(1)}` : brightness > 0 ? `Brillo ${Math.round(brightness)}` : 'Detección satelital',
    severity,
    latitude: input.lat,
    longitude: input.lng,
    // Fail-closed: no invented timestamp; sanitizeWorldPulseEvent drops NaN.
    observedAt,
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

  const observedAt = input.date ? Date.parse(input.date) : Number.NaN;
  return {
    id: `eonet:${input.id}`,
    kind,
    title: input.title,
    detail: input.category || 'Evento natural abierto',
    severity: kind === 'volcano' || kind === 'storm' ? 'elevated' : 'watch',
    latitude: input.lat,
    longitude: input.lng,
    // Fail-closed: no invented timestamp; sanitizeWorldPulseEvent drops NaN.
    observedAt,
    source: input.source || 'NASA EONET',
    sourceUrl: input.source_url || input.link || undefined,
  };
}


/** GDACS events whose last episode ended more than this long ago are dropped. */
export const GDACS_MAX_AGE_MS = 7 * 24 * 3_600_000;

/** GDACS emits zone-less ISO timestamps (UTC). Parse as UTC; NaN when missing/invalid. */
export function parseGdacsDate(value: string | null | undefined): number {
  if (typeof value !== 'string' || !value.trim()) return Number.NaN;
  const trimmed = value.trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  return Date.parse(hasZone ? trimmed : `${trimmed}Z`);
}

export function gdacsToPulseEvent(input: {
  id: string;
  name: string;
  eventType?: string;
  alertLevel?: string;
  lat: number;
  lng: number;
  fromDate?: string | null;
  /** Last episode date — GDACS SEARCH returns historical events, so recency comes from here. */
  toDate?: string | null;
  description?: string | null;
  url?: string | null;
  /** Reference clock for the recency window (tests). */
  now?: number;
}): Omit<WorldPulseEvent, 'score'> | null {
  const id = input.id?.trim();
  const name = input.name?.trim();
  if (!id || !name) return null;
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;

  const type = (input.eventType || '').toUpperCase();
  let kind: WorldPulseKind = 'other';
  if (type === 'EQ') kind = 'earthquake';
  else if (type === 'TC') kind = 'storm';
  else if (type === 'FL') kind = 'flood';
  else if (type === 'VO') kind = 'volcano';
  else if (type === 'WF') kind = 'wildfire';

  const alert = (input.alertLevel || '').toLowerCase();
  const severity: WorldPulseSeverity = alert.includes('red')
    ? 'critical'
    : alert.includes('orange')
      ? 'elevated'
      : alert.includes('green')
        ? 'watch'
        : 'info';

  // Last known activity = latest valid of toDate / fromDate. No date → drop (fail-closed).
  const candidates = [parseGdacsDate(input.toDate), parseGdacsDate(input.fromDate)].filter(Number.isFinite);
  if (candidates.length === 0) return null;
  const observedAt = Math.max(...candidates);
  const now = input.now ?? Date.now();
  // Historical alerts (ended > window ago) are not "live" — never surface them as current.
  if (now - observedAt > GDACS_MAX_AGE_MS) return null;
  return {
    id: `gdacs:${id}`,
    kind,
    title: name,
    detail: input.description?.trim() || `GDACS ${input.alertLevel || 'alert'} · ${type || 'event'}`,
    severity,
    latitude: input.lat,
    longitude: input.lng,
    // Fail-closed: no invented timestamp; sanitizeWorldPulseEvent drops NaN.
    observedAt,
    source: 'GDACS',
    sourceUrl: input.url || undefined,
  };
}
