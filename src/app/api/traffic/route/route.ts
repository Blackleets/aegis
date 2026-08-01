import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  buildTrafficCacheKey,
  normalizeTomTomRouteTraffic,
  parseCoordinate,
  type NormalizedRouteTraffic,
  type TomTomRouteTrafficSummary,
} from '@/lib/tomtom-route-traffic';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 90_000;
const STALE_TTL_MS = 5 * 60_000;
const trafficCache = new Map<string, { value: NormalizedRouteTraffic; storedAt: number }>();

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-AEGIS-Traffic-Provider': 'TomTom',
    },
  });
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    return json({
      status: 'unavailable',
      configured: false,
      source: 'TomTom Traffic',
      message: 'Live traffic provider is not configured',
    });
  }

  const fromLat = parseCoordinate(request.nextUrl.searchParams.get('fromLat'), -90, 90);
  const fromLng = parseCoordinate(request.nextUrl.searchParams.get('fromLng'), -180, 180);
  const toLat = parseCoordinate(request.nextUrl.searchParams.get('toLat'), -90, 90);
  const toLng = parseCoordinate(request.nextUrl.searchParams.get('toLng'), -180, 180);

  if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
    return json({ error: 'Invalid traffic corridor coordinates' }, 400);
  }

  const cacheKey = buildTrafficCacheKey(fromLat, fromLng, toLat, toLng);
  const cached = trafficCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.storedAt <= CACHE_TTL_MS) {
    return json({
      status: 'live',
      configured: true,
      source: 'TomTom Traffic',
      ...cached.value,
      cached: true,
      checkedAt: new Date(cached.storedAt).toISOString(),
    });
  }

  const locations = `${fromLat},${fromLng}:${toLat},${toLng}`;
  const url = new URL(`https://api.tomtom.com/routing/1/calculateRoute/${locations}/json`);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('traffic', 'true');
  url.searchParams.set('travelMode', 'car');
  url.searchParams.set('routeType', 'fastest');
  url.searchParams.set('departAt', 'now');
  url.searchParams.set('computeTravelTimeFor', 'all');
  url.searchParams.set('routeRepresentation', 'summaryOnly');

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      const stale = cached && now - cached.storedAt <= STALE_TTL_MS ? cached : null;
      if (stale) {
        return json({
          status: 'live',
          configured: true,
          source: 'TomTom Traffic',
          ...stale.value,
          cached: true,
          stale: true,
          providerStatus: response.status,
          checkedAt: new Date(stale.storedAt).toISOString(),
        });
      }

      return json({
        status: 'unavailable',
        configured: true,
        source: 'TomTom Traffic',
        reason: response.status === 429 ? 'quota_exceeded' : 'provider_error',
        retryAfterSeconds: Number(response.headers.get('retry-after')) || null,
        message: response.status === 429
          ? 'TomTom free quota is temporarily exhausted'
          : 'Traffic provider temporarily unavailable',
      }, response.status === 429 ? 429 : 502);
    }

    const payload = await response.json() as {
      routes?: Array<{ summary?: TomTomRouteTrafficSummary }>;
    };
    const normalized = payload.routes?.[0]?.summary
      ? normalizeTomTomRouteTraffic(payload.routes[0].summary)
      : null;

    if (!normalized) {
      return json({
        status: 'unavailable',
        configured: true,
        source: 'TomTom Traffic',
        reason: 'invalid_provider_payload',
      }, 502);
    }

    trafficCache.set(cacheKey, { value: normalized, storedAt: now });
    if (trafficCache.size > 250) {
      for (const [key, entry] of trafficCache) {
        if (now - entry.storedAt > STALE_TTL_MS) trafficCache.delete(key);
      }
    }

    return json({
      status: 'live',
      configured: true,
      source: 'TomTom Traffic',
      ...normalized,
      cached: false,
      checkedAt: new Date(now).toISOString(),
    });
  } catch {
    const stale = cached && now - cached.storedAt <= STALE_TTL_MS ? cached : null;
    if (stale) {
      return json({
        status: 'live',
        configured: true,
        source: 'TomTom Traffic',
        ...stale.value,
        cached: true,
        stale: true,
        checkedAt: new Date(stale.storedAt).toISOString(),
      });
    }

    return json({
      status: 'unavailable',
      configured: true,
      source: 'TomTom Traffic',
      reason: 'timeout',
      message: 'Traffic request timed out',
    }, 504);
  }
}
