/**
 * WORLDWATCH — AI Briefing Endpoint
 * POST /api/ai/briefing
 * Supports BYOK, server keys, and a zero-cost local fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createGeminiClient,
  rotateApiKey,
  generateBriefing,
  generateLocalBriefing,
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

interface BriefingRequestBody {
  context: IntelligenceContext;
}

interface BriefingResponse {
  briefing: string;
  generatedAt: string;
  mode?: 'premium' | 'local';
}

interface ErrorResponse {
  error: string;
  code: string;
  retryAfter?: number;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<BriefingResponse | ErrorResponse>> {
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

  let body: BriefingRequestBody;
  try {
    body = (await request.json()) as BriefingRequestBody;
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
        briefing: generateLocalBriefing(body.context),
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
    const briefing = await generateBriefing(client, body.context);

    return NextResponse.json(
      {
        briefing,
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
        briefing: generateLocalBriefing(body.context),
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
