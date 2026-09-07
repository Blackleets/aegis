'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  selectWorldPulseMapPins,
  type WorldPulseMapPinInput,
} from '@/lib/world-pulse-map-pins';

/**
 * Dashboard-owned World Pulse pin state so mercator pins survive mobile drawer unmount.
 * Panel only reports filtered pin inputs + toggle; selection stays here (fail-closed).
 */
export function useWorldPulseMapPins() {
  const [pinSource, setPinSource] = useState<WorldPulseMapPinInput[]>([]);
  const [pinsEnabled, setPinsEnabled] = useState(true);

  const worldPulsePins = useMemo(
    () => selectWorldPulseMapPins(pinSource, { enabled: pinsEnabled }),
    [pinSource, pinsEnabled],
  );

  const onMapPinSourceChange = useCallback((inputs: WorldPulseMapPinInput[]) => {
    setPinSource(Array.isArray(inputs) ? inputs : []);
  }, []);

  return {
    worldPulsePins,
    mapPinsEnabled: pinsEnabled,
    onMapPinsEnabledChange: setPinsEnabled,
    onMapPinSourceChange,
  } as const;
}
