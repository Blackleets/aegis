export type BrowserCapability =
  | 'geolocation'
  | 'notifications'
  | 'speech'
  | 'storage'
  | 'vibration'
  | 'wakeLock';

export type BrowserCapabilityStatus = 'available' | 'unavailable' | 'blocked' | 'failed';

export type BrowserCapabilityResult<T = void> = {
  capability: BrowserCapability;
  status: BrowserCapabilityStatus;
  value?: T;
};

export function getBrowserCapabilityStatus(capability: BrowserCapability): BrowserCapabilityStatus {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unavailable';

  switch (capability) {
    case 'geolocation':
      return navigator.geolocation ? 'available' : 'unavailable';
    case 'notifications':
      if (!('Notification' in window)) return 'unavailable';
      return window.Notification.permission === 'denied' ? 'blocked' : 'available';
    case 'speech':
      return 'speechSynthesis' in window && typeof window.speechSynthesis?.speak === 'function'
        ? 'available'
        : 'unavailable';
    case 'storage':
      return 'localStorage' in window ? 'available' : 'unavailable';
    case 'vibration':
      return typeof navigator.vibrate === 'function' ? 'available' : 'unavailable';
    case 'wakeLock':
      return 'wakeLock' in navigator ? 'available' : 'unavailable';
  }
}

export function safeVibrate(
  pattern: number | number[],
  vibrate?: ((pattern: number | number[]) => boolean) | null,
): BrowserCapabilityResult<boolean> {
  const vibration = vibrate
    ?? (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
      ? navigator.vibrate.bind(navigator)
      : null);

  if (!vibration) return { capability: 'vibration', status: 'unavailable', value: false };

  try {
    const value = vibration(pattern);
    return {
      capability: 'vibration',
      status: value ? 'available' : 'blocked',
      value,
    };
  } catch {
    return { capability: 'vibration', status: 'failed', value: false };
  }
}
