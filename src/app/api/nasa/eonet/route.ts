import { NextResponse } from 'next/server';

type EonetGeometry = {
  date?: string;
  type?: string;
  coordinates?: number[];
};

type EonetEvent = {
  id?: string;
  title?: string;
  link?: string;
  categories?: Array<{ id?: string; title?: string }>;
  sources?: Array<{ id?: string; url?: string }>;
  geometry?: EonetGeometry[];
};

type EonetResponse = {
  events?: EonetEvent[];
};

export async function GET() {
  try {
    const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=8', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      return NextResponse.json({
        source: 'NASA EONET',
        status: 'error',
        total_open: 0,
        events: [],
        fetched_at: new Date().toISOString(),
      }, { status: 502 });
    }

    const data = await res.json() as EonetResponse;
    const events = (data.events || []).slice(0, 8).map((event) => {
      const latestGeometry = [...(event.geometry || [])]
        .filter(Boolean)
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];

      const coords = latestGeometry?.coordinates || [];
      const lng = typeof coords[0] === 'number' ? coords[0] : null;
      const lat = typeof coords[1] === 'number' ? coords[1] : null;

      return {
        id: event.id || `eonet-${Math.random().toString(36).slice(2)}`,
        title: event.title || 'Unnamed event',
        category: event.categories?.[0]?.title || 'Natural event',
        category_id: event.categories?.[0]?.id || null,
        source: event.sources?.[0]?.id || 'NASA EONET',
        source_url: event.sources?.[0]?.url || event.link || null,
        date: latestGeometry?.date || null,
        geometry_type: latestGeometry?.type || null,
        lat,
        lng,
        link: event.link || null,
      };
    });

    return NextResponse.json({
      source: 'NASA EONET',
      status: 'ok',
      total_open: events.length,
      fetched_at: new Date().toISOString(),
      events,
    });
  } catch (error) {
    console.error('NASA EONET API error:', error);
    return NextResponse.json({
      source: 'NASA EONET',
      status: 'error',
      total_open: 0,
      fetched_at: new Date().toISOString(),
      events: [],
      error: 'Failed to fetch NASA EONET data',
    }, { status: 500 });
  }
}
