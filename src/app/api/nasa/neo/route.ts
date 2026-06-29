import { NextResponse } from 'next/server';

type NeoCloseApproach = {
  close_approach_date_full?: string;
  close_approach_date?: string;
  relative_velocity?: {
    kilometers_per_second?: string;
  };
  miss_distance?: {
    lunar?: string;
    kilometers?: string;
  };
  orbiting_body?: string;
};

type NeoObject = {
  id?: string;
  name?: string;
  nasa_jpl_url?: string;
  is_potentially_hazardous_asteroid?: boolean;
  absolute_magnitude_h?: number;
  estimated_diameter?: {
    meters?: {
      estimated_diameter_min?: number;
      estimated_diameter_max?: number;
    };
  };
  close_approach_data?: NeoCloseApproach[];
};

type NeoFeedResponse = {
  element_count?: number;
  near_earth_objects?: Record<string, NeoObject[]>;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET() {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + 6);

  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  const startDate = formatDate(now);
  const endDate = formatDate(end);
  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${apiKey}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({
        source: 'NASA NeoWs',
        status: 'error',
        fetched_at: new Date().toISOString(),
        window: { start_date: startDate, end_date: endDate },
        total: 0,
        hazardous_count: 0,
        closest: [],
        error: `NASA NeoWs returned ${res.status}`,
      }, { status: 502 });
    }

    const data = await res.json() as NeoFeedResponse;
    const objects = Object.values(data.near_earth_objects || {}).flat();

    const normalized = objects
      .map((object) => {
        const approach = object.close_approach_data?.[0] || {};
        const meters = object.estimated_diameter?.meters || {};
        const missLunar = safeNumber(approach.miss_distance?.lunar, 9999);
        const velocityKps = safeNumber(approach.relative_velocity?.kilometers_per_second, 0);
        const diameterMin = safeNumber(meters.estimated_diameter_min, 0);
        const diameterMax = safeNumber(meters.estimated_diameter_max, 0);

        return {
          id: object.id || object.name || `neo-${Math.random().toString(36).slice(2)}`,
          name: object.name || 'Unnamed NEO',
          jpl_url: object.nasa_jpl_url || null,
          hazardous: Boolean(object.is_potentially_hazardous_asteroid),
          close_approach: approach.close_approach_date_full || approach.close_approach_date || null,
          miss_lunar: Math.round(missLunar * 10) / 10,
          miss_km: Math.round(safeNumber(approach.miss_distance?.kilometers, 0)),
          velocity_kps: Math.round(velocityKps * 10) / 10,
          diameter_m: Math.round(((diameterMin + diameterMax) / 2) || diameterMax || diameterMin),
          orbiting_body: approach.orbiting_body || 'Earth',
          magnitude_h: object.absolute_magnitude_h ?? null,
        };
      })
      .sort((a, b) => a.miss_lunar - b.miss_lunar)
      .slice(0, 8);

    const hazardousCount = objects.filter((object) => object.is_potentially_hazardous_asteroid).length;

    return NextResponse.json({
      source: 'NASA NeoWs',
      status: 'ok',
      fetched_at: new Date().toISOString(),
      window: { start_date: startDate, end_date: endDate },
      total: data.element_count ?? objects.length,
      hazardous_count: hazardousCount,
      closest: normalized,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (error) {
    console.error('NASA NeoWs API error:', error);
    return NextResponse.json({
      source: 'NASA NeoWs',
      status: 'error',
      fetched_at: new Date().toISOString(),
      window: { start_date: startDate, end_date: endDate },
      total: 0,
      hazardous_count: 0,
      closest: [],
      error: 'Failed to fetch NASA NeoWs data',
    }, { status: 500 });
  }
}
