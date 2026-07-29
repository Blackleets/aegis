import { describe, expect, it } from 'vitest';
import { resolveRouteAlertPosition } from '../src/lib/route-alert-position';

// Madrid route fixture used for directional corridor checks.
const route: [number, number][] = [
  [-3.7100, 40.4200],
  [-3.7000, 40.4200],
  [-3.6900, 40.4200],
];

describe('route alert position', () => {
  it('returns route distance for an incident ahead', () => {
    const result = resolveRouteAlertPosition({
      user: { lat: 40.4200, lng: -3.7060 },
      alert: { lat: 40.4200, lng: -3.6960 },
      routeCoordinates: route,
      corridorMeters: 100,
      maxAheadMeters: 2_000,
    });
    expect(result).not.toBeNull();
    expect(result?.distanceAheadMeters).toBeGreaterThan(800);
    expect(result?.distanceAheadMeters).toBeLessThan(900);
  });

  it('rejects an incident already passed', () => {
    expect(resolveRouteAlertPosition({
      user: { lat: 40.4200, lng: -3.6960 },
      alert: { lat: 40.4200, lng: -3.7060 },
      routeCoordinates: route,
      corridorMeters: 100,
      maxAheadMeters: 2_000,
    })).toBeNull();
  });

  it('rejects a camera on a parallel street outside its corridor', () => {
    expect(resolveRouteAlertPosition({
      user: { lat: 40.4200, lng: -3.7060 },
      alert: { lat: 40.4220, lng: -3.6960 },
      routeCoordinates: route,
      corridorMeters: 100,
      maxAheadMeters: 2_000,
    })).toBeNull();
  });

  it('accepts a broad hazard whose area intersects the future route', () => {
    const result = resolveRouteAlertPosition({
      user: { lat: 40.4200, lng: -3.7060 },
      alert: { lat: 40.5200, lng: -3.6960 },
      routeCoordinates: route,
      corridorMeters: 15_000,
      maxAheadMeters: 25_000,
    });
    expect(result).not.toBeNull();
    expect(result?.lateralDistanceMeters).toBeGreaterThan(10_000);
  });
  it('projects a short route correctly across the antimeridian', () => {
    const result = resolveRouteAlertPosition({
      user: { lat: 0, lng: 179.91 },
      alert: { lat: 0, lng: -179.95 },
      routeCoordinates: [[179.9, 0], [-179.9, 0]],
      corridorMeters: 100,
      maxAheadMeters: 30_000,
    });
    expect(result).not.toBeNull();
    expect(result?.distanceAheadMeters).toBeGreaterThan(15_000);
    expect(result?.distanceAheadMeters).toBeLessThan(16_000);
  });
});
