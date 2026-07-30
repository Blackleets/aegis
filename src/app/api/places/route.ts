import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { NEARBY_PLACE_META, type NearbyPlace, type NearbyPlaceCategory } from '@/lib/nearby-places';

export const dynamic = 'force-dynamic';

type OverpassElement = {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

const SUPPORTED_CATEGORIES = new Set<NearbyPlaceCategory>([
  'fuel',
  'restaurant',
  'hospital',
  'pharmacy',
  'parking',
  'charging_station',
]);

function validCoordinate(value: string | null, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function GET(request: NextRequest) {
  const lat = validCoordinate(request.nextUrl.searchParams.get('lat'), -90, 90);
  const lng = validCoordinate(request.nextUrl.searchParams.get('lng'), -180, 180);
  const requestedRadius = Number(request.nextUrl.searchParams.get('radius') || 3_500);
  const radius = Number.isFinite(requestedRadius) ? Math.min(6_000, Math.max(500, requestedRadius)) : 3_500;
  if (lat === null || lng === null) {
    return NextResponse.json({ places: [], error: 'Invalid map coordinates' }, { status: 400 });
  }

  const requested = request.nextUrl.searchParams.get('categories')?.split(',') ?? [];
  const categories = requested.filter((value): value is NearbyPlaceCategory => SUPPORTED_CATEGORIES.has(value as NearbyPlaceCategory));
  const selected = categories.length > 0 ? categories : [...SUPPORTED_CATEGORIES];
  const amenityPattern = selected.join('|');
  const query = `[out:json][timeout:12];nwr(around:${Math.round(radius)},${lat.toFixed(5)},${lng.toFixed(5)})["amenity"~"^(${amenityPattern})$"];out center tags 100;`;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'AEGIS Nearby Places/1.0 (Blackleets)',
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(14_000),
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      return NextResponse.json({ places: [], source: 'OpenStreetMap', status: 'unavailable' }, { status: 502 });
    }

    const payload = await response.json() as { elements?: OverpassElement[] };
    const places = (payload.elements ?? []).flatMap<NearbyPlace>((element) => {
      const category = element.tags?.amenity as NearbyPlaceCategory | undefined;
      const placeLat = element.lat ?? element.center?.lat;
      const placeLng = element.lon ?? element.center?.lon;
      if (!category || !SUPPORTED_CATEGORIES.has(category) || !Number.isFinite(placeLat) || !Number.isFinite(placeLng)) return [];
      const meta = NEARBY_PLACE_META[category];
      return [{
        id: `osm-${element.type}-${element.id}`,
        name: element.tags?.name || element.tags?.brand || meta.label,
        category,
        lat: placeLat as number,
        lng: placeLng as number,
        brand: element.tags?.brand,
        openingHours: element.tags?.opening_hours,
        source: 'OpenStreetMap',
      }];
    });

    return NextResponse.json(
      { places, source: 'OpenStreetMap', status: 'live' },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } },
    );
  } catch {
    return NextResponse.json({ places: [], source: 'OpenStreetMap', status: 'unavailable' }, { status: 502 });
  }
}
