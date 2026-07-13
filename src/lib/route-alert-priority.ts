export type RouteAlertSeverity = 'info' | 'warning' | 'critical';

export interface RouteAlertPriorityCandidate {
  channel: 'earthquake' | 'context';
  id: string;
  severity: RouteAlertSeverity;
  distanceMeters: number;
  source: string;
  observedAt?: number | null;
  magnitude?: number;
}

const SEVERITY_WEIGHT: Record<RouteAlertSeverity, number> = {
  info: 100,
  warning: 260,
  critical: 400,
};

const SOURCE_QUALITY = [
  { pattern: /USGS/i, score: 24 },
  { pattern: /NASA|NOAA/i, score: 20 },
  { pattern: /organismo vial|traffic|transport/i, score: 14 },
];

export function scoreRouteAlert(candidate: RouteAlertPriorityCandidate, now = Date.now()) {
  const safeDistance = Math.max(0, candidate.distanceMeters);
  const distanceScore = Math.max(0, 35 - Math.min(35, safeDistance / 2000));
  const sourceScore = SOURCE_QUALITY.find(({ pattern }) => pattern.test(candidate.source))?.score ?? 8;
  const magnitudeScore = candidate.channel === 'earthquake'
    ? Math.max(0, Math.min(45, ((candidate.magnitude ?? 0) - 3) * 15))
    : 0;

  let freshnessScore = 0;
  if (typeof candidate.observedAt === 'number' && Number.isFinite(candidate.observedAt)) {
    const ageHours = Math.max(0, now - candidate.observedAt) / 3_600_000;
    freshnessScore = Math.max(0, 30 - Math.min(30, ageHours * 2));
  }

  return SEVERITY_WEIGHT[candidate.severity]
    + distanceScore
    + sourceScore
    + magnitudeScore
    + freshnessScore;
}

export function chooseRouteAlertChannel(
  earthquake: RouteAlertPriorityCandidate | null,
  context: RouteAlertPriorityCandidate | null,
  now = Date.now(),
): RouteAlertPriorityCandidate['channel'] | null {
  if (!earthquake) return context?.channel ?? null;
  if (!context) return earthquake.channel;

  const earthquakeScore = scoreRouteAlert(earthquake, now);
  const contextScore = scoreRouteAlert(context, now);
  if (earthquakeScore !== contextScore) {
    return earthquakeScore > contextScore ? earthquake.channel : context.channel;
  }

  if (earthquake.distanceMeters !== context.distanceMeters) {
    return earthquake.distanceMeters < context.distanceMeters ? earthquake.channel : context.channel;
  }

  return earthquake.id.localeCompare(context.id) <= 0 ? earthquake.channel : context.channel;
}
