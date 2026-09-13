import { describe, expect, it } from 'vitest';

import {
  UNAVAILABLE_PROVENANCE_LABEL,
  collectContextSources,
  filterActionsWithProvenance,
  fusionItemsToClaims,
  hardenFusionDossier,
  hideUnprovenFusionItems,
  operationalFusionToDisplayItems,
  provenanceChipLabel,
  regionDossierHasProvenance,
  regionDossierToClaims,
  resolveItemProvenance,
  toFusionDisplayItems,
} from '../src/lib/ontology';

const observedAt = Date.parse('2026-09-13T15:00:00.000Z');

describe('fusionItemsToClaims', () => {
  it('maps provenanced fusion items onto OntologyClaim[]', () => {
    const claims = fusionItemsToClaims([
      {
        id: 'hotspot-1',
        kind: 'hotspot',
        text: 'Presión marítima en el Estrecho',
        source: 'AIS',
        observedAt,
        confidence: 'HIGH',
      },
    ]);
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({
      id: 'hotspot-1',
      text: 'Presión marítima en el Estrecho',
      confidence: 'high',
      provenance: { source: 'AIS', observedAt },
    });
  });

  it('drops hotspots without source or observedAt instead of inventing them', () => {
    const claims = fusionItemsToClaims([
      { kind: 'hotspot', text: 'Invented cluster', source: '', observedAt },
      { kind: 'hotspot', text: 'Missing clock', source: 'GDELT' },
      { kind: 'hotspot', text: 'Real cluster', source: 'GDELT', observedAt },
    ]);
    expect(claims.map((claim) => claim.text)).toEqual(['Real cluster']);
  });
});

describe('filterActionsWithProvenance', () => {
  it('strips actions that cannot cite a source', () => {
    const kept = filterActionsWithProvenance([
      { text: 'Prioriza la ruta norte', source: 'USGS', observedAt },
      { text: 'Actúa ya' },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].text).toBe('Prioriza la ruta norte');
  });
});

