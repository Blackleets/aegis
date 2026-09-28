import { describe, expect, it } from 'vitest';
import {
  buildWorldPulseSnapshot,
  earthquakeToPulseEvent,
  eonetToPulseEvent,
  FIRE_ELEVATED_FRP_MW,
  fireToPulseEvent,
  GDACS_MAX_AGE_MS,
  gdacsToPulseEvent,
  parseGdacsDate,
  sanitizeWorldPulseEvent,
  scoreWorldPulseEvent,
  worldPulseDedupeKey,
} from '../src/lib/world-pulse';

const now = Date.parse('2026-09-06T20:00:00.000Z');

describe('world pulse', () => {
  it('drops events without provenance or coordinates', () => {
    expect(sanitizeWorldPulseEvent({
      id: 'x',
      kind: 'earthquake',
      title: 'M5',
      detail: '',
      severity: 'elevated',
      latitude: 40,
      longitude: -3,
      observedAt: now,
      source: '',
    })).toBeNull();

    expect(sanitizeWorldPulseEvent({
      id: 'x',
      kind: 'earthquake',
      title: 'M5',
      detail: '',
      severity: 'elevated',
      latitude: 999,
      longitude: -3,
      observedAt: now,
      source: 'USGS',
    })).toBeNull();
  });

  it('ranks critical recent quakes above older watch fires', () => {
    const quake = earthquakeToPulseEvent({
      id: 'us1',
      magnitude: 6.2,
      place: 'Near coast',
      lat: 35,
      lng: 25,
      time: now - 30 * 60 * 1000,
      tsunami: true,
      url: 'https://example.test/quake',
    });
    const fire = eonetToPulseEvent({
      id: 'e1',
      title: 'Wildfire',
      category: 'Wildfires',
      lat: 40,
      lng: -120,
      date: new Date(now - 20 * 3_600_000).toISOString(),
      source: 'NASA EONET',
    });

    const snapshot = buildWorldPulseSnapshot([
      { name: 'USGS', status: 'ok', events: [quake] },
      { name: 'NASA EONET', status: 'ok', events: [fire] },
    ], { now, limit: 10 });

    expect(snapshot.status).toBe('ok');
    expect(snapshot.events[0].id).toBe('quake:us1');
    expect(snapshot.events[0].severity).toBe('critical');
    expect(scoreWorldPulseEvent(quake, now)).toBeGreaterThan(scoreWorldPulseEvent(fire, now));
  });

  it('degrades when a source fails but others still produce events', () => {
    const snapshot = buildWorldPulseSnapshot([
      {
        name: 'USGS',
        status: 'ok',
        events: [earthquakeToPulseEvent({
          id: 'us2',
          magnitude: 4.8,
          place: 'Madrid',
          lat: 40.4,
          lng: -3.7,
          time: now,
        })],
      },
      { name: 'NASA FIRMS', status: 'error', events: [] },
    ], { now });

    expect(snapshot.status).toBe('degraded');
    expect(snapshot.events).toHaveLength(1);
  });
});

describe('gdacsToPulseEvent', () => {
  it('maps orange cyclone to elevated storm', () => {
    const event = gdacsToPulseEvent({
      id: '1001',
      name: 'Tropical Cyclone TEST',
      eventType: 'TC',
      alertLevel: 'Orange',
      lat: 12.5,
      lng: -60.2,
      fromDate: '2026-09-06T12:00:00Z',
      url: 'https://www.gdacs.org/report.aspx?eventid=1001',
      now,
    });
    expect(event?.kind).toBe('storm');
    expect(event?.severity).toBe('elevated');
    expect(event?.source).toBe('GDACS');
  });

  it('returns null without coords or id', () => {
    expect(gdacsToPulseEvent({
      id: '',
      name: 'x',
      lat: 1,
      lng: 2,
    })).toBeNull();
    expect(gdacsToPulseEvent({
      id: '1',
      name: 'x',
      lat: Number.NaN,
      lng: 2,
    })).toBeNull();
  });
});

