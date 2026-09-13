import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUTE_ALERT_PREFERENCES,
  type RouteAlertPreferences,
} from '../src/lib/route-alert-preferences';
import {
  filterRouteCorridorAlerts,
  formatDistanceAheadEs,
  kindMatchesRouteAlertPreference,
  shouldShowRouteCorridorAlerts,
} from '../src/lib/route-corridor-alerts';
import type { SituationalAlert } from '../src/lib/situational-alerts';

/** Móstoles → Madrid-ish eastbound corridor (lng, lat). */
const mostolesMadridRoute: [number, number][] = [
  [-3.8648, 40.3229], // Móstoles
  [-3.8000, 40.3500],
  [-3.7200, 40.3900],
  [-3.7038, 40.4168], // Madrid centro
];

function alert(partial: Partial<SituationalAlert> & Pick<SituationalAlert, 'id' | 'kind' | 'title'>): SituationalAlert {
  return {
    severity: 'high',
    source: 'USGS',
    observedAt: Date.UTC(2026, 8, 13, 12, 0, 0),
    ...partial,
  };
}

const prefsOn: RouteAlertPreferences = {
  ...DEFAULT_ROUTE_ALERT_PREFERENCES,
  localMonitoring: true,
  earthquakes: true,
  wildfires: true,
  volcanoes: true,
  severeWeather: true,
};

describe('kindMatchesRouteAlertPreference', () => {
  it('maps hazard kinds to prefs and skips news/conflict/other', () => {
    expect(kindMatchesRouteAlertPreference('earthquake', prefsOn)).toBe(true);
    expect(kindMatchesRouteAlertPreference('wildfire', prefsOn)).toBe(true);
    expect(kindMatchesRouteAlertPreference('volcano', prefsOn)).toBe(true);
    expect(kindMatchesRouteAlertPreference('storm', prefsOn)).toBe(true);
    expect(kindMatchesRouteAlertPreference('flood', prefsOn)).toBe(true);
    expect(kindMatchesRouteAlertPreference('weather', prefsOn)).toBe(true);
    expect(kindMatchesRouteAlertPreference('news', prefsOn)).toBe(false);
    expect(kindMatchesRouteAlertPreference('conflict', prefsOn)).toBe(false);
    expect(kindMatchesRouteAlertPreference('other', prefsOn)).toBe(false);
  });

  it('respects disabled category prefs', () => {
    const prefs = { ...prefsOn, earthquakes: false, severeWeather: false };
    expect(kindMatchesRouteAlertPreference('earthquake', prefs)).toBe(false);
    expect(kindMatchesRouteAlertPreference('storm', prefs)).toBe(false);
  });
});

describe('shouldShowRouteCorridorAlerts', () => {
  it('follows shouldMonitorLocalRisks', () => {
    expect(shouldShowRouteCorridorAlerts(true, { localMonitoring: false })).toBe(true);
    expect(shouldShowRouteCorridorAlerts(false, { localMonitoring: true })).toBe(true);
    expect(shouldShowRouteCorridorAlerts(false, { localMonitoring: false })).toBe(false);
  });
});

