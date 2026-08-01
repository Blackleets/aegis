import type { BrowserCapabilityResult } from './browser-capabilities';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function safeStorageGet(
  key: string,
  storage?: StorageLike | null,
): BrowserCapabilityResult<string | null> {
  const target = resolveStorage(storage);
  if (!target) return { capability: 'storage', status: 'unavailable', value: null };

  try {
    return { capability: 'storage', status: 'available', value: target.getItem(key) };
  } catch {
    return { capability: 'storage', status: 'blocked', value: null };
  }
}

export function safeStorageSet(
  key: string,
  value: string,
  storage?: StorageLike | null,
): BrowserCapabilityResult<boolean> {
  const target = resolveStorage(storage);
  if (!target) return { capability: 'storage', status: 'unavailable', value: false };

  try {
    target.setItem(key, value);
    return { capability: 'storage', status: 'available', value: true };
  } catch {
    return { capability: 'storage', status: 'failed', value: false };
  }
}

export function safeStorageRemove(
  key: string,
  storage?: StorageLike | null,
): BrowserCapabilityResult<boolean> {
  const target = resolveStorage(storage);
  if (!target) return { capability: 'storage', status: 'unavailable', value: false };

  try {
    target.removeItem(key);
    return { capability: 'storage', status: 'available', value: true };
  } catch {
    return { capability: 'storage', status: 'failed', value: false };
  }
}

export function safeStorageGetJson<T>(
  key: string,
  fallback: T,
  storage?: StorageLike | null,
): BrowserCapabilityResult<T> {
  const result = safeStorageGet(key, storage);
  if (result.status !== 'available' || !result.value) {
    return { capability: 'storage', status: result.status, value: fallback };
  }

  try {
    return {
      capability: 'storage',
      status: 'available',
      value: JSON.parse(result.value) as T,
    };
  } catch {
    return { capability: 'storage', status: 'failed', value: fallback };
  }
}
