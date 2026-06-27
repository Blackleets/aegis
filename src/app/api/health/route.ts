import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { collectHealthSnapshot } from '@/lib/health';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin || 'http://127.0.0.1:3000';
  const payload = await collectHealthSnapshot(origin);

  const statusCode = payload.status === 'ok' ? 200 : payload.status === 'degraded' ? 200 : 503;

  return NextResponse.json(payload, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
