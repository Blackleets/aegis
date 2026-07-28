export const LIVE_TRAFFIC_REFRESH_MS = 60_000;
export const LIVE_HAZARD_REFRESH_MS = 120_000;

export function shouldRefreshNavigationData(
  lastRefreshAt: number,
  now = Date.now(),
  minimumIntervalMs = 10_000,
) {
  return lastRefreshAt <= 0 || now - lastRefreshAt >= minimumIntervalMs;
}
