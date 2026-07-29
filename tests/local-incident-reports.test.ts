import { describe, expect, it } from 'vitest';
import {
  LOCAL_INCIDENT_TTL_MS,
  addLocalIncidentReport,
  createLocalIncidentReport,
  parseLocalIncidentReports,
} from '../src/lib/local-incident-reports';

describe('local incident reports', () => {
  it('creates an explicitly local-only report with a short expiry', () => {
    const report = createLocalIncidentReport({
      kind: 'accident',
      lat: 40.4168,
      lng: -3.7038,
      now: 1_000,
    });

    expect(report.syncState).toBe('local-only');
    expect(report.expiresAt).toBe(1_000 + LOCAL_INCIDENT_TTL_MS);
  });

  it('drops expired and malformed reports when restoring local storage', () => {
    const active = createLocalIncidentReport({
      kind: 'hazard',
      lat: 40.4168,
      lng: -3.7038,
      now: 10_000,
    });
    const expired = { ...active, id: 'expired', createdAt: 0, expiresAt: 5_000 };

    expect(parseLocalIncidentReports(JSON.stringify([expired, active, { fake: true }]), 20_000)).toEqual([active]);
  });

  it('deduplicates the same nearby report during the local cooldown', () => {
    const first = createLocalIncidentReport({
      kind: 'obstacle',
      lat: 40.4168,
      lng: -3.7038,
      now: 10_000,
    });
    const duplicate = createLocalIncidentReport({
      kind: 'obstacle',
      lat: 40.4169,
      lng: -3.7037,
      now: 20_000,
    });

    const result = addLocalIncidentReport([first], duplicate);
    expect(result.added).toBe(false);
    expect(result.reports).toEqual([first]);
  });
});
