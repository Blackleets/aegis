import { describe, expect, it, vi } from 'vitest';
import { requestNavigationNotificationPermission } from './navigation-notifications';

describe('navigation notification permission', () => {
  it('reports unsupported browsers without throwing', async () => {
    await expect(requestNavigationNotificationPermission(null)).resolves.toBe('unsupported');
  });

  it('does not repeat a permission request after a decision', async () => {
    const requestPermission = vi.fn();
    const api = { permission: 'granted' as const, requestPermission };

    await expect(requestNavigationNotificationPermission(api)).resolves.toBe('granted');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('requests permission once while the state is default', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    const api = { permission: 'default' as const, requestPermission };

    await expect(requestNavigationNotificationPermission(api)).resolves.toBe('granted');
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('keeps navigation safe when the browser request fails', async () => {
    const requestPermission = vi.fn().mockRejectedValue(new Error('blocked'));
    const api = { permission: 'default' as const, requestPermission };

    await expect(requestNavigationNotificationPermission(api)).resolves.toBe('default');
  });
});
