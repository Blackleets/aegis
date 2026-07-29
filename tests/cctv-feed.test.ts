import { describe, expect, it, vi } from 'vitest';
import {
  buildCctvFrameUrl,
  inferCctvRefreshIntervalSeconds,
  isLikelySnapshotUrl,
  normalizeCctvDelivery,
} from '../src/lib/cctv-feed';

describe('CCTV feed delivery', () => {
  it('keeps real snapshot URLs and adds near-live metadata', () => {
    const camera = normalizeCctvDelivery({
      feed_url: 'https://example.com/camera/current.jpg',
      source: 'Road authority',
    }, '2026-07-29T20:00:00.000Z');

    expect(camera).toMatchObject({
      stream_type: 'jpg',
      live_mode: 'snapshot',
      refresh_interval_seconds: 15,
      captured_at: '2026-07-29T20:00:00.000Z',
    });
  });

  it('does not pretend API and HTML pages are camera images', () => {
    expect(isLikelySnapshotUrl('https://511on.ca/api/v2/get/cameras')).toBe(false);
    expect(isLikelySnapshotUrl('https://traffic.ottawa.ca/map/camera?id=6')).toBe(false);

    const camera = normalizeCctvDelivery({
      feed_url: 'https://traffic.ottawa.ca/map/camera?id=6',
      source: 'Ottawa',
    }, '2026-07-29T20:00:00.000Z');

    expect(camera.feed_url).toBeUndefined();
    expect(camera.external_url).toBe('https://traffic.ottawa.ca/map/camera?id=6');
    expect(camera.live_mode).toBe('external');
  });

  it('preserves continuous video streams', () => {
    const camera = normalizeCctvDelivery({
      stream_url: 'https://example.com/live/camera.m3u8',
      stream_type: 'hls' as const,
    }, '2026-07-29T20:00:00.000Z');

    expect(camera.live_mode).toBe('video');
    expect(camera.stream_url).toContain('.m3u8');
  });

  it('builds a same-origin, cache-busting frame URL', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    const url = buildCctvFrameUrl('https://example.com/cam.jpg?view=1', 7);

    expect(url).toBe('/api/cctv/frame?url=https%3A%2F%2Fexample.com%2Fcam.jpg%3Fview%3D1&_t=1234-7');
    vi.restoreAllMocks();
  });

  it('honours safe provider cadence limits', () => {
    expect(inferCctvRefreshIntervalSeconds({ source: 'Alberta 511' })).toBe(60);
    expect(inferCctvRefreshIntervalSeconds({ refresh_interval_seconds: 1 })).toBe(5);
  });
});
