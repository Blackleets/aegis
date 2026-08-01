export type CommunityIncidentKind =
  | "accident"
  | "camera"
  | "fire"
  | "flood"
  | "road_closure"
  | "road_hazard";

export type CommunityIncidentStatus = "active" | "disputed" | "expired";
export type CommunityIncidentVote = "confirm" | "reject";

export interface CommunityIncidentLocation {
  latitude: number;
  longitude: number;
}

export interface CommunityIncidentReport {
  kind: CommunityIncidentKind;
  location: CommunityIncidentLocation;
  reporterId: string;
  reportedAt: string;
  headingDegrees?: number;
}

export interface CommunityIncident {
  id: string;
  kind: CommunityIncidentKind;
  location: CommunityIncidentLocation;
  firstReportedAt: string;
  lastReportedAt: string;
  expiresAt: string;
  status: CommunityIncidentStatus;
  confidence: number;
  reportCount: number;
  confirmations: number;
  rejections: number;
  reporterIds: string[];
  votesByReporter: Record<string, CommunityIncidentVote>;
}

export interface CommunityIncidentRepository {
  list(): Promise<CommunityIncident[]>;
  mutate<T>(
    mutation: (incidents: CommunityIncident[]) => T | Promise<T>,
  ): Promise<T>;
}

export interface CommunityIncidentPolicy {
  dedupeRadiusMeters: number;
  ttlMsByKind: Record<CommunityIncidentKind, number>;
}

export const DEFAULT_COMMUNITY_INCIDENT_POLICY: CommunityIncidentPolicy = {
  dedupeRadiusMeters: 120,
  ttlMsByKind: {
    accident: 60 * 60 * 1000,
    camera: 6 * 60 * 60 * 1000,
    fire: 3 * 60 * 60 * 1000,
    flood: 3 * 60 * 60 * 1000,
    road_closure: 4 * 60 * 60 * 1000,
    road_hazard: 90 * 60 * 1000,
  },
};

const EARTH_RADIUS_METERS = 6_371_000;

export class InMemoryCommunityIncidentRepository
  implements CommunityIncidentRepository
{
  private incidents: CommunityIncident[];
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(initialIncidents: CommunityIncident[] = []) {
    this.incidents = cloneIncidents(initialIncidents);
  }

  async list(): Promise<CommunityIncident[]> {
    return cloneIncidents(this.incidents);
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
      const draft = cloneIncidents(this.incidents);
      const result = await mutation(draft);
      this.incidents = cloneIncidents(draft);
      return result;
    } finally {
      release();
    }
  }
}

export class CommunityIncidentService {
  constructor(
    private readonly repository: CommunityIncidentRepository,
    private readonly policy: CommunityIncidentPolicy =
      DEFAULT_COMMUNITY_INCIDENT_POLICY,
  ) {}

  async report(input: CommunityIncidentReport): Promise<CommunityIncident> {
    validateReport(input);
    const now = parseTimestamp(input.reportedAt, "reportedAt");
    return this.repository.mutate((incidents) => {
      expireIncidents(incidents, now);
      const duplicate = incidents
        .filter(
          (incident) =>
            incident.status !== "expired" && incident.kind === input.kind,
        )
        .map((incident) => ({
          incident,
          distance: distanceMeters(incident.location, input.location),
        }))
        .filter(({ distance }) => distance <= this.policy.dedupeRadiusMeters)
        .sort((left, right) => left.distance - right.distance)[0]?.incident;

      if (duplicate?.reporterIds.includes(input.reporterId)) {
        return cloneIncident(duplicate);
      }
      if (duplicate) {
        removeVote(duplicate, input.reporterId);
        duplicate.reportCount += 1;
        duplicate.reporterIds.push(input.reporterId);
        const latestReportTime = Math.max(
          Date.parse(duplicate.lastReportedAt),
          now,
        );
        duplicate.lastReportedAt = new Date(latestReportTime).toISOString();
        duplicate.expiresAt = new Date(
          latestReportTime + this.policy.ttlMsByKind[input.kind],
        ).toISOString();
        updateAssessment(duplicate);
        return cloneIncident(duplicate);
      }

      const result: CommunityIncident = {
        id: createIncidentId(input),
        kind: input.kind,
        location: { ...input.location },
        firstReportedAt: input.reportedAt,
        lastReportedAt: input.reportedAt,
        expiresAt: new Date(
          now + this.policy.ttlMsByKind[input.kind],
        ).toISOString(),
        status: "active",
        confidence: 0.45,
        reportCount: 1,
        confirmations: 0,
        rejections: 0,
        reporterIds: [input.reporterId],
        votesByReporter: {},
      };
      incidents.push(result);
      return cloneIncident(result);
    });
  }

