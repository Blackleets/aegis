import { describe, expect, it } from 'vitest';

import { rankIncidentsForRoute, selectPrimaryRouteIncident } from '../src/lib/route-incident-priority';
import type { NormalizedRouteIncident } from '../src/lib/tomtom-route-incidents';

const route: [number, number][] = [
  [-3.7038, 40.4168],
  [-3.7000, 40.4168],
  [-3.6960, 40.4168],
  [-3.6920, 40.4168],
];

function incident(overrides: Partial<NormalizedRouteIncident> & Pick<NormalizedRouteIncident, 'id'>): NormalizedRouteIncident {
  return {
    id: overrides.id,
    category: overrides.category ?? 'jam',
    severity: overrides.severity ?? 'warning',
    description: overrides.description ?? 'Retención',
    geometryType: overrides.geometryType ?? 'Point',
    coordinates: overrides.coordinates ?? [-3.6960, 40.4169],
    delaySeconds: overrides.delaySeconds ?? 300,
    lengthMeters: overrides.lengthMeters ?? 500,
    from: null,
    to: null,
    roadNumbers: [],
    startTime: null,
    endTime: null,
    lastReportTime: null,
    reportCount: null,
    probability: null,
  };
}

describe('route incident priority', () => {
  it('keeps incidents close to and ahead on the active route', () => {
    const ranked = rankIncidentsForRoute({
      incidents: [
        incident({ id: 'ahead' }),
        incident({ id: 'parallel', coordinates: [-3.6960, 40.4210] }),
        incident({ id: 'behind', coordinates: [-3.7045, 40.4168] }),
      ],
      route,
      currentLocation: { lat: 40.4168, lng: -3.7020 },
    });

    expect(ranked.map((item) => item.id)).toEqual(['ahead']);
    expect(ranked[0].distanceToRouteMeters).toBeLessThan(30);
    expect(ranked[0].distanceAheadMeters).toBeGreaterThan(0);
  });

  it('prioritizes a critical closure over a nearer informational incident', () => {
    const primary = selectPrimaryRouteIncident({
      incidents: [
        incident({ id: 'info-near', severity: 'info', coordinates: [-3.7000, 40.4168], delaySeconds: 0 }),
        incident({ id: 'closure', category: 'roadClosed', severity: 'critical', coordinates: [-3.6960, 40.4168], delaySeconds: 600 }),
      ],
      route,
      currentLocation: { lat: 40.4168, lng: -3.7035 },
    });

    expect(primary?.id).toBe('closure');
  });

  it('uses the closest point from a line incident geometry', () => {
    const primary = selectPrimaryRouteIncident({
      incidents: [incident({
        id: 'works-line',
        category: 'roadWorks',
        geometryType: 'LineString',
        coordinates: [
          [-3.6980, 40.4200],
          [-3.6980, 40.41685],
        ],
      })],
      route,
      currentLocation: { lat: 40.4168, lng: -3.7030 },
    });

    expect(primary?.id).toBe('works-line');
    expect(primary?.distanceToRouteMeters).toBeLessThan(20);
  });

  it('returns null when no incident belongs to the route corridor', () => {
    expect(selectPrimaryRouteIncident({
      incidents: [incident({ id: 'far', coordinates: [-3.68, 40.43] })],
      route,
      currentLocation: { lat: 40.4168, lng: -3.7038 },
    })).toBeNull();
  });
});
