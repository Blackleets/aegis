import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type FeedSource = 'GDELT Project' | 'GDELT + RSS Fallback' | 'OSINT RSS Mapping';

interface IncidentEvent {
  id: string;
  lat: number;
  lng: number;
  name: string;
  title: string;
  url: string;
  html: string;
  type: 'conflict';
  source: string;
  date: string;
  tone: number;
  severity: 'critical' | 'high' | 'elevated' | 'low';
  theme: string;
  mentions: number;
}

interface CachedPayload {
  events: IncidentEvent[];
  total: number;
  timestamp: string;
  source: FeedSource;
}

interface GdeltArticle {
  title?: string;
  url?: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  sourcecountry?: string;
  sourceCountry?: string;
  language?: string;
  tone?: number | string;
  themes?: string[] | string;
}

const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_EVENTS = 18;
const GDELT_TIMEOUT_MS = 3500;
const RSS_TIMEOUT_MS = 3500;
const GDELT_QUERY = [
  'conflict OR war OR missile OR drone OR strike OR protest OR riot OR military',
  'sourcecountry:Ukraine OR sourcecountry:Israel OR sourcecountry:Iran OR sourcecountry:Russia OR sourcecountry:Sudan OR sourcecountry:Myanmar',
].join(' ');

const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT World' },
];

const GEO_DICT: Record<string, [number, number]> = {
  ukraine: [31.1656, 48.3794], kyiv: [30.5234, 50.4501], russia: [37.6173, 55.7558], moscow: [37.6173, 55.7558],
  gaza: [34.4668, 31.5017], israel: [34.8516, 31.0461], 'tel aviv': [34.7818, 32.0853], palestine: [35.2332, 31.9522],
  iran: [53.688, 32.4279], tehran: [51.389, 35.6892], syria: [38.9968, 34.8021], lebanon: [35.8623, 33.8547],
  beirut: [35.5018, 33.8938], yemen: [47.5868, 15.5527], houthi: [44.2066, 15.3694], sudan: [30.2176, 12.8628],
  china: [116.4074, 39.9042], taiwan: [120.9605, 23.6978], korea: [127.7669, 35.9078], myanmar: [95.956, 21.9162],
  somalia: [46.1996, 5.1521], turkey: [35.2433, 38.9637], france: [2.2137, 46.2276], germany: [10.4515, 51.1657],
  uk: [-3.4359, 55.3781], london: [-0.1276, 51.5072], usa: [-77.0369, 38.9072], washington: [-77.0369, 38.9072],
};

const CONFLICT_KEYWORDS = ['attack', 'strike', 'missile', 'drone', 'war', 'troops', 'military', 'protest', 'riot', 'police', 'clash', 'bomb', 'killed', 'forces'];

let cache: { expiresAt: number; payload: CachedPayload } | null = null;

