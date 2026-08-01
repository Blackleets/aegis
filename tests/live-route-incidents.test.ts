import { describe, expect, it } from 'vitest';
import { buildRouteIncidentRequestUrl, selectLiveRouteIncident } from '@/hooks/useLiveRouteIncidents';
import type { NormalizedRouteIncident } from '@/lib/tomtom-route-incidents';

function incident(overrides: Partial<NormalizedRouteIncident> = {}): NormalizedRouteIncident {
  return {
    id: 'incident-1',
    category: 'roadClosed',
    severity: 'critical',
    description: 'Road closed',
    geometryType: 'Point',
    coordinates: [-3.69, 40.42],
    delaySeconds: 600,
    lengthMeters: 120,
    from: null,
    to: null,
    roadNumbers: [],
    startTime: null,
    endTime: null,
    lastReportTime: null,
    reportCount: null,
    probability: null,
    ...overrides,
  };
}

const route: [number, number][] = [
  [-3.70, 40.41],
  [-3.69, 40.42],
  [-3.68, 40.43],
];

describe('live route incident orchestration', () => {
  it('builds a bounded server endpoint request without exposing a key', () => {
    const url = buildRouteIncidentRequestUrl(
      { lat: 40.41, lng: -3.70 },
      { lat: 40.43, lng: -3.68 },
    );

    expect(url).toContain('/api/traffic/incidents?');
    expect(url).toContain('paddingKm=2.5');
    expect(url).toContain('limit=40');
    expect(url).not.toContain('key=');
  });

  it('selects the highest priority incident still ahead', () => {
    const selected = selectLiveRouteIncident({
      incidents: [
        incident({ id: 'jam', category: 'jam', severity: 'warning', delaySeconds: 300 }),
        incident({ id: 'closure', category: 'roadClosed', severity: 'critical', delaySeconds: 600 }),
      ],
      route,
      currentLocation: { lat: 40.41, lng: -3.70 },
      dismissedIncidentIds: new Set(),
    });

    expect(selected?.id).toBe('closure');
  });

  it('does not surface an incident dismissed by the driver', () => {
    const selected = selectLiveRouteIncident({
      incidents: [incident({ id: 'closure' })],
      route,
      currentLocation: { lat: 40.41, lng: -3.70 },
      dismissedIncidentIds: new Set(['closure']),
    });

    expect(selected).toBeNull();
  });

  it('returns null when all provider incidents are off route', () => {
    const selected = selectLiveRouteIncident({
      incidents: [incident({ coordinates: [-3.50, 40.60] })],
      route,
      currentLocation: { lat: 40.41, lng: -3.70 },
      dismissedIncidentIds: new Set(),
    });

    expect(selected).toBeNull();
  });
});
