import { describe, expect, it } from 'vitest';
import { presentRouteIncident } from '@/lib/route-incident-presentation';
import type { RankedRouteIncident } from '@/lib/route-incident-priority';

function incident(overrides: Partial<RankedRouteIncident> = {}): RankedRouteIncident {
  return {
    id: 'incident-1',
    category: 'roadClosed',
    severity: 'critical',
    description: 'Road closed',
    geometryType: 'Point',
    coordinates: [-3.69, 40.42],
    delaySeconds: 420,
    lengthMeters: 120,
    from: 'Salida 12',
    to: 'Salida 14',
    roadNumbers: ['A-1'],
    startTime: null,
    endTime: null,
    lastReportTime: null,
    reportCount: null,
    probability: null,
    representativePoint: { lat: 40.42, lng: -3.69 },
    distanceToRouteMeters: 24,
    distanceAheadMeters: 1800,
    routeIndex: 3,
    priorityScore: 500,
    ...overrides,
  };
}

describe('route incident presentation', () => {
  it('creates concise Spanish cockpit copy with distance, road and delay', () => {
    const result = presentRouteIncident(incident());

    expect(result.eyebrow).toBe('Carretera cerrada · TomTom live');
    expect(result.title).toBe('Carretera cerrada a 1.8 km');
    expect(result.detail).toContain('A-1');
    expect(result.detail).toContain('+7 min');
    expect(result.critical).toBe(true);
  });

  it('marks fallback information as recent rather than live', () => {
    const result = presentRouteIncident(incident(), { stale: true });
    expect(result.eyebrow).toContain('datos recientes');
  });

  it('uses street endpoints when no road number is available', () => {
    const result = presentRouteIncident(incident({ roadNumbers: [] }));
    expect(result.detail).toContain('Salida 12 → Salida 14');
  });

  it('does not show sub-minute delays as meaningful traffic impact', () => {
    const result = presentRouteIncident(incident({ delaySeconds: 35 }));
    expect(result.delayLabel).toBeNull();
    expect(result.detail).not.toContain('min');
  });

  it('formats nearby incidents in metres', () => {
    const result = presentRouteIncident(incident({ category: 'accident', distanceAheadMeters: 650 }));
    expect(result.title).toBe('Accidente a 650 m');
  });
});
