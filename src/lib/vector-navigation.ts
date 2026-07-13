export type VectorNavigationMode = 'driving' | 'walking' | 'cycling';

export interface NavigationCoordinate {
  lat: number;
  lng: number;
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
    zoom: isMobile ? 17.3 : 16.2,
    pitch: isMobile ? 70 : 62,
    lookAheadMeters: isMobile ? 82 : 145,
    durationMs: isMobile ? 540 : 700,
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
