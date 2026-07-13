import { describe, expect, it } from 'vitest';

import { deriveAviationAlert, getPositionFreshness } from '../src/lib/aviation-intelligence';

describe('aviation intelligence', () => {
  it('marks positions stale using explicit age thresholds', () => {
    expect(getPositionFreshness(8)).toBe('live');
    expect(getPositionFreshness(30)).toBe('delayed');
    expect(getPositionFreshness(60)).toBe('stale');
  });

  it('creates critical alerts only from verified emergency evidence', () => {
    const alert = deriveAviationAlert({
      squawk: '7700',
      grounded: false,
      positionAgeSeconds: 4,
      altitudeFeet: 12000,
      verticalRateFpm: -500,
    });
    expect(alert?.code).toBe('SQUAWK_7700');
    expect(alert?.level).toBe('critical');
  });

  it('labels rapid descent as observation rather than emergency', () => {
    const alert = deriveAviationAlert({
      squawk: '1200',
      grounded: false,
      positionAgeSeconds: 5,
      altitudeFeet: 15000,
      verticalRateFpm: -3500,
    });
    expect(alert?.code).toBe('RAPID_DESCENT');
    expect(alert?.evidence).toContain('no implica emergencia');
  });

  it('does not alert on stale rapid-descent telemetry', () => {
    expect(deriveAviationAlert({
      grounded: false,
      positionAgeSeconds: 90,
      altitudeFeet: 15000,
      verticalRateFpm: -5000,
    })).toBeNull();
  });
});
