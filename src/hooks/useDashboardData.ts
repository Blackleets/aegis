import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type { ActiveLayers, DashboardData, SpaceWeather } from '../lib/dashboard-shell';

export type BackendStatus = 'connecting' | 'connected' | 'error';
export type FeedFreshnessMap = Partial<Record<string, number>>;

type DashboardTransform = (payload: unknown) => Partial<DashboardData>;

interface DashboardDataState {
  data: DashboardData;
  backendStatus: BackendStatus;
  spaceWeather: SpaceWeather | null;
  feedFreshness: FeedFreshnessMap;
}

function markFreshness(
  setFeedFreshness: Dispatch<SetStateAction<FeedFreshnessMap>>,
  feedKey: string
) {
  setFeedFreshness((previous) => ({
    ...previous,
    [feedKey]: Date.now(),
  }));
}

function asObject(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
}

function pickArray<T = unknown>(payload: unknown, key: string): T[] | undefined {
  const value = asObject(payload)[key];
  return Array.isArray(value) ? (value as T[]) : undefined;
}

function pickValue<T>(payload: unknown, key: string): T | undefined {
  return asObject(payload)[key] as T | undefined;
}

export function useDashboardData(activeLayers: ActiveLayers): DashboardDataState {
  const [data, setData] = useState<DashboardData>({});
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('connecting');
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeather | null>(null);
  const [feedFreshness, setFeedFreshness] = useState<FeedFreshnessMap>({});

  const fetchEndpoint = useCallback(
    async (feedKey: string, url: string, transform?: DashboardTransform, options?: RequestInit) => {
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        const response = await fetch(url, {
          cache: 'no-store',
          ...options,
        });
        if (!response.ok) return;

        const payload = (await response.json()) as unknown;
        const nextData = transform ? transform(payload) : (payload as Partial<DashboardData>);
        setData((previous) => ({ ...previous, ...nextData }));
        setBackendStatus('connected');
        markFreshness(setFeedFreshness, feedKey);
      } catch (error) {
        console.warn('[AEGIS] Suppressed error:', error instanceof Error ? error.message : error);
        setBackendStatus('error');
      }
    },
    []
  );

  const fetchSpaceWeather = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;

    try {
      const response = await fetch('/api/space-weather');
      if (!response.ok) return;

      setSpaceWeather((await response.json()) as SpaceWeather);
      markFreshness(setFeedFreshness, 'space-weather');
    } catch (error) {
      console.warn('[AEGIS] Suppressed error:', error instanceof Error ? error.message : error);
    }
  }, []);

  useEffect(() => {
    const kickoff = setTimeout(() => {
      void fetchEndpoint('earthquakes', '/api/earthquakes');
      void fetchEndpoint('news', '/api/news');
      void fetchEndpoint('markets', '/api/markets', (payload) => ({ markets: payload as DashboardData['markets'] }));
    }, 0);

    const spaceTimer = setTimeout(() => {
      void fetchSpaceWeather();
    }, 1500);

    const intervals = [
      setInterval(() => void fetchEndpoint('earthquakes', '/api/earthquakes'), 60000),
      setInterval(() => void fetchEndpoint('news', '/api/news'), 45000),
      setInterval(() => void fetchEndpoint('markets', '/api/markets', (payload) => ({ markets: payload as DashboardData['markets'] })), 20000),
      setInterval(() => void fetchSpaceWeather(), 180000),
    ];

    return () => {
      clearTimeout(kickoff);
      clearTimeout(spaceTimer);
      intervals.forEach(clearInterval);
    };
  }, [fetchEndpoint, fetchSpaceWeather]);

  const layerFetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      if (!layerFetchedRef.current.has('flights')) {
        void fetchEndpoint('flights', '/api/flights');
        layerFetchedRef.current.add('flights');
      }
    }

    if (activeLayers.satellites && !layerFetchedRef.current.has('satellites')) {
      void fetchEndpoint('satellites', '/api/satellites');
      layerFetchedRef.current.add('satellites');
    }

    if (activeLayers.fires && !layerFetchedRef.current.has('fires')) {
      void fetchEndpoint('fires', '/api/fires');
      layerFetchedRef.current.add('fires');
    }

    if (activeLayers.cctv && !layerFetchedRef.current.has('cctv')) {
      void fetchEndpoint('cctv', '/api/cctv?region=all&v=2');
      layerFetchedRef.current.add('cctv');
    }

    if (activeLayers.maritime && !layerFetchedRef.current.has('maritime')) {
      void fetchEndpoint('maritime', '/api/maritime', (payload) => ({
        maritime_ports: pickArray(payload, 'ports'),
        maritime_chokepoints: pickArray(payload, 'chokepoints'),
        maritime_ships: pickArray(payload, 'ships'),
      }));
      layerFetchedRef.current.add('maritime');
    }

    if (activeLayers.balloons && !layerFetchedRef.current.has('balloons')) {
      void fetchEndpoint('balloons', '/api/balloons', (payload) => ({ balloons: pickArray(payload, 'balloons') }));
      layerFetchedRef.current.add('balloons');
    }

    if (activeLayers.radiation && !layerFetchedRef.current.has('radiation')) {
      void fetchEndpoint('radiation', '/api/radiation', (payload) => ({ radiation: pickArray(payload, 'stations') }));
      layerFetchedRef.current.add('radiation');
    }

    if (activeLayers.live_news && !layerFetchedRef.current.has('live_news')) {
      void fetchEndpoint('live-news', '/api/live-news', (payload) => ({ live_feeds: pickArray(payload, 'feeds') }));
      layerFetchedRef.current.add('live_news');
    }

    if (activeLayers.weather && !layerFetchedRef.current.has('weather')) {
      void fetchEndpoint('weather', '/api/weather', (payload) => ({ weather_events: pickArray(payload, 'events') }));
      layerFetchedRef.current.add('weather');
    }

    if (activeLayers.infrastructure && !layerFetchedRef.current.has('infrastructure')) {
      void fetchEndpoint('infrastructure', '/api/infrastructure', (payload) => ({ infrastructure: pickValue(payload, 'infrastructure') }));
      layerFetchedRef.current.add('infrastructure');
    }

    if (activeLayers.global_incidents && !layerFetchedRef.current.has('gdelt')) {
      void fetchEndpoint('gdelt', '/api/gdelt', (payload) => ({ gdelt: pickArray(payload, 'events') }));
      layerFetchedRef.current.add('gdelt');
    }
  }, [activeLayers, fetchEndpoint]);

  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];

    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      intervals.push(setInterval(() => void fetchEndpoint('flights', '/api/flights'), 120000));
    }

    if (activeLayers.balloons) {
      intervals.push(setInterval(() => void fetchEndpoint('balloons', '/api/balloons', (payload) => ({ balloons: pickArray(payload, 'balloons') })), 180000));
    }

    if (activeLayers.radiation) {
      intervals.push(setInterval(() => void fetchEndpoint('radiation', '/api/radiation', (payload) => ({ radiation: pickArray(payload, 'stations') })), 180000));
    }

    if (activeLayers.maritime) {
      intervals.push(
        setInterval(
          () => void fetchEndpoint('maritime', '/api/maritime', (payload) => ({
            maritime_ports: pickArray(payload, 'ports'),
            maritime_chokepoints: pickArray(payload, 'chokepoints'),
            maritime_ships: pickArray(payload, 'ships'),
          })),
          10000
        )
      );
    }

    if (activeLayers.weather) {
      intervals.push(setInterval(() => void fetchEndpoint('weather', '/api/weather', (payload) => ({ weather_events: pickArray(payload, 'events') })), 90000));
    }

    if (activeLayers.cctv) {
      intervals.push(setInterval(() => void fetchEndpoint('cctv', '/api/cctv?region=all&v=2'), 45000));
    }

    if (activeLayers.global_incidents) {
      intervals.push(setInterval(() => void fetchEndpoint('gdelt', '/api/gdelt', (payload) => ({ gdelt: pickArray(payload, 'events') })), 120000));
    }

    return () => intervals.forEach(clearInterval);
  }, [activeLayers, fetchEndpoint]);

  return {
    data,
    backendStatus,
    spaceWeather,
    feedFreshness,
  };
}
