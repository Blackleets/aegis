import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  countWorldPulseAlerts,
  filterWorldPulseEventsByKind,
  loadWorldPulse,
  resetWorldPulseClientCache,
  type WorldPulseClientEvent,
} from '../src/lib/world-pulse-client';

const event = (id: string, severity: WorldPulseClientEvent['severity'], kind = 'earthquake'): WorldPulseClientEvent => ({
  id,
  kind,
  title: id,
  detail: id,
  severity,
  lat: 1,
  lng: 2,
  observed_at: '2026-09-28T08:00:00Z',
  source: 'USGS',
  source_url: null,
});

const okResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
}) as unknown as Response;

afterEach(() => resetWorldPulseClientCache());

describe('loadWorldPulse (shared client)', () => {
  it('collapses concurrent callers into one request and serves the TTL cache', async () => {
    const fetchImpl = vi.fn(async () => okResponse({ status: 'ok', events: [event('a', 'critical')] }));
    let clock = 1_000;
    const now = () => clock;
    const [first, second] = await Promise.all([
      loadWorldPulse({ fetchImpl, now }),
      loadWorldPulse({ fetchImpl, now }),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    clock += 10_000;
    await loadWorldPulse({ fetchImpl, now });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    clock += 60_000;
    await loadWorldPulse({ fetchImpl, now });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await loadWorldPulse({ fetchImpl, now, force: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('never caches failures and reports them fail-closed', async () => {
    const failing = vi.fn(async () => { throw new Error('offline'); });
    const result = await loadWorldPulse({ fetchImpl: failing as unknown as typeof fetch });
    expect(result).toMatchObject({ ok: false, payload: null });
    const recovering = vi.fn(async () => okResponse({ status: 'ok', events: [] }));
    await loadWorldPulse({ fetchImpl: recovering });
    expect(recovering).toHaveBeenCalledTimes(1);
  });

  it('keeps a 503 unavailable payload visible but does not cache it', async () => {
    const fetchImpl = vi.fn(async () => okResponse({ status: 'unavailable', events: [] }, 503));
    const result = await loadWorldPulse({ fetchImpl });
    expect(result).toMatchObject({ ok: true, httpOk: false });
    await loadWorldPulse({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('countWorldPulseAlerts', () => {
  it('counts critical events only', () => {
    expect(countWorldPulseAlerts({
      status: 'ok',
      events: [event('a', 'critical'), event('e', 'critical'), event('b', 'elevated'), event('c', 'watch'), event('d', 'info')],
    })).toBe(2);
  });

  it('hides the badge (null) when unavailable, empty or missing', () => {
    expect(countWorldPulseAlerts(null)).toBeNull();
    expect(countWorldPulseAlerts({ status: 'unavailable', events: [event('a', 'critical')] })).toBeNull();
    expect(countWorldPulseAlerts({ status: 'ok', events: [event('b', 'elevated'), event('c', 'watch')] })).toBeNull();
  });
});

describe('filterWorldPulseEventsByKind', () => {
  it('filters by kind and tolerates missing lists', () => {
    const list = [event('a', 'critical', 'earthquake'), event('b', 'watch', 'wildfire')];
    expect(filterWorldPulseEventsByKind(list, 'all')).toHaveLength(2);
    expect(filterWorldPulseEventsByKind(list, 'wildfire').map((item) => item.id)).toEqual(['b']);
    expect(filterWorldPulseEventsByKind(undefined, 'all')).toEqual([]);
  });
});
