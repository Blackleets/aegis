import { describe, expect, it } from 'vitest';
import {
  applyLiveTrafficToDurationSeconds,
  formatTomTomTrafficLabel,
  buildTrafficCacheKey,
  classifyTrafficDelay,
  normalizeTomTomRouteTraffic,
  parseCoordinate,
} from '../src/lib/tomtom-route-traffic';

describe('TomTom route traffic adapter', () => {
  it('validates coordinates without accepting invalid values', () => {
    expect(parseCoordinate('40.4168', -90, 90)).toBe(40.4168);
    expect(parseCoordinate('91', -90, 90)).toBeNull();
    expect(parseCoordinate('not-a-number', -90, 90)).toBeNull();
  });

  it('rounds route coordinates for cache reuse', () => {
    expect(buildTrafficCacheKey(40.41681, -3.70379, 40.43791, -3.67951))
      .toBe('40.4168:-3.7038:40.4379:-3.6795');
  });

  it('normalizes explicit TomTom traffic delay values', () => {
    expect(normalizeTomTomRouteTraffic({
      travelTimeInSeconds: 1_500,
      noTrafficTravelTimeInSeconds: 900,
      trafficDelayInSeconds: 600,
      trafficLengthInMeters: 2_400,
    })).toMatchObject({
      delaySeconds: 600,
      trafficLengthMeters: 2_400,
      level: 'moderate',
    });
  });

  it('derives delay from free-flow time when TomTom omits the explicit delay', () => {
    expect(normalizeTomTomRouteTraffic({
      travelTimeInSeconds: 1_000,
      noTrafficTravelTimeInSeconds: 820,
    })).toMatchObject({ delaySeconds: 180, level: 'light' });
  });

  it('rejects malformed summaries and classifies delay boundaries', () => {
    expect(normalizeTomTomRouteTraffic({})).toBeNull();
    expect(classifyTrafficDelay(0)).toBe('clear');
    expect(classifyTrafficDelay(120)).toBe('light');
    expect(classifyTrafficDelay(300)).toBe('moderate');
    expect(classifyTrafficDelay(900)).toBe('heavy');
  });

  it('only adds delay to ETA when traffic is live', () => {
    expect(applyLiveTrafficToDurationSeconds(600, null)).toBe(600);
    expect(applyLiveTrafficToDurationSeconds(600, { status: 'unavailable', delaySeconds: 180 })).toBe(600);
    expect(applyLiveTrafficToDurationSeconds(600, { status: 'live', delaySeconds: 180 })).toBe(780);
    expect(applyLiveTrafficToDurationSeconds(600, { status: 'live' })).toBe(600);
  });

  it('labels live TomTom delay and stays honest when offline', () => {
    expect(formatTomTomTrafficLabel({ status: 'live', level: 'heavy', delaySeconds: 900 })).toContain('TomTom');
    expect(formatTomTomTrafficLabel({ status: 'unavailable', configured: false })).toBe('Tráfico TomTom no configurado');
    expect(formatTomTomTrafficLabel(null)).toBeNull();
  });
});
