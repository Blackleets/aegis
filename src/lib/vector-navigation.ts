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
