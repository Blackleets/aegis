import { describe, expect, it } from 'vitest';

import { evaluateOverallStatus, summarizeSubsystems, type SubsystemStatus } from '@/lib/health';

function subsystem(overrides: Partial<SubsystemStatus>): SubsystemStatus {
  return {
    key: 'markets',
    label: 'Markets',
    endpoint: '/api/markets',
    critical: true,
    status: 'healthy',
    latencyMs: 120,
    httpStatus: 200,
    message: 'ok',
    probe: 'http',
    ...overrides,
  };
}

describe('health summary helpers', () => {
  it('returns ok when all critical subsystems are healthy', () => {
    const subsystems = [
      subsystem({ key: 'markets' }),
      subsystem({ key: 'intel', endpoint: '/api/news', label: 'Intel' }),
      subsystem({ key: 'weather', endpoint: '/api/weather', label: 'Weather', critical: false }),
    ];

    expect(evaluateOverallStatus(subsystems)).toBe('ok');

    expect(summarizeSubsystems(subsystems)).toEqual({
      criticalAvailable: 2,
      criticalTotal: 2,
      degradedCount: 0,
      downCount: 0,
      totalSubsystems: 3,
    });
  });

  it('returns degraded when at least one critical subsystem is degraded', () => {
    const subsystems = [
      subsystem({ key: 'markets' }),
      subsystem({ key: 'intel', endpoint: '/api/news', label: 'Intel', status: 'degraded', httpStatus: 503, message: 'upstream timeout' }),
    ];

    expect(evaluateOverallStatus(subsystems)).toBe('degraded');
  });

  it('returns degraded when a critical subsystem is temporarily timing out but another critical subsystem is healthy', () => {
    const subsystems = [
      subsystem({ key: 'markets', status: 'healthy' }),
      subsystem({ key: 'intel', endpoint: '/api/news', label: 'Intel', status: 'degraded', httpStatus: null, message: 'The operation was aborted due to timeout' }),
      subsystem({ key: 'weather', endpoint: '/api/weather', label: 'Weather', critical: false, status: 'degraded', httpStatus: null, message: 'The operation was aborted due to timeout' }),
    ];

    expect(evaluateOverallStatus(subsystems)).toBe('degraded');
    expect(summarizeSubsystems(subsystems)).toEqual({
      criticalAvailable: 1,
      criticalTotal: 2,
      degradedCount: 2,
      downCount: 0,
      totalSubsystems: 3,
    });
  });

  it('returns down when every critical subsystem is down', () => {
    const subsystems = [
      subsystem({ key: 'markets', status: 'down', httpStatus: 500, message: 'failed' }),
      subsystem({ key: 'intel', endpoint: '/api/news', label: 'Intel', status: 'down', httpStatus: 500, message: 'failed' }),
      subsystem({ key: 'weather', endpoint: '/api/weather', label: 'Weather', critical: false, status: 'degraded', httpStatus: 503, message: 'slow provider' }),
    ];

    expect(evaluateOverallStatus(subsystems)).toBe('down');
  });
});
