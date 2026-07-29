import {
  CommunityIncidentService,
  type CommunityIncident,
  type CommunityIncidentRepository,
} from './community-incidents';

export const COMMUNITY_INCIDENTS_STORAGE_KEY = 'aegis-community-incidents-v1';
export const COMMUNITY_REPORTER_STORAGE_KEY = 'aegis-community-reporter-v1';

export class BrowserCommunityIncidentRepository implements CommunityIncidentRepository {
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: Pick<Storage, 'getItem' | 'setItem'>,
    private readonly storageKey = COMMUNITY_INCIDENTS_STORAGE_KEY,
  ) {}

  async list(): Promise<CommunityIncident[]> {
    return parseStoredIncidents(this.storage.getItem(this.storageKey));
  }

  async mutate<T>(
    mutation: (incidents: CommunityIncident[]) => T | Promise<T>,
  ): Promise<T> {
    const previous = this.mutationQueue;
    let release: () => void = () => undefined;
    this.mutationQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const incidents = await this.list();
      const result = await mutation(incidents);
      this.storage.setItem(this.storageKey, JSON.stringify(incidents));
      return result;
    } finally {
      release();
    }
  }
}

export function createBrowserCommunityIncidentService(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  return new CommunityIncidentService(new BrowserCommunityIncidentRepository(storage));
}

export function getOrCreateCommunityReporterId(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  createId: () => string,
) {
  const existing = storage.getItem(COMMUNITY_REPORTER_STORAGE_KEY);
  if (existing?.trim()) return existing;
  const reporterId = `local-${createId()}`;
  storage.setItem(COMMUNITY_REPORTER_STORAGE_KEY, reporterId);
  return reporterId;
}

export function parseStoredIncidents(value: string | null): CommunityIncident[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredIncident);
  } catch {
    return [];
  }
}

function isStoredIncident(value: unknown): value is CommunityIncident {
  if (!value || typeof value !== 'object') return false;
  const incident = value as Partial<CommunityIncident>;
  return (
    typeof incident.id === 'string'
    && ['accident', 'camera', 'fire', 'flood', 'road_closure', 'road_hazard'].includes(incident.kind ?? '')
    && incident.location !== undefined
    && Number.isFinite(incident.location.latitude)
    && incident.location.latitude >= -90
    && incident.location.latitude <= 90
    && Number.isFinite(incident.location.longitude)
    && incident.location.longitude >= -180
    && incident.location.longitude <= 180
    && typeof incident.firstReportedAt === 'string'
    && typeof incident.lastReportedAt === 'string'
    && typeof incident.expiresAt === 'string'
    && ['active', 'disputed', 'expired'].includes(incident.status ?? '')
    && typeof incident.confidence === 'number'
    && typeof incident.reportCount === 'number'
    && typeof incident.confirmations === 'number'
    && typeof incident.rejections === 'number'
    && Array.isArray(incident.reporterIds)
    && incident.votesByReporter !== undefined
    && typeof incident.votesByReporter === 'object'
  );
}
