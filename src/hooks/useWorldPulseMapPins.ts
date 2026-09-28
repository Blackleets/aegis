'use client';

import { useMemo, useState } from 'react';
import { selectWorldPulseMapPins } from '@/lib/world-pulse-map-pins';
import {
  filterWorldPulseEventsByKind,
  type WorldPulseClientEvent,
  type WorldPulseKindFilter,
} from '@/lib/world-pulse-client';

/**
 * Dashboard-owned World Pulse pin state, derived from the shared feed so pins render on the
 * idle map without opening any panel. The panel only drives the toggle + kind filter (fail-closed).
 */
export function useWorldPulseMapPins(events: WorldPulseClientEvent[] | null | undefined) {
  const [pinsEnabled, setPinsEnabled] = useState(true);
  const [kindFilter, setKindFilter] = useState<WorldPulseKindFilter>('all');

  const worldPulsePins = useMemo(
    () => selectWorldPulseMapPins(
      filterWorldPulseEventsByKind(events, kindFilter).map((event) => ({
        id: event.id,
        lat: event.lat,
        lng: event.lng,
        severity: event.severity,
        title: event.title,
        kind: event.kind,
      })),
      { enabled: pinsEnabled },
    ),
    [events, kindFilter, pinsEnabled],
  );

  return {
    worldPulsePins,
    mapPinsEnabled: pinsEnabled,
    onMapPinsEnabledChange: setPinsEnabled,
    kindFilter,
    onKindFilterChange: setKindFilter,
  } as const;
}
