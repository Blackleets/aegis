export const MOBILE_NOTIFICATION_GUARD_SCRIPT = String.raw`
(() => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  const NativeNotification = window.Notification;
  const isMobile = Boolean(
    navigator.userAgentData?.mobile
    || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),
  );

  if (!isMobile || typeof NativeNotification !== 'function') return;

  function SafeMobileNotification() {
    return {
      close() {},
      onclick: null,
      onshow: null,
      onerror: null,
      onclose: null,
    };
  }

  Object.defineProperty(SafeMobileNotification, 'permission', {
    configurable: true,
    get: () => NativeNotification.permission,
  });

  if (typeof NativeNotification.requestPermission === 'function') {
    SafeMobileNotification.requestPermission = NativeNotification.requestPermission.bind(NativeNotification);
  }

  window.Notification = SafeMobileNotification;
})();
`;
