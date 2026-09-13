/** Lightweight country scoping for feeds/nav context. No invented live data. */

export type CountryBBox = {
  code: string;
  name: string;
  /** [west, south, east, north] */
  bbox: [number, number, number, number];
};

/** Curated operator countries — enough for regional filtering without a geo DB. */
export const OPERATOR_COUNTRIES: CountryBBox[] = [
  { code: 'ES', name: 'España', bbox: [-9.6, 35.9, 4.5, 43.9] },
  { code: 'PT', name: 'Portugal', bbox: [-9.6, 36.9, -6.1, 42.2] },
  { code: 'FR', name: 'Francia', bbox: [-5.2, 41.3, 9.7, 51.2] },
  { code: 'DE', name: 'Alemania', bbox: [5.8, 47.2, 15.1, 55.1] },
  { code: 'IT', name: 'Italia', bbox: [6.6, 36.6, 18.6, 47.1] },
  { code: 'GB', name: 'Reino Unido', bbox: [-8.7, 49.8, 1.8, 60.9] },
  { code: 'US', name: 'Estados Unidos', bbox: [-125.0, 24.5, -66.9, 49.4] },
  { code: 'MX', name: 'México', bbox: [-118.5, 14.5, -86.7, 32.7] },
  { code: 'BR', name: 'Brasil', bbox: [-74.0, -34.0, -34.7, 5.3] },
  { code: 'AR', name: 'Argentina', bbox: [-73.6, -55.1, -53.6, -21.8] },
  { code: 'CO', name: 'Colombia', bbox: [-79.1, -4.3, -66.8, 12.6] },
  { code: 'CL', name: 'Chile', bbox: [-75.7, -56.0, -66.3, -17.5] },
  { code: 'PE', name: 'Perú', bbox: [-81.4, -18.4, -68.6, -0.0] },
  { code: 'CA', name: 'Canadá', bbox: [-141.0, 41.6, -52.6, 83.2] },
  { code: 'AU', name: 'Australia', bbox: [112.9, -43.7, 153.7, -10.6] },
  { code: 'JP', name: 'Japón', bbox: [129.3, 31.0, 145.9, 45.6] },
  { code: 'IN', name: 'India', bbox: [68.1, 6.7, 97.5, 35.6] },
];

export function findCountryByCode(code: string | null | undefined): CountryBBox | null {
  if (!code || code.toLowerCase() === 'auto') return null;
  const normalized = code.trim().toUpperCase();
  return OPERATOR_COUNTRIES.find((country) => country.code === normalized) ?? null;
}

export function pointInCountryBBox(
  latitude: number,
  longitude: number,
  bbox: [number, number, number, number],
): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  const [west, south, east, north] = bbox;
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
}

export function detectCountryCode(latitude: number, longitude: number): string | null {
  for (const country of OPERATOR_COUNTRIES) {
    if (pointInCountryBBox(latitude, longitude, country.bbox)) return country.code;
  }
  return null;
}

export function resolveOperatorCountryCode(
  preference: string,
  location: { lat: number; lng: number } | null,
): string | null {
  if (preference && preference.toLowerCase() !== 'auto') {
    return findCountryByCode(preference)?.code ?? null;
  }
  if (!location) return null;
  return detectCountryCode(location.lat, location.lng);
}

export function filterPointsByCountry<T extends { lat: number; lng: number }>(
  points: T[],
  countryCode: string | null,
): T[] {
  const country = findCountryByCode(countryCode);
  if (!country) return points;
  return points.filter((point) => pointInCountryBBox(point.lat, point.lng, country.bbox));
}
