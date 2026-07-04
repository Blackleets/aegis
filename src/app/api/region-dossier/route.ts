import { NextResponse } from 'next/server';

interface LocationInfo {
  city: string;
  state: string;
  country: string;
  country_code: string;
  display_name?: string;
}

interface RestCountryCurrency {
  name?: string;
  symbol?: string;
}

interface RestCountryResponse {
  name?: {
    common?: string;
    official?: string;
  };
  capital?: string[];
  population?: number;
  area?: number;
  region?: string;
  subregion?: string;
  languages?: Record<string, string>;
  currencies?: Record<string, RestCountryCurrency>;
  flag?: string;
  flags?: {
    svg?: string;
  };
  timezones?: string[];
}

interface NearbyCamera {
  id?: string;
  name?: string;
  city?: string;
  country?: string;
  source?: string;
  lat?: number;
  lng?: number;
}

interface OpenMeteoResponse {
  timezone?: string;
  timezone_abbreviation?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    is_day?: number;
  };
}

interface WeatherEventsResponse {
  events?: Array<{
    lat?: number;
    lng?: number;
  }>;
}

interface CameraRouteResponse {
  cameras?: NearbyCamera[];
}

interface TerritoryLiveContext {
  local_time?: string;
  timezone?: string;
  timezone_abbr?: string;
  weather?: {
    temperature_c?: number;
    feels_like_c?: number;
    wind_kmh?: number;
    summary?: string;
    is_day?: boolean;
  };
  nearby_cameras?: {
    count: number;
    countries: string[];
    closest?: {
      name?: string;
      city?: string;
      country?: string;
      source?: string;
      distance_km: number;
    };
  };
  nearby_weather?: {
    count: number;
    radius_km: number;
  };
}

