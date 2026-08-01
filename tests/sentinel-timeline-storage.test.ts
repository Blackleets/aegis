import { describe, expect, it } from 'vitest';
import {
  loadSentinelTimeline,
  normalizeSentinelTimeline,
  prependSentinelTimelineEntry,
  saveSentinelTimeline,
} from '../src/lib/sentinel-timeline-storage';
import type { StorageLike } from '../src/lib/safe-browser-storage';

function createStorage(seed: Record<string, string> = {}): StorageLike {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe('Sentinel timeline storage', () => {
  it('loads only valid timeline entries and caps the history', () => {
    const entries = Array.from({ length: 7 }, (_, index) => ({
      label: `Action ${index}`,
      at: new Date(Date.UTC(2026, 7, 1, 12, index)).toISOString(),
    }));
    const storage = createStorage({
      'aegis-sentinel-timeline': JSON.stringify([...entries, { label: '', at: 'invalid' }]),
    });

    expect(loadSentinelTimeline(storage)).toEqual(entries.slice(0, 5));
  });

  it('falls back to an empty timeline for corrupt or blocked storage', () => {
    expect(loadSentinelTimeline(createStorage({ 'aegis-sentinel-timeline': '{broken' }))).toEqual([]);

    const blocked: StorageLike = {
      getItem: () => { throw new DOMException('Blocked', 'SecurityError'); },
      setItem: () => { throw new DOMException('Blocked', 'SecurityError'); },
      removeItem: () => { throw new DOMException('Blocked', 'SecurityError'); },
    };
    expect(loadSentinelTimeline(blocked)).toEqual([]);
    expect(saveSentinelTimeline([], blocked)).toBe(false);
  });

  it('persists a normalized timeline without throwing', () => {
    const storage = createStorage();
    const entries = [{ label: 'Intel feed opened', at: '2026-08-01T22:00:00.000Z' }];

    expect(saveSentinelTimeline(entries, storage)).toBe(true);
    expect(loadSentinelTimeline(storage)).toEqual(entries);
  });

  it('prepends deterministic entries and ignores blank labels', () => {
    const existing = [{ label: 'Markets board focused', at: '2026-08-01T21:00:00.000Z' }];
    const now = new Date('2026-08-01T22:00:00.000Z');

    expect(prependSentinelTimelineEntry(existing, ' Intel feed opened ', now)).toEqual([
      { label: 'Intel feed opened', at: now.toISOString() },
      ...existing,
    ]);
    expect(prependSentinelTimelineEntry(existing, '   ', now)).toEqual(normalizeSentinelTimeline(existing));
  });
});
