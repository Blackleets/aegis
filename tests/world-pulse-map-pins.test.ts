import { describe, expect, it } from 'vitest';
import {
  WORLD_PULSE_MAP_PIN_LIMIT,
  WORLD_PULSE_PIN_COLORS,
  sanitizeWorldPulseMapPin,
  selectWorldPulseMapPins,
  shouldShowWorldPulseMapPins,
  worldPulsePinsToGeoJSON,
} from '../src/lib/world-pulse-map-pins';

describe('world-pulse-map-pins', () => {
  it('drops pins without coords or identity (fail-closed)', () => {
    expect(sanitizeWorldPulseMapPin({
      id: '',
      lat: 40,
      lng: -3,
      severity: 'critical',
      title: 'X',
    })).toBeNull();

    expect(sanitizeWorldPulseMapPin({
      id: 'a',
      lat: 999,
      lng: -3,
      severity: 'critical',
      title: 'X',
    })).toBeNull();

    expect(sanitizeWorldPulseMapPin(null)).toBeNull();
  });

  it('caps to top severity and never invents events', () => {
    const pins = selectWorldPulseMapPins([
      { id: 'i1', lat: 1, lng: 1, severity: 'info', title: 'Info', score: 9 },
      { id: 'c1', lat: 2, lng: 2, severity: 'critical', title: 'Crit', score: 1 },
      { id: 'e1', lat: 3, lng: 3, severity: 'elevated', title: 'Elev', score: 5 },
      { id: 'bad', lat: Number.NaN, lng: 0, severity: 'critical', title: 'Bad' },
    ], { limit: 2, enabled: true });

    expect(pins).toHaveLength(2);
    expect(pins[0].id).toBe('c1');
    expect(pins[1].id).toBe('e1');
    expect(pins.every((pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng))).toBe(true);
  });

  it('returns empty when disabled or no data', () => {
    expect(selectWorldPulseMapPins([
      { id: 'c1', lat: 2, lng: 2, severity: 'critical', title: 'Crit' },
    ], { enabled: false })).toEqual([]);
    expect(selectWorldPulseMapPins(undefined, { enabled: true })).toEqual([]);
    expect(selectWorldPulseMapPins([], { enabled: true })).toEqual([]);
  });

  it('shows pins only on mercator with data', () => {
    expect(shouldShowWorldPulseMapPins('mercator', true, 3)).toBe(true);
    expect(shouldShowWorldPulseMapPins('globe', true, 3)).toBe(false);
    expect(shouldShowWorldPulseMapPins('mercator', false, 3)).toBe(false);
    expect(shouldShowWorldPulseMapPins('mercator', true, 0)).toBe(false);
  });

  it('maps geojson colors to AEGIS severity tokens', () => {
    const fc = worldPulsePinsToGeoJSON([
      { id: 'c1', lat: 10, lng: 20, severity: 'critical', title: 'Crit', kind: 'storm' },
    ]);
    expect(fc.features[0].geometry.coordinates).toEqual([20, 10]);
    expect(fc.features[0].properties.color).toBe(WORLD_PULSE_PIN_COLORS.critical);
    expect(WORLD_PULSE_MAP_PIN_LIMIT).toBe(25);
  });
});
