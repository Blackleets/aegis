import { describe, expect, it } from 'vitest';
import { chooseRouteAlertChannel, scoreRouteAlert, type RouteAlertPriorityCandidate } from './route-alert-priority';

const NOW = Date.parse('2026-07-14T12:00:00Z');

function alert(overrides: Partial<RouteAlertPriorityCandidate>): RouteAlertPriorityCandidate {
  return {
    channel: 'context',
    id: 'alert',
    severity: 'warning',
    distanceMeters: 2_000,
    source: 'NASA FIRMS',
    observedAt: NOW - 60_000,
    ...overrides,
  };
}

describe('route alert priority', () => {
  it('shows only the available channel', () => {
    const context = alert({});
    expect(chooseRouteAlertChannel(null, context, NOW)).toBe('context');
    expect(chooseRouteAlertChannel(null, null, NOW)).toBeNull();
  });

  it('prioritizes confirmed critical danger over an informational camera', () => {
    const earthquake = alert({
      channel: 'earthquake',
      id: 'quake',
      severity: 'critical',
      magnitude: 5.7,
      source: 'USGS',
      distanceMeters: 12_000,
    });
    const camera = alert({
      id: 'camera',
      severity: 'info',
      source: 'organismo vial',
      distanceMeters: 150,
    });

    expect(chooseRouteAlertChannel(earthquake, camera, NOW)).toBe('earthquake');
  });

  it('uses freshness, distance and source quality within the same severity', () => {
    const freshOfficial = alert({
      channel: 'earthquake',
      id: 'fresh',
      source: 'USGS',
      distanceMeters: 5_000,
      observedAt: NOW - 5 * 60_000,
      magnitude: 4,
    });
    const staleUnknown = alert({
      id: 'stale',
      source: 'unknown feed',
      distanceMeters: 15_000,
      observedAt: NOW - 12 * 3_600_000,
    });

    expect(scoreRouteAlert(freshOfficial, NOW)).toBeGreaterThan(scoreRouteAlert(staleUnknown, NOW));
    expect(chooseRouteAlertChannel(freshOfficial, staleUnknown, NOW)).toBe('earthquake');
  });

  it('is deterministic when scores and distances tie', () => {
    const earthquake = alert({ channel: 'earthquake', id: 'a', source: 'same', observedAt: null });
    const context = alert({ id: 'b', source: 'same', observedAt: null });

    expect(chooseRouteAlertChannel(earthquake, context, NOW)).toBe('earthquake');
  });
});
