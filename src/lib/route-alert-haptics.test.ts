import { describe, expect, it, vi } from 'vitest';
import { getRouteAlertHapticPattern, vibrateForRouteAlert } from './route-alert-haptics';

describe('route alert haptics', () => {
  it('uses a stronger earthquake pattern for critical danger', () => {
    const critical = getRouteAlertHapticPattern('critical', 'earthquake');
    const info = getRouteAlertHapticPattern('info', 'context');

    expect(critical.length).toBeGreaterThan(info.length);
    expect(critical.reduce((sum, duration) => sum + duration, 0))
      .toBeGreaterThan(info.reduce((sum, duration) => sum + duration, 0));
  });

  it('uses a short non-intrusive pattern for informational alerts', () => {
    expect(getRouteAlertHapticPattern('info', 'context')).toEqual([80]);
  });

  it('degrades safely when vibration is unavailable', () => {
    expect(vibrateForRouteAlert('warning', 'context', null)).toBe(false);
  });

  it('sends exactly one pattern to a supported device', () => {
    const vibrate = vi.fn().mockReturnValue(true);

    expect(vibrateForRouteAlert('critical', 'context', vibrate)).toBe(true);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith([220, 100, 300]);
  });

  it('does not break navigation when the device rejects vibration', () => {
    const vibrate = vi.fn(() => {
      throw new Error('not allowed');
    });

    expect(vibrateForRouteAlert('warning', 'earthquake', vibrate)).toBe(false);
  });
});
