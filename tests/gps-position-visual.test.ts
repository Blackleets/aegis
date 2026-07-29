import { describe, expect, it } from 'vitest';

import { getGpsPulseFrame } from '../src/lib/gps-position-visual';

describe('GPS position visual', () => {
  it('maps real accuracy into clear quality states', () => {
    expect(getGpsPulseFrame(0, 8).quality).toBe('precise');
    expect(getGpsPulseFrame(0, 30).quality).toBe('usable');
    expect(getGpsPulseFrame(0, 80).quality).toBe('weak');
    expect(getGpsPulseFrame(0, null).quality).toBe('unknown');
  });

  it('expands and fades during a pulse cycle', () => {
    const start = getGpsPulseFrame(0, 10);
    const middle = getGpsPulseFrame(900, 10);
    expect(middle.pulseRadius).toBeGreaterThan(start.pulseRadius);
    expect(middle.pulseOpacity).toBeLessThan(start.pulseOpacity);
  });

  it('clamps the visual accuracy radius', () => {
    expect(getGpsPulseFrame(0, 1).accuracyRadius).toBe(12);
    expect(getGpsPulseFrame(0, 1000).accuracyRadius).toBe(42);
  });
});
