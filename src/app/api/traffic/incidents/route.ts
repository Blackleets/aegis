import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  buildIncidentCacheKey,
  buildRouteIncidentBoundingBox,
  normalizeTomTomIncidents,
  parseIncidentCoordinate,
  type NormalizedRouteIncident,
  type TomTomIncidentFeature,
} from '@/lib/tomtom-route-incidents';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 90_000;
const STALE_TTL_MS = 5 * 60_000;
const incidentCache = new Map<string, { value: NormalizedRouteIncident[]; storedAt: number }>();

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-AEGIS-Incident-Provider': 'TomTom Orbis',
    },
  });
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    return json({
      status: 'unavailable',
      configured: false,
      source: 'TomTom Orbis Traffic',
      incidents: [],
      message: 'Live incident provider is not configured',
    });
  }

  const fromLat = parseIncidentCoordinate(request.nextUrl.searchParams.get('fromLat'), -90, 90);
  const fromLng = parseIncidentCoordinate(request.nextUrl.searchParams.get('fromLng'), -180, 180);
  const toLat = parseIncidentCoordinate(request.nextUrl.searchParams.get('toLat'), -90, 90);
  const toLng = parseIncidentCoordinate(request.nextUrl.searchParams.get('toLng'), -180, 180);
  const requestedPadding = Number(request.nextUrl.searchParams.get('paddingKm') || '2.5');
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || '40');

  if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
    return json({ error: 'Invalid incident corridor coordinates' }, 400);
  }

  const bbox = buildRouteIncidentBoundingBox(
    fromLat,
    fromLng,
    toLat,
    toLng,
    Number.isFinite(requestedPadding) ? requestedPadding : 2.5,
  );
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.round(requestedLimit))) : 40;
  const cacheKey = buildIncidentCacheKey(bbox);
  const cached = incidentCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.storedAt <= CACHE_TTL_MS) {
    return json({
      status: 'live',
      configured: true,
      source: 'TomTom Orbis Traffic',
      incidents: cached.value.slice(0, limit),
      count: Math.min(cached.value.length, limit),
      bbox,
      cached: true,
      checkedAt: new Date(cached.storedAt).toISOString(),
    });
  }

  const url = new URL('https://api.tomtom.com/maps/orbis/traffic/incidents/details');
  url.searchParams.set('apiVersion', '2');
  url.searchParams.set('bbox', `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`);
  url.searchParams.set('timeValidity', 'present');

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'es-ES',
        'TomTom-Api-Key': apiKey,
        'TomTom-Api-Version': '2',
        Attributes: 'incidents(type,geometry(type,coordinates),properties(id,iconCategory,magnitudeOfDelay,events(description,code,iconCategory),startTime,endTime,from,to,lengthInMeters,delayInSeconds,roadNumbers,timeValidity,probabilityOfOccurrence,numberOfReports,lastReportTime))',
      },
    });

    if (!response.ok) {
      const stale = cached && now - cached.storedAt <= STALE_TTL_MS ? cached : null;
      if (stale) {
        return json({
          status: 'live',
          configured: true,
          source: 'TomTom Orbis Traffic',
          incidents: stale.value.slice(0, limit),
          count: Math.min(stale.value.length, limit),
          bbox,
          cached: true,
          stale: true,
          providerStatus: response.status,
          checkedAt: new Date(stale.storedAt).toISOString(),
        });
      }

      return json({
        status: 'unavailable',
        configured: true,
        source: 'TomTom Orbis Traffic',
        incidents: [],
        reason: response.status === 429 ? 'quota_exceeded' : 'provider_error',
        retryAfterSeconds: Number(response.headers.get('retry-after')) || null,
      }, response.status === 429 ? 429 : 502);
    }

    const payload = await response.json() as { incidents?: TomTomIncidentFeature[] };
    const incidents = normalizeTomTomIncidents(payload.incidents, 100);
    incidentCache.set(cacheKey, { value: incidents, storedAt: now });

    if (incidentCache.size > 200) {
      for (const [key, entry] of incidentCache) {
        if (now - entry.storedAt > STALE_TTL_MS) incidentCache.delete(key);
      }
    }

    return json({
      status: 'live',
      configured: true,
      source: 'TomTom Orbis Traffic',
      incidents: incidents.slice(0, limit),
      count: Math.min(incidents.length, limit),
      bbox,
      cached: false,
      checkedAt: new Date(now).toISOString(),
    });
  } catch {
    const stale = cached && now - cached.storedAt <= STALE_TTL_MS ? cached : null;
    if (stale) {
      return json({
        status: 'live',
        configured: true,
        source: 'TomTom Orbis Traffic',
        incidents: stale.value.slice(0, limit),
        count: Math.min(stale.value.length, limit),
        bbox,
        cached: true,
        stale: true,
        checkedAt: new Date(stale.storedAt).toISOString(),
      });
    }

    return json({
      status: 'unavailable',
      configured: true,
      source: 'TomTom Orbis Traffic',
      incidents: [],
      reason: 'timeout',
      message: 'Incident request timed out',
    }, 504);
  }
}
