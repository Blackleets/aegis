import { describe, expect, it } from 'vitest';
import {
  detectCountryCode,
  filterPointsByCountry,
  resolveOperatorCountryCode,
} from '../src/lib/operator-country';

describe('operator country', () => {
  it('detects Madrid as ES and NYC as US', () => {
    expect(detectCountryCode(40.4168, -3.7038)).toBe('ES');
    expect(detectCountryCode(40.7128, -74.006)).toBe('US');
  });

  it('filters points to the selected country', () => {
    const points = [
      { id: 'mad', lat: 40.4, lng: -3.7 },
      { id: 'nyc', lat: 40.7, lng: -74.0 },
    ];
    expect(filterPointsByCountry(points, 'ES').map((point) => point.id)).toEqual(['mad']);
  });

  it('uses GPS when preference is auto', () => {
    expect(resolveOperatorCountryCode('auto', { lat: 19.43, lng: -99.13 })).toBe('MX');
    expect(resolveOperatorCountryCode('DE', { lat: 19.43, lng: -99.13 })).toBe('DE');
  });
});