  async vote(
    incidentId: string,
    reporterId: string,
    vote: CommunityIncidentVote,
    votedAt: string,
  ): Promise<CommunityIncident> {
    if (!incidentId.trim() || !reporterId.trim()) {
      throw new Error("incidentId and reporterId are required");
    }
    const now = parseTimestamp(votedAt, "votedAt");
    return this.repository.mutate((incidents) => {
      expireIncidents(incidents, now);
      const incident = incidents.find(({ id }) => id === incidentId);
      if (!incident) throw new Error("incident not found");
      if (incident.status === "expired") throw new Error("incident has expired");
      if (incident.reporterIds.includes(reporterId)) {
        throw new Error("reporters cannot vote on their own incident");
      }

      const previousVote = incident.votesByReporter[reporterId];
      if (previousVote === vote) return cloneIncident(incident);
      removeVote(incident, reporterId);
      if (vote === "confirm") incident.confirmations += 1;
      if (vote === "reject") incident.rejections += 1;
      incident.votesByReporter[reporterId] = vote;
      updateAssessment(incident);
      return cloneIncident(incident);
    });
  }

  async active(at: string): Promise<CommunityIncident[]> {
    const now = parseTimestamp(at, "at");
    return this.repository.mutate((incidents) => {
      expireIncidents(incidents, now);
      return incidents
        .filter(({ status }) => status !== "expired")
        .sort(
          (left, right) =>
            right.confidence - left.confidence ||
            Date.parse(right.lastReportedAt) - Date.parse(left.lastReportedAt),
        )
        .map(cloneIncident);
    });
  }

  async cleanup(at: string): Promise<number> {
    const now = parseTimestamp(at, "at");
    return this.repository.mutate((incidents) => {
      const before = incidents.length;
      expireIncidents(incidents, now);
      incidents.splice(0, incidents.length, ...incidents.filter(({ status }) => status !== "expired"));
      return before - incidents.length;
    });
  }
}

function validateReport(input: CommunityIncidentReport): void {
  if (!input.reporterId.trim()) throw new Error("reporterId is required");
  parseTimestamp(input.reportedAt, "reportedAt");
  const { latitude, longitude } = input.location;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("latitude must be between -90 and 90");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("longitude must be between -180 and 180");
  }
  if (
    input.headingDegrees !== undefined &&
    (!Number.isFinite(input.headingDegrees) ||
      input.headingDegrees < 0 ||
      input.headingDegrees >= 360)
  ) {
    throw new Error("headingDegrees must be between 0 and 360");
  }
}

function parseTimestamp(value: string, field: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be an ISO date`);
  return parsed;
}

function updateAssessment(incident: CommunityIncident): void {
  const support = incident.reportCount + incident.confirmations;
  incident.confidence = round(
    Math.max(
      0.05,
      Math.min(
        0.99,
        0.45 +
          (incident.reportCount - 1) * 0.12 +
          incident.confirmations * 0.08 -
          incident.rejections * 0.18,
      ),
    ),
  );
  incident.status =
    incident.rejections >= 2 && incident.rejections > support
      ? "disputed"
      : "active";
}

function removeVote(
  incident: CommunityIncident,
  reporterId: string,
): void {
  const previousVote = incident.votesByReporter[reporterId];
  if (previousVote === "confirm") incident.confirmations -= 1;
  if (previousVote === "reject") incident.rejections -= 1;
  delete incident.votesByReporter[reporterId];
}

function expireIncidents(
  incidents: CommunityIncident[],
  now: number,
): boolean {
  let changed = false;
  for (const incident of incidents) {
    if (incident.status !== "expired" && Date.parse(incident.expiresAt) <= now) {
      incident.status = "expired";
      changed = true;
    }
  }
  return changed;
}

function distanceMeters(
  left: CommunityIncidentLocation,
  right: CommunityIncidentLocation,
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function createIncidentId(input: CommunityIncidentReport): string {
  const bucket = Math.floor(Date.parse(input.reportedAt) / (5 * 60 * 1000));
  const seed = [
    input.kind,
    input.location.latitude.toFixed(4),
    input.location.longitude.toFixed(4),
    bucket,
  ].join(":");
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `community-${(hash >>> 0).toString(36)}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function cloneIncident(incident: CommunityIncident): CommunityIncident {
  return {
    ...incident,
    location: { ...incident.location },
    reporterIds: [...incident.reporterIds],
    votesByReporter: { ...incident.votesByReporter },
  };
}

function cloneIncidents(incidents: CommunityIncident[]): CommunityIncident[] {
  return incidents.map(cloneIncident);
}
