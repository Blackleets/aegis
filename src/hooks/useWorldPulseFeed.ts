'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  loadWorldPulse,
  type WorldPulseClientPayload,
  type WorldPulseLoadResult,
} from '@/lib/world-pulse-client';

export type WorldPulseFeedState = {
  payload: WorldPulseClientPayload | null;
  loading: boolean;
  error: string | null;
};

/** Poll cadence for the shared feed (API caches ~90 s upstream). */
export const WORLD_PULSE_POLL_MS = 180_000;

function reduceResult(prev: WorldPulseFeedState, result: WorldPulseLoadResult): WorldPulseFeedState {
  if (!result.ok) {
    // Fail-closed: keep the last real payload (it carries its own fetched_at label) and surface the error.
    return { payload: prev.payload, loading: false, error: 'No se pudo cargar World Pulse' };
  }
  if (!result.httpOk && result.payload?.status === 'unavailable') {
    return { payload: result.payload, loading: false, error: 'Fuentes globales no disponibles ahora' };
  }
  return { payload: result.payload, loading: false, error: null };
}

/**
 * Dashboard-owned World Pulse feed: loads on mount and polls, independent of any panel being open.
 * Map pins, the World Pulse panel and the mobile menu badge all read this one state.
 */
export function useWorldPulseFeed(pollMs = WORLD_PULSE_POLL_MS) {
  const [state, setState] = useState<WorldPulseFeedState>({ payload: null, loading: true, error: null });

  const refresh = useCallback(async (options?: { force?: boolean; showSpinner?: boolean }) => {
    if (options?.showSpinner) setState((prev) => ({ ...prev, loading: true }));
    const result = await loadWorldPulse({ force: options?.force === true });
    setState((prev) => reduceResult(prev, result));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async (force: boolean) => {
      const result = await loadWorldPulse({ force });
      if (!cancelled) setState((prev) => reduceResult(prev, result));
    };
    // Deferred so react-hooks/set-state-in-effect stays happy.
    const boot = window.setTimeout(() => { void run(false); }, 0);
    const timer = window.setInterval(() => { void run(true); }, pollMs);
    return () => {
      cancelled = true;
      window.clearTimeout(boot);
      window.clearInterval(timer);
    };
  }, [pollMs]);

  return { ...state, refresh } as const;
}

export type WorldPulseFeed = ReturnType<typeof useWorldPulseFeed>;
