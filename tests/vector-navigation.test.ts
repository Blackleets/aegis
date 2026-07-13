import { describe, expect, it } from 'vitest';

import { getNavigationCameraTarget, getVectorCameraPreset } from '../src/lib/vector-navigation';

describe('vector navigation camera', () => {
  it('uses a closer camera for walking than driving', () => {
    expect(getVectorCameraPreset('walking', true).zoom).toBeGreaterThan(getVectorCameraPreset('driving', true).zoom);
  });

  it('keeps driving navigation at street-level zoom on mobile', () => {
    const preset = getVectorCameraPreset('driving', true);
    expect(preset.zoom).toBeGreaterThanOrEqual(17.5);
    expect(preset.pitch).toBeGreaterThanOrEqual(60);
    expect(preset.lookAheadMeters).toBeLessThan(100);
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
