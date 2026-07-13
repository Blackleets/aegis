export type NavigationNotificationPermission = NotificationPermission | 'unsupported';

type NotificationPermissionApi = {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
};

export async function requestNavigationNotificationPermission(
  notificationApi?: NotificationPermissionApi | null,
): Promise<NavigationNotificationPermission> {
  const api = notificationApi
    ?? (typeof window !== 'undefined' && 'Notification' in window ? window.Notification : null);

  if (!api) return 'unsupported';
  if (api.permission !== 'default') return api.permission;

  try {
    return await api.requestPermission();
  } catch {
    return api.permission;
  }
}
