import { describe, expect, it } from 'vitest';
import {
  buildSituationalRadar,
  dedupeSituationalAlerts,
  earthquakeToAlert,
  filterAlertsByChip,
  isBlockedNewsSource,
  newsToAlert,
  pulseEventToAlert,
  rankSituationalAlerts,
  sanitizeSituationalAlert,
  weatherToAlert,
  type SituationalAlert,
} from '../src/lib/situational-alerts';

const now = Date.parse('2026-09-13T18:00:00.000Z');

function alert(partial: Partial<SituationalAlert> & Pick<SituationalAlert, 'id' | 'title'>): SituationalAlert {
  return {
    kind: 'other',
    severity: 'moderate',
    source: 'TEST',
    observedAt: now,
    ...partial,
  };
}

describe('sanitizeSituationalAlert (fail-closed)', () => {
  it('drops missing source, time, id, or title', () => {
    expect(sanitizeSituationalAlert({
      id: 'a',
      kind: 'news',
      title: 'Hello',
      severity: 'high',
      source: '',
      observedAt: now,
    })).toBeNull();

    expect(sanitizeSituationalAlert({
      id: '',
      kind: 'news',
      title: 'Hello',
      severity: 'high',
      source: 'BBC',
      observedAt: now,
    })).toBeNull();

    expect(sanitizeSituationalAlert({
      id: 'a',
      kind: 'news',
      title: '  ',
      severity: 'high',
      source: 'BBC',
      observedAt: now,
    })).toBeNull();

    expect(sanitizeSituationalAlert({
      id: 'a',
      kind: 'news',
      title: 'Hello',
      severity: 'high',
      source: 'BBC',
      observedAt: Number.NaN,
    })).toBeNull();
  });

  it('keeps optional coords when finite', () => {
    const clean = sanitizeSituationalAlert({
      id: 'a',
      kind: 'earthquake',
      title: 'M5.0',
      severity: 'high',
      source: 'USGS',
      observedAt: now,
      lat: 40.4,
      lng: -3.7,
    });
    expect(clean?.lat).toBe(40.4);
    expect(clean?.lng).toBe(-3.7);
  });
});

describe('news / telegram block', () => {
  it('blocks telegram sources and requires provenance', () => {
    expect(isBlockedNewsSource({ source: 'Telegram Channel', link: 'https://example.com' })).toBe(true);
    expect(isBlockedNewsSource({ source: 'BBC', link: 'https://t.me/foo' })).toBe(true);
    expect(newsToAlert({
      id: 'n1',
      title: 'Breaking',
      source: 'Telegram OSINT',
      published: new Date(now).toISOString(),
    })).toBeNull();
    expect(newsToAlert({
      id: 'n2',
      title: 'Verified brief',
      source: 'BBC World',
      published: new Date(now).toISOString(),
      risk_score: 7,
    })?.severity).toBe('high');
  });
});

describe('mappers', () => {
  it('maps pulse + quake + weather with provenance', () => {
    const pulse = pulseEventToAlert({
      id: 'gdacs:1',
      kind: 'storm',
      title: 'Cyclone TEST',
      detail: 'Orange',
      severity: 'elevated',
      lat: 12,
      lng: -60,
      observed_at: new Date(now).toISOString(),
      source: 'GDACS',
      source_url: 'https://gdacs.org/1',
    });
    expect(pulse?.kind).toBe('storm');
    expect(pulse?.severity).toBe('high');
    expect(pulse?.source).toBe('GDACS');

    const quake = earthquakeToAlert({
      id: 'us123',
      magnitude: 6.4,
      place: 'Near coast',
      lat: 35,
      lng: 25,
      time: now,
      tsunami: true,
      depth: 10,
    });
    expect(quake?.id).toBe('quake:us123');
    expect(quake?.severity).toBe('critical');

    expect(weatherToAlert({
      id: 'w1',
      title: 'Gale Warning',
      severity: 'low',
      lat: 40,
      lng: -70,
      date: new Date(now).toISOString(),
      provider: 'NOAA/NWS',
    })).toBeNull();

    expect(weatherToAlert({
      id: 'w2',
      title: 'Severe Thunderstorm',
      severity: 'high',
      lat: 40,
      lng: -70,
      date: new Date(now).toISOString(),
      provider: 'NOAA/NWS',
      category: 'severeStorms',
    })?.kind).toBe('storm');
  });
});

