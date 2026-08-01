import type { LiveRouteIncidentState } from '@/hooks/useLiveRouteIncidents';
import { presentRouteIncident, type RouteIncidentPresentation } from '@/lib/route-incident-presentation';

export type LiveRouteIncidentCockpitModel = RouteIncidentPresentation & {
  incidentId: string;
  severity: 'info' | 'warning' | 'critical';
};

export function buildLiveRouteIncidentCockpitModel(
  state: Pick<LiveRouteIncidentState, 'status' | 'incident' | 'stale'>,
): LiveRouteIncidentCockpitModel | null {
  if (!state.incident) return null;
  if (state.status !== 'live' && !state.stale) return null;

  return {
    incidentId: state.incident.id,
    severity: state.incident.severity,
    ...presentRouteIncident(state.incident, { stale: state.stale }),
  };
}
