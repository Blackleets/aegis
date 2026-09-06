import type { LocalWeather } from '@/hooks/useLocalWeather';

/** Real-data day phase for subtle sky wash — never invents weather. */
export type AmbientSkyPhase = 'dawn' | 'day' | 'golden' | 'dusk' | 'night';

/** Soft weather mood from live Open-Meteo icon — no fake conditions. */
export type AmbientWeatherMood = 'clear' | 'overcast' | 'precip' | 'storm';

export type AmbientSky = {
  phase: AmbientSkyPhase;
  mood: AmbientWeatherMood;
  /** soft | medium — wash strength; always soft during navigation */
  intensity: 'soft' | 'medium';
  /** true when Open-Meteo reports daytime */
  isDay: boolean;
};

const GOLDEN_WINDOW_MS = 45 * 60 * 1000;
const DAWN_DUSK_WINDOW_MS = 50 * 60 * 1000;

function parseTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function getAmbientWeatherMood(icon: LocalWeather['icon']): AmbientWeatherMood {
  switch (icon) {
    case 'storm':
      return 'storm';
    case 'rain':
    case 'snow':
    case 'fog':
      return 'precip';
    case 'cloud':
      return 'overcast';
    case 'sun':
    case 'moon':
    default:
      return 'clear';
  }
}

/**
 * Derive ambient sky phase from live Open-Meteo fields only.
 * Prefer sunrise/sunset windows when present; fall back to isDay.
 */
export function getAmbientSky(
  weather: LocalWeather | null,
  navigationActive: boolean,
  nowMs: number = Date.now(),
): AmbientSky | null {
  if (!weather) return null;

  const sunrise = parseTime(weather.sunrise);
  const sunset = parseTime(weather.sunset);
  let phase: AmbientSkyPhase;

  if (sunrise !== null && sunset !== null) {
    const sinceRise = nowMs - sunrise;
    const untilSet = sunset - nowMs;
    const sinceSet = nowMs - sunset;
    const untilRise = sunrise - nowMs;

    if (sinceRise >= 0 && sinceRise < DAWN_DUSK_WINDOW_MS) {
      phase = 'dawn';
    } else if (untilSet >= 0 && untilSet < GOLDEN_WINDOW_MS) {
      phase = 'golden';
    } else if (untilSet >= 0 && untilSet < DAWN_DUSK_WINDOW_MS) {
      phase = 'dusk';
    } else if (sinceSet >= 0 && sinceSet < DAWN_DUSK_WINDOW_MS) {
      phase = 'dusk';
    } else if (weather.isDay && untilSet > 0 && sinceRise > 0) {
      phase = 'day';
    } else if (!weather.isDay) {
      if (untilRise > 0 && untilRise < DAWN_DUSK_WINDOW_MS) {
        phase = 'dawn';
      } else {
        phase = 'night';
      }
    } else {
      phase = weather.isDay ? 'day' : 'night';
    }
  } else {
    phase = weather.isDay ? 'day' : 'night';
  }

  return {
    phase,
    mood: getAmbientWeatherMood(weather.icon),
    intensity: navigationActive ? 'soft' : 'medium',
    isDay: weather.isDay,
  };
}
