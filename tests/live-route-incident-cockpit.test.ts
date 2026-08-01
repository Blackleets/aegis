import { describe, expect, it } from 'vitest';
import { buildLiveRouteIncidentCockpitModel } from '../src/lib/live-route-incident-cockpit';
import type { RankedRouteIncident } from '../src/lib/route-incident-priority';

const incident: RankedRouteIncident = {
  id: 'incident-a5',
  category: 'accident',
  severity: 'critical',
  description: 'Accidente',
  geometryType: 'Point',
  coordinates: [-3.8, 40.4],
  delaySeconds: 360,
  lengthMeters: 180,
  from: 'Madrid',
  to: 'Móstoles',
  roadNumbers: ['A-5'],
  startTime: null,
  endTime: null,
  lastReportTime: null,
  reportCount: 3,
  probability: 'certain',
  representativePoint: { lat: 40.4, lng: -3.8 },
  distanceToRouteMeters: 24,
  distanceAheadMeters: 850,
  routeIndex: 4,
  priorityScore: 620,
};

describe('live route incident cockpit model', () => {
  it('shows one concise live incident presentation', () => {
    expect(buildLiveRouteIncidentCockpitModel({
      status: 'live',
      incident,
      stale: false,
    })).toMatchObject({
      incidentId: 'incident-a5',
      eyebrow: 'Accidente · TomTom live',
      title: 'Accidente a 850 m',
      detail: 'A-5 · +6 min',
      severity: 'critical',
    });
  });

  it('keeps a recent incident visible during a temporary provider failure', () => {
    expect(buildLiveRouteIncidentCockpitModel({
      status: 'unavailable',
      incident,
      stale: true,
    })?.eyebrow).toBe('Accidente · TomTom · datos recientes');
  });

  it('does not render unavailable non-stale or empty data', () => {
    expect(buildLiveRouteIncidentCockpitModel({
      status: 'unavailable',
      incident,
      stale: false,
    })).toBeNull();

    expect(buildLiveRouteIncidentCockpitModel({
      status: 'live',
      incident: null,
      stale: false,
    })).toBeNull();
  });
});
