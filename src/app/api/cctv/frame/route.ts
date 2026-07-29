import { NextResponse } from 'next/server';
import { getClientIp, isRateLimited, safeFetch } from '@/lib/ssrf-guard';

export const dynamic = 'force-dynamic';

const MAX_FRAME_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = /^image\/(?:avif|gif|jpeg|png|webp)(?:;|$)/i;

export async function GET(request: Request) {
  if (isRateLimited(`cctv-frame:${getClientIp(request)}`, 180, 60_000)) {
    return NextResponse.json({ error: 'Frame refresh limit reached' }, { status: 429 });
  }

  const sourceUrl = new URL(request.url).searchParams.get('url');
  if (!sourceUrl) {
    return NextResponse.json({ error: 'Missing camera URL' }, { status: 400 });
  }

  try {
    const upstreamUrl = new URL(sourceUrl);
    upstreamUrl.searchParams.set('_aegis_frame', Date.now().toString());

    const response = await safeFetch(upstreamUrl.toString(), {
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.2',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'User-Agent': 'Mozilla/5.0 (compatible; AEGIS-CCTV/1.0; +https://github.com/Blackleets/aegis)',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Camera provider unavailable' }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!ALLOWED_IMAGE_TYPES.test(contentType)) {
      return NextResponse.json({ error: 'Camera source did not return an image' }, { status: 415 });
    }

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_FRAME_BYTES) {
      return NextResponse.json({ error: 'Camera frame is too large' }, { status: 413 });
    }

    const frame = await response.arrayBuffer();
    if (frame.byteLength === 0 || frame.byteLength > MAX_FRAME_BYTES) {
      return NextResponse.json({ error: 'Invalid camera frame size' }, { status: frame.byteLength > MAX_FRAME_BYTES ? 413 : 502 });
    }

    return new NextResponse(frame, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': frame.byteLength.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Camera frame could not be loaded safely' }, { status: 502 });
  }
}
