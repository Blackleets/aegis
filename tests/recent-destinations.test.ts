import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearRecentDestinations,
  pushRecentDestination,
  readRecentDestinations,
  removeRecentDestination,
} from '../src/lib/recent-destinations';

describe('recent destinations', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  it('pushes and reads recent destinations (MRU)', () => {
    expect(pushRecentDestination({ label: 'Madrid Centro', lat: 40.4, lng: -3.7 })).not.toBeNull();
    expect(pushRecentDestination({ label: 'Oficina', lat: 40.45, lng: -3.69, placeId: 'osm:1' })).not.toBeNull();
    const list = readRecentDestinations();
    expect(list).toHaveLength(2);
    expect(list[0]?.label).toBe('Oficina');
    expect(list[0]?.placeId).toBe('osm:1');
    expect(list[1]?.label).toBe('Madrid Centro');
  });

  it('dedupes by coords/label and moves to front', () => {
    pushRecentDestination({ label: 'A', lat: 1, lng: 2 });
    pushRecentDestination({ label: 'B', lat: 3, lng: 4 });
    pushRecentDestination({ label: 'A', lat: 1, lng: 2 });
    const list = readRecentDestinations();
    expect(list).toHaveLength(2);
    expect(list[0]?.label).toBe('A');
  });

  it('caps at 8 entries', () => {
    for (let i = 0; i < 12; i += 1) {
      pushRecentDestination({ label: `P${i}`, lat: i, lng: i });
    }
    expect(readRecentDestinations()).toHaveLength(8);
    expect(readRecentDestinations()[0]?.label).toBe('P11');
  });

  it('rejects invalid coords or empty label (fail-closed)', () => {
    expect(pushRecentDestination({ label: 'x', lat: Number.NaN, lng: 1 })).toBeNull();
    expect(pushRecentDestination({ label: '   ', lat: 1, lng: 2 })).toBeNull();
    expect(readRecentDestinations()).toHaveLength(0);
  });

  it('clears all and removes one', () => {
    pushRecentDestination({ label: 'A', lat: 1, lng: 2 });
    pushRecentDestination({ label: 'B', lat: 3, lng: 4 });
    removeRecentDestination({ label: 'A', lat: 1, lng: 2 });
    expect(readRecentDestinations().map((d) => d.label)).toEqual(['B']);
    clearRecentDestinations();
    expect(readRecentDestinations()).toHaveLength(0);
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem('aegis.recent-destinations.v1', '{not-json');
    expect(readRecentDestinations()).toEqual([]);
    localStorage.setItem('aegis.recent-destinations.v1', JSON.stringify([{ label: 'bad', lat: 'x', lng: 1 }]));
    expect(readRecentDestinations()).toEqual([]);
  });
});
