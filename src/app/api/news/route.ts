import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

interface FeedItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  country: string | null;
  coordsHint: [number, number] | null;
}

interface NewsItem extends Omit<FeedItem, 'coordsHint'> {
  id: string;
  published: string;
  risk_score: number;
  coords: [number, number] | null;
  coords_default: boolean;
  machine_assessment: string | null;
}

const RSS_FEEDS: Array<{
  source: string;
  url: string;
  country?: string;
  coordsHint?: [number, number];
}> = [
  { source: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { source: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { source: 'GDACS', url: 'https://www.gdacs.org/xml/rss.xml' },
  { source: 'DW World', url: 'https://rss.dw.com/rdf/rss-en-all' },
  { source: 'France 24', url: 'https://www.france24.com/en/rss' },
  { source: 'UN News', url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml' },
  {
    source: 'Argentina News',
    url: 'https://news.google.com/rss?hl=es-419&gl=AR&ceid=AR:es-419',
    country: 'AR',
    coordsHint: [-34.6037, -58.3816],
  },
  {
    source: 'Bolivia News',
    url: 'https://news.google.com/rss?hl=es-419&gl=BO&ceid=BO:es-419',
    country: 'BO',
    coordsHint: [-16.4897, -68.1193],
  },
  {
    source: 'Opinión Bolivia',
    url: 'https://www.opinion.com.bo/rss/',
    country: 'BO',
    coordsHint: [-17.3895, -66.1568],
  },
];

const RISK_KEYWORDS = [
  'war', 'missile', 'strike', 'attack', 'crisis', 'tension', 'military', 'conflict', 'defense', 'clash',
  'nuclear', 'invasion', 'bomb', 'drone', 'weapon', 'sanctions', 'ceasefire', 'escalation', 'killed',
  'destroyed', 'operation', 'casualty', 'frontline', 'threat', 'earthquake', 'tsunami', 'eruption', 'flood',
  'guerra', 'misil', 'ataque', 'crisis', 'conflicto', 'militar', 'bomba', 'dron', 'sanciones', 'amenaza',
  'terremoto', 'sismo', 'tsunami', 'erupción', 'inundación', 'incendio', 'evacuación', 'bloqueo',
];

const KEYWORD_COORDS: Record<string, [number, number]> = {
  argentina: [-38.416, -63.616],
  bolivia: [-16.29, -63.589],
  'buenos aires': [-34.604, -58.382],
  'la paz': [-16.49, -68.119],
  'santa cruz': [-17.784, -63.181],
  cochabamba: [-17.389, -66.157],
  australia: [-25.274, 133.775],
  brazil: [-14.235, -51.925],
  canada: [56.13, -106.347],
  colombia: [4.571, -74.297],
  egypt: [26.821, 30.802],
  france: [46.228, 2.214],
  germany: [51.166, 10.452],
  india: [20.594, 78.963],
  indonesia: [-0.789, 113.921],
  mexico: [23.635, -102.553],
  pakistan: [30.375, 69.345],
  philippines: [12.88, 121.774],
  spain: [40.464, -3.749],
  sudan: [12.863, 30.218],
  venezuela: [6.424, -66.59],
  ukraine: [49.487, 31.272],
  kyiv: [50.45, 30.523],
  russia: [61.524, 105.318],
  moscow: [55.755, 37.617],
  israel: [31.046, 34.851],
  gaza: [31.416, 34.333],
  iran: [32.427, 53.688],
  lebanon: [33.854, 35.862],
  syria: [34.802, 38.996],
  yemen: [15.552, 48.516],
  china: [35.861, 104.195],
  taiwan: [23.697, 120.96],
  japan: [36.2048, 138.2529],
  turkey: [38.9637, 35.2433],
  europe: [48.8, 2.3],
  africa: [1.6508, 17.6791],
  'middle east': [31.5, 34.8],
  'united states': [38.907, -77.036],
};

function decodeEntities(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripHtml(text: string) {
  return decodeEntities(text)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreRisk(text: string): number {
  const lower = text.toLowerCase();
  let score = 1;
  for (const keyword of RISK_KEYWORDS) {
    if (lower.includes(keyword)) score += 2;
  }
  return Math.min(10, score);
}

function findCoords(text: string): [number, number] | null {
  const lower = text.toLowerCase();
  for (const [keyword, coords] of Object.entries(KEYWORD_COORDS)) {
    if (lower.includes(keyword)) return coords;
  }
  return null;
}

function getTagValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripHtml(match[1]) : '';
}

function parseRSSItems(
  xml: string,
  sourceName: string,
  country: string | null = null,
  coordsHint: [number, number] | null = null,
): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = getTagValue(itemXml, 'title');
    const description = getTagValue(itemXml, 'description');
    const link = getTagValue(itemXml, 'link');
    const pubDate = getTagValue(itemXml, 'pubDate') || new Date().toISOString();

    if (!title && !description) continue;

    items.push({
      title: title.length > 140 ? `${title.slice(0, 137)}...` : title,
      description,
      link,
      pubDate,
      source: sourceName,
      country,
      coordsHint,
    });
  }

  return items;
}

export async function GET() {
  try {
    const feedResults = await Promise.allSettled(
      RSS_FEEDS.map(async ({ source, url, country = null, coordsHint = null }): Promise<FeedItem[]> => {
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
            },
            cache: 'no-store',
          });
          if (!res.ok) return [];
          const xml = await res.text();
          return parseRSSItems(xml, source, country, coordsHint).slice(0, 12);
        } catch {
          return [];
        }
      })
    );

    const allArticles: FeedItem[] = [];
    for (const result of feedResults) {
      if (result.status === 'fulfilled') allArticles.push(...result.value);
    }

    const deduped = Array.from(
      new Map(
        allArticles
          .filter((article) => article.title || article.description)
          .map((article) => [article.link || `${article.source}:${article.title}`, article])
      ).values()
    );

    const newsItems: NewsItem[] = deduped.map((article) => {
      const summaryText = `${article.title} ${article.description}`.trim();
      const riskScore = scoreRisk(summaryText);
      const detectedCoords = findCoords(summaryText);
      const coords = detectedCoords ?? article.coordsHint;

      return {
        title: article.title,
        description: article.description,
        link: article.link,
        pubDate: article.pubDate,
        source: article.source,
        country: article.country,
        id: createHash('md5').update((article.link || '') + (article.pubDate || '') + article.title).digest('hex'),
        published: article.pubDate,
        risk_score: riskScore,
        coords: coords ? [coords[0], coords[1]] : null,
        coords_default: !detectedCoords && Boolean(coords),
        machine_assessment: riskScore >= 8 ? 'AI analysis indicates elevated priority based on real RSS coverage and keyword clustering.' : null,
      };
    });

    newsItems.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());

    return NextResponse.json(
      {
        news: newsItems.slice(0, 60),
        total: newsItems.length,
        sources: RSS_FEEDS.map((feed) => feed.source),
        activeSources: Array.from(new Set(newsItems.map((item) => item.source))),
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch {
    return NextResponse.json({ news: [], error: 'Failed to fetch verified news feeds' }, { status: 500 });
  }
}
