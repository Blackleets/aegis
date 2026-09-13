import { describe, expect, it } from 'vitest';
import {
  buildWorldPulseSnapshot,
  earthquakeToPulseEvent,
  eonetToPulseEvent,
  gdacsToPulseEvent,
  sanitizeWorldPulseEvent,
  scoreWorldPulseEvent,
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
