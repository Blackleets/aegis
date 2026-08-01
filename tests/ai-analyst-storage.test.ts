import { describe, expect, it, vi } from 'vitest';
import {
  clearAnalystApiKey,
  loadAnalystApiKey,
  loadAnalystMode,
  saveAnalystApiKey,
  saveAnalystMode,
} from '../src/lib/ai-analyst-storage';
import type { StorageLike } from '../src/lib/safe-browser-storage';

function createStorage(seed: Record<string, string> = {}): StorageLike {
  const values = new Map(Object.entries(seed));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

describe('AI analyst storage adapter', () => {
  it('accepts only supported analyst modes', () => {
    expect(loadAnalystMode(createStorage({ 'aegis-analyst-mode': 'hermes' }))).toBe('hermes');
    expect(loadAnalystMode(createStorage({ 'aegis-analyst-mode': 'invalid' }))).toBe('aegis');
    expect(saveAnalystMode('hermes', createStorage())).toMatchObject({ status: 'available', value: true });
  });

  it('prefers the primary API key and trims stored values', () => {
    const storage = createStorage({
      'worldwatch-ai-key': '  primary-key  ',
      'aegis-gemini-key': 'legacy-key',
    });
    expect(loadAnalystApiKey(storage)).toBe('primary-key');
  });

  it('falls back to the legacy key and migrates it on save', () => {
    const storage = createStorage({ 'aegis-gemini-key': 'legacy-key' });
    expect(loadAnalystApiKey(storage)).toBe('legacy-key');

    expect(saveAnalystApiKey('  new-key  ', storage)).toMatchObject({ status: 'available', value: true });
    expect(storage.setItem).toHaveBeenCalledWith('worldwatch-ai-key', 'new-key');
    expect(storage.removeItem).toHaveBeenCalledWith('aegis-gemini-key');
  });

  it('rejects blank keys without writing', () => {
    const storage = createStorage();
    expect(saveAnalystApiKey('   ', storage)).toMatchObject({ status: 'blocked', value: false });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('clears both current and legacy keys', () => {
    const storage = createStorage({
      'worldwatch-ai-key': 'primary',
      'aegis-gemini-key': 'legacy',
    });
    expect(clearAnalystApiKey(storage)).toMatchObject({ status: 'available', value: true });
    expect(loadAnalystApiKey(storage)).toBe('');
  });

  it('falls back safely when storage is unavailable', () => {
    expect(loadAnalystMode(null)).toBe('aegis');
    expect(loadAnalystApiKey(null)).toBe('');
    expect(saveAnalystMode('hermes', null)).toMatchObject({ status: 'unavailable', value: false });
  });
});
