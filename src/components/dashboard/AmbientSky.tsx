'use client';

import { memo, useMemo } from 'react';

import type { LocalWeather } from '@/hooks/useLocalWeather';
import { getAmbientSky } from '@/lib/ambient-sky';

type AmbientSkyProps = {
  weather: LocalWeather | null;
  navigationActive: boolean;
  visible: boolean;
};

function AmbientSky({ weather, navigationActive, visible }: AmbientSkyProps) {
  const sky = useMemo(
    () => (visible ? getAmbientSky(weather, navigationActive) : null),
    [navigationActive, visible, weather],
  );

  if (!sky) return null;

  return (
    <div
      className={`ambient-sky ambient-sky--${sky.phase} ambient-sky--${sky.intensity}${
        navigationActive ? ' ambient-sky--navigation' : ''
      }`}
      aria-hidden="true"
      data-phase={sky.phase}
      data-source={weather?.source}
    />
  );
}

export default memo(AmbientSky);
