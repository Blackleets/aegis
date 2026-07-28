import { describe, expect, it } from 'vitest';
import {
  LIVE_HAZARD_REFRESH_MS,
  LIVE_TRAFFIC_REFRESH_MS,
  shouldRefreshNavigationData,
} from './navigation-live-refresh';

describe('navigation live refresh', () => {
  it('keeps traffic and hazard refreshes frequent without polling aggressively', () => {
    expect(LIVE_TRAFFIC_REFRESH_MS).toBe(60_000);
    expect(LIVE_HAZARD_REFRESH_MS).toBe(120_000);
  });

  it('refreshes immediately and throttles rapid visibility or network events', () => {
    expect(shouldRefreshNavigationData(0, 1_000)).toBe(true);
    expect(shouldRefreshNavigationData(100_000, 105_000)).toBe(false);
    expect(shouldRefreshNavigationData(100_000, 110_000)).toBe(true);
  });
});
