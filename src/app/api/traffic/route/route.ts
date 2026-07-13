import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function parseCoordinate(value: string | null, min: number, max: number) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      status: 'unavailable',
      configured: false,
      source: 'TomTom Traffic',
      message: 'Live traffic provider is not configured',
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const fromLat = parseCoordinate(request.nextUrl.searchParams.get('fromLat'), -90, 90);
  const fromLng = parseCoordinate(request.nextUrl.searchParams.get('fromLng'), -180, 180);
  const toLat = parseCoordinate(request.nextUrl.searchParams.get('toLat'), -90, 90);
  const toLng = parseCoordinate(request.nextUrl.searchParams.get('toLng'), -180, 180);

  if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
    return NextResponse.json({ error: 'Invalid traffic corridor coordinates' }, { status: 400 });
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
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return NextResponse.json({
        status: 'unavailable',
        configured: true,
        source: 'TomTom Traffic',
        message: 'Traffic provider temporarily unavailable',
      }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }

    const payload = await response.json() as {
      routes?: Array<{
        summary?: {
          travelTimeInSeconds?: number;
          noTrafficTravelTimeInSeconds?: number;
          trafficDelayInSeconds?: number;
          trafficLengthInMeters?: number;
          departureTime?: string;
          arrivalTime?: string;
        };
      }>;
    };
    const summary = payload.routes?.[0]?.summary;
    if (!summary || typeof summary.travelTimeInSeconds !== 'number') {
      return NextResponse.json({ status: 'unavailable', configured: true, source: 'TomTom Traffic' });
    }

    const delaySeconds = Math.max(0, summary.trafficDelayInSeconds
      ?? (summary.travelTimeInSeconds - (summary.noTrafficTravelTimeInSeconds ?? summary.travelTimeInSeconds)));
    const level = delaySeconds >= 900 ? 'heavy' : delaySeconds >= 300 ? 'moderate' : delaySeconds >= 120 ? 'light' : 'clear';

    return NextResponse.json({
      status: 'live',
      configured: true,
      source: 'TomTom Traffic',
      delaySeconds,
      trafficLengthMeters: Math.max(0, summary.trafficLengthInMeters ?? 0),
      travelTimeSeconds: summary.travelTimeInSeconds,
      freeFlowTimeSeconds: summary.noTrafficTravelTimeInSeconds ?? null,
      departureTime: summary.departureTime ?? null,
      arrivalTime: summary.arrivalTime ?? null,
      level,
      checkedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({
      status: 'unavailable',
      configured: true,
      source: 'TomTom Traffic',
      message: 'Traffic request timed out',
    }, { status: 504, headers: { 'Cache-Control': 'no-store' } });
  }
}