describe('toFusionDisplayItems', () => {
  it('marks unproven actions as sin procedencia instead of faking a source', () => {
    const items = toFusionDisplayItems(
      [
        { kind: 'action', text: 'Revisa la concentración', source: 'RSS', observedAt },
        { kind: 'action', text: 'Inventa un contraataque' },
      ],
      { kind: 'action' },
    );
    expect(items).toHaveLength(2);
    expect(items[0].available).toBe(true);
    expect(items[0].claim?.provenance.source).toBe('RSS');
    expect(items[1].available).toBe(false);
    expect(items[1].unavailableLabel).toBe(UNAVAILABLE_PROVENANCE_LABEL);
    expect(items[1].claim).toBeUndefined();
  });

  it('can hide unproven items entirely', () => {
    const items = hideUnprovenFusionItems([
      { text: 'keep', source: 'USGS', observedAt },
      { text: 'drop me' },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe('keep');
  });
});

describe('context source attachment', () => {
  const context = collectContextSources({
    news: [
      {
        id: 'n1',
        title: 'Puerto cerrado por temporal',
        source: 'Reuters',
        published: '2026-09-13T14:00:00.000Z',
        link: 'https://example.test/reuters',
      },
    ],
    threats: [
      {
        id: 't1',
        title: 'Incidente fronterizo',
        region: 'Donetsk',
        timestamp: '2026-09-13T13:30:00.000Z',
        source: 'GDELT',
      },
    ],
    earthquakes: [
      {
        id: 'eq1',
        location: 'Near Madrid',
        timestamp: '2026-09-13T12:00:00.000Z',
      },
    ],
  });

  it('collects only context rows that already have source + observedAt', () => {
    expect(context.map((item) => item.source).sort()).toEqual(['GDELT', 'Reuters']);
  });

  it('attaches a unique context source when the generated text cites it', () => {
    const resolved = resolveItemProvenance(
      { kind: 'bluf', text: 'AEGIS assesses elevated pressure around Donetsk.' },
      context,
    );
    expect(resolved.source).toBe('GDELT');
    expect(resolved.observedAt).toBe(Date.parse('2026-09-13T13:30:00.000Z'));
  });

  it('does not attach provenance when multiple sources could match', () => {
    const resolved = resolveItemProvenance(
      { kind: 'bluf', text: 'Reuters and GDELT both mention Donetsk developments.' },
      context,
    );
    expect(resolved.source).toBeUndefined();
    expect(resolved.observedAt).toBeUndefined();
  });

  it('never invents observedAt from the model clock', () => {
    const claims = fusionItemsToClaims(
      [{ kind: 'hotspot', text: 'Unrelated theatre' }],
      { contextSources: context },
    );
    expect(claims).toEqual([]);
  });
});

describe('hardenFusionDossier', () => {
  it('omits unproven list items and marks BLUF unavailable', () => {
    const hardened = hardenFusionDossier({
      bluf: 'Something dramatic happened.',
      riskLevel: 'HIGH',
      confidence: 'LOW',
      hotspots: ['Ghost hotspot', { text: 'Donetsk corridor', source: 'GDELT', observedAt }],
      priorityActions: ['Act without evidence', { text: 'Verify GDELT cluster', source: 'GDELT', observedAt }],
      watchlist: ['Invented watch'],
    });

    expect(hardened.blufAvailable).toBe(false);
    expect(hardened.bluf).toContain(UNAVAILABLE_PROVENANCE_LABEL);
    expect(hardened.hotspots).toEqual(['Donetsk corridor']);
    expect(hardened.priorityActions).toEqual(['Verify GDELT cluster']);
    expect(hardened.watchlist).toEqual([]);
    expect(hardened.claims.every((claim) => claim.provenance.source && Number.isFinite(claim.provenance.observedAt))).toBe(true);
    expect(hardened.unavailable.some((item) => item.kind === 'bluf')).toBe(true);
    expect(hardened.unavailable.some((item) => item.text === 'Ghost hotspot')).toBe(true);
  });

  it('recovers BLUF when context uniquely corroborates the sentence', () => {
    const contextSources = collectContextSources({
      threats: [{
        id: 't1',
        title: 'Incidente',
        region: 'Donetsk',
        timestamp: '2026-09-13T13:30:00.000Z',
        source: 'GDELT',
      }],
    });
    const hardened = hardenFusionDossier(
      { bluf: 'Pressure remains elevated around Donetsk.', hotspots: [], priorityActions: [], watchlist: [] },
      { contextSources },
    );
    expect(hardened.blufAvailable).toBe(true);
    expect(hardened.bluf).toContain('Donetsk');
    expect(hardened.claims[0].provenance.source).toBe('GDELT');
  });
});

describe('regionDossierToClaims', () => {
  it('emits claims only for sections that have a real source + observedAt', () => {
    const claims = regionDossierToClaims({
      timestamp: '2026-09-13T15:10:00.000Z',
      location: { display_name: 'Madrid, España' },
      country: { name: 'Spain', capital: 'Madrid' },
      wikipedia: { extract: 'Madrid is the capital of Spain.' },
      live_context: {
        weather: { summary: 'Clear sky', temperature_c: 22 },
        nearby_cameras: { closest: { name: 'Plaza Mayor', source: 'EarthCam', distance_km: 1.2 } },
      },
    });
    const ids = claims.map((claim) => claim.id).sort();
    expect(ids).toEqual([
      'claim:region:cameras',
      'claim:region:country',
      'claim:region:location',
      'claim:region:weather',
      'claim:region:wikipedia',
    ]);
    expect(claims.find((claim) => claim.id === 'claim:region:location')?.provenance.source).toBe('Nominatim');
    expect(claims.find((claim) => claim.id === 'claim:region:cameras')?.provenance.source).toBe('EarthCam');
  });

  it('hides unproven region claims when timestamp or camera source is missing', () => {
    const claims = regionDossierToClaims({
      location: { display_name: 'Madrid, España' },
      wikipedia: { extract: 'Madrid is the capital of Spain.' },
      live_context: {
        nearby_cameras: { closest: { name: 'Plaza Mayor' } },
      },
    });
    expect(claims).toEqual([]);
    expect(regionDossierHasProvenance({
      timestamp: '2026-09-13T15:10:00.000Z',
      wikipedia: { extract: 'Madrid is the capital of Spain.' },
    }, 'wikipedia')).toBe(true);
    expect(regionDossierHasProvenance({
      wikipedia: { extract: 'Madrid is the capital of Spain.' },
    }, 'wikipedia')).toBe(false);
  });

  it('trusts API-supplied claims only after the fail-closed filter', () => {
    const claims = regionDossierToClaims({
      claims: [
        {
          id: 'ok',
          text: 'Capital confirmada',
          confidence: 'high',
          aboutIds: ['entity:region:country'],
          provenance: { source: 'REST Countries', observedAt },
        },
        {
          id: 'bad',
          text: 'Invented leader',
          confidence: 'low',
          aboutIds: [],
          provenance: { source: '', observedAt },
        },
      ],
    });
    expect(claims).toHaveLength(1);
    expect(claims[0].id).toBe('ok');
  });
});

describe('operationalFusionToDisplayItems', () => {
  it('shows case-signal chips and marks count evidence as sin procedencia', () => {
    const items = operationalFusionToDisplayItems(
      ['2 alertas de inteligencia', '1 eventos sísmicos'],
      [{ id: 'sig-1', title: 'Terremoto M5', source: 'USGS', observedAt }],
    );
    expect(items[0]).toMatchObject({
      available: true,
      text: 'Terremoto M5',
    });
    expect(items[0].claim?.provenance.source).toBe('USGS');
    expect(items.slice(1).every((item) => item.available === false)).toBe(true);
    expect(items.slice(1).every((item) => item.unavailableLabel === UNAVAILABLE_PROVENANCE_LABEL)).toBe(true);
  });
});

describe('provenanceChipLabel', () => {
  it('never fabricates a source label', () => {
    expect(provenanceChipLabel(undefined)).toBe(UNAVAILABLE_PROVENANCE_LABEL);
    expect(provenanceChipLabel({ source: 'USGS', observedAt })).toContain('USGS');
  });
});
