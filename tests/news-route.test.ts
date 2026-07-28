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
    expect(payload.sources).toHaveLength(6);
    expect(payload.activeSources).toHaveLength(6);
    expect(payload.news).toHaveLength(6);
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
    expect(payload.activeSources).toHaveLength(5);
    expect(payload.news).toHaveLength(5);
    expect(payload.news[0].coords).toEqual([40.464, -3.749]);
  });
});
