import type { Coordinate } from '@/lib/routing-shell';
import { distanceMetersBetween } from '@/lib/routing-shell';
import type { NormalizedRouteIncident } from '@/lib/tomtom-route-incidents';

export type RankedRouteIncident = NormalizedRouteIncident & {
  representativePoint: Coordinate;
  distanceToRouteMeters: number;
  distanceAheadMeters: number;
  routeIndex: number;
  priorityScore: number;
};

function incidentPoints(incident: NormalizedRouteIncident): Coordinate[] {
  if (incident.geometryType === 'Point') {
    const point = incident.coordinates as number[];
    return point.length >= 2 ? [{ lng: point[0], lat: point[1] }] : [];
  }

  return (incident.coordinates as number[][])
    .filter((point) => point.length >= 2)
    .map(([lng, lat]) => ({ lat, lng }));
}

function cumulativeRouteDistances(route: [number, number][]) {
  const distances = new Array<number>(route.length).fill(0);
  for (let index = 1; index < route.length; index += 1) {
    const [previousLng, previousLat] = route[index - 1];
    const [lng, lat] = route[index];
    distances[index] = distances[index - 1] + distanceMetersBetween(
      { lat: previousLat, lng: previousLng },
      { lat, lng },
    );
  }
  return distances;
}

function closestRouteMatch(
  point: Coordinate,
  route: [number, number][],
  cumulative: number[],
) {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestProgressMeters = 0;

  for (let index = 0; index < route.length - 1; index += 1) {
    const [startLng, startLat] = route[index];
    const [endLng, endLat] = route[index + 1];
    const deltaLng = endLng - startLng;
    const deltaLat = endLat - startLat;
    const segmentLengthSquared = deltaLng * deltaLng + deltaLat * deltaLat;
    const projection = segmentLengthSquared === 0
      ? 0
      : ((point.lng - startLng) * deltaLng + (point.lat - startLat) * deltaLat) / segmentLengthSquared;
    const ratio = Math.max(0, Math.min(1, projection));
    const projectedPoint = {
      lng: startLng + deltaLng * ratio,
      lat: startLat + deltaLat * ratio,
    };
    const distance = distanceMetersBetween(point, projectedPoint);

    if (distance < bestDistance) {
      const segmentLength = cumulative[index + 1] - cumulative[index];
      bestDistance = distance;
      bestIndex = ratio >= 0.5 ? index + 1 : index;
      bestProgressMeters = cumulative[index] + segmentLength * ratio;
    }
  }

  return {
    routeIndex: bestIndex,
    distanceMeters: bestDistance,
    progressMeters: bestProgressMeters,
  };
}

function severityWeight(severity: NormalizedRouteIncident['severity']) {
  if (severity === 'critical') return 300;
  if (severity === 'warning') return 180;
  return 80;
}

export function rankIncidentsForRoute({
  incidents,
  route,
  currentLocation,
  maxDistanceToRouteMeters = 180,
  maxDistanceAheadMeters = 25_000,
}: {
  incidents: NormalizedRouteIncident[];
  route: [number, number][];
  currentLocation: Coordinate;
  maxDistanceToRouteMeters?: number;
  maxDistanceAheadMeters?: number;
}) {
  if (route.length < 2) return [];

  const cumulative = cumulativeRouteDistances(route);
  const currentMatch = closestRouteMatch(currentLocation, route, cumulative);
  const currentProgressMeters = currentMatch.routeIndex >= 0 ? currentMatch.progressMeters : 0;

  return incidents
    .flatMap((incident) => {
      let best: {
        point: Coordinate;
        routeIndex: number;
        distanceMeters: number;
        progressMeters: number;
      } | null = null;

      for (const point of incidentPoints(incident)) {
        const match = closestRouteMatch(point, route, cumulative);
        if (!best || match.distanceMeters < best.distanceMeters) {
          best = {
            point,
            routeIndex: match.routeIndex,
            distanceMeters: match.distanceMeters,
            progressMeters: match.progressMeters,
          };
        }
      }
      if (!best || best.routeIndex < 0 || best.distanceMeters > maxDistanceToRouteMeters) return [];

      const distanceAheadMeters = best.progressMeters - currentProgressMeters;
      if (distanceAheadMeters < -100 || distanceAheadMeters > maxDistanceAheadMeters) return [];

      const delayWeight = Math.min(180, Math.round((incident.delaySeconds ?? 0) / 5));
      const proximityWeight = Math.max(0, 160 - Math.round(Math.max(0, distanceAheadMeters) / 100));
      const routeConfidenceWeight = Math.max(0, 80 - Math.round(best.distanceMeters / 3));

      return [{
        ...incident,
        representativePoint: best.point,
        distanceToRouteMeters: Math.round(best.distanceMeters),
        distanceAheadMeters: Math.max(0, Math.round(distanceAheadMeters)),
        routeIndex: best.routeIndex,
        priorityScore: severityWeight(incident.severity) + delayWeight + proximityWeight + routeConfidenceWeight,
      } satisfies RankedRouteIncident];
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || a.distanceAheadMeters - b.distanceAheadMeters);
}

export function selectPrimaryRouteIncident(input: Parameters<typeof rankIncidentsForRoute>[0]) {
  return rankIncidentsForRoute(input)[0] ?? null;
}
