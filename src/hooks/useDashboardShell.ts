import { useEffect, useRef, useState } from 'react';

import type { ActiveLayers, GlobalStats, MapView } from '@/lib/dashboard-shell';

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
