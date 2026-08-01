'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordinate } from '@/lib/routing-shell';
import type { NormalizedRouteIncident } from '@/lib/tomtom-route-incidents';
import { selectPrimaryRouteIncident, type RankedRouteIncident } from '@/lib/route-incident-priority';

export type LiveRouteIncidentState = {
  status: 'idle' | 'loading' | 'live' | 'unavailable';
  configured?: boolean;
  incident: RankedRouteIncident | null;
  checkedAt: string | null;
  stale: boolean;
};

export const LIVE_ROUTE_INCIDENT_REFRESH_MS = 90_000;

const IDLE_ROUTE_INCIDENT_STATE: LiveRouteIncidentState = {
  status: 'idle',
  incident: null,
  checkedAt: null,
  stale: false,
};

export function buildRouteIncidentRequestUrl(origin: Coordinate, destination: Coordinate) {
  const params = new URLSearchParams({
    fromLat: String(origin.lat),
    fromLng: String(origin.lng),
    toLat: String(destination.lat),
    toLng: String(destination.lng),
    paddingKm: '2.5',
    limit: '40',
  });
  return `/api/traffic/incidents?${params.toString()}`;
}

export function selectLiveRouteIncident({
  incidents,
  route,
  currentLocation,
  dismissedIncidentIds,
}: {
  incidents: NormalizedRouteIncident[];
  route: [number, number][];
  currentLocation: Coordinate;
  dismissedIncidentIds: ReadonlySet<string>;
}) {
  return selectPrimaryRouteIncident({
    incidents: incidents.filter((incident) => !dismissedIncidentIds.has(incident.id)),
    route,
    currentLocation,
  });
}

export function useLiveRouteIncidents({
  enabled,
  route,
  currentLocation,
  destination,
}: {
  enabled: boolean;
  route: [number, number][];
  currentLocation: Coordinate | null;
  destination: Coordinate | null;
}) {
  const [state, setState] = useState<LiveRouteIncidentState>(IDLE_ROUTE_INCIDENT_STATE);
  const dismissedIncidentIdsRef = useRef(new Set<string>());
  const requestSequenceRef = useRef(0);
  const canMonitorRoute = enabled && currentLocation !== null && destination !== null && route.length >= 2;

  const dismissIncident = useCallback((incidentId: string) => {
    dismissedIncidentIdsRef.current.add(incidentId);
    setState((current) => current.incident?.id === incidentId
      ? { ...current, incident: null }
      : current);
  }, []);

  useEffect(() => {
    if (!canMonitorRoute || !currentLocation || !destination) return;

    let active = true;
    let controller: AbortController | null = null;

    const refresh = async () => {
      const sequence = ++requestSequenceRef.current;
      controller?.abort();
      controller = new AbortController();
      setState((current) => ({ ...current, status: current.checkedAt ? current.status : 'loading' }));

      try {
        const response = await fetch(buildRouteIncidentRequestUrl(currentLocation, destination), {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json() as {
          status?: string;
          configured?: boolean;
          incidents?: NormalizedRouteIncident[];
          checkedAt?: string;
          stale?: boolean;
        };
        if (!active || sequence !== requestSequenceRef.current) return;

        const incidents = Array.isArray(payload.incidents) ? payload.incidents : [];
        setState({
          status: response.ok && payload.status === 'live' ? 'live' : 'unavailable',
          configured: payload.configured,
          incident: selectLiveRouteIncident({
            incidents,
            route,
            currentLocation,
            dismissedIncidentIds: dismissedIncidentIdsRef.current,
          }),
          checkedAt: payload.checkedAt ?? new Date().toISOString(),
          stale: payload.stale === true,
        });
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        if (!active || sequence !== requestSequenceRef.current) return;
        setState((current) => ({
          ...current,
          status: 'unavailable',
          incident: current.incident,
          stale: current.incident !== null,
        }));
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), LIVE_ROUTE_INCIDENT_REFRESH_MS);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, [canMonitorRoute, route, currentLocation, destination]);

  return {
    ...(canMonitorRoute ? state : IDLE_ROUTE_INCIDENT_STATE),
    dismissIncident,
  };
}