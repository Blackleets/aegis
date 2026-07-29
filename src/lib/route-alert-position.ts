import type { Coordinate } from './routing-shell';

export type RouteAlertPosition = {
  distanceAheadMeters: number;
  lateralDistanceMeters: number;
};

type ProjectedPoint = {
  progressMeters: number;
  lateralDistanceMeters: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

function toLocalMeters(point: Coordinate, origin: Coordinate) {
  const latitudeRadians = origin.lat * Math.PI / 180;
  return {
    x: (point.lng - origin.lng) * Math.PI / 180 * EARTH_RADIUS_METERS * Math.cos(latitudeRadians),
    y: (point.lat - origin.lat) * Math.PI / 180 * EARTH_RADIUS_METERS,
  };
}

function projectOntoRoute(point: Coordinate, routeCoordinates: [number, number][]): ProjectedPoint | null {
  if (routeCoordinates.length < 2) return null;

  const origin = { lat: routeCoordinates[0][1], lng: routeCoordinates[0][0] };
  const target = toLocalMeters(point, origin);
  let progressMeters = 0;
  let best: ProjectedPoint | null = null;

  for (let index = 1; index < routeCoordinates.length; index += 1) {
    const startCoordinate = { lat: routeCoordinates[index - 1][1], lng: routeCoordinates[index - 1][0] };
    const endCoordinate = { lat: routeCoordinates[index][1], lng: routeCoordinates[index][0] };
    const start = toLocalMeters(startCoordinate, origin);
    const end = toLocalMeters(endCoordinate, origin);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const segmentLengthSquared = dx * dx + dy * dy;
    const segmentLength = Math.sqrt(segmentLengthSquared);
    if (segmentLength === 0) continue;

    const ratio = Math.max(0, Math.min(1, ((target.x - start.x) * dx + (target.y - start.y) * dy) / segmentLengthSquared));
    const projectedX = start.x + ratio * dx;
    const projectedY = start.y + ratio * dy;
    const lateralDistanceMeters = Math.hypot(target.x - projectedX, target.y - projectedY);
    const candidate = {
      progressMeters: progressMeters + ratio * segmentLength,
      lateralDistanceMeters,
    };

    if (!best || candidate.lateralDistanceMeters < best.lateralDistanceMeters) best = candidate;
    progressMeters += segmentLength;
  }

  return best;
}

export function resolveRouteAlertPosition({
  user,
  alert,
  routeCoordinates,
  corridorMeters,
  maxAheadMeters,
  passedToleranceMeters = 30,
}: {
  user: Coordinate;
  alert: Coordinate;
  routeCoordinates: [number, number][];
  corridorMeters: number;
  maxAheadMeters: number;
  passedToleranceMeters?: number;
}): RouteAlertPosition | null {
  const userProjection = projectOntoRoute(user, routeCoordinates);
  const alertProjection = projectOntoRoute(alert, routeCoordinates);
  if (!userProjection || !alertProjection || alertProjection.lateralDistanceMeters > corridorMeters) return null;

  const distanceAheadMeters = alertProjection.progressMeters - userProjection.progressMeters;
  if (distanceAheadMeters < -passedToleranceMeters || distanceAheadMeters > maxAheadMeters) return null;

  return {
    distanceAheadMeters: Math.max(0, Math.round(distanceAheadMeters)),
    lateralDistanceMeters: Math.round(alertProjection.lateralDistanceMeters),
  };
}
