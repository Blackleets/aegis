import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type NominatimItem = {
  display_name?: string;
  lat?: string;
  lon?: string;
  boundingbox?: string[];
  type?: string;
  class?: string;
  addresstype?: string;
  importance?: number;
  place_rank?: number;
  name?: string;
};

type BoundingBox = [west: number, south: number, east: number, north: number];

function parseBoundingBox(raw?: string[]): BoundingBox | null {
  if (!raw || raw.length !== 4) return null;
  const south = Number(raw[0]);
  const north = Number(raw[1]);
  const west = Number(raw[2]);
  const east = Number(raw[3]);
  if ([south, north, west, east].some(Number.isNaN)) return null;
  return [west, south, east, north];
}

function inferZoom(item: NominatimItem, bbox: BoundingBox | null): number {
  const kind = `${item.addresstype || ''} ${item.type || ''} ${item.class || ''}`.toLowerCase();

  if (bbox) {
    const latSpan = Math.abs(bbox[3] - bbox[1]);
    const lngSpan = Math.abs(bbox[2] - bbox[0]);
    const span = Math.max(latSpan, lngSpan);
    if (span > 40) return 3;
    if (span > 18) return 4;
    if (span > 8) return 5;
    if (span > 3) return 6;
    if (span > 1) return 8;
    if (span > 0.25) return 10;
  }

  if (/(country|state|province|region|county)/.test(kind)) return 5;
  if (/(city|town|municipality|village)/.test(kind)) return 9;
  if (/(suburb|district|borough|neighbourhood|neighborhood)/.test(kind)) return 11;
  if (/(road|street|avenue|house|building|amenity|tourism|shop|office|place_of_worship)/.test(kind)) return 14;
  return 10;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() || '';
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || '6') || 6, 10);

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('dedupe', '1');

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'AEGIS Geocode/1.0 (Blackleets)',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ results: [], error: 'Geocode upstream unavailable' }, { status: 502 });
    }

    const data = (await res.json()) as NominatimItem[];
    const results = data
      .map((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        const bbox = parseBoundingBox(item.boundingbox);
        return {
          label: item.display_name || item.name || query,
          lat,
          lng,
          bbox,
          zoom: inferZoom(item, bbox),
          kind: item.addresstype || item.type || item.class || 'place',
          importance: item.importance ?? 0,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => (b.importance - a.importance) || (b.zoom - a.zoom));

    return NextResponse.json(
      { results },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch {
    return NextResponse.json({ results: [], error: 'Failed to geocode query' }, { status: 500 });
  }
}
