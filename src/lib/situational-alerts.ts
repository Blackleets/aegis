/** Multi-source situational radar: normalize / merge / dedupe / rank (fail-closed). */

export type SituationalKind =
  | 'earthquake'
  | 'wildfire'
  | 'volcano'
  | 'storm'
  | 'flood'
  | 'conflict'
  | 'news'
  | 'weather'
  | 'other';

export type SituationalSeverity = 'critical' | 'high' | 'elevated' | 'moderate' | 'low';

export interface SituationalAlert {
  id: string;
  kind: SituationalKind;
  title: string;
  detail?: string;
  severity: SituationalSeverity;
  source: string;
  observedAt: number;
  lat?: number;
  lng?: number;
  url?: string;
}

export type SituationalFilterChip =
  | 'all'
  | 'tierra'
  | 'clima'
  | 'conflicto'
  | 'noticias'
  | 'otros';

export interface SituationalSourceStatus {
  name: string;
  status: 'ok' | 'error' | 'empty' | 'skipped';
  count: number;
}

export interface SituationalRadarSnapshot {
  status: 'ok' | 'degraded' | 'unavailable';
  alerts: SituationalAlert[];
  sources: SituationalSourceStatus[];
  fetchedAt: number;
}

const SEVERITY_RANK: Record<SituationalSeverity, number> = {
  critical: 5,
  high: 4,
  elevated: 3,
  moderate: 2,
  low: 1,
};

const PULSE_SEVERITY: Record<string, SituationalSeverity> = {
  critical: 'critical',
  elevated: 'high',
  watch: 'elevated',
  info: 'moderate',
};

const KIND_CHIP: Record<SituationalKind, SituationalFilterChip> = {
  earthquake: 'tierra',
  volcano: 'tierra',
  wildfire: 'clima',
  storm: 'clima',
  flood: 'clima',
  weather: 'clima',
  conflict: 'conflicto',
  news: 'noticias',
  other: 'otros',
};

function trimStr(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseTime(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function finiteCoord(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const a = typeof lat === 'number' ? lat : typeof lat === 'string' ? Number(lat) : NaN;
  const b = typeof lng === 'number' ? lng : typeof lng === 'string' ? Number(lng) : NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < -90 || a > 90 || b < -180 || b > 180) return null;
  return { lat: a, lng: b };
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 80);
}

function approxCoordKey(lat?: number, lng?: number): string | null {
  if (lat === undefined || lng === undefined) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `${lat.toFixed(1)}:${lng.toFixed(1)}`;
}

/** Fail-closed: drop missing id / title / source / observedAt. Coords optional. */
export function sanitizeSituationalAlert(
  raw: Partial<SituationalAlert> | null | undefined,
): SituationalAlert | null {
  if (!raw) return null;
  const id = trimStr(raw.id);
  const title = trimStr(raw.title);
  const source = trimStr(raw.source);
  const observedAt = typeof raw.observedAt === 'number' && Number.isFinite(raw.observedAt)
    ? raw.observedAt
    : null;
  if (!id || !title || !source || observedAt === null) return null;

  const severity = raw.severity && SEVERITY_RANK[raw.severity] ? raw.severity : 'moderate';
  const kind = (raw.kind && KIND_CHIP[raw.kind] ? raw.kind : 'other') as SituationalKind;
  const detail = trimStr(raw.detail);
  const url = trimStr(raw.url);

  const alert: SituationalAlert = {
    id,
    kind,
    title,
    severity,
    source,
    observedAt,
  };
  if (detail) alert.detail = detail;
  if (url) alert.url = url;

  const coords = finiteCoord(raw.lat, raw.lng);
  if (coords) {
    alert.lat = coords.lat;
    alert.lng = coords.lng;
  }
  return alert;
}

export function isBlockedNewsSource(item: { source?: unknown; link?: unknown; url?: unknown }): boolean {
  const source = String(item.source || '').toLowerCase();
  const link = String(item.link || item.url || '').toLowerCase();
  return source.includes('t.me')
    || source.includes('telegram')
    || link.includes('t.me/')
    || link.includes('telegram.');
}

