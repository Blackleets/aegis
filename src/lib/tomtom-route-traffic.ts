export type TrafficLevel = 'clear' | 'light' | 'moderate' | 'heavy';

export type TomTomRouteTrafficSummary = {
  travelTimeInSeconds?: number;
  noTrafficTravelTimeInSeconds?: number;
  trafficDelayInSeconds?: number;
  trafficLengthInMeters?: number;
  departureTime?: string;
  arrivalTime?: string;
};

export type TomTomRoutePoint = {
  latitude?: number;
  longitude?: number;
};

export type TomTomTrafficSection = {
  startPointIndex?: number;
  endPointIndex?: number;
  sectionType?: string;
  simpleCategory?: string;
  magnitudeOfDelay?: number;
  delayInSeconds?: number;
};

export type NormalizedRouteTraffic = {
  delaySeconds: number;
  trafficLengthMeters: number;
  travelTimeSeconds: number;
  freeFlowTimeSeconds: number | null;
  departureTime: string | null;
  arrivalTime: string | null;
  level: TrafficLevel;
  points: Array<{ lat: number; lng: number }>;
  sections: TomTomTrafficSection[];
};

export function parseCoordinate(value: string | null, min: number, max: number) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function buildTrafficCacheKey(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  return [fromLat, fromLng, toLat, toLng].map((value) => value.toFixed(4)).join(':');
}

export function applyLiveTrafficToDurationSeconds(
  baseDurationSeconds: number,
  traffic: { status?: string; delaySeconds?: number } | null | undefined,
) {
  const base = Math.max(0, baseDurationSeconds);
  if (!traffic || traffic.status !== 'live') return base;
  return base + Math.max(0, traffic.delaySeconds ?? 0);
}

export function formatTomTomTrafficLabel(traffic: {
  status?: string;
  configured?: boolean;
  level?: TrafficLevel;
  delaySeconds?: number;
} | null | undefined) {
  if (!traffic) return null;
  if (traffic.status === 'loading') return 'Analizando tráfico TomTom…';
  if (traffic.status !== 'live') {
    return traffic.configured === false
      ? 'Tráfico TomTom no configurado'
      : 'Tráfico TomTom no disponible';
  }
  const delayMinutes = Math.max(0, Math.round((traffic.delaySeconds ?? 0) / 60));
  if (traffic.level === 'heavy') return `Tráfico intenso · +${delayMinutes} min · TomTom`;
  if (traffic.level === 'moderate') return `Tráfico moderado · +${delayMinutes} min · TomTom`;
  if (traffic.level === 'light') return `Tráfico ligero · +${delayMinutes} min · TomTom`;
  return 'Tráfico fluido · TomTom';
}

export function classifyTrafficDelay(delaySeconds: number): TrafficLevel {
  if (delaySeconds >= 900) return 'heavy';
  if (delaySeconds >= 300) return 'moderate';
  if (delaySeconds >= 120) return 'light';
  return 'clear';
}

export function parseTomTomRoutePoints(points: TomTomRoutePoint[] | null | undefined) {
  if (!Array.isArray(points)) return [];
  const parsed: Array<{ lat: number; lng: number }> = [];
  for (const point of points) {
    if (typeof point?.latitude !== 'number' || typeof point?.longitude !== 'number') continue;
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) continue;
    if (Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) continue;
    parsed.push({ lat: point.latitude, lng: point.longitude });
  }
  return parsed;
}

export function normalizeTomTomRouteTraffic(
  summary: TomTomRouteTrafficSummary,
  extras?: {
    points?: TomTomRoutePoint[] | null;
    sections?: TomTomTrafficSection[] | null;
  },
): NormalizedRouteTraffic | null {
  if (typeof summary.travelTimeInSeconds !== 'number' || !Number.isFinite(summary.travelTimeInSeconds)) return null;

  const travelTimeSeconds = Math.max(0, summary.travelTimeInSeconds);
  const freeFlowTimeSeconds = typeof summary.noTrafficTravelTimeInSeconds === 'number' && Number.isFinite(summary.noTrafficTravelTimeInSeconds)
    ? Math.max(0, summary.noTrafficTravelTimeInSeconds)
    : null;
  const rawDelay = typeof summary.trafficDelayInSeconds === 'number' && Number.isFinite(summary.trafficDelayInSeconds)
    ? summary.trafficDelayInSeconds
    : travelTimeSeconds - (freeFlowTimeSeconds ?? travelTimeSeconds);
  const delaySeconds = Math.max(0, rawDelay);

  return {
    delaySeconds,
    trafficLengthMeters: Math.max(0, Number.isFinite(summary.trafficLengthInMeters) ? summary.trafficLengthInMeters ?? 0 : 0),
    travelTimeSeconds,
    freeFlowTimeSeconds,
    departureTime: summary.departureTime ?? null,
    arrivalTime: summary.arrivalTime ?? null,
    level: classifyTrafficDelay(delaySeconds),
    points: parseTomTomRoutePoints(extras?.points),
    sections: Array.isArray(extras?.sections) ? extras.sections : [],
  };
}
