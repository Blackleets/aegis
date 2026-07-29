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
    };

    expect(response.status).toBe(200);
    expect(payload.sources).toHaveLength(9);
    expect(payload.activeSources).toHaveLength(9);
    expect(payload.news).toHaveLength(9);
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
    };

    expect(response.status).toBe(200);
    expect(payload.activeSources).toHaveLength(8);
    expect(payload.news).toHaveLength(8);
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
});
