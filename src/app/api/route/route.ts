import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type RouteMode = 'driving' | 'walking' | 'cycling';
type Coordinate = [lng: number, lat: number];
type BoundingBox = [west: number, south: number, east: number, north: number];

type OsrmStep = {
  distance?: number;
  duration?: number;
  name?: string;
  ref?: string;
  destinations?: string;
  mode?: string;
  geometry?: { coordinates?: Coordinate[] };
  maneuver?: {
    type?: string;
    modifier?: string;
    location?: Coordinate;
    instruction?: string;
    bearing_after?: number;
    bearing_before?: number;
    exit?: number;
  };
};

type NormalizedRoute = {
  id: string;
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  coordinates: Coordinate[];
  bbox: BoundingBox | null;
  steps: Array<{
    index: number;
    instruction: string;
    distanceMeters: number;
    durationSeconds: number;
    name: string;
    mode: string;
    maneuver: {
      type: string;
      modifier: string | null;
      location: Coordinate | null;
      bearingAfter: number | null;
      bearingBefore: number | null;
      exit: number | null;
    };
    geometry: Coordinate[];
  }>;
};

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

function parseViaCoordinate(value: string): Coordinate | null {
  const match = value.trim().match(/^([+-]?\d+\.?\d*)\s*,\s*([+-]?\d+\.?\d*)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lng, lat];
}

function computeBoundingBox(coords: Coordinate[]): BoundingBox | null {
  if (!coords.length) return null;
  const lngs = coords.map(([lng]) => lng);
  const lats = coords.map(([, lat]) => lat);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

function normalizeMode(value: string | null): RouteMode {
  if (value === 'walking' || value === 'cycling') return value;
  return 'driving';
}

function getRoadLabel(step: OsrmStep): string {
  return step.name || step.ref || step.destinations || 'the route';
}

function buildInstruction(step: OsrmStep): string {
  const maneuver = step.maneuver || {};
  if (maneuver.instruction) return maneuver.instruction;

  const road = getRoadLabel(step);
  const modifier = maneuver.modifier ? maneuver.modifier.replace(/_/g, ' ') : '';
  const type = maneuver.type || 'continue';

  switch (type) {
    case 'depart':
      return modifier ? `Head ${modifier} on ${road}` : `Depart on ${road}`;
    case 'turn':
      return modifier ? `Turn ${modifier} onto ${road}` : `Turn onto ${road}`;
    case 'new name':
      return `Continue onto ${road}`;
    case 'merge':
      return modifier ? `Merge ${modifier} onto ${road}` : `Merge onto ${road}`;
    case 'fork':
      return modifier ? `Keep ${modifier} toward ${road}` : `Keep toward ${road}`;
    case 'roundabout':
    case 'rotary':
      return `Enter the roundabout${maneuver.exit ? ` and take exit ${maneuver.exit}` : ''}`;
    case 'notification':
      return `Continue on ${road}`;
    case 'arrive':
      return 'You have arrived at your destination';
    default:
      return `Continue on ${road}`;
  }
}

function isTimeoutError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: unknown; message?: unknown };
  return candidate.name === 'TimeoutError'
    || candidate.name === 'AbortError'
    || (typeof candidate.message === 'string' && candidate.message.toLowerCase().includes('timeout'));
}

function normalizeRoute(
  route: {
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: Coordinate[] };
    legs?: Array<{ steps?: OsrmStep[] }>;
  },
  mode: RouteMode,
  index: number,
): NormalizedRoute {
  const coordinates = route.geometry?.coordinates ?? [];
  const flatSteps = (route.legs || []).flatMap((leg) => leg.steps || []);
  const steps = flatSteps.map((step, stepIndex) => ({
    index: stepIndex,
    instruction: buildInstruction(step),
    distanceMeters: Math.round(step.distance ?? 0),
    durationSeconds: Math.round(step.duration ?? 0),
    name: step.name || '',
    mode: step.mode || mode,
    maneuver: {
      type: step.maneuver?.type || 'continue',
      modifier: step.maneuver?.modifier || null,
      location: step.maneuver?.location || null,
      bearingAfter: typeof step.maneuver?.bearing_after === 'number' ? step.maneuver.bearing_after : null,
      bearingBefore: typeof step.maneuver?.bearing_before === 'number' ? step.maneuver.bearing_before : null,
      exit: typeof step.maneuver?.exit === 'number' ? step.maneuver.exit : null,
    },
    geometry: step.geometry?.coordinates || [],
  }));

  return {
    id: index === 0 ? 'route-primary' : `route-alt-${index}`,
    label: index === 0 ? 'FASTEST' : `ALT ${index}`,
    distanceMeters: Math.round(route.distance ?? 0),
    durationSeconds: Math.round(route.duration ?? 0),
    coordinates,
    bbox: computeBoundingBox(coordinates),
    steps,
  };
}

export async function GET(request: NextRequest) {
  const fromLat = parseCoordinate(request.nextUrl.searchParams.get('fromLat'), -90, 90);
  const fromLng = parseCoordinate(request.nextUrl.searchParams.get('fromLng'), -180, 180);
  const toLat = parseCoordinate(request.nextUrl.searchParams.get('toLat'), -90, 90);
  const toLng = parseCoordinate(request.nextUrl.searchParams.get('toLng'), -180, 180);
  const mode = normalizeMode(request.nextUrl.searchParams.get('mode'));
  const viaParams = request.nextUrl.searchParams.getAll('via');

  if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
    return NextResponse.json({ error: 'Invalid route coordinates' }, { status: 400 });
  }

  const waypoints = viaParams.map(parseViaCoordinate);
  if (waypoints.some((waypoint) => waypoint === null)) {
    return NextResponse.json({ error: 'Invalid waypoint coordinates' }, { status: 400 });
  }

  const waypointCoordinates = waypoints.filter((waypoint): waypoint is Coordinate => waypoint !== null);
  const profile = mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bike' : 'driving';
  const coordinatePairs = [
    `${fromLng},${fromLat}`,
    ...waypointCoordinates.map(([lng, lat]) => `${lng},${lat}`),
    `${toLng},${toLat}`,
  ];

  const url = new URL(`https://router.project-osrm.org/route/v1/${profile}/${coordinatePairs.join(';')}`);
  url.searchParams.set('alternatives', '3');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('steps', 'true');

  try {
    const response = await fetch(url.toString(), {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'AEGIS Routing/1.0 (Blackleets)',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Routing upstream unavailable' }, { status: 502 });
    }

    const payload = (await response.json()) as {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: Coordinate[] };
        legs?: Array<{ steps?: OsrmStep[] }>;
      }>;
    };

    const normalizedRoutes = (payload.routes || []).map((route, index) => normalizeRoute(route, mode, index));
    const primaryRoute = normalizedRoutes[0];

    if (payload.code !== 'Ok' || !primaryRoute || primaryRoute.coordinates.length < 2) {
      return NextResponse.json({ error: 'No route found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        mode,
        routeId: primaryRoute.id,
        label: primaryRoute.label,
        distanceMeters: primaryRoute.distanceMeters,
        durationSeconds: primaryRoute.durationSeconds,
        coordinates: primaryRoute.coordinates,
        bbox: primaryRoute.bbox,
        steps: primaryRoute.steps,
        alternatives: normalizedRoutes,
        origin: { lat: fromLat, lng: fromLng },
        destination: { lat: toLat, lng: toLng },
        waypoints: waypointCoordinates.map(([lng, lat]) => ({ lat, lng })),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    if (isTimeoutError(error)) {
      return NextResponse.json({ error: 'Routing upstream timeout' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Failed to compute route' }, { status: 500 });
  }
}
