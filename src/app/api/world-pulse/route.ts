import { NextResponse } from 'next/server';
import {
  buildWorldPulseSnapshot,
  earthquakeToPulseEvent,
  eonetToPulseEvent,
  fireToPulseEvent,
  gdacsToPulseEvent,
  type WorldPulseSourceInput,
} from '@/lib/world-pulse';

export const dynamic = 'force-dynamic';

type UsgsFeature = {
  id?: string;
  geometry?: { coordinates?: number[] };
  properties?: {
    mag?: number;
    place?: string;
    time?: number;
    url?: string;
    tsunami?: number;
  };
};

type EonetEvent = {
  id?: string;
  title?: string;
  link?: string;
  categories?: Array<{ title?: string }>;
  sources?: Array<{ id?: string; url?: string }>;
  geometry?: Array<{ date?: string; coordinates?: number[] }>;
};

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'AEGIS-WorldPulse/1.0' },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AEGIS-WorldPulse/1.0' },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function parseFirmsCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [] as Array<{
    id: string; lat: number; lng: number; brightness: number; frp: number; date: string; time: string;
  }>;
  const header = lines[0].split(',');
  const latIdx = header.indexOf('latitude');
  const lngIdx = header.indexOf('longitude');
  const brightIdx = header.indexOf('bright_ti4') >= 0 ? header.indexOf('bright_ti4') : header.indexOf('brightness');
  const frpIdx = header.indexOf('frp');
  const dateIdx = header.indexOf('acq_date');
  const timeIdx = header.indexOf('acq_time');
  if (latIdx < 0 || lngIdx < 0) return [];

  const points = [];
  for (let index = 1; index < lines.length; index += 1) {
    const cols = lines[index].split(',');
    const lat = Number(cols[latIdx]);
    const lng = Number(cols[lngIdx]);
    const brightness = Number(cols[brightIdx]);
    const frp = Number(cols[frpIdx]);
    const date = cols[dateIdx] || '';
    const time = cols[timeIdx] || '0000';
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    points.push({
      id: `firms:${date}:${time}:${lat.toFixed(3)}:${lng.toFixed(3)}`,
      lat,
      lng,
      brightness: Number.isFinite(brightness) ? brightness : 0,
      frp: Number.isFinite(frp) ? frp : 0,
      date,
      time,
    });
  }
  return points
    .sort((left, right) => right.frp - left.frp || right.brightness - left.brightness)
    .slice(0, 40);
}

