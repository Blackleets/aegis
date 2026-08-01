import type { RankedRouteIncident } from '@/lib/route-incident-priority';

const CATEGORY_LABELS: Record<RankedRouteIncident['category'], string> = {
  unknown: 'Incidencia vial',
  accident: 'Accidente',
  fog: 'Niebla',
  dangerousConditions: 'Condiciones peligrosas',
  rain: 'Lluvia intensa',
  ice: 'Hielo en la vía',
  jam: 'Retención',
  laneClosed: 'Carril cerrado',
  roadClosed: 'Carretera cerrada',
  roadWorks: 'Obras',
  wind: 'Viento fuerte',
  flooding: 'Inundación',
  brokenDownVehicle: 'Vehículo averiado',
};

function formatDistance(distanceMeters: number) {
  if (distanceMeters >= 1000) return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10_000 ? 0 : 1)} km`;
  return `${Math.max(1, Math.round(distanceMeters))} m`;
}

function formatDelay(delaySeconds: number | null) {
  if (!delaySeconds || delaySeconds < 60) return null;
  const minutes = Math.max(1, Math.round(delaySeconds / 60));
  return `+${minutes} min`;
}

function routeReference(incident: RankedRouteIncident) {
  const road = incident.roadNumbers[0];
  if (road) return road;
  if (incident.from && incident.to) return `${incident.from} → ${incident.to}`;
  return incident.from || incident.to || null;
}

export type RouteIncidentPresentation = {
  eyebrow: string;
  title: string;
  detail: string;
  distanceLabel: string;
  delayLabel: string | null;
  critical: boolean;
};

export function presentRouteIncident(
  incident: RankedRouteIncident,
  { stale = false }: { stale?: boolean } = {},
): RouteIncidentPresentation {
  const categoryLabel = CATEGORY_LABELS[incident.category];
  const distanceLabel = formatDistance(incident.distanceAheadMeters);
  const delayLabel = formatDelay(incident.delaySeconds);
  const reference = routeReference(incident);
  const sourceLabel = stale ? 'TomTom · datos recientes' : 'TomTom live';
  const detailParts = [reference, delayLabel, incident.description !== categoryLabel ? incident.description : null]
    .filter((value): value is string => Boolean(value));

  return {
    eyebrow: `${categoryLabel} · ${sourceLabel}`,
    title: `${categoryLabel} a ${distanceLabel}`,
    detail: detailParts.join(' · ') || 'Incidencia confirmada en tu ruta',
    distanceLabel,
    delayLabel,
    critical: incident.severity === 'critical',
  };
}
