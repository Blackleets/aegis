import { describe, expect, it } from 'vitest';
import {
  correctGpsKalman,
  createGpsKalman,
  filterGpsWithKalman,
  fromLocalMeters,
  gpsKalmanCoordinate,
  predictGpsKalman,
  toLocalMeters,
} from '../src/lib/gps-kalman';

const origin = { lat: 40.4168, lng: -3.7038 };

describe('GPS constant-velocity Kalman', () => {
  it('round-trips local meters near Madrid', () => {
    const point = { lat: 40.4175, lng: -3.7029 };
    const xy = toLocalMeters(point, origin);
    const back = fromLocalMeters(xy.x, xy.y, origin);
    expect(back.lat).toBeCloseTo(point.lat, 6);
    expect(back.lng).toBeCloseTo(point.lng, 6);
  });

  it('predicts forward using velocity without needing a new fix', () => {
    const state = { ...createGpsKalman(origin, 8), vx: 10, vy: 0 };
    const predicted = predictGpsKalman(state, 1);
    expect(predicted.x).toBeCloseTo(10, 5);
    expect(predicted.y).toBeCloseTo(0, 5);
  });

  it('trusts a precise fix more than a coarse one', () => {
    const prior = createGpsKalman(origin, 8);
    const east = fromLocalMeters(40, 0, origin);
    const precise = correctGpsKalman(prior, east, 5);
    const coarse = correctGpsKalman(prior, east, 80);
    expect(Math.abs(precise.x)).toBeGreaterThan(Math.abs(coarse.x));
  });

  it('learns eastward velocity from a sequence of accepted fixes', () => {
    let filter = filterGpsWithKalman({
      state: null,
      measurement: origin,
      accuracyMeters: 8,
      elapsedMs: 1_000,
    });
    for (let step = 1; step <= 6; step += 1) {
      const measurement = fromLocalMeters(step * 12, 0, origin);
      filter = filterGpsWithKalman({
        state: filter.state,
        measurement,
        accuracyMeters: 8,
        elapsedMs: 1_000,
      });
    }
    expect(filter.state.vx).toBeGreaterThan(6);
    const coordinate = gpsKalmanCoordinate(filter.state);
    expect(coordinate.lng).toBeGreaterThan(origin.lng);
  });
});
