import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { MOBILE_NOTIFICATION_GUARD_SCRIPT } from '../src/lib/notification-compatibility';

function runGuard(storage: Storage) {
  const windowObject = { localStorage: storage };
  const context = vm.createContext({
    window: windowObject,
    navigator: {
      userAgent: 'Mozilla/5.0 (Linux; Android 16; Mobile)',
      userAgentData: { mobile: true },
    },
    Object,
  });

  vm.runInContext(MOBILE_NOTIFICATION_GUARD_SCRIPT, context);
  return windowObject.localStorage;
}

describe('pre-hydration localStorage compatibility guard', () => {
  it('contains read, write and remove failures', () => {
    class ThrowingStorage {
      getItem() { throw new DOMException('Blocked', 'SecurityError'); }
      setItem() { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }
      removeItem() { throw new DOMException('Blocked', 'SecurityError'); }
    }

    const storage = runGuard(new ThrowingStorage() as unknown as Storage);

    expect(() => storage.getItem('aegis')).not.toThrow();
    expect(storage.getItem('aegis')).toBeNull();
    expect(() => storage.setItem('aegis', '1')).not.toThrow();
    expect(() => storage.removeItem('aegis')).not.toThrow();
  });

  it('preserves working storage behavior', () => {
    const values = new Map<string, string>();
    class WorkingStorage {
      getItem(key: string) { return values.get(key) ?? null; }
      setItem(key: string, value: string) { values.set(key, value); }
      removeItem(key: string) { values.delete(key); }
    }

    const storage = runGuard(new WorkingStorage() as unknown as Storage);
    storage.setItem('mode', 'hermes');

    expect(storage.getItem('mode')).toBe('hermes');
    storage.removeItem('mode');
    expect(storage.getItem('mode')).toBeNull();
  });

  it('installs the guard only once per storage prototype', () => {
    const getItem = vi.fn(() => null);
    class WorkingStorage {
      getItem(key: string) { return getItem(key); }
      setItem() {}
      removeItem() {}
    }

    const storage = new WorkingStorage() as unknown as Storage;
    runGuard(storage);
    runGuard(storage);

    expect(storage.getItem('mode')).toBeNull();
    expect(getItem).toHaveBeenCalledOnce();
  });
});
