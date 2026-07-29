import { describe, expect, it } from 'vitest';

import { describeWeatherCode, findNextRainMinutes } from '../src/lib/local-weather';

describe('local weather', () => {
  it('uses a day or night clear-sky icon from real is_day telemetry', () => {
    expect(describeWeatherCode(0, true)).toEqual({ label: 'Despejado', icon: 'sun' });
    expect(describeWeatherCode(0, false)).toEqual({ label: 'Despejado', icon: 'moon' });
  });

  it('maps hazardous weather codes without inventing a condition', () => {
    expect(describeWeatherCode(65, true)).toEqual({ label: 'Lluvia', icon: 'rain' });
    expect(describeWeatherCode(75, true)).toEqual({ label: 'Nieve', icon: 'snow' });
    expect(describeWeatherCode(95, false)).toEqual({ label: 'Tormenta', icon: 'storm' });
  });

  it('returns the next forecast hour that crosses the rain threshold', () => {
    expect(findNextRainMinutes(
      ['2026-07-29T20:00', '2026-07-29T21:00', '2026-07-29T22:00'],
      [5, 70, 80],
      '2026-07-29T20:20',
    )).toBe(40);
  });
});
