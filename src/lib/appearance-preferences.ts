export type AppearanceMode = 'dark' | 'light' | 'system';

export type AppearancePreferences = {
  mode: AppearanceMode;
  /** ISO 3166-1 alpha-2, or `auto` to follow GPS/country detection. */
  countryCode: string;
};

export const DEFAULT_APPEARANCE_PREFERENCES: AppearancePreferences = {
  mode: 'dark',
  countryCode: 'auto',
};

export const APPEARANCE_STORAGE_KEY = 'aegis-appearance';

export function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === 'dark' || value === 'light' || value === 'system';
}

export function parseAppearancePreferences(value: string | null): AppearancePreferences {
  if (!value) return DEFAULT_APPEARANCE_PREFERENCES;
  try {
    const parsed = JSON.parse(value) as Partial<AppearancePreferences>;
    return {
      mode: isAppearanceMode(parsed.mode) ? parsed.mode : DEFAULT_APPEARANCE_PREFERENCES.mode,
      countryCode: typeof parsed.countryCode === 'string' && parsed.countryCode.trim()
        ? parsed.countryCode.trim().toUpperCase()
        : DEFAULT_APPEARANCE_PREFERENCES.countryCode,
    };
  } catch {
    return DEFAULT_APPEARANCE_PREFERENCES;
  }
}

export function updateAppearanceMode(
  preferences: AppearancePreferences,
  mode: AppearanceMode,
): AppearancePreferences {
  return { ...preferences, mode };
}

export function updateAppearanceCountry(
  preferences: AppearancePreferences,
  countryCode: string,
): AppearancePreferences {
  const normalized = countryCode.trim().toUpperCase() || 'AUTO';
  return { ...preferences, countryCode: normalized === 'AUTO' ? 'auto' : normalized };
}

export function resolveAppearanceTheme(
  mode: AppearanceMode,
  prefersLight = false,
): 'dark' | 'light' {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return prefersLight ? 'light' : 'dark';
}

/** Inline boot script — prevents theme flash before React hydrates. */
export const APPEARANCE_BOOTSTRAP_SCRIPT = `(function(){try{var raw=localStorage.getItem('${APPEARANCE_STORAGE_KEY}');var mode='dark';if(raw){var p=JSON.parse(raw);if(p&&(p.mode==='light'||p.mode==='dark'||p.mode==='system'))mode=p.mode;}var prefersLight=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches;var resolved=mode==='system'?(prefersLight?'light':'dark'):mode;var root=document.documentElement;root.dataset.theme=resolved;root.dataset.appearance=mode;root.style.colorScheme=resolved;}catch(e){}})();`;
