import { describe, expect, it } from "vitest";

import {
  CommunityIncidentService,
  InMemoryCommunityIncidentRepository,
} from "../src/lib/community-incidents";

const at = "2026-07-29T18:00:00.000Z";

function createService() {
  return new CommunityIncidentService(
    new InMemoryCommunityIncidentRepository(),
  );
}

describe("CommunityIncidentService", () => {
  it("creates an active incident with a category-specific expiry", async () => {
    const incident = await createService().report({
      kind: "camera",
      location: { latitude: 40.4168, longitude: -3.7038 },
      reporterId: "driver-a",
      reportedAt: at,
    });

    expect(incident.status).toBe("active");
    expect(incident.confidence).toBe(0.45);
    expect(incident.expiresAt).toBe("2026-07-30T00:00:00.000Z");
  });

  it("deduplicates nearby reports of the same kind", async () => {
    const service = createService();
    const first = await service.report({
      kind: "accident",
      location: { latitude: 40.4168, longitude: -3.7038 },
      reporterId: "driver-a",
      reportedAt: at,
    });
    const duplicate = await service.report({
      kind: "accident",
      location: { latitude: 40.4172, longitude: -3.7038 },
      reporterId: "driver-b",
      reportedAt: "2026-07-29T18:02:00.000Z",
    });

    expect(duplicate.id).toBe(first.id);
    expect(duplicate.reportCount).toBe(2);
    expect(duplicate.reporterIds).toEqual(["driver-a", "driver-b"]);
  });

  it("does not merge different hazards or distant reports", async () => {
    const service = createService();
    const first = await service.report({
      kind: "camera",
      location: { latitude: 40.4168, longitude: -3.7038 },
      reporterId: "driver-a",
      reportedAt: at,
    });
    const differentKind = await service.report({
      kind: "fire",
      location: { latitude: 40.4168, longitude: -3.7038 },
      reporterId: "driver-b",
      reportedAt: at,
    });
    const distant = await service.report({
      kind: "camera",
      location: { latitude: 40.4268, longitude: -3.7038 },
      reporterId: "driver-c",
      reportedAt: at,
    });

    expect(new Set([first.id, differentKind.id, distant.id]).size).toBe(3);
  });

  it("makes votes idempotent and lets a reporter change their vote", async () => {
    const service = createService();
    const incident = await service.report({
      kind: "road_hazard",
      location: { latitude: 40.4168, longitude: -3.7038 },
      reporterId: "driver-a",
      reportedAt: at,
    });

    await service.vote(incident.id, "driver-b", "confirm", at);
    const repeated = await service.vote(
      incident.id,
      "driver-b",
      "confirm",
      at,
    );
    const changed = await service.vote(
      incident.id,
      "driver-b",
      "reject",
      at,
    );

    expect(repeated.confirmations).toBe(1);
    expect(changed.confirmations).toBe(0);
    expect(changed.rejections).toBe(1);
  });

  it("prevents reporters from confirming their own report", async () => {
    const service = createService();
    const incident = await service.report({
      kind: "flood",
      location: { latitude: 40.4168, longitude: -3.7038 },
      reporterId: "driver-a",
      reportedAt: at,
    });

    await expect(
      service.vote(incident.id, "driver-a", "confirm", at),
    ).rejects.toThrow("reporters cannot vote on their own incident");
  });

  it("marks sufficiently rejected incidents as disputed", async () => {
    const service = createService();
    const incident = await service.report({
      kind: "road_closure",
      location: { latitude: 40.4168, longitude: -3.7038 },
      reporterId: "driver-a",
      reportedAt: at,
    });

    await service.vote(incident.id, "driver-b", "reject", at);
    const disputed = await service.vote(
      incident.id,
      "driver-c",
      "reject",
      at,
    );

    expect(disputed.status).toBe("disputed");
    expect(disputed.confidence).toBeLessThan(0.5);
  });

  it("expires stale incidents and excludes them from the active feed", async () => {
    const service = createService();
    await service.report({
      kind: "accident",
      location: { latitude: 40.4168, longitude: -3.7038 },
      reporterId: "driver-a",
      reportedAt: at,
    });

    await expect(service.active("2026-07-29T19:00:00.000Z")).resolves.toEqual(
      [],
    );
  });

  it("rejects malformed locations before writing", async () => {
    await expect(
      createService().report({
        kind: "fire",
        location: { latitude: 120, longitude: -3.7038 },
        reporterId: "driver-a",
        reportedAt: at,
      }),
    ).rejects.toThrow("latitude must be between -90 and 90");
  });
});
