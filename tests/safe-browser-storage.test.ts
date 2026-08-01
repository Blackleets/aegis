import { describe, expect, it, vi } from 'vitest';
import {
  safeStorageGet,
  safeStorageGetJson,
  safeStorageRemove,
  safeStorageSet,
  type StorageLike,
} from '../src/lib/safe-browser-storage';

function createStorage(seed: Record<string, string> = {}): StorageLike {
  const values = new Map(Object.entries(seed));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
}

describe('safe browser storage', () => {
  it('reads, writes and removes without changing the storage contract', () => {
    const storage = createStorage();

    expect(safeStorageSet('mode', 'hermes', storage)).toMatchObject({ status: 'available', value: true });
    expect(safeStorageGet('mode', storage)).toMatchObject({ status: 'available', value: 'hermes' });
    expect(safeStorageRemove('mode', storage)).toMatchObject({ status: 'available', value: true });
    expect(safeStorageGet('mode', storage).value).toBeNull();
  });

  it('returns unavailable when storage cannot be resolved', () => {
    expect(safeStorageGet('mode', null)).toMatchObject({ status: 'unavailable', value: null });
    expect(safeStorageSet('mode', 'aegis', null)).toMatchObject({ status: 'unavailable', value: false });
  });

  it('contains private-mode and quota failures', () => {
    const storage: StorageLike = {
      getItem: () => { throw new DOMException('Blocked', 'SecurityError'); },
      setItem: () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); },
      removeItem: () => { throw new DOMException('Blocked', 'SecurityError'); },
    };

    expect(safeStorageGet('key', storage)).toMatchObject({ status: 'blocked', value: null });
    expect(safeStorageSet('key', 'value', storage)).toMatchObject({ status: 'failed', value: false });
    expect(safeStorageRemove('key', storage)).toMatchObject({ status: 'failed', value: false });
  });

  it('falls back safely when stored JSON is corrupt', () => {
    const fallback = { enabled: false };
    const storage = createStorage({ preferences: '{broken-json' });

    expect(safeStorageGetJson('preferences', fallback, storage)).toEqual({
      capability: 'storage',
      status: 'failed',
      value: fallback,
    });
  });

  it('parses valid JSON values', () => {
    const storage = createStorage({ preferences: '{"enabled":true}' });

    expect(safeStorageGetJson('preferences', { enabled: false }, storage)).toEqual({
      capability: 'storage',
      status: 'available',
      value: { enabled: true },
    });
  });
});
