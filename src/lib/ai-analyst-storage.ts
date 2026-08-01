import type { BrowserCapabilityResult } from './browser-capabilities';
import {
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
  type StorageLike,
} from './safe-browser-storage';

export type AnalystMode = 'aegis' | 'hermes';

const ANALYST_MODE_KEY = 'aegis-analyst-mode';
const PRIMARY_API_KEY = 'worldwatch-ai-key';
const LEGACY_API_KEY = 'aegis-gemini-key';

export function loadAnalystMode(storage?: StorageLike | null): AnalystMode {
  const value = safeStorageGet(ANALYST_MODE_KEY, storage).value;
  return value === 'hermes' ? 'hermes' : 'aegis';
}

export function saveAnalystMode(
  mode: AnalystMode,
  storage?: StorageLike | null,
): BrowserCapabilityResult<boolean> {
  return safeStorageSet(ANALYST_MODE_KEY, mode, storage);
}

export function loadAnalystApiKey(storage?: StorageLike | null): string {
  const primary = safeStorageGet(PRIMARY_API_KEY, storage).value?.trim();
  if (primary) return primary;

  return safeStorageGet(LEGACY_API_KEY, storage).value?.trim() ?? '';
}

export function saveAnalystApiKey(
  rawKey: string,
  storage?: StorageLike | null,
): BrowserCapabilityResult<boolean> {
  const key = rawKey.trim();
  if (!key) {
    return { capability: 'storage', status: 'blocked', value: false };
  }

  const write = safeStorageSet(PRIMARY_API_KEY, key, storage);
  if (write.status === 'available') {
    safeStorageRemove(LEGACY_API_KEY, storage);
  }
  return write;
}

export function clearAnalystApiKey(
  storage?: StorageLike | null,
): BrowserCapabilityResult<boolean> {
  const primary = safeStorageRemove(PRIMARY_API_KEY, storage);
  const legacy = safeStorageRemove(LEGACY_API_KEY, storage);

  if (primary.status === 'available' && legacy.status === 'available') {
    return { capability: 'storage', status: 'available', value: true };
  }

  const status = primary.status !== 'available' ? primary.status : legacy.status;
  return { capability: 'storage', status, value: false };
}
