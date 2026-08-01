import { describe, expect, it } from 'vitest';
import {
  BrowserCommunityIncidentRepository,
  COMMUNITY_REPORTER_STORAGE_KEY,
  createBrowserCommunityIncidentService,
  getOrCreateCommunityReporterId,
  parseStoredIncidents,
} from '../src/lib/browser-community-incidents';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('browser community incident repository', () => {
  it('persists reports through the existing community incident service', async () => {
    const storage = memoryStorage();
    const service = createBrowserCommunityIncidentService(storage);
    await service.report({
      kind: 'road_hazard',
      location: { latitude: 40.4168, longitude: -3.7038 },
      reporterId: 'local-driver',
      reportedAt: '2026-07-29T20:00:00.000Z',
    });

    const restored = await new BrowserCommunityIncidentRepository(storage).list();
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ kind: 'road_hazard', reportCount: 1 });
  });

  it('keeps a stable anonymous local reporter identity', () => {
    const storage = memoryStorage();
    expect(getOrCreateCommunityReporterId(storage, () => 'device-a')).toBe('local-device-a');
    expect(getOrCreateCommunityReporterId(storage, () => 'device-b')).toBe('local-device-a');
    expect(storage.getItem(COMMUNITY_REPORTER_STORAGE_KEY)).toBe('local-device-a');
  });

  it('rejects malformed persisted data', () => {
    expect(parseStoredIncidents('not-json')).toEqual([]);
    expect(parseStoredIncidents(JSON.stringify([{ id: 'fake' }]))).toEqual([]);
  });

  it('does not reject a report when mobile storage writes are blocked', async () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
    };
    const service = createBrowserCommunityIncidentService(storage);

    await expect(service.report({
      kind: 'accident',
      location: { latitude: 40.4168, longitude: -3.7038 },
      reporterId: 'local-driver',
      reportedAt: '2026-08-01T18:00:00.000Z',
    })).resolves.toMatchObject({ kind: 'accident' });
  });

  it('treats blocked storage reads as an empty incident list', async () => {
    const storage = {
      getItem: () => {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
      setItem: () => undefined,
    };

    await expect(new BrowserCommunityIncidentRepository(storage).list()).resolves.toEqual([]);
  });

  it('creates a fallback reporter id when randomUUID and storage are unavailable', () => {
    const storage = {
      getItem: () => {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
    };

    const reporterId = getOrCreateCommunityReporterId(storage, () => {
      throw new Error('randomUUID unavailable');
    });

    expect(reporterId).toMatch(/^local-fallback-/);
  });
});
