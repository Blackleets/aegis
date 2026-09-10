'use client';

import { memo, useEffect, useMemo } from 'react';

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

  useEffect(() => {
    const root = document.documentElement;
    if (!sky) {
      root.removeAttribute('data-ambient-phase');
      root.removeAttribute('data-ambient-mood');
      return;
    }
    root.setAttribute('data-ambient-phase', sky.phase);
    root.setAttribute('data-ambient-mood', sky.mood);
    return () => {
      root.removeAttribute('data-ambient-phase');
      root.removeAttribute('data-ambient-mood');
    };
  }, [sky]);

  if (!sky) return null;

  return (
    <div
      className={`ambient-sky ambient-sky--${sky.phase} ambient-sky--mood-${sky.mood} ambient-sky--${sky.intensity}${
        navigationActive ? ' ambient-sky--navigation' : ''
      }`}
      aria-hidden="true"
      data-phase={sky.phase}
      data-mood={sky.mood}
      data-source={weather?.source}
    >
      {/* Soft horizon band only — no particles / stars */}
      <div className="ambient-sky__horizon" />
    </div>
  );
}

export default memo(AmbientSky);
