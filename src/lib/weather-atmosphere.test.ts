import { describe, expect, it } from 'vitest';

import type { LocalWeather } from '@/hooks/useLocalWeather';
import { getWeatherAtmosphere } from './weather-atmosphere';

function weather(icon: LocalWeather['icon']): LocalWeather {
  return {
    source: 'Open-Meteo',
    place: 'Madrid',
    timezone: 'Europe/Madrid',
    observedAt: '2026-07-30T18:00:00Z',
    temperatureC: 24,
    weatherCode: 3,
    isDay: true,
    condition: 'Nublado',
    icon,
    nextRainMinutes: null,
    sunrise: null,
    sunset: null,
  };
}

describe('weather atmosphere policy', () => {
  it('never invents atmosphere for clear weather', () => {
    expect(getWeatherAtmosphere(weather('sun'), false)).toBeNull();
    expect(getWeatherAtmosphere(weather('moon'), false)).toBeNull();
  });

  it('uses richer effects only when live weather supports them', () => {
    expect(getWeatherAtmosphere(weather('storm'), false)).toEqual({
      mode: 'storm',
      cloudCount: 3,
      intensity: 'strong',
    });
  });

  it('reduces the effect while navigating', () => {
    expect(getWeatherAtmosphere(weather('rain'), true)).toEqual({
      mode: 'cloud',
      cloudCount: 1,
      intensity: 'soft',
    });
  });
});