describe('dedupe + rank + merge', () => {
  it('dedupes by id and approx coords+title', () => {
    const a = alert({
      id: 'quake:us1',
      kind: 'earthquake',
      title: 'M5.2 · Madrid',
      severity: 'high',
      source: 'USGS',
      lat: 40.41,
      lng: -3.70,
      observedAt: now - 60_000,
    });
    const b = alert({
      id: 'pulse:quake:us1-alt',
      kind: 'earthquake',
      title: 'M5.2 · Madrid',
      severity: 'critical',
      source: 'World Pulse',
      lat: 40.42,
      lng: -3.71,
      observedAt: now,
    });
    const deduped = dedupeSituationalAlerts([a, b]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].severity).toBe('critical');
  });

  it('ranks critical before fresher moderate', () => {
    const ranked = rankSituationalAlerts([
      alert({ id: '1', title: 'Fresh low', severity: 'moderate', observedAt: now }),
      alert({ id: '2', title: 'Older critical', severity: 'critical', observedAt: now - 3_600_000 }),
    ]);
    expect(ranked[0].id).toBe('2');
  });

  it('builds radar, caps ~40, marks degraded when a source errors', () => {
    const news = Array.from({ length: 30 }, (_, i) => ({
      id: `n${i}`,
      title: `Story ${i}`,
      source: 'Al Jazeera',
      published: new Date(now - i * 60_000).toISOString(),
      risk_score: 3,
    }));
    const quakes = Array.from({ length: 20 }, (_, i) => ({
      id: `q${i}`,
      magnitude: 4 + (i % 3) * 0.5,
      place: `Place ${i}`,
      lat: 10 + i * 0.2,
      lng: 20 + i * 0.2,
      time: now - i * 120_000,
    }));

    const snapshot = buildSituationalRadar({
      pulseEvents: [{
        id: 'gdacs:9',
        kind: 'flood',
        title: 'Flood alert',
        severity: 'critical',
        lat: 1,
        lng: 2,
        observed_at: new Date(now).toISOString(),
        source: 'GDACS',
      }],
      pulseStatus: 'ok',
      earthquakes: quakes,
      quakeStatus: 'ok',
      news,
      newsStatus: 'error',
      weatherStatus: 'skipped',
      limit: 40,
      now,
    });

    expect(snapshot.alerts.length).toBeLessThanOrEqual(40);
    expect(snapshot.alerts[0].severity).toBe('critical');
    expect(snapshot.status).toBe('degraded');
    expect(snapshot.sources.find((s) => s.name === 'News')?.status).toBe('error');
    expect(snapshot.sources.find((s) => s.name === 'Weather')?.status).toBe('skipped');
  });

  it('filters chips Tierra / Clima / Noticias', () => {
    const list: SituationalAlert[] = [
      alert({ id: '1', title: 'q', kind: 'earthquake' }),
      alert({ id: '2', title: 's', kind: 'storm' }),
      alert({ id: '3', title: 'n', kind: 'news' }),
      alert({ id: '4', title: 'c', kind: 'conflict' }),
    ];
    expect(filterAlertsByChip(list, 'tierra').map((a) => a.id)).toEqual(['1']);
    expect(filterAlertsByChip(list, 'clima').map((a) => a.id)).toEqual(['2']);
    expect(filterAlertsByChip(list, 'noticias').map((a) => a.id)).toEqual(['3']);
    expect(filterAlertsByChip(list, 'conflicto').map((a) => a.id)).toEqual(['4']);
  });

  it('never invents events when all sources empty/error', () => {
    const snapshot = buildSituationalRadar({
      pulseEvents: [],
      pulseStatus: 'error',
      earthquakes: [],
      quakeStatus: 'error',
      news: [],
      newsStatus: 'error',
      weatherStatus: 'skipped',
      now,
    });
    expect(snapshot.alerts).toEqual([]);
    expect(snapshot.status).toBe('unavailable');
  });
});
