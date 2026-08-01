export type TomTomIncidentCategory =
  | 'unknown'
  | 'accident'
  | 'fog'
  | 'dangerousConditions'
  | 'rain'
  | 'ice'
  | 'jam'
  | 'laneClosed'
  | 'roadClosed'
  | 'roadWorks'
  | 'wind'
  | 'flooding'
  | 'brokenDownVehicle';

export type TomTomIncidentGeometry = {
  type?: 'Point' | 'LineString' | string;
  coordinates?: number[] | number[][];
};

export type TomTomIncidentProperties = {
  id?: string;
  iconCategory?: string;
  magnitudeOfDelay?: string;
  events?: Array<{ description?: string; code?: number; iconCategory?: string }>;
  startTime?: string | null;
  endTime?: string | null;
  from?: string | null;
  to?: string | null;
  lengthInMeters?: number;
  delayInSeconds?: number | null;
  roadNumbers?: string[];
  timeValidity?: string;
  probabilityOfOccurrence?: string;
  numberOfReports?: number | null;
  lastReportTime?: string | null;
};

export type TomTomIncidentFeature = {
  type?: string;
  geometry?: TomTomIncidentGeometry;
  properties?: TomTomIncidentProperties;
};

export type NormalizedRouteIncident = {
  id: string;
  category: TomTomIncidentCategory;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  geometryType: 'Point' | 'LineString';
  coordinates: number[] | number[][];
  delaySeconds: number | null;
  lengthMeters: number;
  from: string | null;
  to: string | null;
  roadNumbers: string[];
  startTime: string | null;
  endTime: string | null;
  lastReportTime: string | null;
  reportCount: number | null;
  probability: string | null;
};

const VALID_CATEGORIES = new Set<TomTomIncidentCategory>([
  'unknown', 'accident', 'fog', 'dangerousConditions', 'rain', 'ice', 'jam',
  'laneClosed', 'roadClosed', 'roadWorks', 'wind', 'flooding', 'brokenDownVehicle',
]);

export function parseIncidentCoordinate(value: string | null, min: number, max: number) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function buildRouteIncidentBoundingBox(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  paddingKm = 2.5,
) {
  const safePaddingKm = Math.min(10, Math.max(0.5, paddingKm));
  const meanLatRadians = ((fromLat + toLat) / 2) * Math.PI / 180;
  const latPadding = safePaddingKm / 111.32;
  const lngScale = Math.max(0.2, Math.cos(meanLatRadians));
  const lngPadding = safePaddingKm / (111.32 * lngScale);

  return {
    west: Math.max(-180, Math.min(fromLng, toLng) - lngPadding),
    south: Math.max(-90, Math.min(fromLat, toLat) - latPadding),
    east: Math.min(180, Math.max(fromLng, toLng) + lngPadding),
    north: Math.min(90, Math.max(fromLat, toLat) + latPadding),
  };
}

export function buildIncidentCacheKey(bbox: { west: number; south: number; east: number; north: number }) {
  return [bbox.west, bbox.south, bbox.east, bbox.north].map((value) => value.toFixed(3)).join(':');
}

function normalizeCategory(value: string | undefined): TomTomIncidentCategory {
  return VALID_CATEGORIES.has(value as TomTomIncidentCategory)
    ? value as TomTomIncidentCategory
    : 'unknown';
}

function classifySeverity(category: TomTomIncidentCategory, delaySeconds: number | null) {
  if (category === 'roadClosed' || category === 'accident' || category === 'flooding') return 'critical' as const;
  if (category === 'laneClosed' || category === 'dangerousConditions' || category === 'ice') return 'warning' as const;
  if ((delaySeconds ?? 0) >= 900) return 'critical' as const;
  if ((delaySeconds ?? 0) >= 300 || category === 'jam' || category === 'roadWorks') return 'warning' as const;
  return 'info' as const;
}

export function normalizeTomTomIncident(feature: TomTomIncidentFeature): NormalizedRouteIncident | null {
  const properties = feature.properties;
  const geometry = feature.geometry;
  if (!properties?.id || !geometry?.coordinates) return null;
  if (geometry.type !== 'Point' && geometry.type !== 'LineString') return null;

  const category = normalizeCategory(properties.iconCategory || properties.events?.[0]?.iconCategory);
  const delaySeconds = typeof properties.delayInSeconds === 'number' && Number.isFinite(properties.delayInSeconds)
    ? Math.max(0, properties.delayInSeconds)
    : null;
  const description = properties.events
    ?.map((event) => event.description?.trim())
    .find(Boolean)
    || category.replace(/([a-z])([A-Z])/g, '$1 $2');

  return {
    id: properties.id,
    category,
    severity: classifySeverity(category, delaySeconds),
    description,
    geometryType: geometry.type,
    coordinates: geometry.coordinates,
    delaySeconds,
    lengthMeters: typeof properties.lengthInMeters === 'number' && Number.isFinite(properties.lengthInMeters)
      ? Math.max(0, properties.lengthInMeters)
      : 0,
    from: properties.from ?? null,
    to: properties.to ?? null,
    roadNumbers: Array.isArray(properties.roadNumbers) ? properties.roadNumbers.filter(Boolean) : [],
    startTime: properties.startTime ?? null,
    endTime: properties.endTime ?? null,
    lastReportTime: properties.lastReportTime ?? null,
    reportCount: typeof properties.numberOfReports === 'number' ? Math.max(0, properties.numberOfReports) : null,
    probability: properties.probabilityOfOccurrence ?? null,
  };
}

export function normalizeTomTomIncidents(features: TomTomIncidentFeature[] | undefined, limit = 40) {
  return (features ?? [])
    .map(normalizeTomTomIncident)
    .filter((incident): incident is NormalizedRouteIncident => incident !== null)
    .sort((a, b) => {
      const severityRank = { critical: 3, warning: 2, info: 1 } as const;
      return severityRank[b.severity] - severityRank[a.severity]
        || (b.delaySeconds ?? 0) - (a.delaySeconds ?? 0);
    })
    .slice(0, Math.min(100, Math.max(1, limit)));
}
