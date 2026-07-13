import { describe, expect, it } from 'vitest';

import { findNewEarthquakes, getEarthquakeSeverity, isRecentEarthquake } from '../src/lib/earthquakes';

describe('earthquake intelligence helpers', () => {
  it('elevates tsunami events to critical regardless of magnitude', () => {
    expect(getEarthquakeSeverity({ magnitude: 3.2, depth: 12, tsunami: true })).toBe('critical');
  });

  it('treats shallow M4 events as high severity', () => {
    expect(getEarthquakeSeverity({ magnitude: 4.1, depth: 18, tsunami: false })).toBe('high');
    expect(getEarthquakeSeverity({ magnitude: 4.1, depth: 90, tsunami: false })).toBe('moderate');
  });

  it('detects only unseen stable USGS ids', () => {
    const seen = new Set(['us-old']);
    expect(findNewEarthquakes([{ id: 'us-old' }, { id: 'us-new' }, { place: 'invalid' }], seen)).toEqual([{ id: 'us-new' }]);
  });

  it('accepts fresh events and rejects stale or future timestamps', () => {
    const now = 1_000_000;
    expect(isRecentEarthquake(now - 20_000, now)).toBe(true);
    expect(isRecentEarthquake(now - 180_000, now)).toBe(false);
    expect(isRecentEarthquake(now + 60_000, now)).toBe(false);
  });
});
