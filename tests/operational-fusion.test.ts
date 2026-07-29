import { describe, expect, it } from 'vitest';

import { assessOperationalFusion } from '../src/lib/operational-fusion';

describe('operational fusion', () => {
  it('keeps an empty connected mesh steady without fabricating evidence', () => {
    const result = assessOperationalFusion({
      backendStatus: 'connected',
      activeIntelAlerts: 0,
      maritimePressure: 0,
      newsCount: 0,
      earthquakeCount: 0,
      gdeltCount: 0,
    });

    expect(result).toMatchObject({
      pressure: 'steady',
      score: 0,
      confidence: 'low',
      evidence: [],
    });
  });

  it('raises confidence only when independent source families corroborate', () => {
    const result = assessOperationalFusion({
      backendStatus: 'connected',
      activeIntelAlerts: 2,
      maritimePressure: 1,
      newsCount: 20,
      earthquakeCount: 0,
      gdeltCount: 12,
    });

    expect(result.pressure).toBe('elevated');
    expect(result.confidence).toBe('high');
    expect(result.corroboratingSources).toBe(4);
    expect(result.evidence).toHaveLength(4);
  });

  it('marks the assessment degraded when the backend is unavailable', () => {
    const result = assessOperationalFusion({
      backendStatus: 'error',
      activeIntelAlerts: 3,
      maritimePressure: 2,
      newsCount: 30,
      earthquakeCount: 1,
      gdeltCount: 20,
    });

    expect(result.pressure).toBe('degraded');
    expect(result.confidence).toBe('low');
    expect(result.action).toContain('Datos incompletos');
  });

  it('rejects invalid signal counts', () => {
    expect(() => assessOperationalFusion({
      backendStatus: 'connected',
      activeIntelAlerts: -1,
      maritimePressure: 0,
      newsCount: 0,
      earthquakeCount: 0,
      gdeltCount: 0,
    })).toThrow('non-negative');
  });
});