describe('world pulse ranking hardening', () => {
  const fire = (id: string, lat: number, lng: number, frp: number) => fireToPulseEvent({
    id,
    lat,
    lng,
    frp,
    brightness: 367,
    date: '2026-09-06',
    time: '1800',
    type: 'fire',
    title: 'Fuego activo VIIRS',
    source: 'NASA FIRMS (VIIRS)',
  });

  it('never marks a single satellite hotspot as critical', () => {
    expect(fire('f1', -23.4, -61.7, 550).severity).toBe('elevated');
    expect(fire('f2', -23.4, -61.7, FIRE_ELEVATED_FRP_MW - 1).severity).toBe('watch');
  });

  it('drops fires without an acquisition date instead of inventing one', () => {
    const undated = fireToPulseEvent({ id: 'f3', lat: 1, lng: 1, frp: 200 });
    expect(Number.isFinite(undated.observedAt)).toBe(false);
    expect(sanitizeWorldPulseEvent(undated)).toBeNull();
  });

  it('dedupes same-kind detections on the same rounded cell, keeping the highest-ranked', () => {
    const snapshot = buildWorldPulseSnapshot([
      {
        name: 'NASA FIRMS',
        status: 'ok',
        events: [
          fire('a', -23.41, -61.71, 50),
          fire('b', -23.43, -61.69, 900),
          fire('c', -23.38, -61.74, 300),
          fire('d', 5.2, -54.3, 300),
        ],
      },
    ], { now, limit: 10 });
    expect(snapshot.events.map((event) => event.id)).toEqual(['b', 'd']);
    expect(worldPulseDedupeKey({ kind: 'wildfire', latitude: -23.41, longitude: -61.71 }))
      .toBe(worldPulseDedupeKey({ kind: 'wildfire', latitude: -23.43, longitude: -61.69 }));
  });

  it('caps a single feed so other sources (GDACS) stay visible', () => {
    const fires = Array.from({ length: 30 }, (_, index) => fire(`f${index}`, -40 + index * 2, -60, 900));
    const gdacs = [
      gdacsToPulseEvent({ id: 'g1', name: 'Flood in India', eventType: 'FL', alertLevel: 'Orange', lat: 22, lng: 80, toDate: '2026-09-05T00:00:00', now })!,
      gdacsToPulseEvent({ id: 'g2', name: 'Tropical Cyclone X', eventType: 'TC', alertLevel: 'Orange', lat: 15, lng: 130, toDate: '2026-09-06T00:00:00', now })!,
    ];
    const snapshot = buildWorldPulseSnapshot([
      { name: 'NASA FIRMS', status: 'ok', events: fires },
      { name: 'GDACS', status: 'ok', events: gdacs },
    ], { now, limit: 10 });
    const bySource = snapshot.events.reduce<Record<string, number>>((acc, event) => {
      acc[event.source] = (acc[event.source] ?? 0) + 1;
      return acc;
    }, {});
    expect(bySource.GDACS).toBe(2);
    expect(snapshot.events).toHaveLength(10);
    // Cap only applies while other feeds can fill the list: FIRMS takes the remaining slots.
    expect(bySource['NASA FIRMS (VIIRS)']).toBe(8);
  });

  it('guarantees each feed its top events even when outranked', () => {
    const quakes = Array.from({ length: 20 }, (_, index) => earthquakeToPulseEvent({
      id: `q${index}`, magnitude: 6.5, place: 'x', lat: -50 + index * 4, lng: 100, time: now, tsunami: true,
    }));
    const gdacs = [
      gdacsToPulseEvent({ id: 'g1', name: 'Drought', eventType: 'DR', alertLevel: 'Green', lat: 10, lng: 10, toDate: '2026-09-01T00:00:00', now })!,
      gdacsToPulseEvent({ id: 'g2', name: 'Flood', eventType: 'FL', alertLevel: 'Green', lat: 20, lng: 20, toDate: '2026-09-01T00:00:00', now })!,
    ];
    const snapshot = buildWorldPulseSnapshot([
      { name: 'USGS', status: 'ok', events: quakes },
      { name: 'GDACS', status: 'ok', events: gdacs },
    ], { now, limit: 10 });
    expect(snapshot.events.filter((event) => event.source === 'GDACS')).toHaveLength(2);
  });

  it('fills beyond the cap only when other feeds cannot', () => {
    const fires = Array.from({ length: 12 }, (_, index) => fire(`f${index}`, -40 + index * 2, -60, 900));
    const snapshot = buildWorldPulseSnapshot([{ name: 'NASA FIRMS', status: 'ok', events: fires }], { now, limit: 10 });
    expect(snapshot.events).toHaveLength(10);
  });
});

describe('gdacs recency (SEARCH returns historical events)', () => {
  it('parses zone-less GDACS timestamps as UTC', () => {
    expect(parseGdacsDate('2026-09-06T12:00:00')).toBe(Date.parse('2026-09-06T12:00:00Z'));
    expect(Number.isNaN(parseGdacsDate(''))).toBe(true);
  });

  it('uses the last episode date and drops events older than the window', () => {
    const recent = gdacsToPulseEvent({ id: '1', name: 'Drought', eventType: 'DR', alertLevel: 'Orange', lat: 1, lng: 1, fromDate: '2025-11-21T00:00:00', toDate: '2026-09-05T00:00:00', now });
    expect(recent?.observedAt).toBe(Date.parse('2026-09-05T00:00:00Z'));
    const stale = gdacsToPulseEvent({ id: '2', name: 'Earthquake in Afghanistan', eventType: 'EQ', alertLevel: 'Red', lat: 36, lng: 67, fromDate: '2025-11-02T20:29:02', toDate: '2025-11-02T20:29:02', now });
    expect(stale).toBeNull();
    expect(now - GDACS_MAX_AGE_MS).toBeLessThan(Date.parse('2026-09-05T00:00:00Z'));
  });

  it('drops GDACS events without any date', () => {
    expect(gdacsToPulseEvent({ id: '3', name: 'x', eventType: 'FL', lat: 1, lng: 1, now })).toBeNull();
  });
});
