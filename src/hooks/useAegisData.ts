'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveLayers, DashboardData, GlobalStats, SpaceWeather } from '@/lib/dashboard-types';

export function useAegisData(activeLayers: ActiveLayers) {
  const [data, setData] = useState<DashboardData>({});
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeather | null>(null);
  const layerFetchedRef = useRef<Set<string>>(new Set());

  const fetchEndpoint = useCallback(async (
    url: string,
    transform?: (d: unknown) => Partial<DashboardData>,
    options?: RequestInit
  ) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        const json = await res.json() as unknown;
        const nextData = transform ? transform(json) : (json as Partial<DashboardData>);
        setData(prev => ({ ...prev, ...nextData }));
        setBackendStatus('connected');
      }
    } catch (e) {
      console.warn('[AEGIS] Suppressed error:', e instanceof Error ? e.message : e);
      setBackendStatus('error');
    }
  }, []);

  // Global stats
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then((d: { stats?: GlobalStats }) => {
        if (d.stats) setGlobalStats(d.stats);
      })
      .catch(console.error);
  }, []);

  // Core feeds + space weather
  useEffect(() => {
    const loadCoreFeeds = async () => {
      await fetchEndpoint('/api/earthquakes');
      await fetchEndpoint('/api/news');
    };

    void loadCoreFeeds();
    const marketTimer = setTimeout(() => fetchEndpoint('/api/markets', d => ({ markets: d })), 800);

    const spaceTimer = setTimeout(async () => {
      try {
        const r = await fetch('/api/space-weather');
        if (r.ok) setSpaceWeather(await r.json() as SpaceWeather);
      } catch (e) { console.warn('[AEGIS] Suppressed error:', e instanceof Error ? e.message : e); }
    }, 5000);

    const intervals = [
      setInterval(() => fetchEndpoint('/api/earthquakes'), 900000),
      setInterval(() => fetchEndpoint('/api/news'), 1800000),
      setInterval(() => fetchEndpoint('/api/markets', d => ({ markets: d })), 900000),
    ];

    return () => {
      clearTimeout(marketTimer);
      clearTimeout(spaceTimer);
      intervals.forEach(clearInterval);
    };
  }, [fetchEndpoint]);

  // Layer-aware initial fetch (each layer fetched once when first activated)
  useEffect(() => {
    const fetched = layerFetchedRef.current;

    if ((activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) && !fetched.has('flights')) {
      fetchEndpoint('/api/flights');
      fetched.add('flights');
    }
    if (activeLayers.satellites && !fetched.has('satellites')) {
      fetchEndpoint('/api/satellites');
      fetched.add('satellites');
    }
    if (activeLayers.fires && !fetched.has('fires')) {
      fetchEndpoint('/api/fires');
      fetched.add('fires');
    }
    if (activeLayers.cctv && !fetched.has('cctv')) {
      fetchEndpoint('/api/cctv?region=all&v=2');
      fetched.add('cctv');
    }
    if (activeLayers.maritime && !fetched.has('maritime')) {
      fetchEndpoint('/api/maritime', d => {
        const o = d as Record<string, unknown>;
        return { maritime_ports: o.ports, maritime_chokepoints: o.chokepoints, maritime_ships: o.ships };
      });
      fetched.add('maritime');
    }
    if (activeLayers.balloons && !fetched.has('balloons')) {
      fetchEndpoint('/api/balloons', d => { const o = d as Record<string, unknown>; return { balloons: o.balloons }; });
      fetched.add('balloons');
    }
    if (activeLayers.radiation && !fetched.has('radiation')) {
      fetchEndpoint('/api/radiation', d => { const o = d as Record<string, unknown>; return { radiation: o.stations }; });
      fetched.add('radiation');
    }
    if (activeLayers.live_news && !fetched.has('live_news')) {
      fetchEndpoint('/api/live-news', d => { const o = d as Record<string, unknown>; return { live_feeds: o.feeds }; });
      fetched.add('live_news');
    }
    if (activeLayers.weather && !fetched.has('weather')) {
      fetchEndpoint('/api/weather', d => { const o = d as Record<string, unknown>; return { weather_events: o.events }; });
      fetched.add('weather');
    }
    if (activeLayers.infrastructure && !fetched.has('infrastructure')) {
      fetchEndpoint('/api/infrastructure', d => { const o = d as Record<string, unknown>; return { infrastructure: o.infrastructure }; });
      fetched.add('infrastructure');
    }
    if (activeLayers.global_incidents && !fetched.has('gdelt')) {
      fetchEndpoint('/api/gdelt', d => { const o = d as Record<string, unknown>; return { gdelt: o.events }; });
      fetched.add('gdelt');
    }
  }, [activeLayers, fetchEndpoint]);

  // Layer-aware polling
  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];

    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      intervals.push(setInterval(() => fetchEndpoint('/api/flights'), 300000));
    }
    if (activeLayers.balloons) {
      intervals.push(setInterval(() => fetchEndpoint('/api/balloons', d => { const o = d as Record<string, unknown>; return { balloons: o.balloons }; }), 300000));
    }
    if (activeLayers.radiation) {
      intervals.push(setInterval(() => fetchEndpoint('/api/radiation', d => { const o = d as Record<string, unknown>; return { radiation: o.stations }; }), 300000));
    }
    if (activeLayers.maritime) {
      intervals.push(setInterval(() => fetchEndpoint('/api/maritime', d => {
        const o = d as Record<string, unknown>;
        return { maritime_ports: o.ports, maritime_chokepoints: o.chokepoints, maritime_ships: o.ships };
      }), 10000));
    }

    return () => intervals.forEach(clearInterval);
  }, [activeLayers, fetchEndpoint]);

  return { data, backendStatus, globalStats, spaceWeather };
}
