import { describe, expect, it } from 'vitest';
import { shouldRerouteNavigation } from './vector-navigation';

const confirmedDeviation = {
  offRouteDistanceMeters: 120,
  gpsAccuracyMeters: 12,
  deviationDurationMs: 9_000,
  cooldownElapsedMs: 40_000,
  consecutiveOffRouteFixes: 4,
};

describe('confirmed navigation rerouting', () => {
  it('reroutes after a sustained multi-fix deviation', () => {
    expect(shouldRerouteNavigation(confirmedDeviation)).toBe(true);
  });

  it('ignores a single GPS spike', () => {
    expect(shouldRerouteNavigation({
      ...confirmedDeviation,
      consecutiveOffRouteFixes: 1,
    })).toBe(false);
  });

  it('requires accuracy-aware separation from the route', () => {
    expect(shouldRerouteNavigation({
      ...confirmedDeviation,
      gpsAccuracyMeters: 45,
      offRouteDistanceMeters: 95,
    })).toBe(false);
  });

  it('rejects unreliable GPS even after many fixes', () => {
    expect(shouldRerouteNavigation({
      ...confirmedDeviation,
      gpsAccuracyMeters: 70,
      consecutiveOffRouteFixes: 10,
    })).toBe(false);
  });

  it('preserves duration and cooldown guards', () => {
    expect(shouldRerouteNavigation({
      ...confirmedDeviation,
      deviationDurationMs: 5_000,
    })).toBe(false);
    expect(shouldRerouteNavigation({
      ...confirmedDeviation,
      cooldownElapsedMs: 20_000,
    })).toBe(false);
  });
});
