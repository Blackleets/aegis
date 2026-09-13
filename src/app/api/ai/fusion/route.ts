/**
 * WORLDWATCH — Fusion Dossier Endpoint
 * POST /api/ai/fusion
 * Supports BYOK, server keys, and a zero-cost local fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeIntelligence,
  createGeminiClient,
  rotateApiKey,
  generateLocalFusionDossier,
  type IntelligenceContext,
} from '@/lib/ai-engine';
import {
  collectContextSources,
  hardenFusionDossier,
  type HardenedFusionDossier,
} from '@/lib/ontology/fusion-claims';

export const dynamic = 'force-dynamic';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetIn: entry.resetAt - now };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of Array.from(rateLimitMap.entries())) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 120_000);

function getEnvApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) keys.push(key.trim());
  }
  return keys;
}

interface FusionRequestBody {
  context: IntelligenceContext;
}

interface FusionDossier {
  bluf: string;
  blufAvailable?: boolean;
  riskLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW';
  confidence: 'HIGH' | 'MODERATE' | 'LOW';
  hotspots: string[];
  priorityActions: string[];
  watchlist: string[];
  claims?: HardenedFusionDossier['claims'];
  unavailable?: HardenedFusionDossier['unavailable'];
}

interface FusionResponse {
  dossier: FusionDossier;
  generatedAt: string;
  mode?: 'premium' | 'local';
}

interface ErrorResponse {
  error: string;
  code: string;
  retryAfter?: number;
}

const FUSION_PROMPT = `Generate a cross-domain fusion dossier from the current operational dataset.
Return ONLY valid JSON with this exact schema:
{
  "bluf": "string",
  "riskLevel": "CRITICAL|HIGH|ELEVATED|LOW",
  "confidence": "HIGH|MODERATE|LOW",
  "hotspots": ["string"],
  "priorityActions": ["string"],
  "watchlist": ["string"]
}
Rules:
- Use concise executive language.
- Mention concrete regions, systems, or themes from the dataset.
- priorityActions must be action-oriented.
- watchlist should contain near-term developments to monitor.
- If evidence is weak, lower confidence instead of inventing facts.
- Never invent sources, timestamps, or live counters.
- Cite only sources already present in the operational data.`;

function extractJsonObject(rawText: string): FusionDossier {
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model did not return valid JSON');
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<FusionDossier>;
  return {
    bluf: typeof parsed.bluf === 'string' ? parsed.bluf : 'No BLUF generated.',
    riskLevel:
      parsed.riskLevel === 'CRITICAL' || parsed.riskLevel === 'HIGH' || parsed.riskLevel === 'ELEVATED' || parsed.riskLevel === 'LOW'
        ? parsed.riskLevel
        : 'ELEVATED',
    confidence:
      parsed.confidence === 'HIGH' || parsed.confidence === 'MODERATE' || parsed.confidence === 'LOW'
        ? parsed.confidence
        : 'MODERATE',
    hotspots: Array.isArray(parsed.hotspots) ? parsed.hotspots.filter((item): item is string => typeof item === 'string') : [],
    priorityActions: Array.isArray(parsed.priorityActions)
      ? parsed.priorityActions.filter((item): item is string => typeof item === 'string')
      : [],
    watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist.filter((item): item is string => typeof item === 'string') : [],
  };
}

function shapeFusionDossier(dossier: FusionDossier, context: IntelligenceContext): FusionDossier {
  const hardened = hardenFusionDossier(dossier, {
    contextSources: collectContextSources(context),
  });
  return {
    bluf: hardened.bluf,
    blufAvailable: hardened.blufAvailable,
    riskLevel: dossier.riskLevel,
    confidence: dossier.confidence,
    hotspots: hardened.hotspots,
    priorityActions: hardened.priorityActions,
    watchlist: hardened.watchlist,
    claims: hardened.claims,
    unavailable: hardened.unavailable,
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<FusionResponse | ErrorResponse>> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Maximum 5 requests per minute.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil(rateCheck.resetIn / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  let body: FusionRequestBody;
  try {
    body = (await request.json()) as FusionRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  if (!body.context) {
    return NextResponse.json(
      { error: 'Intelligence context is required.', code: 'MISSING_CONTEXT' },
      { status: 400 }
    );
  }

  const userKey = request.headers.get('x-gemini-key')?.trim();
  const envKeys = getEnvApiKeys();
  const apiKey = userKey && userKey.length > 0 ? userKey : envKeys.length > 0 ? rotateApiKey(envKeys) : '';

  if (!apiKey) {
    return NextResponse.json(
      {
        dossier: shapeFusionDossier(generateLocalFusionDossier(body.context), body.context),
        generatedAt: new Date().toISOString(),
        mode: 'local',
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );
  }

  try {
    const client = createGeminiClient(apiKey);
    const raw = await analyzeIntelligence(client, body.context, FUSION_PROMPT);
    const dossier = extractJsonObject(raw);

    return NextResponse.json(
      {
        dossier: shapeFusionDossier(dossier, body.context),
        generatedAt: new Date().toISOString(),
        mode: 'premium',
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown Gemini API error';

    if (userKey && (message.includes('API_KEY_INVALID') || message.includes('API key not valid'))) {
      return NextResponse.json(
        { error: 'Invalid Gemini API key. Please check your configuration.', code: 'INVALID_KEY' },
        { status: 401 }
      );
    }

    if (message.includes('SAFETY')) {
      return NextResponse.json(
        {
          error: 'Response blocked by Gemini safety filters. Try again.',
          code: 'SAFETY_BLOCKED',
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        dossier: shapeFusionDossier(generateLocalFusionDossier(body.context), body.context),
        generatedAt: new Date().toISOString(),
        mode: 'local',
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );
  }
}
