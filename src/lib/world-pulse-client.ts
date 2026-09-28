/**
 * Shared browser-side World Pulse loader.
 * One in-flight request + short TTL so the map pins, World Pulse panel, situational radar
 * and the menu badge all read the same payload instead of fetching independently.
 * Fail-closed: failures are never cached and never produce events.
 */

export type WorldPulseClientSeverity = 'info' | 'watch' | 'elevated' | 'critical';

export type WorldPulseClientEvent = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  severity: WorldPulseClientSeverity;
  lat: number;
  lng: number;
  observed_at: string;
  source: string;
  source_url: string | null;
};

export type WorldPulseClientPayload = {
  status: 'ok' | 'degraded' | 'unavailable';
  fetched_at?: string;
  sources?: Array<{ name: string; status: string; count: number }>;
  events?: WorldPulseClientEvent[];
};

export type WorldPulseLoadResult = {
  /** Request completed and JSON parsed (HTTP may still be non-2xx, e.g. 503 unavailable). */
  ok: boolean;
  httpOk: boolean;
  payload: WorldPulseClientPayload | null;
  /** Client clock when the payload was received. */
  receivedAt: number;
};

/** Matches the API's s-maxage (90 s) window loosely; long enough to collapse sibling mounts. */
export const WORLD_PULSE_CLIENT_TTL_MS = 30_000;

let cached: WorldPulseLoadResult | null = null;
let inflight: Promise<WorldPulseLoadResult> | null = null;

export function resetWorldPulseClientCache() {
  cached = null;
  inflight = null;
}

export async function loadWorldPulse(options: {
  force?: boolean;
  maxAgeMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
} = {}): Promise<WorldPulseLoadResult> {
  const now = options.now ?? Date.now;
  const maxAgeMs = options.maxAgeMs ?? WORLD_PULSE_CLIENT_TTL_MS;
  if (!options.force && cached && now() - cached.receivedAt < maxAgeMs) return cached;
  if (inflight) return inflight;

  const fetchImpl = options.fetchImpl ?? fetch;
  inflight = (async () => {
    try {
      const response = await fetchImpl('/api/world-pulse', { cache: 'no-store' });
      let payload: WorldPulseClientPayload | null = null;
      try {
        payload = await response.json() as WorldPulseClientPayload;
      } catch {
        payload = null;
      }
      const result: WorldPulseLoadResult = {
        ok: payload !== null,
        httpOk: response.ok,
        payload,
        receivedAt: now(),
      };
      if (result.ok && result.httpOk) cached = result;
      return result;
    } catch {
      return { ok: false, httpOk: false, payload: null, receivedAt: now() };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export const WORLD_PULSE_KIND_FILTERS = ['all', 'earthquake', 'storm', 'wildfire', 'volcano', 'flood'] as const;
export type WorldPulseKindFilter = (typeof WORLD_PULSE_KIND_FILTERS)[number];

export function filterWorldPulseEventsByKind<T extends { kind: string }>(
  events: T[] | null | undefined,
  kind: WorldPulseKindFilter,
): T[] {
  const list = Array.isArray(events) ? events : [];
  if (kind === 'all') return list;
  return list.filter((event) => event.kind === kind);
}

/**
 * Live alert count for the mobile menu badge: critical World Pulse events only (GDACS Red,
 * USGS M6+/tsunami…) so the badge stays meaningful instead of always showing the list size.
 * Null (hide badge) when there is no usable payload — never a guessed number.
 */
export function countWorldPulseAlerts(payload: WorldPulseClientPayload | null | undefined): number | null {
  if (!payload || payload.status === 'unavailable' || !Array.isArray(payload.events)) return null;
  const count = payload.events.filter((event) => event.severity === 'critical').length;
  return count > 0 ? count : null;
}
