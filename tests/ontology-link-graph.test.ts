import { describe, expect, it } from 'vitest';

import { ontologyGraphToLinkGraph } from '../src/lib/ontology/link-graph';
import type { OntologyGraph } from '../src/lib/ontology/types';

const baseTime = Date.parse('2026-07-29T20:00:00.000Z');

function emptyGraph(): OntologyGraph {
  return { entities: [], relationships: [], claims: [] };
}

function sampleGraph(overrides?: Partial<OntologyGraph>): OntologyGraph {
  return {
    entities: [
      {
        id: 'entity:case:1',
        kind: 'Case',
        label: 'Caso demo',
        provenance: { source: 'ops', observedAt: baseTime },
        confidence: 'high',
      },
      {
        id: 'entity:loc:1',
        kind: 'Location',
        label: '40.4, -3.7',
        provenance: { source: 'ops', observedAt: baseTime },
        confidence: 'medium',
      },
      {
        id: 'entity:signal:a',
        kind: 'Event',
        label: 'Quake',
        provenance: { source: 'USGS', observedAt: baseTime },
        confidence: 'high',
      },
    ],
    relationships: [
      {
        id: 'rel-1',
        type: 'located_at',
        fromId: 'entity:case:1',
        toId: 'entity:loc:1',
        provenance: { source: 'ops', observedAt: baseTime },
        confidence: 'high',
      },
      {
        id: 'rel-2',
        type: 'contains',
        fromId: 'entity:case:1',
        toId: 'entity:signal:a',
        provenance: { source: 'ops', observedAt: baseTime },
        confidence: 'medium',
      },
      {
        id: 'rel-3',
        type: 'corroborates',
        fromId: 'entity:signal:a',
        toId: 'entity:missing',
        provenance: { source: 'ops', observedAt: baseTime },
        confidence: 'low',
      },
      {
        id: 'rel-4',
        type: 'observed_in',
        fromId: 'entity:ghost',
        toId: 'entity:case:1',
        provenance: { source: 'ops', observedAt: baseTime },
        confidence: 'low',
      },
    ],
    claims: [],
    ...overrides,
  };
}

describe('ontologyGraphToLinkGraph', () => {
  it('returns empty nodes and links for an empty graph', () => {
    expect(ontologyGraphToLinkGraph(emptyGraph())).toEqual({ nodes: [], links: [] });
  });

  it('maps entities to nodes with kind labels for styling', () => {
    const data = ontologyGraphToLinkGraph(sampleGraph());
    expect(data.nodes).toHaveLength(3);
    expect(data.nodes.map((n) => n.id).sort()).toEqual([
      'entity:case:1',
      'entity:loc:1',
      'entity:signal:a',
    ]);
    expect(data.nodes.find((n) => n.id === 'entity:case:1')).toMatchObject({
      label: 'Caso demo',
      kind: 'Case',
      confidence: 'high',
    });
  });

  it('drops edges whose endpoints are missing (fail-closed)', () => {
    const data = ontologyGraphToLinkGraph(sampleGraph());
    expect(data.links.map((l) => l.id).sort()).toEqual(['rel-1', 'rel-2']);
    expect(data.links.some((l) => l.id === 'rel-3')).toBe(false);
    expect(data.links.some((l) => l.id === 'rel-4')).toBe(false);
    expect(data.nodes.some((n) => n.id === 'entity:missing')).toBe(false);
    expect(data.nodes.some((n) => n.id === 'entity:ghost')).toBe(false);
  });

  it('preserves relationship edge types on links', () => {
    const data = ontologyGraphToLinkGraph(sampleGraph());
    expect(data.links.find((l) => l.id === 'rel-1')?.type).toBe('located_at');
    expect(data.links.find((l) => l.id === 'rel-2')?.type).toBe('contains');
    expect(data.links.every((l) => typeof l.source === 'string' && typeof l.target === 'string')).toBe(true);
  });

  it('never invents nodes from dangling relationship endpoints', () => {
    const danglingOnly: OntologyGraph = {
      entities: [],
      relationships: [
        {
          id: 'orphan',
          type: 'related_to',
          fromId: 'a',
          toId: 'b',
          provenance: { source: 'ops', observedAt: baseTime },
          confidence: 'low',
        },
      ],
      claims: [],
    };
    expect(ontologyGraphToLinkGraph(danglingOnly)).toEqual({ nodes: [], links: [] });
  });
});
