import type { RouteAlertSeverity } from './route-alert-priority';

export type RouteAlertChannel = 'earthquake' | 'context';

export function getRouteAlertHapticPattern(
  severity: RouteAlertSeverity,
  channel: RouteAlertChannel,
): number[] {
  if (severity === 'critical') {
    return channel === 'earthquake'
      ? [220, 90, 220, 90, 320]
      : [220, 100, 300];
  }

  if (severity === 'warning') {
    return channel === 'earthquake'
      ? [150, 80, 150]
      : [140, 90, 140];
  }

  return [80];
}

export function vibrateForRouteAlert(
  severity: RouteAlertSeverity,
  channel: RouteAlertChannel,
  vibrate?: ((pattern: number | number[]) => boolean) | null,
): boolean {
  const vibration = vibrate
    ?? (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
      ? navigator.vibrate.bind(navigator)
      : null);

  if (!vibration) return false;

  try {
    return vibration(getRouteAlertHapticPattern(severity, channel));
  } catch {
    return false;
  }
}
