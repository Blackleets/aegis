import { describe, expect, it } from 'vitest';
import { formatRouteAlertAge, getAlertObservedAt, isRouteAlertFresh, parseAlertTimestamp } from './route-alert-freshness';

const NOW = Date.parse('2026-07-14T12:00:00Z');

describe('route alert freshness', () => {
  it('normalizes seconds, milliseconds and ISO dates', () => {
    expect(parseAlertTimestamp(1_700_000_000)).toBe(1_700_000_000_000);
    expect(parseAlertTimestamp(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(parseAlertTimestamp('2026-07-14T11:30:00Z')).toBe(Date.parse('2026-07-14T11:30:00Z'));
  });

  it('uses the first trustworthy timestamp field', () => {
    expect(getAlertObservedAt({
      updatedAt: '2026-07-14T11:00:00Z',
      date: '2026-07-13T11:00:00Z',
    })).toBe(Date.parse('2026-07-14T11:00:00Z'));
  });

  it('expires stale hazards according to their source category', () => {
    expect(isRouteAlertFresh('wildfire', NOW - 49 * 60 * 60 * 1000, NOW)).toBe(false);
    expect(isRouteAlertFresh('severe-weather', NOW - 25 * 60 * 60 * 1000, NOW)).toBe(false);
    expect(isRouteAlertFresh('volcano', NOW - 6 * 24 * 60 * 60 * 1000, NOW)).toBe(true);
  });

  it('rejects timestamps too far in the future but preserves unknown timestamps', () => {
    expect(isRouteAlertFresh('wildfire', NOW + 10 * 60 * 1000, NOW)).toBe(false);
    expect(isRouteAlertFresh('wildfire', null, NOW)).toBe(true);
  });

  it('formats honest concise age labels', () => {
    expect(formatRouteAlertAge(NOW - 20_000, NOW)).toBe('Verificado ahora');
    expect(formatRouteAlertAge(NOW - 12 * 60_000, NOW)).toBe('Hace 12 min');
    expect(formatRouteAlertAge(NOW - 3 * 60 * 60_000, NOW)).toBe('Hace 3 h');
    expect(formatRouteAlertAge(null, NOW)).toBe('Hora no disponible');
  });
});