export function pulseEventToAlert(raw: Record<string, unknown>): SituationalAlert | null {
  const id = trimStr(raw.id);
  const title = trimStr(raw.title);
  const source = trimStr(raw.source);
  const observedAt = parseTime(raw.observed_at ?? raw.observedAt);
  if (!id || !title || !source || observedAt === null) return null;

  const kindRaw = trimStr(raw.kind) || 'other';
  const kind = (KIND_CHIP[kindRaw as SituationalKind] ? kindRaw : 'other') as SituationalKind;
  const sevRaw = trimStr(raw.severity).toLowerCase();
  const severity = PULSE_SEVERITY[sevRaw] || 'moderate';
  const detail = trimStr(raw.detail);
  const url = trimStr(raw.source_url ?? raw.sourceUrl ?? raw.url);
  const lat = typeof raw.lat === 'number' ? raw.lat : typeof raw.latitude === 'number' ? raw.latitude : undefined;
  const lng = typeof raw.lng === 'number' ? raw.lng : typeof raw.longitude === 'number' ? raw.longitude : undefined;

  return sanitizeSituationalAlert({
    id: id.startsWith('pulse:') || id.includes(':') ? id : `pulse:${id}`,
    kind,
    title,
    detail: detail || undefined,
    severity,
    source,
    observedAt,
    lat,
    lng,
    url: url || undefined,
  });
}

export function earthquakeToAlert(raw: Record<string, unknown>): SituationalAlert | null {
  const id = trimStr(raw.id);
  const place = trimStr(raw.place) || trimStr(raw.location);
  const magnitude = Number(raw.magnitude);
  const observedAt = parseTime(raw.time);
  if (!id || !place || !Number.isFinite(magnitude) || observedAt === null) return null;

  const tsunami = Boolean(raw.tsunami);
  const severity: SituationalSeverity = tsunami || magnitude >= 6
    ? 'critical'
    : magnitude >= 4.5
      ? 'high'
      : magnitude >= 3.5
        ? 'elevated'
        : 'moderate';

  const depth = typeof raw.depth === 'number' ? raw.depth : undefined;
  const url = trimStr(raw.url) || `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`;

  return sanitizeSituationalAlert({
    id: `quake:${id}`,
    kind: 'earthquake',
    title: `M${magnitude.toFixed(1)} · ${place}`,
    detail: [
      typeof depth === 'number' ? `${depth.toFixed(1)} km` : null,
      tsunami ? 'TSUNAMI' : null,
    ].filter(Boolean).join(' · ') || undefined,
    severity,
    source: 'USGS',
    observedAt,
    lat: typeof raw.lat === 'number' ? raw.lat : undefined,
    lng: typeof raw.lng === 'number' ? raw.lng : undefined,
    url,
  });
}

export function newsToAlert(raw: Record<string, unknown>): SituationalAlert | null {
  if (isBlockedNewsSource(raw)) return null;
  const id = trimStr(raw.id);
  const title = trimStr(raw.title) || trimStr(raw.description);
  const source = trimStr(raw.source);
  const observedAt = parseTime(raw.published ?? raw.pubDate ?? raw.time);
  if (!id || !title || !source || observedAt === null) return null;

  const risk = Number(raw.risk_score);
  const severity: SituationalSeverity = Number.isFinite(risk)
    ? risk >= 8
      ? 'critical'
      : risk >= 6
        ? 'high'
        : risk >= 4
          ? 'elevated'
          : 'moderate'
    : 'moderate';

  let lat: number | undefined;
  let lng: number | undefined;
  const coords = raw.coords;
  if (Array.isArray(coords) && coords.length >= 2) {
    const c = finiteCoord(coords[0], coords[1]);
    if (c) {
      lat = c.lat;
      lng = c.lng;
    }
  }

  return sanitizeSituationalAlert({
    id: `news:${id}`,
    kind: 'news',
    title,
    detail: trimStr(raw.description) || undefined,
    severity,
    source,
    observedAt,
    lat,
    lng,
    url: trimStr(raw.link ?? raw.url) || undefined,
  });
}

