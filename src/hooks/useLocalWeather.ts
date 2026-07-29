'use client';

import { useEffect, useMemo, useState } from 'react';

export type LocalWeather = {
  source: 'Open-Meteo';
  place: string;
  timezone: string;
  observedAt: string;
  temperatureC: number;
  apparentTemperatureC?: number;
  windKmh?: number;
  weatherCode: number;
  isDay: boolean;
  condition: string;
  icon: 'sun' | 'moon' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm';
  nextRainMinutes: number | null;
  sunrise: string | null;
  sunset: string | null;
};

export function useLocalWeather(location: { lat: number; lng: number } | null) {
  const [weather, setWeather] = useState<LocalWeather | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'live' | 'unavailable'>('idle');
  const gridKey = location
    ? `${Math.round(location.lat * 100) / 100},${Math.round(location.lng * 100) / 100}`
    : null;
  const gridLocation = useMemo(() => {
    if (!gridKey) return null;
    const [lat, lng] = gridKey.split(',').map(Number);
    return {
      lat,
      lng,
    };
  }, [gridKey]);

  useEffect(() => {
    if (!gridLocation) return;

    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setStatus((current) => current === 'live' ? current : 'loading');
      try {
        const response = await fetch(`/api/local-weather?lat=${gridLocation.lat}&lng=${gridLocation.lng}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('weather unavailable');
        const payload = await response.json() as LocalWeather;
        if (!active) return;
        setWeather(payload);
        setStatus('live');
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setStatus('unavailable');
        console.warn('[AEGIS] Local weather unavailable:', error instanceof Error ? error.message : error);
      }
    };

    void load();
    const interval = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [gridLocation]);

  return {
    weather: gridLocation ? weather : null,
    status: gridLocation ? status : 'idle' as const,
  };
}
