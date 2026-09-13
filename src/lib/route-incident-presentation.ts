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

const CATEGORY_ACTIONS: Record<RankedRouteIncident['category'], string> = {
  unknown: 'Mantén precaución y reduce si hace falta',
  accident: 'Reduce y estate listo para detenerte',
  fog: 'Baja velocidad y aumenta distancia',
  dangerousConditions: 'Reduce y evita maniobras bruscas',
  rain: 'Reduce y aumenta la distancia de frenado',
  ice: 'Reduce mucho y evita frenar fuerte',
  jam: 'Anticipa frenada y evita cambios bruscos',
  laneClosed: 'Prepárate para cambiar de carril',
  roadClosed: 'Busca desvío o espera recalculo',
  roadWorks: 'Reduce y respeta el desvío temporal',
  wind: 'Sujeta el volante y reduce en exposiciones',
  flooding: 'No cruces agua profunda; busca alternativa',
  brokenDownVehicle: 'Cambia de carril con antelación',
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

function confidenceFromIncident(incident: RankedRouteIncident): 'low' | 'medium' | 'high' {
  if (incident.probability === 'certain') return 'high';
  if (incident.probability === 'probable') return 'medium';
  if (incident.reportCount !== null && incident.reportCount >= 3) return 'high';
  if (incident.reportCount !== null && incident.reportCount >= 1) return 'medium';
  if (incident.severity === 'critical') return 'medium';
  return 'low';
}

export type RouteIncidentPresentation = {
  eyebrow: string;
  title: string;
  detail: string;
  /** Glanceable driver action (Waze-style). */
  action: string;
  /** Provenance confidence for operator trust (Palantir-style). */
  confidence: 'low' | 'medium' | 'high';
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
    action: CATEGORY_ACTIONS[incident.category],
    confidence: confidenceFromIncident(incident),
    distanceLabel,
    delayLabel,
    critical: incident.severity === 'critical',
  };
}
