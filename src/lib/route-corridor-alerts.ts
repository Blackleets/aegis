/**
 * Opt-in route-corridor situational alerts (anti-Waze).
 * Only surfaces real events along the active route when the user enabled those categories.
 */

import { shouldMonitorLocalRisks } from './local-risk-monitoring';
import { resolveRouteAlertPosition } from './route-alert-position';
import type { RouteAlertPreferences } from './route-alert-preferences';
import type { Coordinate } from './routing-shell';
import type { SituationalAlert, SituationalKind } from './situational-alerts';

export const DEFAULT_CORRIDOR_METERS = 15_000;
export const DEFAULT_MAX_AHEAD_METERS = 50_000;

export type RouteCorridorAlert = SituationalAlert & {
  distanceAheadMeters: number;
  lateralDistanceMeters: number;
};

export type RouteCorridorOptions = {
  corridorMeters?: number;
  maxAheadMeters?: number;
  passedToleranceMeters?: number;
};

/** Map alert kinds → driver prefs. news/conflict/other are skipped for corridor voice for now. */
export function kindMatchesRouteAlertPreference(
  kind: SituationalKind,
  prefs: RouteAlertPreferences,
): boolean {
  switch (kind) {
    case 'earthquake':
      return prefs.earthquakes;
    case 'wildfire':
      return prefs.wildfires;
    case 'volcano':
      return prefs.volcanoes;
    case 'storm':
    case 'flood':
    case 'weather':
      return prefs.severeWeather;
    case 'conflict':
    case 'news':
    case 'other':
      return false;
    default:
      return false;
  }
}

/** True when navigation or localMonitoring means corridor UI may show. */
export function shouldShowRouteCorridorAlerts(
  navigationActive: boolean,
  prefs: Pick<RouteAlertPreferences, 'localMonitoring'>,
): boolean {
  return shouldMonitorLocalRisks(navigationActive, prefs.localMonitoring);
}

function hasUsableProvenance(alert: SituationalAlert): boolean {
  const source = typeof alert.source === 'string' ? alert.source.trim() : '';
  const observedAt = typeof alert.observedAt === 'number' && Number.isFinite(alert.observedAt)
    ? alert.observedAt
    : null;
  return Boolean(source) && observedAt !== null;
}

function hasUsableCoords(alert: SituationalAlert): alert is SituationalAlert & { lat: number; lng: number } {
  return typeof alert.lat === 'number'
    && Number.isFinite(alert.lat)
    && typeof alert.lng === 'number'
    && Number.isFinite(alert.lng);
}

/**
 * Filter situational (or pulse-like) alerts to those on the route corridor ahead of the user.
 * Fail-closed: drops missing coords/source/time; uses resolveRouteAlertPosition.
 * If !navigationActive && !prefs.localMonitoring → empty (caller decides whether to show chip).
 */
export function filterRouteCorridorAlerts({
  alerts,
  routeCoordinates,
  userLocation,
  prefs,
  navigationActive,
  options,
}: {
  alerts: SituationalAlert[];
  routeCoordinates: [number, number][];
  userLocation: Coordinate | null;
  prefs: RouteAlertPreferences;
  navigationActive: boolean;
  options?: RouteCorridorOptions;
}): RouteCorridorAlert[] {
  if (!shouldShowRouteCorridorAlerts(navigationActive, prefs)) return [];
  if (!userLocation) return [];
  if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) return [];
  if (!Array.isArray(alerts) || alerts.length === 0) return [];

  const corridorMeters = options?.corridorMeters ?? DEFAULT_CORRIDOR_METERS;
  const maxAheadMeters = options?.maxAheadMeters ?? DEFAULT_MAX_AHEAD_METERS;
  const passedToleranceMeters = options?.passedToleranceMeters ?? 30;

  const out: RouteCorridorAlert[] = [];

  for (const alert of alerts) {
    if (!hasUsableProvenance(alert)) continue;
    if (!hasUsableCoords(alert)) continue;
    if (!kindMatchesRouteAlertPreference(alert.kind, prefs)) continue;

    const position = resolveRouteAlertPosition({
      user: userLocation,
      alert: { lat: alert.lat, lng: alert.lng },
      routeCoordinates,
      corridorMeters,
      maxAheadMeters,
      passedToleranceMeters,
    });
    if (!position) continue;

    out.push({
      ...alert,
      distanceAheadMeters: position.distanceAheadMeters,
      lateralDistanceMeters: position.lateralDistanceMeters,
    });
  }

  return out.sort((a, b) => a.distanceAheadMeters - b.distanceAheadMeters);
}

/** Spanish distance label for corridor rows, e.g. "a 3,2 km" / "a 450 m". */
export function formatDistanceAheadEs(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return 'a —';
  if (meters < 1000) {
    return `a ${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  const rounded = km >= 10 ? Math.round(km).toString() : km.toFixed(1).replace('.', ',');
  return `a ${rounded} km`;
}