export async function GET() {
  type GdacsFeature = {
    properties?: {
      eventid?: string | number;
      eventtype?: string;
      name?: string;
      alertlevel?: string;
      fromdate?: string;
      description?: string;
      url?: { report?: string } | string;
    };
    geometry?: { coordinates?: number[] };
  };

  const [usgsSettled, eonetSettled, firmsSettled, gdacsSettled] = await Promise.allSettled([
    fetchJson<{ features?: UsgsFeature[] }>(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
      10_000,
    ),
    fetchJson<{ events?: EonetEvent[] }>(
      'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=30',
      12_000,
    ),
    fetchText(
      'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv',
      15_000,
    ),
    // Free multi-hazard alerts (Orange/Red only) — fail-closed if shape unexpected
    fetchJson<{ features?: GdacsFeature[] }>(
      'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange;Red&limit=40',
      10_000,
    ),
  ]);

  const inputs: WorldPulseSourceInput[] = [];

  const usgs = usgsSettled.status === 'fulfilled' ? usgsSettled.value : null;
  if (!usgs) {
    inputs.push({ name: 'USGS', status: 'error', events: [] });
  } else {
    const events = (usgs.features || []).flatMap((feature) => {
      const id = feature.id;
      const coords = feature.geometry?.coordinates || [];
      const mag = Number(feature.properties?.mag);
      const lat = Number(coords[1]);
      const lng = Number(coords[0]);
      const time = Number(feature.properties?.time);
      if (!id || !Number.isFinite(mag) || !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(time)) {
        return [];
      }
      if (mag < 4) return [];
      return [earthquakeToPulseEvent({
        id,
        magnitude: mag,
        place: feature.properties?.place || 'Unknown location',
        lat,
        lng,
        time,
        tsunami: feature.properties?.tsunami === 1,
        url: feature.properties?.url,
      })];
    });
    inputs.push({ name: 'USGS', status: events.length ? 'ok' : 'empty', events });
  }

  const eonet = eonetSettled.status === 'fulfilled' ? eonetSettled.value : null;
  if (!eonet) {
    inputs.push({ name: 'NASA EONET', status: 'error', events: [] });
  } else {
    const events = (eonet.events || []).flatMap((event) => {
      const geometry = [...(event.geometry || [])]
        .filter(Boolean)
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];
      const coords = geometry?.coordinates || [];
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      const id = typeof event.id === 'string' ? event.id : '';
      const title = typeof event.title === 'string' ? event.title : '';
      if (!id || !title || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      return [eonetToPulseEvent({
        id,
        title,
        category: event.categories?.[0]?.title,
        lat,
        lng,
        date: geometry?.date || null,
        source: event.sources?.[0]?.id || 'NASA EONET',
        source_url: event.sources?.[0]?.url || null,
        link: event.link || null,
      })];
    });
    inputs.push({ name: 'NASA EONET', status: events.length ? 'ok' : 'empty', events });
  }

  const firmsCsv = firmsSettled.status === 'fulfilled' ? firmsSettled.value : null;
  if (!firmsCsv || !firmsCsv.includes('latitude')) {
    inputs.push({ name: 'NASA FIRMS', status: 'error', events: [] });
  } else {
    const events = parseFirmsCsv(firmsCsv).map((point) => fireToPulseEvent({
      ...point,
      type: 'fire',
      title: 'Fuego activo VIIRS',
      source: 'NASA FIRMS (VIIRS)',
    }));
    inputs.push({ name: 'NASA FIRMS', status: events.length ? 'ok' : 'empty', events });
  }

  const gdacs = gdacsSettled.status === 'fulfilled' ? gdacsSettled.value : null;
  if (!gdacs || !Array.isArray(gdacs.features)) {
    inputs.push({ name: 'GDACS', status: gdacs ? 'empty' : 'error', events: [] });
  } else {
    const events = gdacs.features.flatMap((feature) => {
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates || [];
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      const rawId = props.eventid;
      const id = rawId === undefined || rawId === null ? '' : String(rawId);
      const url = typeof props.url === 'string'
        ? props.url
        : props.url && typeof props.url === 'object'
          ? props.url.report || null
          : null;
      const mapped = gdacsToPulseEvent({
        id,
        name: props.name || '',
        eventType: props.eventtype,
        alertLevel: props.alertlevel,
        lat,
        lng,
        fromDate: props.fromdate || null,
        description: props.description || null,
        url,
      });
      return mapped ? [mapped] : [];
    });
    inputs.push({ name: 'GDACS', status: events.length ? 'ok' : 'empty', events });
  }

  const snapshot = buildWorldPulseSnapshot(inputs, { limit: 28 });

  return NextResponse.json({
    status: snapshot.status,
    fetched_at: new Date(snapshot.fetchedAt).toISOString(),
    sources: snapshot.sources,
    events: snapshot.events.map((event) => ({
      id: event.id,
      kind: event.kind,
      title: event.title,
      detail: event.detail,
      severity: event.severity,
      lat: event.latitude,
      lng: event.longitude,
      observed_at: new Date(event.observedAt).toISOString(),
      source: event.source,
      source_url: event.sourceUrl || null,
    })),
  }, {
    status: snapshot.status === 'unavailable' ? 503 : 200,
    headers: {
      'Cache-Control': 'public, s-maxage=90, stale-while-revalidate=180',
    },
  });
}
