import type { NavigationCoordinate } from '@/lib/vector-navigation';

const EARTH_RADIUS_METERS = 6_371_000;
const MIN_ACCURACY_METERS = 5;
const PROCESS_ACCEL_MS2 = 1.6;
const MAX_DT_SECONDS = 3;

export type GpsKalmanState = {
  originLat: number;
  originLng: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 4x4 covariance, row-major. */
  P: number[];
};

function shortestLongitudeDelta(degrees: number) {
  return ((degrees + 540) % 360) - 180;
}

export function toLocalMeters(point: NavigationCoordinate, origin: NavigationCoordinate) {
  const latitudeRadians = origin.lat * Math.PI / 180;
  return {
    x: shortestLongitudeDelta(point.lng - origin.lng) * Math.PI / 180 * EARTH_RADIUS_METERS * Math.cos(latitudeRadians),
    y: (point.lat - origin.lat) * Math.PI / 180 * EARTH_RADIUS_METERS,
  };
}

export function fromLocalMeters(x: number, y: number, origin: NavigationCoordinate): NavigationCoordinate {
  const latitudeRadians = origin.lat * Math.PI / 180;
  return {
    lat: origin.lat + (y / EARTH_RADIUS_METERS) * 180 / Math.PI,
    lng: origin.lng + (x / (EARTH_RADIUS_METERS * Math.max(0.2, Math.cos(latitudeRadians)))) * 180 / Math.PI,
  };
}

function identity4() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

function matMul4(a: number[], b: number[]) {
  const out = new Array<number>(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      out[row * 4 + col] =
        a[row * 4] * b[col]
        + a[row * 4 + 1] * b[4 + col]
        + a[row * 4 + 2] * b[8 + col]
        + a[row * 4 + 3] * b[12 + col];
    }
  }
  return out;
}

function matAdd4(a: number[], b: number[]) {
  return a.map((value, index) => value + b[index]);
}

function transpose4(a: number[]) {
  const out = new Array<number>(16);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      out[col * 4 + row] = a[row * 4 + col];
    }
  }
  return out;
}

export function createGpsKalman(coordinate: NavigationCoordinate, accuracyMeters: number | null): GpsKalmanState {
  const accuracy = Math.max(MIN_ACCURACY_METERS, accuracyMeters ?? 25);
  const variance = accuracy * accuracy;
  const P = identity4();
  P[0] = variance;
  P[5] = variance;
  P[10] = 16;
  P[15] = 16;
  return {
    originLat: coordinate.lat,
    originLng: coordinate.lng,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    P,
  };
}

export function predictGpsKalman(state: GpsKalmanState, dtSeconds: number): GpsKalmanState {
  const dt = Math.min(MAX_DT_SECONDS, Math.max(0.05, dtSeconds));
  const F = [
    1, 0, dt, 0,
    0, 1, 0, dt,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
  const q = PROCESS_ACCEL_MS2 * PROCESS_ACCEL_MS2;
  const dt2 = dt * dt;
  const dt3 = dt2 * dt;
  const dt4 = dt2 * dt2;
  const Q = [
    q * dt4 / 4, 0, q * dt3 / 2, 0,
    0, q * dt4 / 4, 0, q * dt3 / 2,
    q * dt3 / 2, 0, q * dt2, 0,
    0, q * dt3 / 2, 0, q * dt2,
  ];
  const Fp = matMul4(F, state.P);
  const P = matAdd4(matMul4(Fp, transpose4(F)), Q);
  return {
    ...state,
    x: state.x + state.vx * dt,
    y: state.y + state.vy * dt,
    P,
  };
}

export function correctGpsKalman(
  state: GpsKalmanState,
  measurement: NavigationCoordinate,
  accuracyMeters: number | null,
): GpsKalmanState {
  const origin = { lat: state.originLat, lng: state.originLng };
  const z = toLocalMeters(measurement, origin);
  const accuracy = Math.max(MIN_ACCURACY_METERS, accuracyMeters ?? 25);
  const r = accuracy * accuracy;

  // S = H P Hᵀ + R, H picks position.
  const s00 = state.P[0] + r;
  const s01 = state.P[1];
  const s10 = state.P[4];
  const s11 = state.P[5] + r;
  const det = s00 * s11 - s01 * s10;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return state;
  const inv00 = s11 / det;
  const inv01 = -s01 / det;
  const inv10 = -s10 / det;
  const inv11 = s00 / det;

  // K = P Hᵀ S⁻¹  (4x2)
  const k = [
    state.P[0] * inv00 + state.P[1] * inv10,
    state.P[0] * inv01 + state.P[1] * inv11,
    state.P[4] * inv00 + state.P[5] * inv10,
    state.P[4] * inv01 + state.P[5] * inv11,
    state.P[8] * inv00 + state.P[9] * inv10,
    state.P[8] * inv01 + state.P[9] * inv11,
    state.P[12] * inv00 + state.P[13] * inv10,
    state.P[12] * inv01 + state.P[13] * inv11,
  ];

  const innovX = z.x - state.x;
  const innovY = z.y - state.y;

  const next = {
    ...state,
    x: state.x + k[0] * innovX + k[1] * innovY,
    y: state.y + k[2] * innovX + k[3] * innovY,
    vx: state.vx + k[4] * innovX + k[5] * innovY,
    vy: state.vy + k[6] * innovX + k[7] * innovY,
    P: state.P.slice(),
  };

  // Joseph form-lite: P = (I − K H) P
  const KH = [
    k[0], k[1], 0, 0,
    k[2], k[3], 0, 0,
    k[4], k[5], 0, 0,
    k[6], k[7], 0, 0,
  ];
  const IminusKH = identity4().map((value, index) => value - KH[index]);
  next.P = matMul4(IminusKH, state.P);
  return next;
}

export function gpsKalmanCoordinate(state: GpsKalmanState): NavigationCoordinate {
  return fromLocalMeters(state.x, state.y, { lat: state.originLat, lng: state.originLng });
}

export function filterGpsWithKalman({
  state,
  measurement,
  accuracyMeters,
  elapsedMs,
}: {
  state: GpsKalmanState | null;
  measurement: NavigationCoordinate;
  accuracyMeters: number | null;
  elapsedMs: number;
}) {
  if (!state) {
    const initialized = createGpsKalman(measurement, accuracyMeters);
    return { state: initialized, coordinate: measurement };
  }

  const predicted = predictGpsKalman(state, elapsedMs / 1000);
  const corrected = correctGpsKalman(predicted, measurement, accuracyMeters);
  return {
    state: corrected,
    coordinate: gpsKalmanCoordinate(corrected),
  };
}
