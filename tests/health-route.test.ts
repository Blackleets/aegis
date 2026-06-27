import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/health/route';

function jsonResponse(status = 200, body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/health', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with ok status when critical probes succeed', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/markets') || url.includes('/api/news')) {
        return jsonResponse(200);
      }
      return jsonResponse(200);
    });

    const response = await GET(new NextRequest('http://localhost:3000/api/health'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe('ok');
    expect(payload.summary.criticalAvailable).toBe(payload.summary.criticalTotal);
  });

  it('returns 200 with degraded status when a critical self-probe times out but another critical probe succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/markets')) {
        return jsonResponse(200);
      }
      if (url.includes('/api/news')) {
        throw new Error('The operation was aborted due to timeout');
      }
      return jsonResponse(200);
    });

    const response = await GET(new NextRequest('http://localhost:3000/api/health'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe('degraded');
    expect(payload.summary.criticalAvailable).toBe(1);
    expect(payload.summary.criticalTotal).toBe(2);
    expect(payload.subsystems.find((subsystem: { key: string }) => subsystem.key === 'intel')?.status).toBe('degraded');
  });

  it('returns 503 with down status when all critical probes fail', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/markets') || url.includes('/api/news')) {
        return jsonResponse(503, { error: 'offline' });
      }
      return jsonResponse(200);
    });

    const response = await GET(new NextRequest('http://localhost:3000/api/health'));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.status).toBe('down');
    expect(payload.summary.criticalAvailable).toBe(0);
  });
});
