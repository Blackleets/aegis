import { describe, expect, it } from 'vitest';
import {
  parseAppearancePreferences,
  resolveAppearanceTheme,
  updateAppearanceCountry,
  updateAppearanceMode,
} from '../src/lib/appearance-preferences';

describe('appearance preferences', () => {
  it('defaults to dark sovereign theme', () => {
    expect(parseAppearancePreferences(null)).toEqual({ mode: 'dark', countryCode: 'auto' });
  });

  it('parses mode and country safely', () => {
    expect(parseAppearancePreferences(JSON.stringify({ mode: 'light', countryCode: 'es' }))).toEqual({
      mode: 'light',
      countryCode: 'ES',
    });
    expect(parseAppearancePreferences('{bad')).toEqual({ mode: 'dark', countryCode: 'auto' });
  });

  it('resolves system from prefers-color-scheme', () => {
    expect(resolveAppearanceTheme('system', true)).toBe('light');
    expect(resolveAppearanceTheme('system', false)).toBe('dark');
    expect(resolveAppearanceTheme('dark', true)).toBe('dark');
  });

  it('updates immutably', () => {
    const base = parseAppearancePreferences(null);
    expect(updateAppearanceMode(base, 'system').mode).toBe('system');
    expect(updateAppearanceCountry(base, 'mx').countryCode).toBe('MX');
  });
});
