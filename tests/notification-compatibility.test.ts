import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { MOBILE_NOTIFICATION_GUARD_SCRIPT } from '../src/lib/notification-compatibility';

function runGuard({ mobile }: { mobile: boolean }) {
  function NativeNotification() {
    throw new TypeError("Failed to construct 'Notification': Illegal constructor");
  }
  Object.defineProperty(NativeNotification, 'permission', { value: 'granted' });
  Object.defineProperty(NativeNotification, 'requestPermission', {
    value: async () => 'granted',
  });

  const windowObject = { Notification: NativeNotification };
  const context = vm.createContext({
    window: windowObject,
    navigator: {
      userAgent: mobile ? 'Mozilla/5.0 (Linux; Android 16; Mobile)' : 'Mozilla/5.0 (X11; Linux x86_64)',
      userAgentData: { mobile },
    },
  });

  vm.runInContext(MOBILE_NOTIFICATION_GUARD_SCRIPT, context);
  return windowObject.Notification as typeof Notification;
}

describe('mobile Notification compatibility guard', () => {
  it('replaces the illegal mobile constructor with a safe no-op', async () => {
    const NotificationConstructor = runGuard({ mobile: true });

    expect(() => new NotificationConstructor('AEGIS alert')).not.toThrow();
    expect(NotificationConstructor.permission).toBe('granted');
    await expect(NotificationConstructor.requestPermission()).resolves.toBe('granted');
  });

  it('leaves desktop Notification untouched', () => {
    const NotificationConstructor = runGuard({ mobile: false });

    expect(() => new NotificationConstructor('AEGIS alert')).toThrow('Illegal constructor');
  });
});
