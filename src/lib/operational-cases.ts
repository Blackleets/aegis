export type OperationalSignalSeverity = 'info' | 'warning' | 'critical';

export interface OperationalSignal {
  id: string;
  kind: string;
  title: string;
  source: string;
  latitude: number;
  longitude: number;
  observedAt: number;
  severity: OperationalSignalSeverity;
}

export interface OperationalCase {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  openedAt: number;
  updatedAt: number;
  severity: OperationalSignalSeverity;
  confidence: 'medium' | 'high';
  sourceCount: number;
  signals: OperationalSignal[];
}

const EARTH_RADIUS_METERS = 6_371_000;
const SEVERITY_WEIGHT: Record<OperationalSignalSeverity, number> = {
  info: 1,
  warning: 2,
  critical: 3,
};

export function buildOperationalCases(
  signals: OperationalSignal[],
  options: { radiusMeters?: number; windowMs?: number } = {},
): OperationalCase[] {
  const radiusMeters = options.radiusMeters ?? 50_000;
  const windowMs = options.windowMs ?? 6 * 60 * 60 * 1000;
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) throw new Error('radiusMeters must be positive');
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error('windowMs must be positive');

  const validSignals = signals.map(validateSignal).sort(
    (left, right) => right.observedAt - left.observedAt || left.id.localeCompare(right.id),
  );
  const clusters: OperationalSignal[][] = [];

  for (const signal of validSignals) {
    const cluster = clusters.find((candidate) => {
      const newest = Math.max(...candidate.map(({ observedAt }) => observedAt));
      const oldest = Math.min(...candidate.map(({ observedAt }) => observedAt));
      const nextNewest = Math.max(newest, signal.observedAt);
      const nextOldest = Math.min(oldest, signal.observedAt);
      const center = clusterCenter(candidate);
      return nextNewest - nextOldest <= windowMs
        && distanceMeters(center.latitude, center.longitude, signal.latitude, signal.longitude) <= radiusMeters;
    });
    if (cluster) cluster.push(signal);
    else clusters.push([signal]);
  }

  return clusters
    .filter((cluster) => cluster.length >= 2 && new Set(cluster.map(({ source }) => source)).size >= 2)
    .map(toOperationalCase)
    .sort(
      (left, right) =>
        SEVERITY_WEIGHT[right.severity] - SEVERITY_WEIGHT[left.severity]
        || right.sourceCount - left.sourceCount
        || right.updatedAt - left.updatedAt,
    );
}

function validateSignal(signal: OperationalSignal): OperationalSignal {
  if (!signal.id.trim() || !signal.title.trim() || !signal.source.trim() || !signal.kind.trim()) {
    throw new Error('operational signal identity fields are required');
  }
  if (!Number.isFinite(signal.latitude) || signal.latitude < -90 || signal.latitude > 90) {
    throw new Error('signal latitude is invalid');
  }
  if (!Number.isFinite(signal.longitude) || signal.longitude < -180 || signal.longitude > 180) {
    throw new Error('signal longitude is invalid');
  }
  if (!Number.isFinite(signal.observedAt)) throw new Error('signal observedAt is invalid');
  return { ...signal };
}

function toOperationalCase(signals: OperationalSignal[]): OperationalCase {
  const ordered = [...signals].sort(
    (left, right) =>
      SEVERITY_WEIGHT[right.severity] - SEVERITY_WEIGHT[left.severity]
      || right.observedAt - left.observedAt,
  );
  const center = clusterCenter(signals);
  const sourceCount = new Set(signals.map(({ source }) => source)).size;
  const ids = signals.map(({ id }) => id).sort();
  return {
    id: `case-${stableHash(ids.join('|'))}`,
    title: ordered[0].title,
    latitude: center.latitude,
    longitude: center.longitude,
    openedAt: Math.min(...signals.map(({ observedAt }) => observedAt)),
    updatedAt: Math.max(...signals.map(({ observedAt }) => observedAt)),
    severity: ordered[0].severity,
    confidence: sourceCount >= 3 && signals.length >= 3 ? 'high' : 'medium',
    sourceCount,
    signals: [...signals].sort((left, right) => right.observedAt - left.observedAt),
  };
}

function clusterCenter(signals: OperationalSignal[]) {
  return {
    latitude: signals.reduce((sum, signal) => sum + signal.latitude, 0) / signals.length,
    longitude: signals.reduce((sum, signal) => sum + signal.longitude, 0) / signals.length,
  };
}

function distanceMeters(latA: number, lngA: number, latB: number, lngB: number) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(latB - latA);
  const longitudeDelta = toRadians(lngB - lngA);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
