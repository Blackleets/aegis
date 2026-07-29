import { describe, expect, it } from 'vitest';
import { getLiveMotionFrame } from '@/lib/map-live-motion';

describe('live map motion', () => {
  it('keeps every animated layer inside readable opacity bounds', () => {
    for (let elapsedMs = 0; elapsedMs <= 20_000; elapsedMs += 137) {
      const frame = getLiveMotionFrame(elapsedMs);
      expect(frame.fireOpacity).toBeGreaterThanOrEqual(0.38);
      expect(frame.fireOpacity).toBeLessThanOrEqual(0.72);
      expect(frame.hotspotOpacity).toBeGreaterThanOrEqual(0.08);
      expect(frame.hotspotOpacity).toBeLessThanOrEqual(0.18);
      expect(frame.satelliteGlowOpacity).toBeGreaterThanOrEqual(0.2);
      expect(frame.satelliteGlowOpacity).toBeLessThanOrEqual(0.54);
      expect(frame.shipOpacity).toBeGreaterThanOrEqual(0.66);
      expect(frame.shipOpacity).toBeLessThanOrEqual(0.9);
      expect(frame.trailOpacity).toBeGreaterThanOrEqual(0.12);
      expect(frame.trailOpacity).toBeLessThanOrEqual(0.3);
    }
  });

  it('produces visible change instead of a static frame', () => {
    expect(getLiveMotionFrame(0)).not.toEqual(getLiveMotionFrame(1_000));
  });
});
