import { describe, expect, it } from 'vitest';
import {
  isAcceptableLocalRiskFix,
  LOCAL_RISK_MAX_ACCURACY_METERS,
  shouldMonitorLocalRisks,
} from '../src/lib/local-risk-monitoring';

describe('local risk monitoring', () => {
  it('runs during navigation even when permanent monitoring is disabled', () => {
    expect(shouldMonitorLocalRisks(true, false)).toBe(true);
  });

  it('runs without a route only after the user enables it', () => {
    expect(shouldMonitorLocalRisks(false, false)).toBe(false);
    expect(shouldMonitorLocalRisks(false, true)).toBe(true);
  });

  it('rejects only positions too imprecise for nearby alerts', () => {
    expect(isAcceptableLocalRiskFix(null)).toBe(true);
    expect(isAcceptableLocalRiskFix(LOCAL_RISK_MAX_ACCURACY_METERS)).toBe(true);
    expect(isAcceptableLocalRiskFix(LOCAL_RISK_MAX_ACCURACY_METERS + 1)).toBe(false);
  });
});
