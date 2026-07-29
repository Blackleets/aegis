import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { describeWeatherCode, findNextRainMinutes } from '@/lib/local-weather';

export const dynamic = 'force-dynamic';

type OpenMeteoPayload = {
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    is_day?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time?: string[];
    precipitation_probability?: number[];
  };
  daily?: {
    sunrise?: string[];
    sunset?: string[];
  };
};

type NominatimReversePayload = {
  name?: string;
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    county?: string;
  };
};

function validCoordinate(value: string | null, min: number, max: number) {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function GET(request: NextRequest) {
  const lat = validCoordinate(request.nextUrl.searchParams.get('lat'), -90, 90);
  const lng = validCoordinate(request.nextUrl.searchParams.get('lng'), -180, 180);

  if (lat === null || lng === null) {
    return NextResponse.json({ error: 'Valid lat and lng are required' }, { status: 400 });
  }

  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.searchParams.set('latitude', lat.toFixed(4));
  weatherUrl.searchParams.set('longitude', lng.toFixed(4));
  weatherUrl.searchParams.set('current', 'temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m');
  weatherUrl.searchParams.set('hourly', 'precipitation_probability');
  weatherUrl.searchParams.set('daily', 'sunrise,sunset');
  weatherUrl.searchParams.set('forecast_days', '1');
  weatherUrl.searchParams.set('timezone', 'auto');

  const reverseUrl = new URL('https://nominatim.openstreetmap.org/reverse');
  reverseUrl.searchParams.set('lat', lat.toFixed(5));
  reverseUrl.searchParams.set('lon', lng.toFixed(5));
  reverseUrl.searchParams.set('format', 'jsonv2');
  reverseUrl.searchParams.set('zoom', '10');
  reverseUrl.searchParams.set('addressdetails', '1');

  try {
    const [weatherResponse, reverseResponse] = await Promise.all([
      fetch(weatherUrl, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } }),
      fetch(reverseUrl, {
        signal: AbortSignal.timeout(8000),
        headers: {
          'Accept-Language': 'es',
          'User-Agent': 'AEGIS Local Weather/1.0 (Blackleets)',
        },
        next: { revalidate: 3600 },
      }),
    ]);

    if (!weatherResponse.ok) {
      return NextResponse.json({ error: 'Weather source unavailable' }, { status: 502 });
    }

    const weather = await weatherResponse.json() as OpenMeteoPayload;
    const reverse = reverseResponse.ok
      ? await reverseResponse.json() as NominatimReversePayload
      : null;
    const current = weather.current;

    if (
      typeof current?.temperature_2m !== 'number'
      || typeof current.weather_code !== 'number'
      || typeof current.is_day !== 'number'
    ) {
      return NextResponse.json({ error: 'Weather source returned incomplete telemetry' }, { status: 502 });
    }

    const appearance = describeWeatherCode(current.weather_code, current.is_day === 1);
    const place = reverse?.address?.city
      || reverse?.address?.town
      || reverse?.address?.village
      || reverse?.address?.municipality
      || reverse?.address?.suburb
      || reverse?.name
      || reverse?.address?.county
      || 'Tu ubicación';
    const observedAt = current.time || new Date().toISOString();

    return NextResponse.json({
      source: 'Open-Meteo',
      place,
      timezone: weather.timezone || 'auto',
      observedAt,
      temperatureC: current.temperature_2m,
      apparentTemperatureC: current.apparent_temperature,
      windKmh: current.wind_speed_10m,
      weatherCode: current.weather_code,
      isDay: current.is_day === 1,
      condition: appearance.label,
      icon: appearance.icon,
      nextRainMinutes: findNextRainMinutes(
        weather.hourly?.time,
        weather.hourly?.precipitation_probability,
        observedAt,
      ),
      sunrise: weather.daily?.sunrise?.[0] || null,
      sunset: weather.daily?.sunset?.[0] || null,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch local weather' }, { status: 502 });
  }
}
