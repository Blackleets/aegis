'use client';

import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Moon, Sun } from 'lucide-react';

import type { LocalWeather } from '@/hooks/useLocalWeather';

type WeatherCapsuleProps = {
  weather: LocalWeather | null;
  status: 'idle' | 'loading' | 'live' | 'unavailable';
  navigationActive: boolean;
};

const WEATHER_ICONS = {
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

function localTime(timezone: string) {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone === 'auto' ? undefined : timezone,
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  }
}

export default function WeatherCapsule({ weather, status, navigationActive }: WeatherCapsuleProps) {
  if (navigationActive || status === 'idle' || status === 'unavailable') return null;

  if (!weather) {
    return (
      <div className="pointer-events-none fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[390] -translate-x-1/2 rounded-full border border-white/10 bg-[rgba(4,13,22,0.76)] px-3 py-2 text-[8px] font-mono uppercase tracking-[0.14em] text-white/55 backdrop-blur-xl">
        Clima…
      </div>
    );
  }

  const Icon = WEATHER_ICONS[weather.icon];
  const rainSoon = weather.nextRainMinutes !== null && weather.nextRainMinutes <= 90;
  const detail = rainSoon
    ? weather.nextRainMinutes === 0 ? 'Lluvia probable ahora' : `Lluvia probable en ${weather.nextRainMinutes} min`
    : weather.condition;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[max(0.8rem,env(safe-area-inset-top))] z-[390] flex min-w-[10.5rem] -translate-x-1/2 items-center gap-2 rounded-[18px] border border-white/12 bg-[rgba(4,13,22,0.84)] px-3 py-2 shadow-[0_14px_38px_rgba(0,0,0,0.34)] backdrop-blur-xl"
      aria-label={`${weather.place}, ${Math.round(weather.temperatureC)} grados, ${weather.condition}`}
      title={`Datos reales de Open-Meteo · actualizados ${weather.observedAt}`}
    >
      <Icon className={`h-6 w-6 shrink-0 ${rainSoon ? 'text-cyan-200' : weather.isDay ? 'text-amber-200' : 'text-indigo-200'}`} />
      <div>
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-[15px] font-semibold tabular-nums text-white">{Math.round(weather.temperatureC)}°</span>
          <span className="max-w-[8.5rem] truncate text-[10px] font-medium text-white/88">{weather.place}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[8px] text-white/58">
          <span>{detail}</span>
          <span>·</span>
          <span className="tabular-nums">{localTime(weather.timezone)}</span>
        </div>
      </div>
    </div>
  );
}
