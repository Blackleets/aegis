import { describe, expect, it } from 'vitest';

import type { LocalWeather } from '@/hooks/useLocalWeather';
import { getAmbientSky } from './ambient-sky';

function weather(partial: Partial<LocalWeather>): LocalWeather {
  return {
    source: 'Open-Meteo',
    place: 'Madrid',
    timezone: 'Europe/Madrid',
    observedAt: '2026-09-06T12:00:00Z',
    temperatureC: 22,
    weatherCode: 0,
    isDay: true,
    condition: 'Despejado',
    icon: 'sun',
    nextRainMinutes: null,
    sunrise: '2026-09-06T05:30:00Z',
    sunset: '2026-09-06T18:45:00Z',
    ...partial,
  };
}

describe('ambient sky phase', () => {
  it('returns null without live weather', () => {
    expect(getAmbientSky(null, false)).toBeNull();
  });

  it('uses isDay when sun times missing', () => {
    expect(getAmbientSky(weather({ sunrise: null, sunset: null, isDay: true }), false)?.phase).toBe('day');
    expect(getAmbientSky(weather({ sunrise: null, sunset: null, isDay: false, icon: 'moon' }), false)?.phase).toBe('night');
  });

  it('marks dawn shortly after sunrise', () => {
    const sky = getAmbientSky(
      weather({ isDay: true }),
      false,
      Date.parse('2026-09-06T05:45:00Z'),
    );
    expect(sky?.phase).toBe('dawn');
  });

  it('marks golden near sunset', () => {
    const sky = getAmbientSky(
      weather({ isDay: true }),
      false,
      Date.parse('2026-09-06T18:20:00Z'),
    );
    expect(sky?.phase).toBe('golden');
  });

  it('marks night after dusk window', () => {
    const sky = getAmbientSky(
      weather({ isDay: false, icon: 'moon' }),
      false,
      Date.parse('2026-09-06T21:00:00Z'),
    );
    expect(sky?.phase).toBe('night');
  });

  it('softens intensity while navigating', () => {
    expect(getAmbientSky(weather({}), true)?.intensity).toBe('soft');
    expect(getAmbientSky(weather({}), false)?.intensity).toBe('medium');
  });
});
