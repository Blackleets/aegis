import { describe, expect, it } from 'vitest';

import { buildOperationalCases, type OperationalSignal } from '../src/lib/operational-cases';

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

describe('operational cases', () => {
  it('does not promote a single signal into a case', () => {
    expect(buildOperationalCases([signal({ id: 'one', source: 'RSS' })])).toEqual([]);
  });

  it('correlates independent nearby signals inside the time window', () => {
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
    expect(cases[0]).toMatchObject({
      title: 'Terremoto M5',
      severity: 'critical',
      sourceCount: 2,
      confidence: 'medium',
    });
  });

  it('requires independent sources and rejects distant or stale correlation', () => {
    expect(buildOperationalCases([
      signal({ id: 'a', source: 'RSS' }),
      signal({ id: 'b', source: 'RSS' }),
      signal({ id: 'far', source: 'USGS', latitude: 42 }),
      signal({ id: 'stale', source: 'NASA', observedAt: baseTime - 12 * 60 * 60 * 1000 }),
    ])).toEqual([]);
  });

  it('produces stable case ids regardless of input order', () => {
    const signals = [
      signal({ id: 'a', source: 'RSS' }),
      signal({ id: 'b', source: 'USGS' }),
      signal({ id: 'c', source: 'NASA' }),
    ];
    expect(buildOperationalCases(signals)[0].id).toBe(buildOperationalCases([...signals].reverse())[0].id);
    expect(buildOperationalCases(signals)[0].confidence).toBe('high');
  });
});
