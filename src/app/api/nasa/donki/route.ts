import { NextResponse } from 'next/server';

type DonkiRecord = Record<string, unknown>;

type DonkiFamily = 'CME' | 'FLR' | 'GST' | 'IPS' | 'MPC' | 'SEP';
type NasaCredential = string;

type DonkiEvent = {
  id: string;
  family: DonkiFamily;
  label: string;
  time: string | null;
  severity: 'low' | 'watch' | 'storm';
  summary: string;
  source?: string | null;
};

const FAMILIES: DonkiFamily[] = ['CME', 'FLR', 'GST', 'IPS', 'MPC', 'SEP'];

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function pickTime(record: DonkiRecord, family: DonkiFamily) {
  const keys: Partial<Record<DonkiFamily, string[]>> = {
    CME: ['startTime', 'time21_5', 'noteTime'],
    FLR: ['beginTime', 'peakTime', 'endTime'],
    GST: ['startTime', 'observedTime'],
    IPS: ['eventTime', 'activityStartTime'],
    MPC: ['eventTime', 'activityStartTime'],
    SEP: ['eventTime'],
  };

  for (const key of keys[family] || []) {
    const value = safeString(record[key]);
    if (value) return value;
  }
  return null;
}

function eventId(record: DonkiRecord, family: DonkiFamily, index: number) {
  const candidate = safeString(record[`${family.toLowerCase()}ID`])
    || safeString(record.activityID)
    || safeString(record.flrID)
    || safeString(record.gstID)
    || safeString(record.cmeID)
    || safeString(record.sepID)
    || safeString(record.catalog);
  return candidate || `${family}-${index}`;
}

function flareClass(record: DonkiRecord) {
  return safeString(record.classType) || safeString(record.intensity) || 'FLR';
}

function gstLevel(record: DonkiRecord) {
  const kp = Number(record.kpIndex ?? record.kp_index ?? 0);
  if (Number.isFinite(kp) && kp >= 7) return `G${Math.max(1, Math.min(5, Math.round(kp - 4)))}`;
  return kp ? `Kp ${kp}` : 'GST';
}

function severityFor(record: DonkiRecord, family: DonkiFamily): DonkiEvent['severity'] {
  if (family === 'GST') {
    const kp = Number(record.kpIndex ?? record.kp_index ?? 0);
    if (Number.isFinite(kp) && kp >= 7) return 'storm';
    if (Number.isFinite(kp) && kp >= 5) return 'watch';
  }

  if (family === 'FLR') {
    const cls = flareClass(record).toUpperCase();
    if (cls.startsWith('X')) return 'storm';
    if (cls.startsWith('M')) return 'watch';
  }

  if (family === 'CME') {
    const speed = Number(record.speed ?? record.halfAngle ?? 0);
    const type = safeString(record.type).toUpperCase();
    if (type.includes('HALO') || speed >= 900) return 'storm';
    if (speed >= 500) return 'watch';
  }

  if (family === 'SEP' || family === 'IPS') return 'watch';
  return 'low';
}

function eventSummary(record: DonkiRecord, family: DonkiFamily) {
  if (family === 'FLR') return `Solar flare ${flareClass(record)}`;
  if (family === 'GST') return `Geomagnetic storm ${gstLevel(record)}`;
  if (family === 'CME') return `Coronal mass ejection ${safeString(record.type) || 'tracked'}`;
  if (family === 'IPS') return 'Interplanetary shock signature';
  if (family === 'MPC') return 'Magnetopause crossing';
  return 'Solar energetic particle event';
}

function normalize(record: DonkiRecord, family: DonkiFamily, index: number): DonkiEvent {
  return {
    id: eventId(record, family, index),
    family,
    label: family === 'FLR' ? flareClass(record) : family === 'GST' ? gstLevel(record) : family,
    time: pickTime(record, family),
    severity: severityFor(record, family),
    summary: eventSummary(record, family),
    source: safeString(record.link) || safeString(record.sourceLocation) || null,
  };
}

async function fetchFamily(family: DonkiFamily, startDate: string, endDate: string, keyValue: NasaCredential) {
  const url = `https://api.nasa.gov/DONKI/${family}?startDate=${startDate}&endDate=${endDate}&api_key=${keyValue}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
    next: { revalidate: 1800 },
  });

  if (!res.ok) throw new Error(`${family} returned ${res.status}`);
  const payload = await res.json();
  return Array.isArray(payload) ? payload as DonkiRecord[] : [];
}

export async function GET() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 7);

  const startDate = formatDate(start);
  const endDate = formatDate(now);
  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';

  const settled = await Promise.allSettled(
    FAMILIES.map((family) => fetchFamily(family, startDate, endDate, apiKey).then((records) => ({ family, records }))),
  );

  const events: DonkiEvent[] = [];
  const familyCounts: Record<DonkiFamily, number> = {
    CME: 0,
    FLR: 0,
    GST: 0,
    IPS: 0,
    MPC: 0,
    SEP: 0,
  };
  const errors: string[] = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      familyCounts[result.value.family] = result.value.records.length;
      events.push(...result.value.records.map((record, index) => normalize(record, result.value.family, index)));
    } else {
      errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  }

  const ranked = events
    .sort((a, b) => {
      const severityRank = { storm: 3, watch: 2, low: 1 } as const;
      const severityDelta = severityRank[b.severity] - severityRank[a.severity];
      if (severityDelta !== 0) return severityDelta;
      return new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime();
    })
    .slice(0, 10);

  const stormCount = events.filter((event) => event.severity === 'storm').length;
  const watchCount = events.filter((event) => event.severity === 'watch').length;
  const status = stormCount > 0 ? 'storm' : watchCount > 0 ? 'watch' : errors.length === FAMILIES.length ? 'error' : 'quiet';

  return NextResponse.json({
    source: 'NASA DONKI',
    status,
    fetched_at: new Date().toISOString(),
    window: { start_date: startDate, end_date: endDate },
    total: events.length,
    storm_count: stormCount,
    watch_count: watchCount,
    family_counts: familyCounts,
    events: ranked,
    degraded: errors.length > 0,
    errors: errors.slice(0, 3),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
  });
}
