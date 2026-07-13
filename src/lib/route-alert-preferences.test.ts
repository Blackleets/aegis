import { describe, expect, it } from 'vitest';
import { DEFAULT_ROUTE_ALERT_PREFERENCES, parseRouteAlertPreferences, updateRouteAlertPreference } from './route-alert-preferences';

describe('route alert preferences', () => {
  it('uses safe defaults for missing or invalid storage', () => {
    expect(parseRouteAlertPreferences(null)).toEqual(DEFAULT_ROUTE_ALERT_PREFERENCES);
    expect(parseRouteAlertPreferences('{broken')).toEqual(DEFAULT_ROUTE_ALERT_PREFERENCES);
  });

  it('preserves new defaults when reading an older partial preference set', () => {
    expect(parseRouteAlertPreferences(JSON.stringify({ earthquakes: false }))).toEqual({
      ...DEFAULT_ROUTE_ALERT_PREFERENCES,
      earthquakes: false,
    });
  });

  it('ignores malformed field values', () => {
    expect(parseRouteAlertPreferences(JSON.stringify({
      wildfires: 'no',
      haptics: false,
    }))).toEqual({
      ...DEFAULT_ROUTE_ALERT_PREFERENCES,
      haptics: false,
    });
  });

  it('updates one preference without mutating the previous object', () => {
    const next = updateRouteAlertPreference(DEFAULT_ROUTE_ALERT_PREFERENCES, 'trafficCameras', false);

    expect(next.trafficCameras).toBe(false);
    expect(DEFAULT_ROUTE_ALERT_PREFERENCES.trafficCameras).toBe(true);
  });
});
