import { describe, expect, it } from 'vitest';

import { recommendRoute } from '../src/lib/route-intelligence';

describe('route intelligence', () => {
  it('keeps the active route when the alternative gain is trivial', () => {
    const result = recommendRoute({
      activeRouteId: 'active',
      candidates: [
        { id: 'active', label: 'Actual', durationSeconds: 1200, nearbySignals: 1 },
        { id: 'alt', label: 'Alternativa', durationSeconds: 1140, nearbySignals: 1 },
      ],
    });

    expect(result?.routeId).toBe('active');
    expect(result?.shouldSwitch).toBe(false);
  });

  it('recommends an alternative only when time savings are meaningful', () => {
    const result = recommendRoute({
      activeRouteId: 'active',
      candidates: [
        { id: 'active', label: 'Actual', durationSeconds: 1800, nearbySignals: 1 },
        { id: 'alt', label: 'Rápida', durationSeconds: 1500, nearbySignals: 1 },
      ],
    });

    expect(result?.routeId).toBe('alt');
    expect(result?.shouldSwitch).toBe(true);
    expect(result?.savingsSeconds).toBe(300);
    expect(result?.reason).toContain('5 min');
  });

  it('accepts a short detour when it removes several nearby alerts', () => {
    const result = recommendRoute({
      activeRouteId: 'active',
      candidates: [
        { id: 'active', label: 'Actual', durationSeconds: 1200, nearbySignals: 5 },
        { id: 'alt', label: 'Más segura', durationSeconds: 1320, nearbySignals: 1 },
      ],
    });

    expect(result?.routeId).toBe('alt');
    expect(result?.signalReduction).toBe(4);
    expect(result?.shouldSwitch).toBe(true);
  });

  it('refuses a large detour even when it has fewer signals', () => {
    const result = recommendRoute({
      activeRouteId: 'active',
      candidates: [
        { id: 'active', label: 'Actual', durationSeconds: 1200, nearbySignals: 5 },
        { id: 'alt', label: 'Larga', durationSeconds: 1800, nearbySignals: 0 },
      ],
    });

    expect(result?.routeId).toBe('active');
    expect(result?.shouldSwitch).toBe(false);
  });
});
