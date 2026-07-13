export type VectorNavigationMode = 'driving' | 'walking' | 'cycling';

export interface NavigationCoordinate {
  lat: number;
  lng: number;
}

export function navigationDistanceMeters(a: NavigationCoordinate, b: NavigationCoordinate) {
  const latScale = 111_320;
  const meanLat = ((a.lat + b.lat) / 2) * Math.PI / 180;
  const latMeters = (b.lat - a.lat) * latScale;
  const lngMeters = (b.lng - a.lng) * latScale * Math.cos(meanLat);
  return Math.hypot(latMeters, lngMeters);
}

export function shouldUpdateNavigationCamera(previous: NavigationCoordinate | null, current: NavigationCoordinate, elapsedMs: number) {
  if (!previous) return true;
  if (elapsedMs < 1_100) return false;
  return navigationDistanceMeters(previous, current) >= 8;
}

export function smoothNavigationBearing(previous: number | null, next: number, factor = 0.32) {
  if (!Number.isFinite(next)) return previous ?? 0;
  if (previous === null || !Number.isFinite(previous)) return ((next % 360) + 360) % 360;
  const delta = ((((next - previous) % 360) + 540) % 360) - 180;
  return ((previous + delta * factor) % 360 + 360) % 360;
}

export function shouldRerouteNavigation({
  offRouteDistanceMeters,
  gpsAccuracyMeters,
  deviationDurationMs,
  cooldownElapsedMs,
}: {
  offRouteDistanceMeters: number;
  gpsAccuracyMeters: number | null;
  deviationDurationMs: number;
  cooldownElapsedMs: number;
}) {
  return gpsAccuracyMeters !== null
    && gpsAccuracyMeters <= 45
    && offRouteDistanceMeters > 85
    && deviationDurationMs > 7_000
    && cooldownElapsedMs > 30_000;
}

export function getNextSimulationIndex(currentIndex: number, coordinateCount: number) {
  if (coordinateCount <= 1) return 0;
  const stride = Math.max(1, Math.floor(coordinateCount / 180));
  return Math.min(coordinateCount - 1, currentIndex + stride);
}

export function getVectorCameraPreset(mode: VectorNavigationMode, isMobile: boolean) {
  if (mode === 'walking') {
    return {
      zoom: isMobile ? 18.2 : 17.4,
      pitch: isMobile ? 62 : 56,
      lookAheadMeters: isMobile ? 38 : 65,
      durationMs: isMobile ? 500 : 620,
    };
  }

  if (mode === 'cycling') {
    return {
      zoom: isMobile ? 17.8 : 16.8,
      pitch: isMobile ? 66 : 58,
      lookAheadMeters: isMobile ? 58 : 95,
      durationMs: isMobile ? 520 : 660,
    };
  }

  return {
    zoom: isMobile ? 16.7 : 16.2,
    pitch: isMobile ? 54 : 52,
    lookAheadMeters: isMobile ? 95 : 135,
    durationMs: isMobile ? 760 : 720,
  };
}

export function getNavigationCameraTarget(
  coordinate: NavigationCoordinate,
  bearingDegrees: number,
  distanceMeters: number,
): NavigationCoordinate {
  if (!Number.isFinite(bearingDegrees) || distanceMeters <= 0) return coordinate;

  const earthRadiusMeters = 6_371_000;
  const angularDistance = distanceMeters / earthRadiusMeters;
  const bearing = bearingDegrees * Math.PI / 180;
  const lat1 = coordinate.lat * Math.PI / 180;
  const lng1 = coordinate.lng * Math.PI / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance)
      + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
  );

  return {
    lat: lat2 * 180 / Math.PI,
    lng: ((lng2 * 180 / Math.PI + 540) % 360) - 180,
  };
}


export function stabilizeNavigationCoordinate(
  previous: NavigationCoordinate | null,
  next: NavigationCoordinate,
  gpsAccuracyMeters: number | null,
  speedKmh: number | null,
): NavigationCoordinate {
  if (!previous) return next;
  const jumpMeters = navigationDistanceMeters(previous, next);
  const accuracy = gpsAccuracyMeters ?? 35;

  // Reject implausible one-sample jumps while stationary or moving slowly.
  if ((speedKmh ?? 0) < 12 && jumpMeters > Math.max(90, accuracy * 2.5)) {
    return previous;
  }

  const accuracyFactor = accuracy <= 12 ? 0.76 : accuracy <= 30 ? 0.56 : 0.34;
  const speedFactor = speedKmh !== null && speedKmh >= 45 ? 0.82 : accuracyFactor;
  const factor = Math.min(0.88, Math.max(0.28, speedFactor));

  return {
    lat: previous.lat + (next.lat - previous.lat) * factor,
    lng: previous.lng + (next.lng - previous.lng) * factor,
  };
}

export function snapNavigationToRoute(
  coordinate: NavigationCoordinate,
  route: NavigationCoordinate[],
  gpsAccuracyMeters: number | null,
): { coordinate: NavigationCoordinate; distanceMeters: number; snapped: boolean } {
  if (route.length < 2) {
    return { coordinate, distanceMeters: Number.POSITIVE_INFINITY, snapped: false };
  }

  const referenceLat = coordinate.lat * Math.PI / 180;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = Math.max(1, metersPerDegreeLat * Math.cos(referenceLat));
  let best: NavigationCoordinate | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < route.length; index += 1) {
    const start = route[index - 1];
    const end = route[index];
    const ax = (start.lng - coordinate.lng) * metersPerDegreeLng;
    const ay = (start.lat - coordinate.lat) * metersPerDegreeLat;
    const bx = (end.lng - coordinate.lng) * metersPerDegreeLng;
    const by = (end.lat - coordinate.lat) * metersPerDegreeLat;
    const dx = bx - ax;
    const dy = by - ay;
    const denominator = dx * dx + dy * dy;
    const ratio = denominator > 0 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / denominator)) : 0;
    const x = ax + dx * ratio;
    const y = ay + dy * ratio;
    const distance = Math.hypot(x, y);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = {
        lat: coordinate.lat + y / metersPerDegreeLat,
        lng: coordinate.lng + x / metersPerDegreeLng,
      };
    }
  }

  const snapThreshold = Math.min(65, Math.max(22, (gpsAccuracyMeters ?? 20) * 1.5));
  return best && bestDistance <= snapThreshold
    ? { coordinate: best, distanceMeters: bestDistance, snapped: true }
    : { coordinate, distanceMeters: bestDistance, snapped: false };
}

export function getArrivalThresholdMeters(
  mode: VectorNavigationMode,
  gpsAccuracyMeters: number | null,
  speedKmh: number | null,
) {
  const base = mode === 'walking' ? 18 : mode === 'cycling' ? 24 : 32;
  const accuracyAllowance = Math.min(18, Math.max(0, (gpsAccuracyMeters ?? 10) * 0.45));
  const movingAllowance = mode === 'driving' && (speedKmh ?? 0) > 35 ? 12 : 0;
  return Math.round(base + accuracyAllowance + movingAllowance);
}
