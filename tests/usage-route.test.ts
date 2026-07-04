import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '@/app/api/usage/route';
import * as fs from 'fs';

describe('/api/usage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 for invalid JSON bodies', async () => {
    const request = new NextRequest('http://localhost:3000/api/usage', {
      method: 'POST',
      body: '{bad json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('invalid request body');
  });

  it('returns 400 when sessionId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/usage', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('sessionId is required');
  });

  it('falls back to in-memory metrics when filesystem writes fail', async () => {
    vi.spyOn(fs.promises, 'mkdir').mockRejectedValue(new Error('read-only file system'));

    const first = new NextRequest('http://localhost:3000/api/usage', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-a' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const second = new NextRequest('http://localhost:3000/api/usage', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'session-b' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const firstResponse = await POST(first);
    const firstPayload = await firstResponse.json();
    const secondResponse = await POST(second);
    const secondPayload = await secondResponse.json();
    const snapshotResponse = await GET();
    const snapshotPayload = await snapshotResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstPayload.totalUsers).toBe(1);
    expect(secondResponse.status).toBe(200);
    expect(secondPayload.totalUsers).toBe(2);
    expect(snapshotResponse.status).toBe(200);
    expect(snapshotPayload.totalUsers).toBe(2);
    expect(snapshotPayload.onlineUsers).toBe(2);
  });
});
