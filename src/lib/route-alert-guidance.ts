import type { RouteAlertSeverity } from './route-alert-priority';

export type RouteAlertPhase = 'ahead' | 'near' | 'now';

export type RouteAlertGuidance = {
  phase: RouteAlertPhase;
  label: string;
  etaSeconds: number | null;
  shouldSpeak: boolean;
};

type RouteAlertGuidanceInput = {
  distanceMeters: number;
  speedKmh: number | null;
  severity: RouteAlertSeverity;
};

const ROUTE_ALERT_PHASE_RANK: Record<RouteAlertPhase, number> = {
  ahead: 0,
  near: 1,
  now: 2,
};

export function getRouteAlertGuidance({
  distanceMeters,
  speedKmh,
  severity,
}: RouteAlertGuidanceInput): RouteAlertGuidance {
  const distance = Math.max(0, Math.round(distanceMeters));
  const effectiveSpeedKmh = speedKmh && speedKmh > 2 ? speedKmh : null;
  const metersPerSecond = effectiveSpeedKmh ? effectiveSpeedKmh / 3.6 : null;
  const etaSeconds = metersPerSecond ? Math.max(0, Math.round(distance / metersPerSecond)) : null;
  const criticalMultiplier = severity === 'critical' ? 1.35 : severity === 'warning' ? 1.15 : 1;
  const nearThreshold = Math.max(100, Math.min(900, (metersPerSecond ?? 6) * 18 * criticalMultiplier));
  const nowThreshold = Math.max(35, Math.min(220, (metersPerSecond ?? 4) * 5 * criticalMultiplier));

  if (distance <= nowThreshold) {
    return {
      phase: 'now',
      label: 'Ahora',
      etaSeconds,
      shouldSpeak: true,
    };
  }

  if (distance <= nearThreshold) {
    return {
      phase: 'near',
      label: etaSeconds !== null && etaSeconds < 60
        ? `En ${Math.max(5, Math.round(etaSeconds / 5) * 5)} s`
        : 'Muy cerca',
      etaSeconds,
      shouldSpeak: true,
    };
  }

  return {
    phase: 'ahead',
    label: etaSeconds !== null && etaSeconds < 3600
      ? `En ${Math.max(1, Math.round(etaSeconds / 60))} min`
      : 'Más adelante',
    etaSeconds,
    shouldSpeak: severity !== 'info',
  };
}

export function buildRouteAlertVoiceMessage({
  title,
  distanceMeters,
  guidance,
}: {
  title: string;
  distanceMeters: number;
  guidance: RouteAlertGuidance;
}) {
  const roundedDistance = distanceMeters < 1000
    ? `${Math.max(10, Math.round(distanceMeters / 10) * 10)} metros`
    : `${(distanceMeters / 1000).toFixed(1)} kilómetros`;

  if (guidance.phase === 'now') return `Atención ahora. ${title}.`;
  if (guidance.phase === 'near') return `En ${roundedDistance}, ${title}.`;
  return `Aviso AEGIS. ${title} a ${roundedDistance}.`;
}

export function shouldAnnounceRouteAlertPhase(
  announcedPhases: Set<string>,
  alertId: string,
  phase: RouteAlertPhase,
) {
  const requestedRank = ROUTE_ALERT_PHASE_RANK[phase];
  const alreadyAnnouncedAtSameOrLaterPhase = (Object.keys(ROUTE_ALERT_PHASE_RANK) as RouteAlertPhase[])
    .some((announcedPhase) => (
      ROUTE_ALERT_PHASE_RANK[announcedPhase] >= requestedRank
      && announcedPhases.has(`${alertId}:${announcedPhase}`)
    ));

  if (alreadyAnnouncedAtSameOrLaterPhase) return false;
  announcedPhases.add(`${alertId}:${phase}`);
  return true;
}
