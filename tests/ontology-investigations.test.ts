import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildOperationalCases, type OperationalSignal } from '../src/lib/operational-cases';
import {
  deleteInvestigation,
  INVESTIGATIONS_STORAGE_KEY,
  promoteOperationalCaseToInvestigation,
  readInvestigations,
  upsertInvestigation,
  type SavedInvestigation,
} from '../src/lib/ontology/investigations';
import { operationalCaseToOntologyGraph } from '../src/lib/ontology';

const baseTime = Date.parse('2026-09-13T15:00:00.000Z');

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

function fixtureCaseAndGraph() {
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
  return { operationalCase: cases[0], graph };
}

describe('ontology investigations (Wave 3)', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  it('promotes a live case into a durable investigation with real map pin', () => {
    const { operationalCase, graph } = fixtureCaseAndGraph();
    const saved = promoteOperationalCaseToInvestigation(operationalCase, graph);
    expect(saved).not.toBeNull();
    expect(saved!.id).toBe(`investigation:${operationalCase.id}`);
    expect(saved!.sourceCaseId).toBe(operationalCase.id);
    expect(saved!.title).toBe(operationalCase.title);
    expect(saved!.notes).toBe('');
    expect(saved!.watchlistEntityIds).toEqual([]);
    expect(saved!.pinnedEntityIds.length).toBeGreaterThan(0);
    expect(saved!.mapPin).toEqual({
      latitude: operationalCase.latitude,
      longitude: operationalCase.longitude,
    });
    expect(saved!.graph.entities.length).toBe(graph.entities.length);
    expect(readInvestigations()).toHaveLength(1);
    expect(localStorage.getItem(INVESTIGATIONS_STORAGE_KEY)).toBeTruthy();
  });

  it('fail-closed: rejects empty graph / blank case identity and never invents pins', () => {
    const { operationalCase, graph } = fixtureCaseAndGraph();
    expect(promoteOperationalCaseToInvestigation(operationalCase, { entities: [], relationships: [], claims: [] })).toBeNull();
    expect(promoteOperationalCaseToInvestigation({ ...operationalCase, id: '  ' }, graph)).toBeNull();
    expect(promoteOperationalCaseToInvestigation({ ...operationalCase, title: '' }, graph)).toBeNull();

    const withoutCoords = promoteOperationalCaseToInvestigation(
      { ...operationalCase, latitude: Number.NaN, longitude: Number.NaN },
      graph,
    );
    expect(withoutCoords).not.toBeNull();
    expect(withoutCoords!.mapPin).toBeUndefined();
  });

  it('upserts notes / watchlist and deletes', () => {
    const { operationalCase, graph } = fixtureCaseAndGraph();
    const saved = promoteOperationalCaseToInvestigation(operationalCase, graph)!;
    const entityId = graph.entities[0].id;

    const updated = upsertInvestigation(saved, {
      notes: 'Seguimiento operador',
      watchlistEntityIds: [entityId, 'entity:missing'],
      pinnedEntityIds: [entityId],
    });
    expect(updated).not.toBeNull();
    expect(updated!.notes).toBe('Seguimiento operador');
    expect(updated!.watchlistEntityIds).toEqual([entityId]);
    expect(updated!.pinnedEntityIds).toEqual([entityId]);

    const again = readInvestigations();
    expect(again).toHaveLength(1);
    expect(again[0].notes).toBe('Seguimiento operador');

    deleteInvestigation(saved.id);
    expect(readInvestigations()).toHaveLength(0);
  });

  it('drops corrupt localStorage entries instead of throwing', () => {
    localStorage.setItem(INVESTIGATIONS_STORAGE_KEY, '{"not":"an-array"}');
    expect(readInvestigations()).toEqual([]);

    localStorage.setItem(
      INVESTIGATIONS_STORAGE_KEY,
      JSON.stringify([
        { id: 'bad' },
        {
          id: 'investigation:ok',
          title: 'Ok',
          createdAt: baseTime,
          updatedAt: baseTime,
          sourceCaseId: 'case-ok',
          pinnedEntityIds: ['entity:case:case-ok'],
          watchlistEntityIds: [],
          notes: '',
          graph: {
            entities: [{
              id: 'entity:case:case-ok',
              kind: 'Case',
              label: 'Ok',
              confidence: 'medium',
              provenance: { source: 'test', observedAt: baseTime },
            }],
            relationships: [],
            claims: [],
          },
        } satisfies SavedInvestigation,
      ]),
    );
    const items = readInvestigations();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('investigation:ok');
  });

  it('returns empty when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readInvestigations()).toEqual([]);
    const { operationalCase, graph } = fixtureCaseAndGraph();
    expect(promoteOperationalCaseToInvestigation(operationalCase, graph)).toBeNull();
  });
});