/** Optional weather: only keep events with lat/lng + source + time. Skip weak/low. */
export function weatherToAlert(raw: Record<string, unknown>): SituationalAlert | null {
  const id = trimStr(raw.id);
  const title = trimStr(raw.title) || trimStr(raw.headline);
  const source = trimStr(raw.provider) || trimStr(raw.source);
  const observedAt = parseTime(raw.date ?? raw.effective ?? raw.sent ?? raw.observedAt);
  const coords = finiteCoord(raw.lat, raw.lng);
  if (!id || !title || !source || observedAt === null || !coords) return null;

  const sevRaw = trimStr(raw.severity).toLowerCase();
  if (sevRaw === 'low' || sevRaw === 'info' || sevRaw === 'minor' || sevRaw === 'unknown') {
    return null;
  }

  const severity: SituationalSeverity = sevRaw === 'high' || sevRaw === 'extreme' || sevRaw === 'severe'
    ? 'high'
    : sevRaw === 'medium' || sevRaw === 'moderate'
      ? 'elevated'
      : 'elevated';

  const category = trimStr(raw.category || raw.type).toLowerCase();
  let kind: SituationalKind = 'weather';
  if (category.includes('volcano')) kind = 'volcano';
  else if (category.includes('storm') || category.includes('cyclone') || category.includes('hurricane')) kind = 'storm';
  else if (category.includes('flood')) kind = 'flood';
  else if (category.includes('fire')) kind = 'wildfire';

  const maybeUrl = trimStr(raw.url);
  const sourceMaybeUrl = trimStr(raw.source);
  const url = maybeUrl.startsWith('http')
    ? maybeUrl
    : sourceMaybeUrl.startsWith('http')
      ? sourceMaybeUrl
      : undefined;

  return sanitizeSituationalAlert({
    id: `weather:${id}`,
    kind,
    title,
    detail: trimStr(raw.area) || trimStr(raw.type) || undefined,
    severity,
    source,
    observedAt,
    lat: coords.lat,
    lng: coords.lng,
    url,
  });
}

export function dedupeSituationalAlerts(alerts: SituationalAlert[]): SituationalAlert[] {
  const byId = new Map<string, SituationalAlert>();
  const softKeys = new Map<string, string>();

  for (const alert of alerts) {
    if (byId.has(alert.id)) {
      const existing = byId.get(alert.id)!;
      if (SEVERITY_RANK[alert.severity] > SEVERITY_RANK[existing.severity]
        || (SEVERITY_RANK[alert.severity] === SEVERITY_RANK[existing.severity]
          && alert.observedAt > existing.observedAt)) {
        byId.set(alert.id, alert);
      }
      continue;
    }

    const coordKey = approxCoordKey(alert.lat, alert.lng);
    const titleKey = normalizeTitleKey(alert.title);
    const soft = coordKey && titleKey ? `${alert.kind}|${coordKey}|${titleKey}` : null;

    if (soft && softKeys.has(soft)) {
      const existingId = softKeys.get(soft)!;
      const existing = byId.get(existingId);
      if (existing) {
        if (SEVERITY_RANK[alert.severity] > SEVERITY_RANK[existing.severity]
          || (SEVERITY_RANK[alert.severity] === SEVERITY_RANK[existing.severity]
            && alert.observedAt > existing.observedAt)) {
          byId.delete(existingId);
          byId.set(alert.id, alert);
          softKeys.set(soft, alert.id);
        }
        continue;
      }
    }

    byId.set(alert.id, alert);
    if (soft) softKeys.set(soft, alert.id);
  }

  return Array.from(byId.values());
}

export function rankSituationalAlerts(alerts: SituationalAlert[]): SituationalAlert[] {
  return [...alerts].sort((a, b) => {
    const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sev !== 0) return sev;
    return b.observedAt - a.observedAt;
  });
}

export function filterAlertsByChip(
  alerts: SituationalAlert[],
  chip: SituationalFilterChip,
): SituationalAlert[] {
  if (chip === 'all') return alerts;
  return alerts.filter((alert) => KIND_CHIP[alert.kind] === chip);
}

