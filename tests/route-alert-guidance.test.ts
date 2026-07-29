import { describe, expect, it } from 'vitest';
import { buildRouteAlertVoiceMessage, getRouteAlertGuidance } from '../src/lib/route-alert-guidance';

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

  it('builds a concise proximity voice instruction', () => {
    const guidance = getRouteAlertGuidance({ distanceMeters: 180, speedKmh: 60, severity: 'warning' });

    expect(buildRouteAlertVoiceMessage({
      title: 'Incendio en la ruta',
      distanceMeters: 180,
      guidance,
    })).toBe('Atención. Incendio en la ruta a 180 metros.');
  });
});
