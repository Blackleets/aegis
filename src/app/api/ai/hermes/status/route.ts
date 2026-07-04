import { NextResponse } from 'next/server';
import { getHermesRuntimeStatus } from '@/lib/hermes-ops';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const status = await getHermesRuntimeStatus();
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to inspect Hermes runtime';
    return NextResponse.json(
      {
        available: false,
        command: null,
        runtime: 'aegis-fallback',
        mode: 'hybrid-fallback',
        reason: message,
        detectedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
