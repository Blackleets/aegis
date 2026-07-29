export type WeatherAppearance = {
  label: string;
  icon: 'sun' | 'moon' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm';
};

export function describeWeatherCode(code: number, isDay: boolean): WeatherAppearance {
  if (code === 0) return { label: 'Despejado', icon: isDay ? 'sun' : 'moon' };
  if (code === 1) return { label: 'Mayormente despejado', icon: isDay ? 'sun' : 'moon' };
  if (code === 2) return { label: 'Parcialmente nublado', icon: 'cloud' };
  if (code === 3) return { label: 'Nublado', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Niebla', icon: 'fog' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { label: 'Lluvia', icon: 'rain' };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Nieve', icon: 'snow' };
  if ([95, 96, 99].includes(code)) return { label: 'Tormenta', icon: 'storm' };
  return { label: 'Condiciones variables', icon: 'cloud' };
}

export function findNextRainMinutes(
  times: string[] | undefined,
  probabilities: number[] | undefined,
  nowIso: string,
  threshold = 45,
): number | null {
  if (!times?.length || !probabilities?.length) return null;
  const now = new Date(nowIso).getTime();

  for (let index = 0; index < Math.min(times.length, probabilities.length); index += 1) {
    if (probabilities[index] < threshold) continue;
    const eventTime = new Date(times[index]).getTime();
    if (!Number.isFinite(eventTime) || eventTime < now) continue;
    return Math.max(0, Math.round((eventTime - now) / 60000));
  }

  return null;
}
