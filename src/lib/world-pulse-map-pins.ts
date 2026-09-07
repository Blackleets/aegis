/** Soft 2D map pins for World Pulse — mercator only; never invents events. */

export type WorldPulsePinSeverity = 'info' | 'watch' | 'elevated' | 'critical';

export type WorldPulseMapPinInput = {
  id: string;
  lat: number;
  lng: number;
  severity: WorldPulsePinSeverity;
  title: string;
  kind?: string;
  /** Optional ranking hint from API/lib score; higher is worse/fresher. */
  score?: number;
};

export type WorldPulseMapPin = {
  id: string;
  lat: number;
  lng: number;
  severity: WorldPulsePinSeverity;
  title: string;
  kind: string;
};

/** Cap pins so the 2D map stays glanceable. */
export const WORLD_PULSE_MAP_PIN_LIMIT = 25;

/** AEGIS token-aligned soft pin colors (rose critical → amber elevated → cyan watch). */
export const WORLD_PULSE_PIN_COLORS: Record<WorldPulsePinSeverity, string> = {
  critical: '#FB7185',
  elevated: '#FBBF24',
  watch: '#67E8F9',
  info: '#CBD5E1',
};

const SEVERITY_RANK: Record<WorldPulsePinSeverity, number> = {
  critical: 4,
  elevated: 3,
  watch: 2,
  info: 1,
};

function assertFiniteCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90
    && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

/** Fail-closed pin sanitizer — drop missing identity/coords. */
export function sanitizeWorldPulseMapPin(
  input: WorldPulseMapPinInput | null | undefined,
): WorldPulseMapPin | null {
  if (!input) return null;
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!id || !title) return null;
  if (!assertFiniteCoord(input.lat, input.lng)) return null;
  if (!(input.severity in SEVERITY_RANK)) return null;
  const kind = typeof input.kind === 'string' && input.kind.trim()
    ? input.kind.trim()
    : 'other';
  return {
    id,
    lat: input.lat,
    lng: input.lng,
    severity: input.severity,
    title,
    kind,
  };
}

/**
 * Select top pins by severity (then score). Empty when disabled or no valid events.
 * Does not invent coordinates or events.
 */
export function selectWorldPulseMapPins(
  events: WorldPulseMapPinInput[] | null | undefined,
  options: { limit?: number; enabled?: boolean } = {},
): WorldPulseMapPin[] {
  if (options.enabled === false) return [];
  if (!Array.isArray(events) || events.length === 0) return [];

  const limit = Math.max(0, options.limit ?? WORLD_PULSE_MAP_PIN_LIMIT);
  if (limit === 0) return [];

  const scored: Array<WorldPulseMapPin & { _rank: number; _score: number }> = [];
  for (const raw of events) {
    const pin = sanitizeWorldPulseMapPin(raw);
    if (!pin) continue;
    const score = Number.isFinite(raw.score) ? Number(raw.score) : 0;
    scored.push({
      ...pin,
      _rank: SEVERITY_RANK[pin.severity],
      _score: score,
    });
  }

  scored.sort((a, b) => b._rank - a._rank || b._score - a._score || a.id.localeCompare(b.id));

  return scored.slice(0, limit).map(({ _rank: _r, _score: _s, ...pin }) => pin);
}

/** Pins render only on the 2D (mercator) map path — never on globe. */
export function shouldShowWorldPulseMapPins(
  projection: string | null | undefined,
  enabled: boolean,
  pinCount: number,
): boolean {
  return projection === 'mercator' && enabled === true && pinCount > 0;
}

export type WorldPulsePinFeature = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    id: string;
    severity: WorldPulsePinSeverity;
    title: string;
    kind: string;
    color: string;
  };
};

export function worldPulsePinsToGeoJSON(
  pins: WorldPulseMapPin[],
): { type: 'FeatureCollection'; features: WorldPulsePinFeature[] } {
  return {
    type: 'FeatureCollection',
    features: pins.map((pin) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [pin.lng, pin.lat] as [number, number],
      },
      properties: {
        id: pin.id,
        severity: pin.severity,
        title: pin.title,
        kind: pin.kind,
        color: WORLD_PULSE_PIN_COLORS[pin.severity],
      },
    })),
  };
}
