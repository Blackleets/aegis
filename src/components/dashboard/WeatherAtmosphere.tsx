'use client';

import { memo, useMemo } from 'react';

import type { LocalWeather } from '@/hooks/useLocalWeather';
import { getWeatherAtmosphere } from '@/lib/weather-atmosphere';

type WeatherAtmosphereProps = {
  weather: LocalWeather | null;
  navigationActive: boolean;
  visible: boolean;
};

function WeatherAtmosphere({ weather, navigationActive, visible }: WeatherAtmosphereProps) {
  const atmosphere = useMemo(
    () => visible ? getWeatherAtmosphere(weather, navigationActive) : null,
    [navigationActive, visible, weather],
  );

  if (!atmosphere) return null;

  return (
    <div
      className={`weather-atmosphere weather-atmosphere--${atmosphere.mode} weather-atmosphere--${atmosphere.intensity} ${
        navigationActive ? 'weather-atmosphere--navigation' : ''
      }`}
      aria-hidden="true"
      data-source={weather?.source}
    >
      {Array.from({ length: atmosphere.cloudCount }, (_, index) => (
        <div className={`weather-cloud weather-cloud--${index + 1}`} key={index}>
          <span />
          <span />
          <span />
        </div>
      ))}
      {(atmosphere.mode === 'rain' || atmosphere.mode === 'storm') && <div className="weather-precipitation weather-rain" />}
      {atmosphere.mode === 'snow' && <div className="weather-precipitation weather-snow" />}
      {atmosphere.mode === 'fog' && <div className="weather-fog" />}
      {atmosphere.mode === 'storm' && <div className="weather-lightning" />}
    </div>
  );
}

export default memo(WeatherAtmosphere);
