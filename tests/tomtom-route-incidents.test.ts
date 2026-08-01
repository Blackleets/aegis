import { describe, expect, it } from 'vitest';

import {
  buildIncidentCacheKey,
  buildRouteIncidentBoundingBox,
  normalizeTomTomIncident,
  normalizeTomTomIncidents,
  parseIncidentCoordinate,
} from '../src/lib/tomtom-route-incidents';

describe('TomTom route incidents', () => {
  it('validates coordinates and builds a bounded corridor', () => {
    expect(parseIncidentCoordinate('40.4168', -90, 90)).toBe(40.4168);
    expect(parseIncidentCoordinate('999', -90, 90)).toBeNull();

    const bbox = buildRouteIncidentBoundingBox(40.4168, -3.7038, 40.5475, -3.6419, 2.5);
    expect(bbox.west).toBeLessThan(-3.7038);
    expect(bbox.south).toBeLessThan(40.4168);
    expect(bbox.east).toBeGreaterThan(-3.6419);
    expect(bbox.north).toBeGreaterThan(40.5475);
    expect(buildIncidentCacheKey(bbox)).toMatch(/^-?\d+\.\d{3}:/);
  });

  it('normalizes and prioritizes serious incidents', () => {
    const incidents = normalizeTomTomIncidents([
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-3.7, 40.42] },
        properties: {
          id: 'jam-1',
          iconCategory: 'jam',
          delayInSeconds: 420,
          lengthInMeters: 900,
          events: [{ description: 'Retención intensa' }],
        },
      },
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[-3.69, 40.43], [-3.68, 40.44]] },
        properties: {
          id: 'closure-1',
          iconCategory: 'roadClosed',
          delayInSeconds: 60,
          events: [{ description: 'Carretera cerrada' }],
          roadNumbers: ['A-1'],
          numberOfReports: 4,
        },
      },
    ]);

    expect(incidents).toHaveLength(2);
    expect(incidents[0].id).toBe('closure-1');
    expect(incidents[0].severity).toBe('critical');
    expect(incidents[1].severity).toBe('warning');
  });

  it('rejects malformed provider features safely', () => {
    expect(normalizeTomTomIncident({ properties: { id: 'missing-geometry' } })).toBeNull();
    expect(normalizeTomTomIncident({
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { id: 'unsupported' },
    })).toBeNull();
  });
});
