
import { NextResponse } from 'next/server';

import type { EarthquakeEvent } from '@/lib/earthquakes';

export const dynamic = 'force-dynamic';

/**
 * AEGIS — Earthquake Data API
 * Fetches real-time seismic events from USGS (last 24h, M2.5+)
 * No API key required
 */

interface UsgsFeature {
  id: string;
  geometry?: {
    coordinates?: number[];
  };
  properties?: {
    mag?: number;
    place?: string;
    time?: number;
    url?: string;
    tsunami?: number;
    type?: string;
    felt?: number | null;
    alert?: string | null;
    updated?: number;
  };
}

interface UsgsResponse {
  features?: UsgsFeature[];
}

export async function GET() {
  try {
    const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ earthquakes: [], error: 'USGS unavailable' });
    }

    const data: UsgsResponse = await res.json();
    const features = data.features || [];

    const earthquakes: EarthquakeEvent[] = features.flatMap((f) => {
      const coords = f.geometry?.coordinates || [0, 0, 0];
      const props = f.properties || {};
      const magnitude = Number(props.mag);
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      const depth = Number(coords[2]);
      const time = Number(props.time);

      if (!f.id || !Number.isFinite(magnitude) || !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(time)) {
        return [];
      }

      return [{
        id: f.id,
        lat,
        lng,
        depth: Number.isFinite(depth) ? depth : 0,
        magnitude,
        place: props.place || 'Unknown location',
        time,
        updated: props.updated,
        url: props.url,
        tsunami: props.tsunami === 1,
        felt: props.felt,
        alert: props.alert,
      }];
    }).sort((a, b) => b.time - a.time);

    return NextResponse.json({
      earthquakes,
      total: earthquakes.length,
      timestamp: new Date().toISOString(),
      source: 'USGS',
      refreshIntervalMs: 20000,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Earthquake fetch error:', error);
    return NextResponse.json({ earthquakes: [], error: 'Failed to fetch earthquake data' }, { status: 500 });
  }
}

