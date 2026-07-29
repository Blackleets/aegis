import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/news/route';

function rss(items: Array<{ title: string; link: string; description?: string }>) {
  return `<?xml version="1.0"?><rss><channel>${items.map((item) => `
    <item>
      <title>${item.title}</title>
      <description>${item.description ?? item.title}</description>
      <link>${item.link}</link>
      <pubDate>Mon, 28 Jul 2026 20:00:00 GMT</pubDate>
    </item>`).join('')}</channel></rss>`;
}

describe('global news route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('aggregates all configured global sources and exposes source health', async () => {
    let requestIndex = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      requestIndex += 1;
      return new Response(rss([{
        title: `Global report ${requestIndex}`,
        link: `https://example.com/${requestIndex}`,
      }]), { status: 200, headers: { 'Content-Type': 'application/rss+xml' } });
    }));

    const response = await GET();
    const payload = await response.json() as {
      news: Array<{ source: string }>;
      sources: string[];
      activeSources: string[];
      sourceHealth: Array<{ status: string; articleCount: number }>;
    };

    expect(response.status).toBe(200);
    expect(payload.sources).toHaveLength(17);
    expect(payload.activeSources).toHaveLength(17);
    expect(payload.news).toHaveLength(17);
    expect(payload.sourceHealth).toHaveLength(17);
    expect(payload.sourceHealth).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'active', articleCount: 1 }),
    ]));
  });

  it('keeps healthy sources live when another provider fails', async () => {
    let requestIndex = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      requestIndex += 1;
      if (requestIndex === 2) throw new Error('provider unavailable');
      return new Response(rss([{
        title: `Spain wildfire update ${requestIndex}`,
        link: `https://example.com/fire-${requestIndex}`,
      }]), { status: 200 });
    }));

    const response = await GET();
    const payload = await response.json() as {
      news: Array<{ coords: [number, number] | null }>;
      activeSources: string[];
      sourceHealth: Array<{ status: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.activeSources).toHaveLength(16);
    expect(payload.news).toHaveLength(16);
    expect(payload.sourceHealth[1].status).toBe('fetch_error');
    expect(payload.news[0].coords).toEqual([40.464, -3.749]);
  });

  it('keeps Argentina and Bolivia visible even when a local headline omits the country name', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const title = url.includes('gl=AR')
        ? 'Cortes y demoras en el transporte de la capital'
        : url.includes('gl=BO') || url.includes('opinion.com.bo')
          ? 'Bloqueo afecta una ruta nacional'
          : 'Global report';
      return new Response(rss([{
        title,
        link: `https://example.com/${encodeURIComponent(url)}`,
      }]), { status: 200 });
    }));

    const response = await GET();
    const payload = await response.json() as {
      news: Array<{ source: string; country: string | null; coords: [number, number] | null }>;
    };

    const argentina = payload.news.find((item) => item.source === 'Argentina News');
    const bolivia = payload.news.find((item) => item.source === 'Bolivia News');
    expect(argentina).toMatchObject({ country: 'AR', coords: [-34.6037, -58.3816] });
    expect(bolivia).toMatchObject({ country: 'BO', coords: [-16.4897, -68.1193] });
  });

  it('anchors every South American regional feed without inventing precise coordinates', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      return new Response(rss([{
        title: 'Actualización nacional sin ciudad identificada',
        link: `https://example.com/${encodeURIComponent(url)}`,
      }]), { status: 200 });
    }));

    const response = await GET();
    const payload = await response.json() as {
      news: Array<{
        source: string;
        country: string | null;
        coords: [number, number] | null;
        coords_default: boolean;
      }>;
    };

    for (const country of ['AR', 'BO', 'CL', 'PE', 'EC', 'CO', 'VE', 'BR', 'UY', 'PY']) {
      const item = payload.news.find((news) => news.country === country);
      expect(item?.coords).not.toBeNull();
      expect(item?.coords_default).toBe(true);
    }
  });

  it('reports HTTP failures separately from empty but reachable feeds', async () => {
    let requestIndex = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      requestIndex += 1;
      if (requestIndex === 1) return new Response('', { status: 503 });
      if (requestIndex === 2) return new Response(rss([]), { status: 200 });
      return new Response(rss([{
        title: `Report ${requestIndex}`,
        link: `https://example.com/${requestIndex}`,
      }]), { status: 200 });
    }));

    const response = await GET();
    const payload = await response.json() as {
      sourceHealth: Array<{ status: string; articleCount: number }>;
    };

    expect(payload.sourceHealth[0]).toMatchObject({ status: 'http_error', articleCount: 0 });
    expect(payload.sourceHealth[1]).toMatchObject({ status: 'empty', articleCount: 0 });
  });
});
