import { describe, expect, it } from 'vitest';
import { buildJourneyBoard, buildLiveArrivalLabel } from '../src/lib/route-journey-board';
import type { RouteOption } from '../src/lib/routing-shell';

const now = Date.parse('2026-09-06T21:00:00.000Z');

function option(overrides: Partial<RouteOption> & Pick<RouteOption, 'id'>): RouteOption {
  return {
    label: overrides.label || overrides.id,
    coordinates: [],
    distanceMeters: 10_000,
    durationSeconds: 1200,
    steps: [],
    ...overrides,
  };
}

describe('route journey board', () => {
  it('builds Citymapper-style cards with fastest and recommended badges', () => {
    const cards = buildJourneyBoard({
      activeRouteId: 'a',
      recommendedRouteId: 'b',
      recommendationReason: 'Ahorra 5 min frente a tu ruta',
      now,
      options: [
        option({ id: 'a', label: 'Actual', durationSeconds: 1800, distanceMeters: 12_000 }),
        option({ id: 'b', label: 'Rápida', durationSeconds: 1500, distanceMeters: 11_000 }),
        option({ id: 'c', label: 'Larga', durationSeconds: 2100, distanceMeters: 14_000 }),
      ],
    });

    expect(cards[0].id).toBe('a');
    expect(cards[0].badge).toBe('active');
    const recommended = cards.find((card) => card.id === 'b');
    expect(recommended?.badge).toBe('recommended');
    expect(recommended?.tradeoff).toContain('Ahorra 5 min');
    expect(cards.find((card) => card.id === 'c')?.tradeoff).toContain('+');
  });

  it('applies live traffic delay only when provided', () => {
    const cards = buildJourneyBoard({
      activeRouteId: 'a',
      now,
      trafficDelaySecondsByRouteId: { a: 300 },
      options: [
        option({ id: 'a', durationSeconds: 1200 }),
        option({ id: 'b', durationSeconds: 1200 }),
      ],
    });

    const active = cards.find((card) => card.id === 'a');
    expect(active?.trafficDelayLabel).toBe('+5 min tráfico');
    expect(active?.durationLabel).toContain('25');
    expect(cards.find((card) => card.id === 'b')?.trafficDelayLabel).toBeNull();
  });

  it('uses remaining duration for the active route during live navigation', () => {
    const cards = buildJourneyBoard({
      activeRouteId: 'a',
      activeRemainingDurationSeconds: 600,
      now,
      options: [option({ id: 'a', durationSeconds: 1800 }), option({ id: 'b', durationSeconds: 900 })],
    });
    expect(cards.find((card) => card.id === 'a')?.durationLabel).toBe('10 min');
  });
});

describe('live arrival label', () => {
  it('folds traffic delay into arrival time', () => {
    expect(buildLiveArrivalLabel({
      remainingDurationSeconds: 600,
      trafficDelaySeconds: 120,
      now,
    })).toBe(new Date(now + 720_000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  });
});
