import { useEffect, useRef, useState } from 'react';

import type { ActiveLayers, GlobalStats, MapView, UsageMetrics } from '@/lib/dashboard-shell';

export function useSplashScreen(delayMs = 2200) {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.sessionStorage.getItem('aegis-splash-seen') !== '1';
  });

  useEffect(() => {
    if (!showSplash) return;
    const splashTimer = window.setTimeout(() => {
      window.sessionStorage.setItem('aegis-splash-seen', '1');
      setShowSplash(false);
    }, delayMs);
    return () => window.clearTimeout(splashTimer);
  }, [delayMs, showSplash]);

  return showSplash;
}

export function useDashboardUrlState(mapView: MapView, activeLayers: ActiveLayers) {
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (urlTimer.current) clearTimeout(urlTimer.current);

    urlTimer.current = setTimeout(() => {
      const params = new URLSearchParams();
      params.set('lat', (mapView.latitude ?? 20).toFixed(4));
      params.set('lon', '0');
      params.set('zoom', mapView.zoom.toFixed(2));
      const active = Object.entries(activeLayers)
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(',');
      params.set('layers', active);
      const url = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', url);
    }, 1500);

    return () => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
    };
  }, [mapView, activeLayers]);
}

export function useGlobalStats() {
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((response) => response.json())
      .then((payload: { stats?: GlobalStats }) => {
        if (payload.stats) setGlobalStats(payload.stats);
      })
      .catch(console.error);
  }, []);

  return globalStats;
}

export function useUsageMetrics() {
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sessionKey = 'aegis-session-id';
    let sessionId = window.sessionStorage.getItem(sessionKey);

    if (!sessionId) {
      sessionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(sessionKey, sessionId);
    }

    let cancelled = false;

    const syncUsage = async () => {
      try {
        const response = await fetch('/api/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) return;
        const metrics = (await response.json()) as UsageMetrics;
        if (!cancelled) setUsageMetrics(metrics);
      } catch (error) {
        console.warn('[AEGIS] Suppressed error:', error instanceof Error ? error.message : error);
      }
    };

    void syncUsage();

    const intervalId = window.setInterval(() => {
      void syncUsage();
    }, 30000);

    const handleVisibility = () => {
      if (!document.hidden) {
        void syncUsage();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return usageMetrics;
}
