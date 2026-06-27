import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { POST } from '@/app/api/ai/analyze/route';

const context = {
  earthquakes: [],
  news: [],
  threats: [],
  cyberAlerts: [],
  timestamp: '2026-06-26T00:00:00.000Z',
};

describe('/api/ai/analyze', () => {
  it('returns 400 when query is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ context }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe('MISSING_QUERY');
  });

  it('returns local fallback analysis when no server or user key is configured', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Give me a quick risk picture',
        context,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.mode).toBe('local');
    expect(payload.model).toBe('aegis-local-analyst');
    expect(typeof payload.analysis).toBe('string');
    expect(payload.analysis.length).toBeGreaterThan(0);
  });
});
