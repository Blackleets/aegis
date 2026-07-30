import type { LocalWeather } from '@/hooks/useLocalWeather';

export type WeatherAtmosphereMode = 'cloud' | 'fog' | 'rain' | 'snow' | 'storm';

export type WeatherAtmosphere = {
  mode: WeatherAtmosphereMode;
  cloudCount: 1 | 2 | 3;
  intensity: 'soft' | 'medium' | 'strong';
};

export function getWeatherAtmosphere(
  weather: LocalWeather | null,
  navigationActive: boolean,
): WeatherAtmosphere | null {
  if (!weather || weather.icon === 'sun' || weather.icon === 'moon') return null;

  if (navigationActive) {
    return {
      mode: weather.icon === 'fog' ? 'fog' : 'cloud',
      cloudCount: 1,
      intensity: 'soft',
    };
  }

  switch (weather.icon) {
    case 'storm':
      return { mode: 'storm', cloudCount: 3, intensity: 'strong' };
    case 'rain':
      return { mode: 'rain', cloudCount: 3, intensity: 'medium' };
    case 'snow':
      return { mode: 'snow', cloudCount: 2, intensity: 'medium' };
    case 'fog':
      return { mode: 'fog', cloudCount: 1, intensity: 'medium' };
    case 'cloud':
      return { mode: 'cloud', cloudCount: 2, intensity: 'soft' };
  }
}