function normalizeTone(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

function toneToSeverity(tone: number): IncidentEvent['severity'] {
  if (tone <= -6) return 'critical';
  if (tone <= -3) return 'high';
  if (tone < 0) return 'elevated';
  return 'low';
}

function extractCoords(text: string, seed: number): [number, number] | null {
  const haystack = text.toLowerCase();
  for (const [location, point] of Object.entries(GEO_DICT)) {
    const regex = new RegExp(`\\b${location}\\b`, 'i');
    if (regex.test(haystack)) {
      const jitterLng = ((((seed * 137.5) % 200) - 100) / 100) * 1.15;
      const jitterLat = ((((seed * 251.3) % 200) - 100) / 100) * 1.15;
      return [point[0] + jitterLng, point[1] + jitterLat];
    }
  }
  return null;
}

function eventHtml(url: string, title: string, source: string, severity: string): string {
  return `<a href="${url}" target="_blank">${title}</a><br/><i>${source} • ${severity.toUpperCase()}</i>`;
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'Aegis/1.0' } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchGdeltEvents(): Promise<IncidentEvent[]> {
  const endpoint = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(GDELT_QUERY)}&mode=artlist&format=json&maxrecords=${MAX_EVENTS}&sort=datedesc`;
  const payload = await fetchJson<{ articles?: GdeltArticle[] }>(endpoint, GDELT_TIMEOUT_MS);
  const articles = payload?.articles ?? [];
  const events: IncidentEvent[] = [];

  for (let index = 0; index < articles.length; index += 1) {
    const article = articles[index];
    const title = String(article.title ?? '').trim();
    const url = String(article.url ?? '').trim();
    if (!title || !url) continue;

    const source = String(article.sourceCountry ?? article.sourcecountry ?? article.domain ?? 'GDELT').trim();
    const date = String(article.seendate ?? new Date().toISOString());
    const tone = normalizeTone(article.tone);
    const theme = Array.isArray(article.themes) ? String(article.themes[0] ?? 'Geopolitical Incident') : String(article.themes ?? 'Geopolitical Incident');
    const coords = extractCoords(`${title} ${source}`, index + 1);
    if (!coords) continue;

    const severity = toneToSeverity(tone);
    events.push({
      id: `gdelt-${index}-${Buffer.from(url).toString('base64').slice(0, 10)}`,
      lat: coords[1],
      lng: coords[0],
      name: `[GDELT] ${title}`,
      title,
      url,
      html: eventHtml(url, title, source, severity),
      type: 'conflict',
      source,
      date,
      tone,
      severity,
      theme,
      mentions: 1,
    });
  }

  return events;
}

async function fetchRssFallbackEvents(): Promise<IncidentEvent[]> {
  const xmlFeeds = await Promise.all(RSS_FEEDS.map(async (feed) => ({ feed, xml: await fetchText(feed.url, RSS_TIMEOUT_MS) })));
  const events: IncidentEvent[] = [];
  let eventId = 0;

  for (const { feed, xml } of xmlFeeds) {
    if (!xml) continue;
    const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
    for (const item of items) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || item.match(/<title>(.*?)<\/title>/i);
      const linkMatch = item.match(/<link>(.*?)<\/link>/i);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) || item.match(/<description>(.*?)<\/description>/i);
      if (!titleMatch || !linkMatch) continue;

      const title = titleMatch[1].trim();
      const url = linkMatch[1].trim();
      const description = descMatch?.[1] ?? '';
      const haystack = `${title} ${description}`.toLowerCase();
      if (!CONFLICT_KEYWORDS.some((kw) => haystack.includes(kw))) continue;

      const coords = extractCoords(haystack, eventId + 1);
      if (!coords) continue;

      const tone = CONFLICT_KEYWORDS.reduce((score, kw) => score + (haystack.includes(kw) ? -0.7 : 0), 0);
      const severity = toneToSeverity(tone);
      events.push({
        id: `rss-${feed.source.replace(/\s+/g, '')}-${eventId++}`,
        lat: coords[1],
        lng: coords[0],
        name: `[${feed.source}] ${title}`,
        title,
        url,
        html: eventHtml(url, title, feed.source, severity),
        type: 'conflict',
        source: feed.source,
        date: new Date().toISOString(),
        tone,
        severity,
        theme: 'Conflict Signal',
        mentions: 1,
      });
      if (events.length >= MAX_EVENTS) return events;
    }
  }

  return events;
}

function dedupe(events: IncidentEvent[]): IncidentEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.title.toLowerCase()}|${event.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET() {
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.payload, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } });
  }

  try {
    const [gdeltEvents, rssEvents] = await Promise.all([fetchGdeltEvents(), fetchRssFallbackEvents()]);
    const primary = gdeltEvents.slice(0, MAX_EVENTS);
    const topUp = primary.length >= MAX_EVENTS ? [] : rssEvents.slice(0, MAX_EVENTS - primary.length);
    const events = dedupe([...primary, ...topUp]).slice(0, MAX_EVENTS);
    const source: FeedSource = primary.length > 0 && topUp.length > 0 ? 'GDELT + RSS Fallback' : primary.length > 0 ? 'GDELT Project' : 'OSINT RSS Mapping';
    const payload: CachedPayload = { events, total: events.length, timestamp: new Date().toISOString(), source };

    cache = { expiresAt: Date.now() + CACHE_TTL_MS, payload };

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('AEGIS GDELT adapter error:', error);
    return NextResponse.json({ events: [], total: 0, error: 'Failed to fetch global incidents' }, { status: 500 });
  }
}
