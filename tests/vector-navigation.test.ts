import { describe, expect, it } from 'vitest';

import { getNavigationCameraTarget, getNextSimulationIndex, getVectorCameraPreset, shouldRerouteNavigation, shouldUpdateNavigationCamera, smoothNavigationBearing } from '../src/lib/vector-navigation';

describe('vector navigation camera', () => {
  it('uses a closer camera for walking than driving', () => {
    expect(getVectorCameraPreset('walking', true).zoom).toBeGreaterThan(getVectorCameraPreset('driving', true).zoom);
  });

  it('keeps driving navigation at street-level zoom on mobile', () => {
    const preset = getVectorCameraPreset('driving', true);
    expect(preset.zoom).toBeGreaterThanOrEqual(16.5);
    expect(preset.pitch).toBeGreaterThanOrEqual(50);
    expect(preset.lookAheadMeters).toBeLessThan(100);
  });

  it('ignores stationary GPS jitter and rate-limits camera updates', () => {
    const previous = { lat: 40.4168, lng: -3.7038 };
    expect(shouldUpdateNavigationCamera(previous, { lat: 40.41681, lng: -3.70381 }, 2_000)).toBe(false);
    expect(shouldUpdateNavigationCamera(previous, { lat: 40.417, lng: -3.7038 }, 500)).toBe(false);
    expect(shouldUpdateNavigationCamera(previous, { lat: 40.417, lng: -3.7038 }, 2_000)).toBe(true);
  });

  it('smooths bearing changes across north without spinning the long way', () => {
    expect(smoothNavigationBearing(350, 10, 0.5)).toBeCloseTo(0);
  });

  it('reroutes only after a sustained deviation with reliable GPS', () => {
    expect(shouldRerouteNavigation({ offRouteDistanceMeters: 120, gpsAccuracyMeters: 12, deviationDurationMs: 8_000, cooldownElapsedMs: 31_000 })).toBe(true);
    expect(shouldRerouteNavigation({ offRouteDistanceMeters: 120, gpsAccuracyMeters: 80, deviationDurationMs: 8_000, cooldownElapsedMs: 31_000 })).toBe(false);
    expect(shouldRerouteNavigation({ offRouteDistanceMeters: 120, gpsAccuracyMeters: 12, deviationDurationMs: 2_000, cooldownElapsedMs: 31_000 })).toBe(false);
  });

  it('advances simulation safely and stops at the destination', () => {
    expect(getNextSimulationIndex(0, 240)).toBeGreaterThan(0);
    expect(getNextSimulationIndex(239, 240)).toBe(239);
    expect(getNextSimulationIndex(0, 0)).toBe(0);
  });

  it('looks ahead in the current direction instead of always shifting north', () => {
    const origin = { lat: 40.4168, lng: -3.7038 };
    const east = getNavigationCameraTarget(origin, 90, 100);
    const north = getNavigationCameraTarget(origin, 0, 100);

    expect(east.lng).toBeGreaterThan(origin.lng);
    expect(Math.abs(east.lat - origin.lat)).toBeLessThan(0.0001);
    expect(north.lat).toBeGreaterThan(origin.lat);
  });

  it('keeps the original coordinate when a bearing is unavailable', () => {
    const origin = { lat: 40.4168, lng: -3.7038 };
    expect(getNavigationCameraTarget(origin, Number.NaN, 100)).toEqual(origin);
  });
});
