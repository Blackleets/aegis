import { NextResponse } from 'next/server';
import { safeFetch, isRateLimited, getClientIp } from '@/lib/ssrf-guard';
import { matchExact, type SanctionEntry } from '@/lib/sanctions';

interface RdapEvent {
  action?: string;
  date?: string;
}

interface RdapEntitySummary {
  handle?: string;
  roles?: string[];
  name?: string;
  org?: string;
}

interface WhoisResults {
  domain: string;
  timestamp: string;
  rdap?: {
    handle?: string;
    name?: string;
    status?: string[];
    events: RdapEvent[];
    nameservers: string[];
    entities: RdapEntitySummary[];
  };
  registration?: string;
  expiration?: string;
  last_changed?: string;
  http?: {
    status: number;
    headers: Record<string, string>;
    redirected: boolean;
    final_url: string;
  };
  security_score?: {
    score: number;
    max: number;
    grade: 'A' | 'B' | 'C' | 'F';
  };
  sanctions_match?: {
    source: string;
    hits: Array<{ matched_value: string; entries: SanctionEntry[] }>;
  } | null;
}

interface RdapEventRaw {
  eventAction?: string;
  eventDate?: string;
}

interface VCardEntry extends Array<string | string[] | undefined> {
  0: string;
  3?: string | string[];
}

interface RdapEntityRaw {
  handle?: string;
  roles?: string[];
  vcardArray?: [string, VCardEntry[]?];
}

interface RdapResponseRaw {
  handle?: string;
  ldhName?: string;
  status?: string[];
  events?: RdapEventRaw[];
  nameservers?: Array<{ ldhName?: string }>;
  entities?: RdapEntityRaw[];
}

function extractVcardValue(entity: RdapEntityRaw, field: string): string | undefined {
  const rows = entity.vcardArray?.[1];
  if (!Array.isArray(rows)) return undefined;
  const entry = rows.find((row) => row[0] === field);
  const value = entry?.[3];
  if (Array.isArray(value)) return value.join(' ');
  return typeof value === 'string' ? value : undefined;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp, 20, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  try {
    const results: WhoisResults = { domain, timestamp: new Date().toISOString() };

    try {
      const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json() as RdapResponseRaw;
        const events: RdapEvent[] = (data.events || []).map((event) => ({
          action: event.eventAction,
          date: event.eventDate,
        }));
        const entities: RdapEntitySummary[] = (data.entities || [])
          .map((entity) => ({
            handle: entity.handle,
            roles: entity.roles,
            name: extractVcardValue(entity, 'fn'),
            org: extractVcardValue(entity, 'org'),
          }))
          .filter((entity) => entity.name || entity.org);

        results.rdap = {
          handle: data.handle,
          name: data.ldhName,
          status: data.status,
          events,
          nameservers: (data.nameservers || []).flatMap((nameserver) => nameserver.ldhName ? [nameserver.ldhName] : []),
          entities,
        };

        results.registration = events.find((event) => event.action === 'registration')?.date;
        results.expiration = events.find((event) => event.action === 'expiration')?.date;
        results.last_changed = events.find((event) => event.action === 'last changed')?.date;
      }
    } catch (error) {
      console.warn('[OSIRIS] Suppressed error:', error instanceof Error ? error.message : error);
    }

    try {
      const res = await safeFetch(`https://${domain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
        maxRedirects: 3,
      });
      const headers: Record<string, string> = {};
      ['server', 'x-powered-by', 'x-frame-options', 'strict-transport-security', 'content-security-policy', 'x-content-type-options', 'x-xss-protection', 'referrer-policy', 'permissions-policy'].forEach((header) => {
        const value = res.headers.get(header);
        if (value) headers[header] = value;
      });
      results.http = {
        status: res.status,
        headers,
        redirected: res.redirected,
        final_url: res.url,
      };

      let score = 0;
      if (headers['strict-transport-security']) score += 2;
      if (headers['content-security-policy']) score += 2;
      if (headers['x-frame-options']) score += 1;
      if (headers['x-content-type-options']) score += 1;
      if (headers['referrer-policy']) score += 1;
      results.security_score = {
        score,
        max: 7,
        grade: score >= 5 ? 'A' : score >= 3 ? 'B' : score >= 1 ? 'C' : 'F',
      };
    } catch (error) {
      console.warn('[OSIRIS] Suppressed error:', error instanceof Error ? error.message : error);
    }

    try {
      const candidates = new Set<string>();
      for (const entity of results.rdap?.entities ?? []) {
        if (entity.name) candidates.add(entity.name);
        if (entity.org) candidates.add(entity.org);
      }
      const hits: Array<{ matched_value: string; entries: SanctionEntry[] }> = [];
      for (const value of Array.from(candidates)) {
        const entries = await matchExact(value);
        if (entries.length) hits.push({ matched_value: value, entries });
      }
      results.sanctions_match = hits.length ? { source: 'OFAC SDN', hits } : null;
    } catch (error) {
      console.warn('[OSIRIS] Sanctions cross-check failed:', error instanceof Error ? error.message : error);
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'WHOIS lookup failed' }, { status: 500 });
  }
}
