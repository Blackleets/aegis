/**
 * ═══════════════════════════════════════════════════════════════
 *  AEGIS — Fusion Dossier Endpoint
 *  POST /api/ai/fusion
 *  Generates structured cross-domain fusion dossiers via Gemini
 * ═══════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeIntelligence,
  createGeminiClient,
  rotateApiKey,
  type IntelligenceContext,
} from '@/lib/ai-engine';

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
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 120_000);

function getEnvApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) {
      keys.push(key.trim());
    }
  }
  return keys;
}

interface FusionRequestBody {
  context: IntelligenceContext;
}

interface FusionDossier {
  bluf: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW';
  confidence: 'HIGH' | 'MODERATE' | 'LOW';
  hotspots: string[];
  priorityActions: string[];
  watchlist: string[];
}

interface FusionResponse {
  dossier: FusionDossier;
  generatedAt: string;
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
- If evidence is weak, lower confidence instead of inventing facts.`;

function extractJsonObject(rawText: string): FusionDossier {
  const cleaned = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

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

  const userKey = request.headers.get('x-gemini-key')?.trim();
  let apiKey = '';

  if (userKey && userKey.length > 0) {
    apiKey = userKey;
  } else {
    const envKeys = getEnvApiKeys();
    if (envKeys.length === 0) {
      return NextResponse.json(
        {
          error:
            'No Gemini API key configured. Set GEMINI_API_KEY_1 in environment or provide a key via the settings panel.',
          code: 'NO_API_KEY',
        },
        { status: 503 }
      );
    }
    apiKey = rotateApiKey(envKeys);
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

  try {
    const client = createGeminiClient(apiKey);
    const raw = await analyzeIntelligence(client, body.context, FUSION_PROMPT);
    const dossier = extractJsonObject(raw);

    return NextResponse.json(
      {
        dossier,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown Gemini API error';

    if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
      return NextResponse.json(
        { error: 'Invalid Gemini API key. Please check your configuration.', code: 'INVALID_KEY' },
        { status: 401 }
      );
    }

    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
      return NextResponse.json(
        {
          error: 'Gemini API quota exhausted. Try again later or provide your own API key.',
          code: 'QUOTA_EXHAUSTED',
        },
        { status: 429 }
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

    console.error('[AEGIS AI] Fusion dossier error:', message);
    return NextResponse.json(
      { error: 'Fusion dossier generation failed. Please try again.', code: 'FUSION_FAILED' },
      { status: 500 }
    );
  }
}
