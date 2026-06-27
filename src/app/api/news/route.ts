import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

interface FeedItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
}

interface NewsItem extends FeedItem {
  id: string;
  published: string;
  risk_score: number;
  coords: [number, number] | null;
  coords_default: boolean;
  machine_assessment: string | null;
}

const RSS_FEEDS: Array<{ source: string; url: string }> = [
  { source: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { source: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { source: 'GDACS', url: 'https://www.gdacs.org/xml/rss.xml' },
];

const RISK_KEYWORDS = [
  'war', 'missile', 'strike', 'attack', 'crisis', 'tension', 'military', 'conflict', 'defense', 'clash',
  'nuclear', 'invasion', 'bomb', 'drone', 'weapon', 'sanctions', 'ceasefire', 'escalation', 'killed',
  'destroyed', 'operation', 'casualty', 'frontline', 'threat', 'earthquake', 'tsunami', 'eruption', 'flood',
];

const KEYWORD_COORDS: Record<string, [number, number]> = {
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

function parseRSSItems(xml: string, sourceName: string): FeedItem[] {
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
    });
  }

  return items;
}

export async function GET() {
  try {
    const feedResults = await Promise.allSettled(
      RSS_FEEDS.map(async ({ source, url }): Promise<FeedItem[]> => {
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
          return parseRSSItems(xml, source).slice(0, 8);
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
      const coords = findCoords(summaryText);

      return {
        ...article,
        id: createHash('md5').update((article.link || '') + (article.pubDate || '') + article.title).digest('hex'),
        published: article.pubDate,
        risk_score: riskScore,
        coords: coords ? [coords[0], coords[1]] : null,
        coords_default: !coords,
        machine_assessment: riskScore >= 8 ? 'AI analysis indicates elevated priority based on real RSS coverage and keyword clustering.' : null,
      };
    });

    newsItems.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());

    return NextResponse.json(
      {
        news: newsItems.slice(0, 24),
        total: newsItems.length,
        sources: RSS_FEEDS.map((feed) => feed.source),
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