describe('filterRouteCorridorAlerts', () => {
  const userNearMostoles = { lat: 40.3300, lng: -3.8500 };

  it('returns empty when not monitoring', () => {
    const result = filterRouteCorridorAlerts({
      alerts: [alert({
        id: 'eq-1',
        kind: 'earthquake',
        title: 'M 3.2 near Leganés',
        lat: 40.3600,
        lng: -3.7800,
      })],
      routeCoordinates: mostolesMadridRoute,
      userLocation: userNearMostoles,
      prefs: { ...prefsOn, localMonitoring: false },
      navigationActive: false,
    });
    expect(result).toEqual([]);
  });

  it('keeps an earthquake ahead on the Móstoles→Madrid corridor', () => {
    const result = filterRouteCorridorAlerts({
      alerts: [alert({
        id: 'eq-ahead',
        kind: 'earthquake',
        title: 'M 3.1 near Alcorcón',
        lat: 40.3600,
        lng: -3.7800,
      })],
      routeCoordinates: mostolesMadridRoute,
      userLocation: userNearMostoles,
      prefs: prefsOn,
      navigationActive: true,
      options: { corridorMeters: 20_000, maxAheadMeters: 80_000 },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('eq-ahead');
    expect(result[0].distanceAheadMeters).toBeGreaterThan(0);
  });

  it('drops news/conflict even with coords on route', () => {
    const result = filterRouteCorridorAlerts({
      alerts: [
        alert({
          id: 'news-1',
          kind: 'news',
          title: 'Headline on route',
          lat: 40.3600,
          lng: -3.7800,
          source: 'Reuters',
        }),
        alert({
          id: 'conflict-1',
          kind: 'conflict',
          title: 'Conflict on route',
          lat: 40.3600,
          lng: -3.7800,
          source: 'ACLED',
        }),
      ],
      routeCoordinates: mostolesMadridRoute,
      userLocation: userNearMostoles,
      prefs: prefsOn,
      navigationActive: true,
      options: { corridorMeters: 20_000, maxAheadMeters: 80_000 },
    });
    expect(result).toEqual([]);
  });

  it('fail-closes alerts missing coords, source, or time', () => {
    const result = filterRouteCorridorAlerts({
      alerts: [
        alert({ id: 'no-coords', kind: 'earthquake', title: 'No coords' }),
        alert({
          id: 'no-source',
          kind: 'earthquake',
          title: 'No source',
          lat: 40.3600,
          lng: -3.7800,
          source: '   ',
        }),
        {
          id: 'no-time',
          kind: 'earthquake',
          title: 'No time',
          severity: 'high',
          source: 'USGS',
          observedAt: Number.NaN,
          lat: 40.3600,
          lng: -3.7800,
        },
      ],
      routeCoordinates: mostolesMadridRoute,
      userLocation: userNearMostoles,
      prefs: prefsOn,
      navigationActive: true,
      options: { corridorMeters: 20_000, maxAheadMeters: 80_000 },
    });
    expect(result).toEqual([]);
  });

  it('rejects hazards far off the corridor', () => {
    const result = filterRouteCorridorAlerts({
      alerts: [alert({
        id: 'far',
        kind: 'wildfire',
        title: 'Far north fire',
        lat: 40.7000,
        lng: -3.7800,
        source: 'NASA FIRMS',
      })],
      routeCoordinates: mostolesMadridRoute,
      userLocation: userNearMostoles,
      prefs: prefsOn,
      navigationActive: true,
      options: { corridorMeters: 5_000, maxAheadMeters: 80_000 },
    });
    expect(result).toEqual([]);
  });

  it('sorts by distanceAheadMeters ascending', () => {
    const result = filterRouteCorridorAlerts({
      alerts: [
        alert({
          id: 'farther',
          kind: 'storm',
          title: 'Storm nearer Madrid',
          lat: 40.4000,
          lng: -3.7200,
          source: 'GDACS',
        }),
        alert({
          id: 'nearer',
          kind: 'earthquake',
          title: 'Quake nearer start',
          lat: 40.3450,
          lng: -3.8200,
        }),
      ],
      routeCoordinates: mostolesMadridRoute,
      userLocation: userNearMostoles,
      prefs: prefsOn,
      navigationActive: true,
      options: { corridorMeters: 20_000, maxAheadMeters: 80_000 },
    });
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].distanceAheadMeters).toBeLessThanOrEqual(result[1].distanceAheadMeters);
  });

  it('returns empty without user location or short route', () => {
    expect(filterRouteCorridorAlerts({
      alerts: [alert({
        id: 'eq',
        kind: 'earthquake',
        title: 'Q',
        lat: 40.36,
        lng: -3.78,
      })],
      routeCoordinates: mostolesMadridRoute,
      userLocation: null,
      prefs: prefsOn,
      navigationActive: true,
    })).toEqual([]);

    expect(filterRouteCorridorAlerts({
      alerts: [alert({
        id: 'eq',
        kind: 'earthquake',
        title: 'Q',
        lat: 40.36,
        lng: -3.78,
      })],
      routeCoordinates: [[-3.86, 40.32]],
      userLocation: userNearMostoles,
      prefs: prefsOn,
      navigationActive: true,
    })).toEqual([]);
  });
});

describe('formatDistanceAheadEs', () => {
  it('formats meters and km with Spanish decimal comma', () => {
    expect(formatDistanceAheadEs(450)).toBe('a 450 m');
    expect(formatDistanceAheadEs(3200)).toBe('a 3,2 km');
    expect(formatDistanceAheadEs(12500)).toBe('a 13 km');
    expect(formatDistanceAheadEs(10500)).toBe('a 11 km');
  });
});
