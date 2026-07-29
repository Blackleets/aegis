export interface LiveMotionFrame {
  fireOpacity: number;
  hotspotOpacity: number;
  satelliteGlowOpacity: number;
  shipOpacity: number;
  trailOpacity: number;
}

const round = (value: number) => Math.round(value * 1000) / 1000;

export function getLiveMotionFrame(elapsedMs: number): LiveMotionFrame {
  const seconds = Math.max(0, elapsedMs) / 1000;
  const slowPulse = (Math.sin(seconds * 1.7) + 1) / 2;
  const fastPulse = (Math.sin(seconds * 2.8 + 0.8) + 1) / 2;
  const drift = (Math.sin(seconds * 0.9 + 1.7) + 1) / 2;

  return {
    fireOpacity: round(0.38 + fastPulse * 0.34),
    hotspotOpacity: round(0.08 + slowPulse * 0.1),
    satelliteGlowOpacity: round(0.2 + drift * 0.34),
    shipOpacity: round(0.66 + slowPulse * 0.24),
    trailOpacity: round(0.12 + drift * 0.18),
  };
}
