import { describe, expect, it } from 'vitest';

import { buildOperationalCases, type OperationalSignal } from '../src/lib/operational-cases';
import {
  filterClaimsWithProvenance,
  listEntityKinds,
  operationalCaseToOntologyGraph,
  operationalSignalToEntities,
  ProvenanceError,
  requireProvenance,
} from '../src/lib/ontology';

const baseTime = Date.parse('2026-07-29T20:00:00.000Z');

function signal(overrides: Partial<OperationalSignal> & Pick<OperationalSignal, 'id' | 'source'>): OperationalSignal {
  return {
    kind: 'news',
    title: 'Incidente regional',
    latitude: 40.4168,
    longitude: -3.7038,
    observedAt: baseTime,
    severity: 'warning',
    ...overrides,
  };
}

describe('ontology provenance', () => {
  it('requires source and observedAt', () => {
    expect(() => requireProvenance({ source: '', observedAt: baseTime })).toThrow(ProvenanceError);
    expect(() => requireProvenance({ source: 'USGS', observedAt: Number.NaN })).toThrow(ProvenanceError);
    expect(requireProvenance({ source: ' USGS ', observedAt: baseTime })).toEqual({
      source: 'USGS',
      observedAt: baseTime,
    });
  });

  it('drops claims without provenance instead of inventing sources', () => {
    const kept = filterClaimsWithProvenance([
      {
        id: 'ok',
        text: 'Quake reported',
        confidence: 'high',
        aboutIds: ['entity:a'],
        provenance: { source: 'USGS', observedAt: baseTime },
      },
      {
        id: 'bad',
        text: 'Invented claim',
        confidence: 'low',
        aboutIds: ['entity:a'],
        provenance: { source: '', observedAt: baseTime },
      },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe('ok');
  });
});

describe('ontology adapters', () => {
  it('maps a signal into a typed entity with real provenance', () => {
    const graph = operationalSignalToEntities(
      signal({ id: 'quake-1', source: 'USGS', kind: 'earthquake', title: 'Terremoto M5', severity: 'critical' }),
    );
    expect(graph.entities).toHaveLength(1);
    expect(graph.entities[0]).toMatchObject({
      id: 'entity:signal:quake-1',
      kind: 'Event',
      label: 'Terremoto M5',
      confidence: 'high',
      provenance: { source: 'USGS', observedAt: baseTime, sourceId: 'quake-1' },
    });
    expect(graph.claims[0].aboutIds).toEqual(['entity:signal:quake-1']);
  });

  it('promotes a corroborated operational case into Case + Location + signal entities', () => {
    const cases = buildOperationalCases([
      signal({ id: 'news', source: 'RSS' }),
      signal({
        id: 'quake',
        source: 'USGS',
        kind: 'earthquake',
        title: 'Terremoto M5',
        latitude: 40.45,
        observedAt: baseTime - 30 * 60 * 1000,
        severity: 'critical',
      }),
    ]);
    expect(cases).toHaveLength(1);
    const graph = operationalCaseToOntologyGraph(cases[0]);
    expect(listEntityKinds(graph)).toEqual(['Case', 'Event', 'Evidence', 'Location']);
    expect(graph.entities.some((entity) => entity.kind === 'Case')).toBe(true);
    expect(graph.relationships.some((rel) => rel.type === 'corroborates')).toBe(true);
    expect(graph.relationships.some((rel) => rel.type === 'located_at')).toBe(true);
    expect(graph.claims.length).toBeGreaterThanOrEqual(3);
    for (const claim of graph.claims) {
      expect(claim.provenance.source.trim().length).toBeGreaterThan(0);
      expect(Number.isFinite(claim.provenance.observedAt)).toBe(true);
    }
  });
});
