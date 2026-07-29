'use client';

import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const timeout = window.setTimeout(() => setExpanded(false), 6500);
    return () => window.clearTimeout(timeout);
  }, [expanded]);

  if (navigationActive || status === 'idle' || status === 'unavailable') return null;

  if (!weather) {
    return (
      <div className="pointer-events-none fixed left-4 top-[calc(env(safe-area-inset-top)+4.75rem)] z-[390] grid h-11 w-11 place-items-center rounded-[15px] border border-white/10 bg-[rgba(4,13,22,0.76)] text-[8px] font-mono text-white/55 backdrop-blur-xl">
        …
      </div>
    );
  }

  const Icon = WEATHER_ICONS[weather.icon];
  const rainSoon = weather.nextRainMinutes !== null && weather.nextRainMinutes <= 90;
  const detail = rainSoon
    ? weather.nextRainMinutes === 0 ? 'Lluvia probable ahora' : `Lluvia probable en ${weather.nextRainMinutes} min`
    : weather.condition;

  return (
    <div className="fixed left-4 top-[calc(env(safe-area-inset-top)+4.75rem)] z-[390] flex items-start gap-2">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className={`pointer-events-auto flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-[15px] border px-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-all active:scale-95 ${
          expanded ? 'border-cyan-200/28 bg-[rgba(6,27,38,0.94)]' : 'border-white/12 bg-[rgba(4,13,22,0.82)]'
        }`}
        aria-label={`${weather.place}, ${Math.round(weather.temperatureC)} grados, ${weather.condition}. ${expanded ? 'Ocultar detalle' : 'Ver detalle'}`}
        aria-expanded={expanded}
        title={`Datos reales de Open-Meteo · actualizados ${weather.observedAt}`}
      >
        <Icon className={`h-[18px] w-[18px] shrink-0 ${rainSoon ? 'text-cyan-200' : weather.isDay ? 'text-amber-200' : 'text-indigo-200'}`} />
        <span className="text-[13px] font-semibold tabular-nums text-white">{Math.round(weather.temperatureC)}°</span>
      </button>

      {expanded && (
        <div className="pointer-events-auto min-w-[9.5rem] max-w-[calc(100vw-6rem)] rounded-[17px] border border-white/12 bg-[rgba(4,13,22,0.94)] px-3 py-2 shadow-[0_14px_38px_rgba(0,0,0,0.38)] backdrop-blur-xl" role="status">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="max-w-[9rem] truncate text-[11px] font-semibold text-white/92">{weather.place}</span>
            <span className="text-[9px] tabular-nums text-white/48">{localTime(weather.timezone)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[9px] text-white/62">
            <span>{detail}</span>
            {typeof weather.windKmh === 'number' && (
              <>
                <span>·</span>
                <span>{Math.round(weather.windKmh)} km/h</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
