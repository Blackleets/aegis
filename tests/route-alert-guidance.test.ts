import { describe, expect, it } from 'vitest';
import { buildRouteAlertVoiceMessage, getRouteAlertGuidance, shouldAnnounceRouteAlertPhase } from '../src/lib/route-alert-guidance';

describe('route alert guidance', () => {
  it('warns earlier when driving faster', () => {
    const slow = getRouteAlertGuidance({ distanceMeters: 500, speedKmh: 20, severity: 'warning' });
    const fast = getRouteAlertGuidance({ distanceMeters: 500, speedKmh: 100, severity: 'warning' });

    expect(slow.phase).toBe('ahead');
    expect(fast.phase).toBe('near');
  });

  it('gives critical hazards a wider warning window', () => {
    const informational = getRouteAlertGuidance({ distanceMeters: 520, speedKmh: 80, severity: 'info' });
    const critical = getRouteAlertGuidance({ distanceMeters: 520, speedKmh: 80, severity: 'critical' });

    expect(informational.phase).toBe('ahead');
    expect(critical.phase).toBe('near');
  });

  it('marks a hazard in the immediate safety window as now', () => {
    const guidance = getRouteAlertGuidance({ distanceMeters: 45, speedKmh: 50, severity: 'warning' });

    expect(guidance.phase).toBe('now');
    expect(guidance.label).toBe('Ahora');
  });

  it('does not announce distant informational cameras', () => {
    const guidance = getRouteAlertGuidance({ distanceMeters: 480, speedKmh: 15, severity: 'info' });

    expect(guidance.phase).toBe('ahead');
    expect(guidance.shouldSpeak).toBe(false);
  });

  it('builds concise phase-specific voice instructions', () => {
    const nearGuidance = getRouteAlertGuidance({ distanceMeters: 180, speedKmh: 60, severity: 'warning' });
    const nowGuidance = getRouteAlertGuidance({ distanceMeters: 35, speedKmh: 50, severity: 'critical' });

    expect(buildRouteAlertVoiceMessage({
      title: 'incendio en la ruta',
      distanceMeters: 180,
      guidance: nearGuidance,
    })).toBe('En 180 metros, incendio en la ruta.');

    expect(buildRouteAlertVoiceMessage({
      title: 'cierre de vía',
      distanceMeters: 35,
      guidance: nowGuidance,
    })).toBe('Atención ahora. cierre de vía.');
  });

  it('advances through each phase only once', () => {
    const announced = new Set<string>();

    expect(shouldAnnounceRouteAlertPhase(announced, 'camera-1', 'ahead')).toBe(true);
    expect(shouldAnnounceRouteAlertPhase(announced, 'camera-1', 'near')).toBe(true);
    expect(shouldAnnounceRouteAlertPhase(announced, 'camera-1', 'now')).toBe(true);
    expect(shouldAnnounceRouteAlertPhase(announced, 'camera-1', 'now')).toBe(false);
  });

  it('blocks phase regressions caused by noisy GPS distance', () => {
    const announced = new Set<string>();

    expect(shouldAnnounceRouteAlertPhase(announced, 'hazard-1', 'near')).toBe(true);
    expect(shouldAnnounceRouteAlertPhase(announced, 'hazard-1', 'ahead')).toBe(false);
    expect(shouldAnnounceRouteAlertPhase(announced, 'hazard-1', 'now')).toBe(true);
    expect(shouldAnnounceRouteAlertPhase(announced, 'hazard-1', 'near')).toBe(false);
    expect(shouldAnnounceRouteAlertPhase(announced, 'hazard-1', 'ahead')).toBe(false);
  });
});
