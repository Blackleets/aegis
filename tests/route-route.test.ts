import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/route/route';

function jsonResponse(status = 200, body: unknown = { code: 'Ok', routes: [] }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 when any route coordinate is invalid', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/route?fromLat=abc&fromLng=-3.7&toLat=40.4&toLng=-3.6'));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid route coordinates');
  });

  it('returns 400 when any waypoint coordinate is invalid', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/route?fromLat=40.4168&fromLng=-3.7038&toLat=41.3874&toLng=2.1686&via=bad-stop'));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid waypoint coordinates');
  });

  it('returns 504 when the upstream router times out', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));

    const response = await GET(new NextRequest('http://localhost:3000/api/route?fromLat=40.4168&fromLng=-3.7038&toLat=41.3874&toLng=2.1686&mode=driving'));
    const payload = await response.json();

    expect(response.status).toBe(504);
    expect(payload.error).toBe('Routing upstream timeout');
  });

  it('returns 500 when route computation fails for a non-timeout reason', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('boom'));

    const response = await GET(new NextRequest('http://localhost:3000/api/route?fromLat=40.4168&fromLng=-3.7038&toLat=41.3874&toLng=2.1686&mode=walking'));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe('Failed to compute route');
  });

  it('normalizes the primary route and alternatives from OSRM', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(200, {
        code: 'Ok',
        routes: [
          {
            distance: 621500,
            duration: 22500,
            geometry: {
              coordinates: [[-3.7038, 40.4168], [-0.1276, 51.5072]],
            },
            legs: [
              {
                steps: [
                  {
                    distance: 1000,
                    duration: 120,
                    name: 'A-2',
                    mode: 'driving',
                    geometry: { coordinates: [[-3.7038, 40.4168], [-3.5, 40.6]] },
                    maneuver: {
                      type: 'depart',
                      modifier: 'north',
                      location: [-3.7038, 40.4168],
                      bearing_after: 15,
                      bearing_before: 0,
                    },
                  },
                  {
                    distance: 500,
                    duration: 60,
                    geometry: { coordinates: [[-3.5, 40.6], [-3.4, 40.7]] },
                    maneuver: {
                      type: 'roundabout',
                      exit: 2,
                      location: [-3.5, 40.6],
                    },
                  },
                ],
              },
            ],
          },
          {
            distance: 640000,
            duration: 24000,
            geometry: {
              coordinates: [[-3.7038, 40.4168], [2.1686, 41.3874]],
            },
            legs: [{ steps: [] }],
          },
        ],
      }),
    );

    const response = await GET(new NextRequest('http://localhost:3000/api/route?fromLat=40.4168&fromLng=-3.7038&toLat=41.3874&toLng=2.1686&mode=cycling&via=41.0000,-1.2000&via=41.1200,0.5000'));
    const payload = await response.json();
    const upstreamUrl = String(fetchSpy.mock.calls[0]?.[0]);

    expect(response.status).toBe(200);
    expect(payload.mode).toBe('cycling');
    expect(payload.routeId).toBe('route-primary');
    expect(payload.distanceMeters).toBe(621500);
    expect(payload.durationSeconds).toBe(22500);
    expect(payload.bbox).toEqual([-3.7038, 40.4168, -0.1276, 51.5072]);
    expect(payload.steps).toHaveLength(2);
    expect(payload.steps[0].instruction).toBe('Head north on A-2');
    expect(payload.steps[1].instruction).toBe('Enter the roundabout and take exit 2');
    expect(payload.alternatives).toHaveLength(2);
    expect(payload.alternatives[1].id).toBe('route-alt-1');
    expect(payload.alternatives[1].label).toBe('ALT 1');
    expect(payload.waypoints).toEqual([
      { lat: 41, lng: -1.2 },
      { lat: 41.12, lng: 0.5 },
    ]);
    expect(upstreamUrl).toContain('/route/v1/bike/');
    expect(upstreamUrl).toContain('-3.7038,40.4168;-1.2,41;0.5,41.12;2.1686,41.3874');
  });
});
