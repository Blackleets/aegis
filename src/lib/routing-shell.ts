export type Coordinate = { lat: number; lng: number };
export type BoundingBox = [west: number, south: number, east: number, north: number];
export type FlyToLocation = Coordinate & { ts: number; zoom?: number; bbox?: BoundingBox | null; label?: string };
export type MapView = { zoom: number; latitude: number };
export type ActiveLayers = Record<string, boolean>;

export interface RouteStep {
  index: number;
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  name: string;
  mode: string;
  maneuver: {
    type: string;
    modifier: string | null;
    location: [number, number] | null;
    bearingAfter: number | null;
    bearingBefore: number | null;
    exit: number | null;
  };
  geometry: [number, number][];
}

export interface RouteOption {
  id: string;
  label: string;
  coordinates: [number, number][];
  bbox?: BoundingBox | null;
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
}

export interface RouteRiskSummary {
  score: number;
  level: 'low' | 'elevated' | 'high';
  nearbySignals: number;
  counts: {
    incidents: number;
    earthquakes: number;
    weather: number;
    fires: number;
    jamming: number;
  };
}

export interface RouteSnapshot {
  origin: Coordinate;
  destination: FlyToLocation;
  waypoints: FlyToLocation[];
  mode: 'driving' | 'walking' | 'cycling';
  activeRouteId: string;
  coordinates: [number, number][];
  bbox?: BoundingBox | null;
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
  alternatives: RouteOption[];
}

export function getYouTubeWatchUrl(url: string): string {
  if (url.includes('channel=')) return `https://www.youtube.com/channel/${url.split('channel=')[1].split('&')[0]}/live`;
  if (url.includes('/embed/')) return `https://www.youtube.com/watch?v=${url.split('/embed/')[1].split('?')[0]}`;
  return url;
}

export function formatRouteDistance(distanceMeters: number) {
  return distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${distanceMeters} m`;
}

export function formatRouteDuration(durationSeconds: number) {
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

export function formatCoordinateLabel(coordinate: Coordinate) {
  return `${coordinate.lat.toFixed(3)}, ${coordinate.lng.toFixed(3)}`;
}

export function formatStepDistance(distanceMeters: number) {
  return distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${Math.max(1, Math.round(distanceMeters))} m`;
}

export function localizeRouteInstruction(instruction: string) {
  if (!instruction) return 'Sigue la ruta';
  return instruction
    .replace(/^Head straight on /i, 'Sigue recto por ')
    .replace(/^Head right on /i, 'Sigue por la derecha en ')
    .replace(/^Head left on /i, 'Sigue por la izquierda en ')
    .replace(/^Continue straight on /i, 'Continúa recto por ')
    .replace(/^Continue /i, 'Continúa ')
    .replace(/^Keep /i, 'Mantente ')
    .replace(/^Turn left on /i, 'Gira a la izquierda por ')
    .replace(/^Turn right on /i, 'Gira a la derecha por ')
    .replace(/^Turn left /i, 'Gira a la izquierda ')
    .replace(/^Turn right /i, 'Gira a la derecha ')
    .replace(/^Slight left /i, 'Desvíate a la izquierda ')
    .replace(/^Slight right /i, 'Desvíate a la derecha ')
    .replace(/^Sharp left /i, 'Giro pronunciado a la izquierda ')
    .replace(/^Sharp right /i, 'Giro pronunciado a la derecha ')
    .replace(/^Take the ramp /i, 'Toma la rampa ')
    .replace(/^Merge /i, 'Incorpórate ')
    .replace(/^You have arrived at your destination/i, 'Has llegado a tu destino')
    .replace(/^Arrive at your destination/i, 'Has llegado a tu destino')
    .replace(/^Destination is on the left/i, 'Tu destino está a la izquierda')
    .replace(/^Destination is on the right/i, 'Tu destino está a la derecha')
    .replace(/ on the left/i, ' a la izquierda')
    .replace(/ on the right/i, ' a la derecha')
    .replace(/ onto /i, ' hacia ');
}

export function formatRouteModeLabel(mode: 'driving' | 'walking' | 'cycling') {
  if (mode === 'walking') return 'WALK';
  if (mode === 'cycling') return 'CYCLE';
  return 'DRIVE';
}

export function formatEtaLabel(durationSeconds: number) {
  const eta = new Date(Date.now() + durationSeconds * 1000);
  return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatProgressLabel(completedDistance: number, totalDistance: number) {
  if (totalDistance <= 0) return '0%';
  const ratio = Math.max(0, Math.min(1, completedDistance / totalDistance));
  return `${Math.round(ratio * 100)}%`;
}

export function computeBearing(from: Coordinate, to: Coordinate) {
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function distanceMetersBetween(a: Coordinate, b: Coordinate) {
  const R = 6371000;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distanceToRouteStep(position: Coordinate, step: RouteStep) {
  const points = step.geometry.length > 0
    ? step.geometry.map(([lng, lat]) => ({ lat, lng }))
    : step.maneuver.location
      ? [{ lat: step.maneuver.location[1], lng: step.maneuver.location[0] }]
      : [];
  if (!points.length) return Number.POSITIVE_INFINITY;
  return Math.min(...points.map((point) => distanceMetersBetween(position, point)));
}

export function getClosestStepIndex(position: Coordinate, steps: RouteStep[]) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  steps.forEach((step, index) => {
    const distance = distanceToRouteStep(position, step);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function distanceToRoutePath(position: Coordinate, coordinates: [number, number][]) {
  if (!coordinates.length) return Number.POSITIVE_INFINITY;
  let bestDistance = Number.POSITIVE_INFINITY;
  const stride = coordinates.length > 180 ? 3 : 1;
  for (let index = 0; index < coordinates.length; index += stride) {
    const [lng, lat] = coordinates[index];
    const distance = distanceMetersBetween(position, { lat, lng });
    if (distance < bestDistance) bestDistance = distance;
  }
  return bestDistance;
}

export function getItemCoordinate(item: unknown): Coordinate | null {
  if (!item || typeof item !== 'object') return null;
  const candidate = item as { lat?: unknown; lng?: unknown; coords?: unknown };
  if (typeof candidate.lat === 'number' && typeof candidate.lng === 'number') {
    return { lat: candidate.lat, lng: candidate.lng };
  }
  if (Array.isArray(candidate.coords) && candidate.coords.length >= 2 && typeof candidate.coords[0] === 'number' && typeof candidate.coords[1] === 'number') {
    return { lng: candidate.coords[0], lat: candidate.coords[1] };
  }
  return null;
}

export function countSignalsNearRoute(items: unknown[] | undefined, routeCoordinates: [number, number][], thresholdMeters: number) {
  if (!Array.isArray(items) || !items.length || routeCoordinates.length < 2) return 0;
  return items.reduce((count, item) => {
    const coordinate = getItemCoordinate(item);
    if (!coordinate) return count;
    return distanceToRoutePath(coordinate, routeCoordinates) <= thresholdMeters ? count + 1 : count;
  }, 0);
}