/**
 * AEGIS — Region Dossier API
 * Provides country intelligence for any coordinate (right-click on map)
 * Steps that depend on reverse geocode run after it; external enrichments fan out in parallel.
 */

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');

  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=5&addressdetails=1`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'AegisIntelPlatform/1.0' },
      }
    );

    let countryName = '';
    let countryCode = '';
    let locationInfo: LocationInfo = {
      city: '',
      state: '',
      country: '',
      country_code: '',
    };

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const addr = geoData.address || {};
      countryName = addr.country || '';
      countryCode = addr.country_code?.toUpperCase() || '';
      locationInfo = {
        city: addr.city || addr.town || addr.village || '',
        state: addr.state || addr.region || '',
        country: countryName,
        country_code: countryCode,
        display_name: geoData.display_name,
      };
    }

    const [countryResult, wikiResult, hosResult, weatherResult, camerasResult, weatherEventsResult] = await Promise.allSettled([
      (async () => {
        if (!countryCode) return null;
        try {
          const res = await fetch(
            `https://restcountries.com/v3.1/alpha/${countryCode}?fields=name,capital,population,area,region,subregion,languages,currencies,flag,flags,timezones`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) return await res.json() as RestCountryResponse;
        } catch (e) {
          console.warn('[AEGIS] Country fetch error:', e instanceof Error ? e.message : e);
        }
        return null;
      })(),
      (async () => {
        const wikiQuery = locationInfo.city || countryName;
        if (!wikiQuery) return null;
        try {
          const res = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) {
            const wiki = await res.json();
            return {
              title: wiki.title,
              extract: wiki.extract?.substring(0, 500),
              thumbnail: wiki.thumbnail?.source,
            };
          }
        } catch (e) {
          console.warn('[AEGIS] Wikipedia fetch error:', e instanceof Error ? e.message : e);
        }
        return null;
      })(),
      (async () => {
        if (!countryName) return null;
        try {
          const safe = countryName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          const sparql = `SELECT ?leader ?leaderLabel ?positionLabel WHERE {
            ?country wdt:P31 wd:Q6256;
                     rdfs:label "${safe}"@en;
                     wdt:P6 ?leader.
            OPTIONAL { ?leader wdt:P39 ?position. }
            SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
          } LIMIT 1`;
          const res = await fetch(
            `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
            {
              signal: AbortSignal.timeout(5000),
              headers: { 'User-Agent': 'AegisIntelPlatform/1.0' },
            }
          );
          if (res.ok) {
            const wd = await res.json();
            const binding = wd.results?.bindings?.[0];
            if (binding) {
              return {
                name: binding.leaderLabel?.value,
                position: binding.positionLabel?.value || 'Head of State',
              };
            }
          }
        } catch (e) {
          console.warn('[AEGIS] Wikidata fetch error:', e instanceof Error ? e.message : e);
        }
        return null;
      })(),
      (async () => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=auto`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) return await res.json() as OpenMeteoResponse;
        } catch (e) {
          console.warn('[AEGIS] Open-Meteo fetch error:', e instanceof Error ? e.message : e);
        }
        return null;
      })(),
      (async () => {
        try {
          const res = await fetch(`${origin}/api/cctv?lat=${lat}&lng=${lng}`, { signal: AbortSignal.timeout(12000) });
          if (res.ok) return await res.json() as CameraRouteResponse;
        } catch (e) {
          console.warn('[AEGIS] CCTV proximity fetch error:', e instanceof Error ? e.message : e);
        }
        return null;
      })(),
      (async () => {
        try {
          const res = await fetch(`${origin}/api/weather`, { signal: AbortSignal.timeout(12000) });
          if (res.ok) return await res.json() as WeatherEventsResponse;
        } catch (e) {
          console.warn('[AEGIS] Weather events fetch error:', e instanceof Error ? e.message : e);
        }
        return null;
      })(),
    ]);

    const countryData = countryResult.status === 'fulfilled' ? countryResult.value : null;
    const wikiSummary = wikiResult.status === 'fulfilled' ? wikiResult.value : null;
    const headOfState = hosResult.status === 'fulfilled' ? hosResult.value : null;
    const liveWeather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
    const nearbyCameraPayload = camerasResult.status === 'fulfilled' ? camerasResult.value : null;
    const nearbyWeatherPayload = weatherEventsResult.status === 'fulfilled' ? weatherEventsResult.value : null;

    const nearbyCameras = (nearbyCameraPayload?.cameras || [])
      .filter((camera) => typeof camera.lat === 'number' && typeof camera.lng === 'number')
      .map((camera) => ({
        ...camera,
        distance_km: haversineKm(lat, lng, camera.lat as number, camera.lng as number),
      }))
      .sort((a, b) => a.distance_km - b.distance_km);

    const WEATHER_RADIUS_KM = 450;
    const filteredWeatherEvents = (nearbyWeatherPayload?.events || []).filter((event) => {
      if (typeof event.lat !== 'number' || typeof event.lng !== 'number') return false;
      return haversineKm(lat, lng, event.lat, event.lng) <= WEATHER_RADIUS_KM;
    });

    const primaryTimezone = liveWeather?.timezone || countryData?.timezones?.[0];
    const liveContext: TerritoryLiveContext = {
      local_time: formatLocalTime(primaryTimezone, liveWeather?.current?.time),
      timezone: primaryTimezone,
      timezone_abbr: liveWeather?.timezone_abbreviation,
      weather: liveWeather?.current ? {
        temperature_c: liveWeather.current.temperature_2m,
        feels_like_c: liveWeather.current.apparent_temperature,
        wind_kmh: liveWeather.current.wind_speed_10m,
        summary: weatherCodeLabel(liveWeather.current.weather_code, liveWeather.current.is_day === 1),
        is_day: liveWeather.current.is_day === 1,
      } : undefined,
      nearby_cameras: {
        count: nearbyCameras.length,
        countries: uniqueCountries(nearbyCameras),
        closest: nearbyCameras[0] ? {
          name: nearbyCameras[0].name,
          city: nearbyCameras[0].city,
          country: nearbyCameras[0].country,
          source: nearbyCameras[0].source,
          distance_km: Number(nearbyCameras[0].distance_km.toFixed(1)),
        } : undefined,
      },
      nearby_weather: {
        count: filteredWeatherEvents.length,
        radius_km: WEATHER_RADIUS_KM,
      },
    };

    return NextResponse.json({
      coordinates: { lat, lng },
      location: locationInfo,
      country: countryData ? {
        name: countryData.name?.common,
        official_name: countryData.name?.official,
        capital: countryData.capital?.[0],
        population: countryData.population,
        area: countryData.area,
        region: countryData.region,
        subregion: countryData.subregion,
        languages: countryData.languages ? Object.values(countryData.languages) : [],
        currencies: countryData.currencies
          ? Object.entries(countryData.currencies).map(([code, info]) => `${info.name ?? code} (${info.symbol || code})`)
          : [],
        flag: countryData.flag,
        flag_url: countryData.flags?.svg,
        timezones: countryData.timezones,
      } : null,
      head_of_state: headOfState,
      wikipedia: wikiSummary,
      live_context: liveContext,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Region dossier error:', error);
    return NextResponse.json({ error: 'Failed to fetch region data' }, { status: 500 });
  }
}

function formatLocalTime(timeZone?: string, localIso?: string) {
  if (localIso) {
    const date = new Date(localIso);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
        timeZone: timeZone || 'UTC',
      }).format(date);
    }
  }

  if (!timeZone) return undefined;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      timeZone,
    }).format(new Date());
  } catch {
    return undefined;
  }
}

function uniqueCountries(cameras: Array<{ country?: string }>) {
  return Array.from(new Set(cameras.map((camera) => camera.country).filter(Boolean) as string[])).slice(0, 4);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function weatherCodeLabel(code?: number, isDay = true) {
  switch (code) {
    case 0:
      return isDay ? 'Clear sky' : 'Clear night';
    case 1:
    case 2:
    case 3:
      return 'Partly cloudy';
    case 45:
    case 48:
      return 'Fog';
    case 51:
    case 53:
    case 55:
      return 'Drizzle';
    case 61:
    case 63:
    case 65:
      return 'Rain';
    case 66:
    case 67:
      return 'Freezing rain';
    case 71:
    case 73:
    case 75:
    case 77:
      return 'Snow';
    case 80:
    case 81:
    case 82:
      return 'Rain showers';
    case 85:
    case 86:
      return 'Snow showers';
    case 95:
      return 'Thunderstorm';
    case 96:
    case 99:
      return 'Severe thunderstorm';
    default:
      return 'Atmospheric watch';
  }
}
