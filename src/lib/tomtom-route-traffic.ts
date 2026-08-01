export type TrafficLevel = 'clear' | 'light' | 'moderate' | 'heavy';

export type TomTomRouteTrafficSummary = {
  travelTimeInSeconds?: number;
  noTrafficTravelTimeInSeconds?: number;
  trafficDelayInSeconds?: number;
  trafficLengthInMeters?: number;
  departureTime?: string;
  arrivalTime?: string;
};

export type NormalizedRouteTraffic = {
  delaySeconds: number;
  trafficLengthMeters: number;
  travelTimeSeconds: number;
  freeFlowTimeSeconds: number | null;
  departureTime: string | null;
  arrivalTime: string | null;
  level: TrafficLevel;
};

export function parseCoordinate(value: string | null, min: number, max: number) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function buildTrafficCacheKey(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  return [fromLat, fromLng, toLat, toLng].map((value) => value.toFixed(4)).join(':');
}

export function classifyTrafficDelay(delaySeconds: number): TrafficLevel {
  if (delaySeconds >= 900) return 'heavy';
  if (delaySeconds >= 300) return 'moderate';
  if (delaySeconds >= 120) return 'light';
  return 'clear';
}

export function normalizeTomTomRouteTraffic(summary: TomTomRouteTrafficSummary): NormalizedRouteTraffic | null {
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
  };
}