export function buildSituationalRadar(input: {
  pulseEvents?: Array<Record<string, unknown>>;
  pulseStatus?: 'ok' | 'degraded' | 'unavailable' | 'error';
  earthquakes?: Array<Record<string, unknown>>;
  quakeStatus?: 'ok' | 'error' | 'empty';
  news?: Array<Record<string, unknown>>;
  newsStatus?: 'ok' | 'error' | 'empty';
  weatherEvents?: Array<Record<string, unknown>>;
  weatherStatus?: 'ok' | 'error' | 'empty' | 'skipped';
  limit?: number;
  now?: number;
}): SituationalRadarSnapshot {
  const limit = input.limit ?? 40;
  const now = input.now ?? Date.now();
  const sources: SituationalSourceStatus[] = [];

  const pulseRaw = Array.isArray(input.pulseEvents) ? input.pulseEvents : [];
  const pulseAlerts = pulseRaw.map(pulseEventToAlert).filter((a): a is SituationalAlert => Boolean(a));
  const pulseStatus = input.pulseStatus === 'error' || input.pulseStatus === 'unavailable'
    ? 'error'
    : pulseAlerts.length
      ? 'ok'
      : input.pulseStatus === 'degraded'
        ? 'ok'
        : pulseRaw.length
          ? 'empty'
          : (input.pulseStatus === 'ok' ? 'empty' : (input.pulseStatus ? 'error' : 'empty'));
  sources.push({ name: 'World Pulse', status: pulseStatus === 'error' ? 'error' : pulseStatus, count: pulseAlerts.length });

  const quakeRaw = Array.isArray(input.earthquakes) ? input.earthquakes : [];
  const quakeAlerts = quakeRaw.map(earthquakeToAlert).filter((a): a is SituationalAlert => Boolean(a));
  const quakeStatus = input.quakeStatus === 'error'
    ? 'error'
    : quakeAlerts.length
      ? 'ok'
      : 'empty';
  sources.push({ name: 'USGS', status: quakeStatus, count: quakeAlerts.length });

  const newsRaw = Array.isArray(input.news) ? input.news : [];
  const newsAlerts = newsRaw.map(newsToAlert).filter((a): a is SituationalAlert => Boolean(a));
  const newsStatus = input.newsStatus === 'error'
    ? 'error'
    : newsAlerts.length
      ? 'ok'
      : 'empty';
  sources.push({ name: 'News', status: newsStatus, count: newsAlerts.length });

  const weatherRaw = Array.isArray(input.weatherEvents) ? input.weatherEvents : [];
  let weatherAlerts: SituationalAlert[] = [];
  let weatherStatus: SituationalSourceStatus['status'] = input.weatherStatus === 'skipped'
    ? 'skipped'
    : input.weatherStatus === 'error'
      ? 'error'
      : 'empty';
  if (input.weatherStatus !== 'skipped') {
    weatherAlerts = weatherRaw.map(weatherToAlert).filter((a): a is SituationalAlert => Boolean(a));
    weatherStatus = input.weatherStatus === 'error'
      ? 'error'
      : weatherAlerts.length
        ? 'ok'
        : 'empty';
  }
  sources.push({ name: 'Weather', status: weatherStatus, count: weatherAlerts.length });

  const merged = dedupeSituationalAlerts([
    ...pulseAlerts,
    ...quakeAlerts,
    ...newsAlerts,
    ...weatherAlerts,
  ]);
  const ranked = rankSituationalAlerts(merged).slice(0, Math.max(1, limit));

  const attempted = sources.filter((s) => s.status !== 'skipped');
  const okCount = attempted.filter((s) => s.status === 'ok').length;
  const errorCount = attempted.filter((s) => s.status === 'error').length;

  let status: SituationalRadarSnapshot['status'];
  if (ranked.length === 0) {
    status = okCount === 0 && errorCount > 0 ? 'unavailable' : 'degraded';
  } else if (errorCount > 0 || okCount < attempted.length) {
    status = 'degraded';
  } else {
    status = 'ok';
  }

  return {
    status,
    alerts: ranked,
    sources,
    fetchedAt: now,
  };
}

export function kindLabelEs(kind: SituationalKind): string {
  switch (kind) {
    case 'earthquake': return 'Sismo';
    case 'wildfire': return 'Fuego';
    case 'volcano': return 'Volcán';
    case 'storm': return 'Tormenta';
    case 'flood': return 'Inundación';
    case 'conflict': return 'Conflicto';
    case 'news': return 'Noticia';
    case 'weather': return 'Clima';
    default: return 'Otro';
  }
}

export function severityLabelEs(severity: SituationalSeverity): string {
  switch (severity) {
    case 'critical': return 'CRÍTICO';
    case 'high': return 'ALTO';
    case 'elevated': return 'ELEVADO';
    case 'moderate': return 'MODERADO';
    default: return 'BAJO';
  }
}

export function relativeTimeEs(observedAt: number, now = Date.now()): string {
  if (!Number.isFinite(observedAt)) return '';
  const minutes = Math.max(0, Math.round((now - observedAt) / 60_000));
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

export const SITUATIONAL_FILTER_CHIPS: Array<{ id: SituationalFilterChip; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'tierra', label: 'Tierra' },
  { id: 'clima', label: 'Clima' },
  { id: 'conflicto', label: 'Conflicto' },
  { id: 'noticias', label: 'Noticias' },
  { id: 'otros', label: 'Otros' },
];
