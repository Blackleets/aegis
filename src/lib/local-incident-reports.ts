export type LocalIncidentKind = 'accident' | 'obstacle' | 'roadworks' | 'hazard';

export type LocalIncidentReport = {
  id: string;
  kind: LocalIncidentKind;
  lat: number;
  lng: number;
  createdAt: number;
  expiresAt: number;
  syncState: 'local-only';
};

export const LOCAL_INCIDENT_REPORTS_KEY = 'aegis-local-incident-reports-v1';
export const LOCAL_INCIDENT_TTL_MS = 30 * 60 * 1000;
export const LOCAL_INCIDENT_DEDUPE_WINDOW_MS = 5 * 60 * 1000;

function isValidReport(value: unknown): value is LocalIncidentReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as Partial<LocalIncidentReport>;
  return (
    typeof report.id === 'string'
    && ['accident', 'obstacle', 'roadworks', 'hazard'].includes(report.kind ?? '')
    && typeof report.lat === 'number'
    && Number.isFinite(report.lat)
    && report.lat >= -90
    && report.lat <= 90
    && typeof report.lng === 'number'
    && Number.isFinite(report.lng)
    && report.lng >= -180
    && report.lng <= 180
    && typeof report.createdAt === 'number'
    && typeof report.expiresAt === 'number'
    && report.syncState === 'local-only'
  );
}

export function parseLocalIncidentReports(value: string | null, now = Date.now()): LocalIncidentReport[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidReport).filter((report) => report.expiresAt > now);
  } catch {
    return [];
  }
}

export function createLocalIncidentReport({
  kind,
  lat,
  lng,
  now = Date.now(),
}: {
  kind: LocalIncidentKind;
  lat: number;
  lng: number;
  now?: number;
}): LocalIncidentReport {
  const coordinateKey = `${lat.toFixed(5)}:${lng.toFixed(5)}`;
  return {
    id: `local:${kind}:${coordinateKey}:${now}`,
    kind,
    lat,
    lng,
    createdAt: now,
    expiresAt: now + LOCAL_INCIDENT_TTL_MS,
    syncState: 'local-only',
  };
}

export function addLocalIncidentReport(
  reports: LocalIncidentReport[],
  report: LocalIncidentReport,
): { reports: LocalIncidentReport[]; added: boolean } {
  const activeReports = reports.filter((candidate) => candidate.expiresAt > report.createdAt);
  const duplicate = activeReports.some((candidate) => (
    candidate.kind === report.kind
    && Math.abs(candidate.lat - report.lat) < 0.0005
    && Math.abs(candidate.lng - report.lng) < 0.0005
    && report.createdAt - candidate.createdAt < LOCAL_INCIDENT_DEDUPE_WINDOW_MS
  ));

  if (duplicate) return { reports: activeReports, added: false };
  return { reports: [report, ...activeReports].slice(0, 20), added: true };
}
