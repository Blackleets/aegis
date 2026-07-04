import { NextRequest, NextResponse } from 'next/server';
import {
  createGeminiClient,
  rotateApiKey,
  analyzeIntelligence,
  generateLocalAnalysis,
  type IntelligenceContext,
} from '@/lib/ai-engine';
import { runHermesPrompt } from '@/lib/hermes-ops';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface HermesAnalyzeBody {
  query: string;
  context: IntelligenceContext;
}

function getEnvApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 8; i += 1) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) keys.push(key.trim());
  }
  return keys;
}

export async function POST(request: NextRequest) {
  let body: HermesAnalyzeBody;

  try {
    body = (await request.json()) as HermesAnalyzeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.', code: 'INVALID_BODY' }, { status: 400 });
  }

  if (!body?.query?.trim()) {
    return NextResponse.json({ error: 'Query is required.', code: 'MISSING_QUERY' }, { status: 400 });
  }

  if (!body.context) {
    return NextResponse.json({ error: 'Intelligence context is required.', code: 'MISSING_CONTEXT' }, { status: 400 });
  }

  try {
    const hermes = await runHermesPrompt(body.query.trim(), body.context);

    if (hermes.mode === 'hermes' && hermes.output) {
      return NextResponse.json({
        analysis: hermes.output,
        mode: 'hermes',
        runtime: hermes.metadata.runtime,
        available: hermes.available,
        commandTried: hermes.commandTried,
        timestamp: new Date().toISOString(),
        metadata: hermes.metadata,
      });
    }

    const userKey = request.headers.get('x-gemini-key')?.trim();
    const envKeys = getEnvApiKeys();
    const apiKey = userKey && userKey.length > 0 ? userKey : envKeys.length > 0 ? rotateApiKey(envKeys) : '';

    if (apiKey) {
      try {
        const client = createGeminiClient(apiKey);
        const analysis = await analyzeIntelligence(client, body.context, body.query.trim());
        return NextResponse.json({
          analysis,
          mode: 'fallback-premium',
          runtime: 'aegis-fallback',
          available: hermes.available,
          commandTried: hermes.commandTried,
          timestamp: new Date().toISOString(),
          metadata: hermes.metadata,
        });
      } catch {
        // fall through to local fallback below
      }
    }

    return NextResponse.json({
      analysis: generateLocalAnalysis(body.context, body.query.trim()),
      mode: 'fallback-local',
      runtime: 'aegis-fallback',
      available: hermes.available,
      commandTried: hermes.commandTried,
      timestamp: new Date().toISOString(),
      metadata: hermes.metadata,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Hermes execution failed';
    return NextResponse.json(
      {
        error: message,
        code: 'HERMES_EXECUTION_FAILED',
      },
      { status: 500 }
    );
  }
}
