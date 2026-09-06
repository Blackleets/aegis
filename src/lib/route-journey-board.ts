import {
  formatEtaLabel,
  formatRouteDistance,
  formatRouteDuration,
  type RouteOption,
} from '@/lib/routing-shell';

export type JourneyBoardBadge = 'active' | 'recommended' | 'fastest' | 'safer' | 'alternative';

export type JourneyBoardCard = {
  id: string;
  label: string;
  badge: JourneyBoardBadge;
  badgeLabel: string;
  durationLabel: string;
  distanceLabel: string;
  etaLabel: string;
  /** Citymapper-style one-line tradeoff. */
  tradeoff: string;
  trafficDelayLabel: string | null;
  selected: boolean;
  recommended: boolean;
  durationSeconds: number;
  distanceMeters: number;
};

export type JourneyBoardInput = {
  options: RouteOption[];
  activeRouteId: string;
  recommendedRouteId?: string | null;
  recommendationReason?: string | null;
  /** Optional live traffic delay seconds keyed by route id. */
  trafficDelaySecondsByRouteId?: Record<string, number>;
  /** Remaining duration override for the active route (live nav). */
  activeRemainingDurationSeconds?: number | null;
  now?: number;
};

function trafficLabel(delaySeconds: number | null | undefined) {
  if (!delaySeconds || delaySeconds < 60) return null;
  return `+${Math.max(1, Math.round(delaySeconds / 60))} min tráfico`;
}

function effectiveDuration(option: RouteOption, input: JourneyBoardInput) {
  const delay = input.trafficDelaySecondsByRouteId?.[option.id] ?? 0;
  if (option.id === input.activeRouteId && input.activeRemainingDurationSeconds != null) {
    return Math.max(0, input.activeRemainingDurationSeconds) + Math.max(0, delay);
  }
  return option.durationSeconds + Math.max(0, delay);
}

/**
 * Citymapper-inspired journey comparison board.
 * Pure + fail-closed: never invents traffic; only uses provided delays.
 */
export function buildJourneyBoard(input: JourneyBoardInput): JourneyBoardCard[] {
  const options = Array.isArray(input.options) ? input.options.filter((option) => option?.id) : [];
  if (options.length === 0) return [];

  const now = input.now ?? Date.now();
  const fastestId = [...options].sort((a, b) => effectiveDuration(a, input) - effectiveDuration(b, input))[0]?.id;
  const recommendedId = input.recommendedRouteId && options.some((option) => option.id === input.recommendedRouteId)
    ? input.recommendedRouteId
    : null;

  return options.map((option) => {
    const durationSeconds = effectiveDuration(option, input);
    const delay = input.trafficDelaySecondsByRouteId?.[option.id] ?? 0;
    const selected = option.id === input.activeRouteId;
    const recommended = option.id === recommendedId;
    const fastest = option.id === fastestId;
    const delayLabel = trafficLabel(delay);

    let badge: JourneyBoardBadge = 'alternative';
    let badgeLabel = 'Alternativa';
    if (selected && recommended) {
      badge = 'recommended';
      badgeLabel = 'Recomendada';
    } else if (selected) {
      badge = 'active';
      badgeLabel = 'Actual';
    } else if (recommended) {
      badge = 'recommended';
      badgeLabel = 'Recomendada';
    } else if (fastest) {
      badge = 'fastest';
      badgeLabel = 'Más rápida';
    }

    const fastestDuration = effectiveDuration(
      options.find((candidate) => candidate.id === fastestId) ?? option,
      input,
    );
    const deltaSeconds = durationSeconds - fastestDuration;
    let tradeoff: string;
    if (recommended && input.recommendationReason?.trim()) {
      tradeoff = input.recommendationReason.trim();
    } else if (fastest && !delayLabel) {
      tradeoff = 'La más rápida ahora mismo';
    } else if (deltaSeconds >= 60) {
      tradeoff = `+${Math.max(1, Math.round(deltaSeconds / 60))} min vs la más rápida`;
    } else if (deltaSeconds <= -60) {
      tradeoff = `−${Math.max(1, Math.round(Math.abs(deltaSeconds) / 60))} min vs la actual referencia`;
    } else {
      tradeoff = 'Tiempo similar a la más rápida';
    }
    if (delayLabel && !tradeoff.includes('tráfico')) {
      tradeoff = `${tradeoff} · ${delayLabel}`;
    }

    // ETA based on provided now for stable tests.
    const eta = new Date(now + durationSeconds * 1000);
    const etaLabel = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      id: option.id,
      label: option.label || 'Ruta',
      badge,
      badgeLabel,
      durationLabel: formatRouteDuration(durationSeconds),
      distanceLabel: formatRouteDistance(option.distanceMeters),
      etaLabel,
      tradeoff,
      trafficDelayLabel: delayLabel,
      selected,
      recommended,
      durationSeconds,
      distanceMeters: option.distanceMeters,
    };
  }).sort((left, right) => {
    if (left.selected !== right.selected) return left.selected ? -1 : 1;
    if (left.recommended !== right.recommended) return left.recommended ? -1 : 1;
    return left.durationSeconds - right.durationSeconds;
  });
}

export function buildLiveArrivalLabel({
  remainingDurationSeconds,
  trafficDelaySeconds = 0,
  now = Date.now(),
}: {
  remainingDurationSeconds: number;
  trafficDelaySeconds?: number;
  now?: number;
}) {
  if (!Number.isFinite(remainingDurationSeconds) || remainingDurationSeconds < 0) {
    return formatEtaLabel(0);
  }
  const total = remainingDurationSeconds + Math.max(0, trafficDelaySeconds);
  const eta = new Date(now + total * 1000);
  return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
