'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, BarChart3, Newspaper, Search, X, Globe, MapPinned, Satellite, Moon, ExternalLink, AlertTriangle, Activity, Database, Wifi, Radar } from 'lucide-react';
import IntelFeed from '@/components/IntelFeed';
import MarketsPanel from '@/components/MarketsPanel';
import ScmPanel from '@/components/ScmPanel';
import SearchBar from '@/components/SearchBar';
import ScaleBar from '@/components/ScaleBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import SharePanel from '@/components/SharePanel';
import ViewPresets from '@/components/ViewPresets';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import GlobalStatusBar from '@/components/GlobalStatusBar';
import LiveAlerts from '@/components/LiveAlerts';
import AiAnalyst from '@/components/AiAnalyst';
import SolarSystemMode, { type CelestialBodyId } from '@/components/SolarSystemMode';
import ModeDock from '@/components/dashboard/ModeDock';
import FocusModeOverlay from '@/components/dashboard/FocusModeOverlay';
import IncidentFusionStrip from '@/components/dashboard/IncidentFusionStrip';
import NasaMissionStrip, { type NasaEventItem } from '@/components/dashboard/NasaMissionStrip';
import { DEFAULT_LOCALE, getDashboardCopy, isLocale, type Locale } from '@/lib/i18n';

const AegisMap = dynamic(() => import('@/components/AegisMap'), { ssr: false });
const LayerPanel = dynamic(() => import('@/components/LayerPanel'));
const CameraViewer = dynamic(() => import('@/components/CameraViewer'));
const OsintPanel = dynamic(() => import('@/components/OsintPanel'));

type DashboardMode = 'earth' | 'solar' | 'focus';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Mobile if narrow, OR landscape phone (short height + moderate width)
      setIsMobile(w < 768 || (h < 500 && w < 1024));
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  return isMobile;
}
const UptimeClock = () => {
  const [uptime, setUptime] = useState('00:00:00');
  const startTime = useRef<number | null>(null);
  useEffect(() => {
    startTime.current = Date.now();
    const iv = setInterval(() => {
      const e = Math.floor((Date.now() - (startTime.current ?? Date.now())) / 1000);
      setUptime(`${String(Math.floor(e/3600)).padStart(2,'0')}:${String(Math.floor((e%3600)/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="hidden lg:inline">UPTIME: <span className="text-[var(--gold-primary)]">{uptime}</span></span>;
};

const ZuluClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      setTime(`ZULU ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}Z`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="text-[var(--cyan-primary)] font-bold tabular-nums">{time || 'ZULU --:--:--Z'}</span>;
};

/** Real entity count — no fake throughput metrics */
const ActiveEntityCount = ({ data }: { data: Record<string, unknown[]> }) => {
  const count = useMemo(() => {
    if (!data) return 0;
    return Object.values(data).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 0), 0);
  }, [data]);
  return <span className="text-[var(--alert-green)] font-bold tabular-nums">{count.toLocaleString()}</span>;
};

/** Extracts a watchable YouTube URL from embed/channel URLs */
function getYouTubeWatchUrl(url: string): string {
  if (url.includes('channel=')) return `https://www.youtube.com/channel/${url.split('channel=')[1].split('&')[0]}/live`;
  if (url.includes('/embed/')) return `https://www.youtube.com/watch?v=${url.split('/embed/')[1].split('?')[0]}`;
  return url;
}

type Coordinate = { lat: number; lng: number };
type BoundingBox = [west: number, south: number, east: number, north: number];
type FlyToLocation = Coordinate & { ts: number; zoom?: number; bbox?: BoundingBox | null; label?: string };
type MapView = { zoom: number; latitude: number };
type ActiveLayers = Record<string, boolean>;

interface DashboardEntity extends Partial<Coordinate> {
  [key: string]: unknown;
}

interface DashboardNews {
  coords?: [number, number];
  title?: string;
  source?: string;
  [key: string]: unknown;
}

interface DashboardData extends Record<string, unknown> {
  commercial_flights?: DashboardEntity[];
  private_flights?: DashboardEntity[];
  private_jets?: DashboardEntity[];
  military_flights?: DashboardEntity[];
  maritime_ships?: DashboardEntity[];
  maritime_ports?: DashboardEntity[];
  maritime_chokepoints?: DashboardEntity[];
  earthquakes?: (DashboardEntity & { magnitude?: number; place?: string })[];
  gdelt?: (DashboardEntity & { name?: string })[];
  news?: DashboardNews[];
  satellites?: DashboardEntity[];
  cameras?: DashboardEntity[];
  weather_events?: DashboardEntity[];
  infrastructure?: DashboardEntity[];
  balloons?: DashboardEntity[];
  radiation?: DashboardEntity[];
  fires?: DashboardEntity[];
  gps_jamming?: DashboardEntity[];
  sdk_entities?: unknown[];
}

interface UsageMetrics {
  onlineUsers: number;
  totalUsers: number;
  updatedAt?: string;
}

interface RegionDossier {
  location?: { display_name?: string };
  country?: {
    flag?: string;
    name?: string;
    capital?: string;
    population?: number;
    subregion?: string;
    region?: string;
    languages?: string[];
    area?: number;
  };
  head_of_state?: { name?: string; position?: string };
  wikipedia?: { thumbnail?: string; extract?: string };
}

interface SpaceWeather {
  storm_color?: string;
  kp_index?: number | string;
  [key: string]: unknown;
}

interface NasaEventMesh {
  source?: string;
  status?: 'ok' | 'error';
  total_open?: number;
  fetched_at?: string;
  events?: NasaEventItem[];
}

interface ActiveCamera {
  type?: string;
  url?: string;
  name?: string;
  embed_allowed?: boolean;
  [key: string]: unknown;
}

interface ScanTarget extends Coordinate {
  id: string;
  timestamp: number;
  [key: string]: unknown;
}

interface OsintGeolocatePayload extends Coordinate {
  [key: string]: unknown;
}

const DEFAULT_ACTIVE_LAYERS: ActiveLayers = {
  flights: false,
  private: false,
  jets: false,
  military: false,
  maritime: true,
  satellites: false,
  balloons: false,
  cctv: true,
  live_news: true,
  news_intel: true,
  earthquakes: true,
  fires: false,
  weather: false,
  radiation: false,
  infrastructure: false,
  global_incidents: true,
  war_alerts: false,
  gps_jamming: false,
  day_night: true,
  sdk_stream: true,
};

function getInitialUrlState() {
  if (typeof window === 'undefined') {
    return {
      flyToLocation: null as FlyToLocation | null,
      mapView: { zoom: 2.5, latitude: 20 } as MapView,
      activeLayers: DEFAULT_ACTIVE_LAYERS,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get('lat') || '');
  const lon = parseFloat(params.get('lon') || '');
  const zoom = parseFloat(params.get('zoom') || '');
  const nextLayers: ActiveLayers = { ...DEFAULT_ACTIVE_LAYERS };
  const layers = params.get('layers');

  if (layers) {
    const active = new Set(layers.split(','));
    Object.keys(nextLayers).forEach((key) => {
      nextLayers[key] = active.has(key);
    });
  }

  return {
    flyToLocation: !Number.isNaN(lat) && !Number.isNaN(lon) ? { lat, lng: lon, ts: Date.now() } : null,
    mapView: { zoom: !Number.isNaN(zoom) ? zoom : 2.5, latitude: 20 },
    activeLayers: nextLayers,
  };
}

export default function Dashboard() {
  const initialUrlState = useMemo(() => getInitialUrlState(), []);
  const [data, setData] = useState<DashboardData>({});

  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [mapView, setMapView] = useState<MapView>(initialUrlState.mapView);
  const [flyToLocation, setFlyToLocation] = useState<FlyToLocation | null>(initialUrlState.flyToLocation);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);
  const mouseCoordsRef = useRef<Coordinate | null>(null);
  const coordsDisplayRef = useRef<HTMLDivElement>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [regionDossier, setRegionDossier] = useState<RegionDossier | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    const stored = window.localStorage.getItem('aegis-locale');
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  });
  const [activeCamera, setActiveCamera] = useState<ActiveCamera | null>(null);
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeather | null>(null);
  const [nasaEventMesh, setNasaEventMesh] = useState<NasaEventMesh | null>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [showMarkets, setShowMarkets] = useState(true);
  const [showScmPanel, setShowScmPanel] = useState(true);
  const [showIntel, setShowIntel] = useState(true);
  const [leftRailFocus, setLeftRailFocus] = useState<'markets' | 'flow' | 'intel'>('markets');
  const [rightRailFocus, setRightRailFocus] = useState<'alerts' | 'recon'>('alerts');
  const [mobilePanel, setMobilePanel] = useState<'layers'|'markets'|'intel'|'search'|'recon'|null>(null);
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>('earth');
  const [mapProjection, setMapProjection] = useState<'globe'|'mercator'>('globe');
  const [selectedCelestialBody, setSelectedCelestialBody] = useState<CelestialBodyId>('earth');

  const [mapStyle, setMapStyle] = useState<'dark'|'satellite'>('dark');
  const [sweepData, setSweepData] = useState<unknown>(null);
  const [scanTargets, setScanTargets] = useState<ScanTarget[]>([]);

  const isMobile = useIsMobile();
  const geocodeCache = useRef<Map<string, string>>(new Map());
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const lastGeocodedPos = useRef<{ lat: number; lng: number } | null>(null);
  const lastGeocodeKeyRef = useRef<string>('');
  const lastLocationLabelRef = useRef<string>('');

  // ── DEFAULT: Most layers OFF — fast initial load ──
  const [activeLayers, setActiveLayers] = useState<ActiveLayers>(initialUrlState.activeLayers);
  const [liveFeedUrl, setLiveFeedUrl] = useState<string | null>(null);
  const [liveFeedName, setLiveFeedName] = useState('');
  const [liveFeedEmbedAllowed, setLiveFeedEmbedAllowed] = useState(true);

  // Splash screen
  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('aegis-locale', locale);
  }, [locale]);

  // URL state: update URL on view change (debounced)
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const p = new URLSearchParams();
      p.set('lat', (mapView.latitude ?? 20).toFixed(4));
      p.set('lon', '0');
      p.set('zoom', mapView.zoom.toFixed(2));
      const active = Object.entries(activeLayers).filter(([,v]) => v).map(([k]) => k).join(',');
      p.set('layers', active);
      const url = `${window.location.pathname}?${p.toString()}`;
      window.history.replaceState(null, '', url);
    }, 1500);
  }, [mapView, activeLayers]);

  // Presence + cumulative usage counter
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
        const res = await fetch('/api/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) return;
        const metrics = await res.json() as UsageMetrics;
        if (!cancelled) setUsageMetrics(metrics);
      } catch (e) {
        console.warn('[AEGIS] Suppressed error:', e instanceof Error ? e.message : e);
      }
    };

    void syncUsage();

    const interval = window.setInterval(() => {
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
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === 'f' && !e.ctrlKey) {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
      if (e.key === 'l') setShowLayers(p => !p);
      if (e.key === 'm') setShowMarkets(p => !p);
      if (e.key === 'c') setShowScmPanel(p => !p);
      if (e.key === 'i') setShowIntel(p => !p);
      if (e.key === 'r') setFlyToLocation({ lat: 20, lng: 0, ts: Date.now() });
      if (e.key === 'g') setMapProjection(p => p === 'globe' ? 'mercator' : 'globe');
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); };
  }, []);

  // Mouse coords + reverse geocode (Zero-Render)
  const handleMouseCoords = useCallback((coords: { lat: number; lng: number }) => {
    mouseCoordsRef.current = coords;
    if (coordsDisplayRef.current) {
      coordsDisplayRef.current.innerText = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    }
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      if (lastGeocodedPos.current) {
        const d = Math.abs(coords.lat - lastGeocodedPos.current.lat) + Math.abs(coords.lng - lastGeocodedPos.current.lng);
        if (d < 0.5) return; // increased threshold — fewer geocode calls
      }
      const gk = `${coords.lat.toFixed(1)},${coords.lng.toFixed(1)}`; // coarser grid = more cache hits
      if (gk === lastGeocodeKeyRef.current) return;
      if (geocodeCache.current.has(gk)) {
        const cachedLabel = geocodeCache.current.get(gk)!;
        if (cachedLabel !== lastLocationLabelRef.current) {
          lastLocationLabelRef.current = cachedLabel;
          setLocationLabel(cachedLabel);
        }
        lastGeocodeKeyRef.current = gk;
        lastGeocodedPos.current = coords;
        return;
      }
      geocodeAbortRef.current?.abort();
      const controller = new AbortController();
      geocodeAbortRef.current = controller;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&zoom=10&addressdetails=1`, {
          headers: { 'Accept-Language': 'en' },
          signal: controller.signal,
        });
        if (res.ok) {
          const d = await res.json();
          const a = d.address || {};
          const label = [a.city||a.town||a.village||a.county, a.state||a.region, a.country].filter(Boolean).join(', ') || 'Unknown';
          if (geocodeCache.current.size > 500) { const it = geocodeCache.current.keys(); for (let i=0;i<100;i++) { const k = it.next().value; if(k) geocodeCache.current.delete(k); }}
          geocodeCache.current.set(gk, label);
          lastGeocodeKeyRef.current = gk;
          if (label !== lastLocationLabelRef.current) {
            lastLocationLabelRef.current = label;
            setLocationLabel(label);
          }
          lastGeocodedPos.current = coords;
        }
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') {
          console.warn('[AEGIS] Suppressed error:', e instanceof Error ? e.message : e);
        }
      }
    }, 3000); // 3s debounce (was 1.5s)
  }, []);

  useEffect(() => {
    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
      geocodeAbortRef.current?.abort();
    };
  }, []);

  // Region dossier (right-click)
  const handleRightClick = useCallback(async (coords: Coordinate) => {
    setDossierLoading(true); setRegionDossier(null);
    try {
      const res = await fetch(`/api/region-dossier?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) setRegionDossier(await res.json() as RegionDossier);
    } catch (e) { console.warn('[AEGIS] Suppressed error:', e instanceof Error ? e.message : e); } finally { setDossierLoading(false); }
  }, []);

  // Entity click handler (hoisted from JSX to comply with Rules of Hooks — Fixes #113)
  const handleEntityClick = useCallback((entity: ActiveCamera) => {
    if (entity?.type === 'cctv') setActiveCamera(entity);
    if (entity?.type === 'live_news' && entity.url) {
      setLiveFeedUrl(entity.url);
      setLiveFeedName(entity.name);
      setLiveFeedEmbedAllowed(entity.embed_allowed !== false);
    }
  }, []);

  // ── SHARED FETCH UTILITY (Fixes #107 — single definition, not 3 copies) ──
  const fetchEndpoint = useCallback(async (url: string, transform?: (d: unknown) => Partial<DashboardData>, options?: RequestInit) => {
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

  // ── PROGRESSIVE DATA LOADING (request-optimized) ──
  useEffect(() => {
    const loadCoreFeeds = async () => {
      await fetchEndpoint('/api/earthquakes');
      await fetchEndpoint('/api/news');
    };

    const loadNasaEvents = async () => {
      try {
        const r = await fetch('/api/nasa/eonet');
        if (r.ok) setNasaEventMesh(await r.json());
      } catch (e) {
        console.warn('[AEGIS] Suppressed error:', e instanceof Error ? e.message : e);
      }
    };

    // Priority 1: Core feeds (always needed for panels)
    void loadCoreFeeds();
    const marketTimer = setTimeout(() => fetchEndpoint('/api/markets', d => ({ markets: d })), 800);

    // Priority 2: Space Weather (needed for MarketsPanel)
    const spaceTimer = setTimeout(async () => {
      try {
        const r = await fetch('/api/space-weather');
        if (r.ok) setSpaceWeather(await r.json());
      } catch (e) { console.warn('[AEGIS] Suppressed error:', e instanceof Error ? e.message : e); }
    }, 5000);

    // Priority 3: NASA event mesh
    const nasaTimer = setTimeout(() => {
      void loadNasaEvents();
    }, 2500);

    // Polling — OPTIMIZED intervals to minimize edge requests
    const intervals = [
      setInterval(() => fetchEndpoint('/api/earthquakes'), 900000),  // 15 min (was 5)
      setInterval(() => fetchEndpoint('/api/news'), 1800000),        // 30 min (was 10)
      setInterval(() => fetchEndpoint('/api/markets', d => ({ markets: d })), 900000), // 15 min (was 5)
      setInterval(() => {
        void loadNasaEvents();
      }, 1800000),
    ];
    return () => {
      clearTimeout(marketTimer);
      clearTimeout(spaceTimer);
      clearTimeout(nasaTimer);
      intervals.forEach(clearInterval);
    };
  }, [fetchEndpoint]);

  // ── LAYER-AWARE DATA LOADING — only fetch when layer is toggled ON ──
  const layerFetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {

    // Flights
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      if (!layerFetchedRef.current.has('flights')) {
        fetchEndpoint('/api/flights');
        layerFetchedRef.current.add('flights');
      }
    }
    // Satellites
    if (activeLayers.satellites && !layerFetchedRef.current.has('satellites')) {
      fetchEndpoint('/api/satellites');
      layerFetchedRef.current.add('satellites');
    }
    // Fires
    if (activeLayers.fires && !layerFetchedRef.current.has('fires')) {
      fetchEndpoint('/api/fires');
      layerFetchedRef.current.add('fires');
    }
    // CCTV
    if (activeLayers.cctv && !layerFetchedRef.current.has('cctv')) {
      fetchEndpoint('/api/cctv?region=all&v=2');
      layerFetchedRef.current.add('cctv');
    }
    // Maritime
    if (activeLayers.maritime && !layerFetchedRef.current.has('maritime')) {
      fetchEndpoint('/api/maritime', d => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, maritime_ships: d.ships }));
      layerFetchedRef.current.add('maritime');
    }
    // Balloons
    if (activeLayers.balloons && !layerFetchedRef.current.has('balloons')) {
      fetchEndpoint('/api/balloons', d => ({ balloons: d.balloons }));
      layerFetchedRef.current.add('balloons');
    }
    // Radiation
    if (activeLayers.radiation && !layerFetchedRef.current.has('radiation')) {
      fetchEndpoint('/api/radiation', d => ({ radiation: d.stations }));
      layerFetchedRef.current.add('radiation');
    }
    // Live News
    if (activeLayers.live_news && !layerFetchedRef.current.has('live_news')) {
      fetchEndpoint('/api/live-news', d => ({ live_feeds: d.feeds }));
      layerFetchedRef.current.add('live_news');
    }
    // Weather
    if (activeLayers.weather && !layerFetchedRef.current.has('weather')) {
      fetchEndpoint('/api/weather', d => ({ weather_events: d.events }));
      layerFetchedRef.current.add('weather');
    }
    // Infrastructure
    if (activeLayers.infrastructure && !layerFetchedRef.current.has('infrastructure')) {
      fetchEndpoint('/api/infrastructure', d => ({ infrastructure: d.infrastructure }));
      layerFetchedRef.current.add('infrastructure');
    }
    // Global Incidents (GDELT)
    if (activeLayers.global_incidents && !layerFetchedRef.current.has('gdelt')) {
      fetchEndpoint('/api/gdelt', d => ({ gdelt: d.events }));
      layerFetchedRef.current.add('gdelt');
    }

  }, [activeLayers, fetchEndpoint]);

  // ── LAYER-AWARE POLLING — only poll data for active layers ──
  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      intervals.push(setInterval(() => fetchEndpoint('/api/flights'), 300000)); // 5 min (was 2 min)
    }

    if (activeLayers.balloons) {
      intervals.push(setInterval(() => fetchEndpoint('/api/balloons', d => ({ balloons: d.balloons })), 300000)); // 5m
    }
    if (activeLayers.radiation) {
      intervals.push(setInterval(() => fetchEndpoint('/api/radiation', d => ({ radiation: d.stations })), 300000)); // 5m
    }
    if (activeLayers.maritime) {
      intervals.push(setInterval(() => fetchEndpoint('/api/maritime', d => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, maritime_ships: d.ships })), 10000)); // 10s
    }
    return () => intervals.forEach(clearInterval);
  }, [activeLayers, fetchEndpoint]);

  // CCTV: loaded once on layer toggle via layerFetchedRef (no viewport polling)

  // Reactive layer fetch: handled by layerFetchedRef above (no duplicate)

  // ── AEGIS SDK — Intelligence Fusion Layer ──
  // Produces node coordinates for the SDK network mesh visualization.
  // Does NOT duplicate existing layer visuals — SDK layer is LINES ONLY.
  // Cameras are excluded — they have their own dedicated layer.
  const sdkEntities = useMemo(() => {
    if (!activeLayers.sdk_stream) {
      return [] as Array<{
        type: 'Feature';
        geometry: { type: 'Point'; coordinates: [number, number] };
        properties: { domain: string; name: string; source: string };
      }>;
    }

    const computedSdkEntities: Array<{
      type: 'Feature';
      geometry: { type: 'Point'; coordinates: [number, number] };
      properties: { domain: string; name: string; source: string };
    }> = [];

    // Air domain (nodes only — no visual duplication)
    const allFlights = [
      ...(data.commercial_flights || []),
      ...(data.private_flights || []),
      ...(data.private_jets || []),
      ...(data.military_flights || []),
    ];
    // Sample flights to keep it clean (every Nth)
    const flightStep = Math.max(1, Math.floor(allFlights.length / 60));
    for (let i = 0; i < allFlights.length; i += flightStep) {
      const f = allFlights[i];
      if (!f.lat || !f.lng) continue;
      computedSdkEntities.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
        properties: { domain: 'AIR', name: typeof f.callsign === 'string' ? f.callsign.trim() || 'TRACK' : 'TRACK', source: 'ADS-B / OpenSky' },
      });
    }

    // Sea domain
    const ships = data.maritime_ships || [];
    const shipStep = Math.max(1, Math.floor(ships.length / 60));
    for (let i = 0; i < ships.length; i += shipStep) {
      const s = ships[i];
      if (!s.lat || !s.lng) continue;
      computedSdkEntities.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: { domain: 'SEA', name: typeof s.name === 'string' ? s.name : `MMSI-${String(s.mmsi ?? 'UNKNOWN')}`, source: 'AIS Stream' },
      });
    }

    // Events — Earthquakes
    if (data.earthquakes?.length) {
      for (const eq of data.earthquakes) {
        if (!eq.lat || !eq.lng) continue;
        computedSdkEntities.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [eq.lng, eq.lat] },
          properties: { domain: 'LAND', name: `M${String(eq.magnitude ?? '?')} ${typeof eq.place === 'string' ? eq.place : ''}`.trim(), source: 'USGS' },
        });
      }
    }

    // GDELT events
    if (data.gdelt?.length) {
      for (const g of data.gdelt) {
        if (!g.lat || !g.lng) continue;
        computedSdkEntities.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [g.lng, g.lat] },
          properties: { domain: 'INTEL', name: typeof g.name === 'string' ? g.name : 'GDELT Event', source: 'GDELT Project' },
        });
      }
    }

    // News intel
    if (data.news?.length) {
      for (const n of data.news) {
        if (!n.coords || n.coords.length < 2) continue;
        computedSdkEntities.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [n.coords[1], n.coords[0]] },
          properties: { domain: 'INTEL', name: typeof n.title === 'string' ? n.title : 'SIGINT', source: typeof n.source === 'string' ? n.source : 'RSS Feed' },
        });
      }
    }

    return computedSdkEntities;
  }, [
    activeLayers.sdk_stream,
    data.commercial_flights,
    data.private_flights,
    data.private_jets,
    data.military_flights,
    data.maritime_ships,
    data.earthquakes,
    data.gdelt,
    data.news,
  ]);

  const dataWithSdk = useMemo<DashboardData>(() => ({
    ...data,
    sdk_entities: sdkEntities,
  }), [data, sdkEntities]);

  const totalFlights = useMemo(() => (
    (data.commercial_flights?.length||0)+(data.private_flights?.length||0)+(data.private_jets?.length||0)+(data.military_flights?.length||0)
  ), [data.commercial_flights, data.private_flights, data.private_jets, data.military_flights]);

  const trackedEntityCount = useMemo(() => {
    return [
      data.commercial_flights,
      data.private_flights,
      data.private_jets,
      data.military_flights,
      data.maritime_ships,
      data.satellites,
      data.cameras,
      data.weather_events,
      data.infrastructure,
      data.balloons,
      data.radiation,
      data.fires,
      data.gps_jamming,
      data.gdelt,
      data.news,
      data.earthquakes,
    ].reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0);
  }, [
    data.commercial_flights,
    data.private_flights,
    data.private_jets,
    data.military_flights,
    data.maritime_ships,
    data.satellites,
    data.cameras,
    data.weather_events,
    data.infrastructure,
    data.balloons,
    data.radiation,
    data.fires,
    data.gps_jamming,
    data.gdelt,
    data.news,
    data.earthquakes,
  ]);

  const activeIntelAlerts = useMemo(() => {
    const highRiskNews = (data.news || []).filter((item) => typeof item.risk_score === 'number' && item.risk_score >= 6).length;
    const significantQuakes = (data.earthquakes || []).filter((item) => typeof item.magnitude === 'number' && item.magnitude >= 4.5).length;
    return highRiskNews + significantQuakes;
  }, [data.news, data.earthquakes]);

  const maritimePressure = useMemo(() => {
    const congestedPorts = (data.maritime_ports || []).filter((port) => port.congestion === 'SEVERE' || port.congestion === 'CONGESTED').length;
    const riskyChokepoints = (data.maritime_chokepoints || []).filter((point) => point.risk === 'CRITICAL' || point.risk === 'HIGH').length;
    return congestedPorts + riskyChokepoints;
  }, [data.maritime_ports, data.maritime_chokepoints]);

  const isEarthOps = dashboardMode === 'earth';
  const isSolarView = dashboardMode === 'solar';
  const isFocusView = dashboardMode === 'focus';
  const showEarthOperationalShell = selectedCelestialBody === 'earth' && !isSolarView;
  const showDesktopRails = !isMobile && isEarthOps && selectedCelestialBody === 'earth';
  const showDesktopBottomBar = !isMobile && isEarthOps && selectedCelestialBody === 'earth';
  const showAuxiliaryHud = isEarthOps && selectedCelestialBody === 'earth';
  const copy = getDashboardCopy(locale);

  const operationalModeLabel = selectedCelestialBody !== 'earth'
    ? locale === 'es' ? `MODO VISUAL ${selectedCelestialBody.toUpperCase()}` : `${selectedCelestialBody.toUpperCase()} VISUAL MODE`
    : backendStatus === 'connected'
      ? activeIntelAlerts > 0 || maritimePressure > 0
        ? locale === 'es' ? 'VIGILIA ELEVADA' : 'HEIGHTENED WATCH'
        : locale === 'es' ? 'SEGUIMIENTO ESTABLE' : 'STEADY TRACKING'
      : backendStatus === 'error'
        ? locale === 'es' ? 'ESTADO DE FEEDS DEGRADADO' : 'DEGRADED FEED STATE'
        : locale === 'es' ? 'ENLAZANDO MALLA DE DATOS' : 'LINKING DATA MESH';

  const commandRailFocus = selectedCelestialBody !== 'earth'
    ? locale === 'es' ? 'DATOS DE TIERRA EN ESPERA' : 'EARTH DATA STANDBY'
    : backendStatus === 'connected'
      ? activeIntelAlerts > 0
        ? locale === 'es' ? 'SEÑALES PRIORITARIAS' : 'PRIORITY SIGNALS'
        : maritimePressure > 0
          ? locale === 'es' ? 'VIGILIA DE CADENA DE SUMINISTRO' : 'SUPPLY-CHAIN WATCH'
          : locale === 'es' ? 'RECON RUTINARIO' : 'ROUTINE RECON'
      : backendStatus === 'error'
        ? locale === 'es' ? 'COBERTURA DEGRADADA' : 'DEGRADED COVERAGE'
        : locale === 'es' ? 'SINCRONIZANDO FUENTES' : 'SYNCING SOURCES';

  return (
    <main className="fixed inset-0 w-full h-full bg-[var(--bg-void)] overflow-hidden">
      {/* ── SPLASH ── */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, #0a0a14 0%, var(--bg-void) 70%)' }}
          >

            <div className="absolute inset-0 pointer-events-none z-[1]" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,175,55,0.015) 2px, rgba(212,175,55,0.015) 4px)',
              animation: 'splashScanDrift 8s linear infinite',
            }} />

            {/* ── V4.2 badge — top-left ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute top-6 left-6 z-[2] font-mono text-[10px] tracking-[0.3em] text-[var(--gold-primary)]"
            >
              V4.2
            </motion.div>



            {/* ── AEGIS tactical identity block ── */}
            <div className="relative w-[18rem] max-w-[82vw] mb-7 flex flex-col items-center z-[2]">
              <motion.div
                initial={{ opacity: 0, y: 22, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
                className="w-full rounded-[24px] border border-[rgba(34,211,238,0.16)] bg-[linear-gradient(180deg,rgba(6,14,24,0.96)_0%,rgba(7,11,18,0.92)_100%)] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                <div className="mb-3 flex items-center justify-between text-[9px] font-mono tracking-[0.28em] text-[var(--text-muted)]">
                  <span>AEGIS</span>
                  <span className="text-[var(--cyan-primary)]">WORLD MODEL</span>
                </div>

                <div className="relative h-[92px] overflow-hidden rounded-[16px] border border-[rgba(34,211,238,0.12)] bg-[linear-gradient(180deg,rgba(8,16,28,0.96)_0%,rgba(5,10,18,0.84)_100%)]">
                  <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.07) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
                  <div className="absolute left-0 right-0 top-1/2 h-[1px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[rgba(34,211,238,0.38)] to-transparent" />
                  <div className="absolute bottom-0 left-[18%] top-0 w-[1px] bg-gradient-to-b from-transparent via-[rgba(212,175,55,0.2)] to-transparent" />
                  <div className="absolute bottom-0 right-[22%] top-0 w-[1px] bg-gradient-to-b from-transparent via-[rgba(34,211,238,0.16)] to-transparent" />

                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35, duration: 0.6 }}
                    className="absolute left-3 top-3 rounded-full border border-[rgba(212,175,55,0.26)] bg-[rgba(212,175,55,0.08)] px-2 py-[3px] text-[8px] font-mono tracking-[0.2em] text-[var(--gold-primary)]"
                  >
                    GRID LOCK
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.45, duration: 0.8, ease: 'easeOut' }}
                    className="absolute left-4 right-4 top-1/2 h-[2px] origin-left rounded-full bg-gradient-to-r from-[rgba(34,211,238,0.12)] via-[rgba(191,219,254,0.92)] to-[rgba(212,175,55,0.4)] shadow-[0_0_16px_rgba(34,211,238,0.24)]"
                  />

                  {[
                    { left: '22%', top: '50%', delay: 0.8, color: 'rgba(34,211,238,0.95)' },
                    { left: '46%', top: '50%', delay: 1.0, color: 'rgba(191,219,254,0.95)' },
                    { left: '71%', top: '50%', delay: 1.2, color: 'rgba(212,175,55,0.95)' },
                  ].map((node, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: [0.55, 1, 0.55], scale: [0.9, 1.08, 0.9] }}
                      transition={{ delay: node.delay, duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ left: node.left, top: node.top, background: node.color, boxShadow: `0 0 14px ${node.color}` }}
                    />
                  ))}

                  <motion.div
                    initial={{ opacity: 0, x: 22 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.55 }}
                    className="absolute right-3 top-3 text-right text-[8px] font-mono tracking-[0.22em] text-[var(--text-secondary)]"
                  >
                    <div>SYNC 3/3</div>
                    <div className="mt-1 text-[var(--cyan-primary)]">VERIFIED FEEDS</div>
                  </motion.div>

                  <div className="absolute bottom-3 left-3 text-[8px] font-mono tracking-[0.22em] text-[rgba(212,175,55,0.72)]">COMMAND SURFACE</div>
                  <div className="absolute right-3 bottom-3 text-[8px] font-mono tracking-[0.22em] text-[rgba(34,211,238,0.72)]">LIVE MODEL</div>
                </div>
              </motion.div>
            </div>

            {/* ── Title / identity ── */}
            <div className="flex flex-col items-center mb-7 z-[2] px-4 text-center">
              <motion.h1
                initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.55, duration: 0.65, ease: 'easeOut' }}
                className="text-[2.15rem] md:text-[3.2rem] font-bold tracking-[0.36em] md:tracking-[0.42em] font-mono text-[var(--text-heading)]"
                style={{ textShadow: '0 0 26px rgba(212,175,55,0.14)' }}
              >
                AEGIS
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.92 }}
                transition={{ delay: 0.95, duration: 0.5 }}
                className="mt-2 text-[10px] md:text-[11px] font-mono tracking-[0.44em] text-[var(--gold-primary)]"
              >
                LIVE WORLD MODEL
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.72 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="mt-2 max-w-[24rem] text-[8px] md:text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--text-secondary)]"
              >
                VERIFIED GLOBAL INTELLIGENCE • COMMAND SURFACE ONLINE
              </motion.p>
            </div>

            {/* ── Progress / status ── */}
            <div className="w-64 md:w-80 z-[2]">
              <div className="mb-2 flex items-center justify-between text-[8px] font-mono tracking-[0.22em] text-[var(--text-muted)]">
                <span>BOOTSTRAP</span>
                <span className="text-[var(--gold-primary)]">V4.2</span>
              </div>
              <div className="relative w-full h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.12)' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: ['0%', '22%', '48%', '74%', '100%'] }}
                  transition={{ duration: 2.2, delay: 0.45, times: [0, 0.22, 0.5, 0.78, 1], ease: 'easeInOut' }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'linear-gradient(90deg, rgba(34,211,238,0.88), rgba(191,219,254,0.95), rgba(212,175,55,0.9))', boxShadow: '0 0 12px rgba(34,211,238,0.32)' }}
                />
              </div>

              <div className="mt-3 h-4 flex items-center justify-center">
                {[
                  { text: 'LOCKING WORLD GRID...', delay: 0.5 },
                  { text: 'SYNCING VERIFIED FEEDS...', delay: 1.1 },
                  { text: 'ALIGNING COMMAND SURFACE...', delay: 1.7 },
                  { text: 'AEGIS READY', delay: 2.2 },
                ].map((stage, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ delay: stage.delay, duration: 0.62, times: [0, 0.1, 0.72, 1] }}
                    className="absolute text-[9px] font-mono tracking-[0.24em]"
                    style={{ color: i === 3 ? 'var(--cyan-primary)' : 'var(--text-muted)' }}
                  >
                    {stage.text}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* ── Decorative grid lines ── */}
            <div className="absolute inset-0 pointer-events-none z-[0]" style={{ opacity: 0.03 }}>
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }} />
            </div>

            {/* ── Corner frame accents ── */}
            {[
              { t: '10px', l: '10px', bw: '2px 0 0 2px' },
              { t: '10px', r: '10px', bw: '2px 2px 0 0' },
              { b: '10px', l: '10px', bw: '0 0 2px 2px' },
              { b: '10px', r: '10px', bw: '0 2px 2px 0' },
            ].map((pos, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                className="absolute w-8 h-8 z-[2]"
                style={{ top: pos.t, bottom: pos.b, left: pos.l, right: pos.r, borderWidth: pos.bw, borderStyle: 'solid', borderColor: 'var(--gold-primary)' }}
              />
            ))}



            {/* ── Inline keyframe for scanline drift ── */}

          </motion.div>
        )}
      </AnimatePresence>



      {/* ── MAP ── */}
      <ErrorBoundary name="Map">
        <AegisMap
          data={dataWithSdk}
          activeLayers={activeLayers}
          projection={mapProjection}
          mapStyle={mapStyle === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'dark'}
          onEntityClick={handleEntityClick}
          onMouseCoords={handleMouseCoords}
          onRightClick={handleRightClick}
          onViewStateChange={setMapView}
          flyToLocation={flyToLocation}
          sweepData={sweepData}
          scanTargets={scanTargets}
        />
      </ErrorBoundary>

      <SolarSystemMode
        selected={selectedCelestialBody}
        onSelect={setSelectedCelestialBody}
        onReturnEarth={() => {
          setDashboardMode('earth');
          setSelectedCelestialBody('earth');
        }}
        isMobile={isMobile}
        enabled={isSolarView}
        locale={locale}
      />

      <ModeDock
        mode={dashboardMode}
        locale={locale}
        onLocaleChange={setLocale}
        onEarthOps={() => {
          setDashboardMode('earth');
          setSelectedCelestialBody('earth');
        }}
        onSolarView={() => {
          setDashboardMode('solar');
          setSelectedCelestialBody(prev => prev === 'earth' ? 'mars' : prev);
        }}
        onFocus={() => {
          setDashboardMode('focus');
          setSelectedCelestialBody('earth');
        }}
      />

      {isFocusView && (
        <FocusModeOverlay
          backendStatus={backendStatus}
          trackedEntityCount={trackedEntityCount}
          activeIntelAlerts={activeIntelAlerts}
          postureLabel={operationalModeLabel}
          locale={locale}
        />
      )}

      {/* ── MAP VIEW CONTROLS (Earth ops) / return control (planet vista) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3.5 }}
        className={`absolute z-[200] flex items-center gap-2 pointer-events-none ${isEarthOps ? 'bottom-[75px] md:bottom-6 left-3 md:left-[19rem] xl:left-[20rem]' : 'bottom-[88px] md:bottom-8 left-1/2 -translate-x-1/2'}`}
      >
        {(showEarthOperationalShell || isFocusView) ? (
          <>
            <button
              onClick={() => setMapProjection(p => p === 'globe' ? 'mercator' : 'globe')}
              className="glass-panel p-2.5 pointer-events-auto hover:border-[var(--gold-primary)]/40 transition-colors group relative"
              title={mapProjection === 'globe' ? copy.controls.switch2d : copy.controls.switch3d}
            >
              {mapProjection === 'globe' ? (
                <MapPinned className="w-4 h-4 text-[var(--gold-primary)] group-hover:scale-110 transition-transform" />
              ) : (
                <Globe className="w-4 h-4 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />
              )}
              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[var(--text-muted)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity glass-panel px-2 py-1 z-[300]">
                {mapProjection === 'globe' ? copy.controls.map2d : copy.controls.globe3d}
              </span>
            </button>

            <button
              onClick={() => setMapStyle(s => s === 'dark' ? 'satellite' : 'dark')}
              className="glass-panel p-2.5 pointer-events-auto hover:border-[var(--gold-primary)]/40 transition-colors group relative"
              title={mapStyle === 'dark' ? copy.controls.satelliteView : copy.controls.nightView}
            >
              {mapStyle === 'dark' ? (
                <Satellite className="w-4 h-4 text-[var(--alert-green)] group-hover:scale-110 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />
              )}
              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[var(--text-muted)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity glass-panel px-2 py-1 z-[300]">
                {mapStyle === 'dark' ? copy.controls.satellite : copy.controls.nightMode}
              </span>
            </button>
          </>
        ) : isSolarView ? (
          <button
            onClick={() => {
              setSelectedCelestialBody('earth');
              setDashboardMode('earth');
            }}
            className="glass-panel px-3 py-2 pointer-events-auto hover:border-[var(--cyan-primary)]/40 transition-colors group relative text-[8px] font-mono tracking-[0.2em] text-[var(--cyan-primary)]"
            title={copy.controls.returnEarth}
          >
            {copy.controls.returnEarth}
          </button>
        ) : (
          <button
            onClick={() => setDashboardMode('earth')}
            className="glass-panel px-3 py-2 pointer-events-auto hover:border-[var(--gold-primary)]/40 transition-colors group relative text-[8px] font-mono tracking-[0.2em] text-[var(--gold-primary)]"
            title={copy.controls.exitFocus}
          >
            {copy.controls.exitFocus}
          </button>
        )}
      </motion.div>

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 2.5 }} className={`absolute top-3 left-3 md:top-5 md:left-5 z-[200] pointer-events-none flex items-center gap-2 md:gap-3`}>
        <div className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center relative">
          {/* Ambient glow ring — slow rotating */}
          <div className="absolute inset-[-4px] md:inset-[-5px] rounded-full border border-[var(--gold-primary)]/20" style={{ animation: 'aegis-rotate 12s linear infinite' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[var(--gold-primary)] shadow-[0_0_6px_var(--gold-primary)]" />
          </div>
          <div className="absolute inset-[-8px] md:inset-[-10px] rounded-full border border-[var(--gold-primary)]/10" style={{ animation: 'aegis-rotate 20s linear infinite reverse' }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-0.5 h-0.5 rounded-full bg-[var(--gold-primary)]/60" />
          </div>
          <div className="w-5 h-5 md:w-7 md:h-7 rounded-full border-2 border-[var(--gold-primary)] flex items-center justify-center animate-glow-pulse">
            <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-[var(--gold-primary)]/30 border border-[var(--gold-primary)]/60" />
          </div>
          <div className="absolute w-[1px] h-full bg-[var(--gold-primary)]/30" />
          <div className="absolute w-full h-[1px] bg-[var(--gold-primary)]/30" />
        </div>
        {/* Horizontal rule extending from logo */}
        <div className="hidden md:block absolute top-1/2 left-[52px] w-[200px] h-[1px] bg-gradient-to-r from-[var(--gold-primary)]/40 via-[var(--gold-primary)]/15 to-transparent" />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-xl font-bold tracking-[0.4em] md:tracking-[0.5em] text-[var(--text-heading)] font-mono">AEGIS</h1>
            <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-[1px] rounded-sm border border-[var(--cyan-primary)]/40 bg-[var(--cyan-primary)]/10 text-[7px] font-mono font-bold tracking-[0.15em] text-[var(--cyan-primary)] uppercase" style={{ lineHeight: '1.4' }}>
              <Globe className="w-2.5 h-2.5" />
              {copy.header.badge}
            </span>
          </div>
          <span className="text-[8px] md:text-[9px] text-[var(--gold-primary)] font-mono tracking-[0.2em] md:tracking-[0.3em] opacity-80">{copy.header.subtitle}</span>
        </div>
      </motion.div>


      {/* ── TOP-RIGHT STATUS (desktop) — C2 DISPLAY ── */}
      {showAuxiliaryHud && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }} className="status-bar-desktop absolute top-3 right-3 md:top-4 md:right-5 z-[200] pointer-events-none flex items-center gap-1.5 xl:gap-2.5 2xl:gap-3 text-[8px] xl:text-[9px] 2xl:text-[10px] font-mono tracking-[0.16em] xl:tracking-[0.2em] text-[var(--text-muted)]">

        {/* Zulu Clock */}
        <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-[var(--border-primary)]/70 bg-[rgba(15,23,32,0.82)] px-2.5 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">
          <ZuluClock />
        </span>

        <span className="hidden lg:inline text-[var(--border-primary)]">│</span>

        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-primary)]/70 bg-[rgba(15,23,32,0.82)] px-2 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">{copy.status.sys} <span className={backendStatus === 'connected' ? 'text-[var(--alert-green)]' : 'text-[var(--alert-red)]'}>{backendStatus.toUpperCase()}</span></span>

        {spaceWeather && <span className="hidden xl:inline">SOLAR: <span style={{ color: spaceWeather.storm_color, fontWeight: 700 }}>Kp{spaceWeather.kp_index}</span></span>}

        {/* Active Data Feeds */}
        <span className="hidden xl:inline-flex items-center gap-1">
          <Wifi className="w-3 h-3 text-[var(--cyan-primary)]" />
          <span className="text-[var(--cyan-primary)] font-bold">{Object.values(activeLayers).filter(Boolean).length}</span>
          <span className="text-[var(--text-muted)]/60">{copy.status.feeds}</span>
        </span>

        {usageMetrics && (
          <span className="hidden 2xl:inline-flex items-center gap-2 rounded-full border border-[var(--border-primary)]/70 bg-[rgba(15,23,32,0.82)] px-2.5 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">
            <Activity className="h-3 w-3 text-[var(--alert-green)]" />
            <span className="text-[var(--text-secondary)]">{copy.status.live}</span>
            <span className="font-bold text-[var(--text-primary)]">{usageMetrics.onlineUsers}</span>
            <span className="text-[var(--border-primary)]">/</span>
            <BarChart3 className="h-3 w-3 text-[var(--gold-primary)]" />
            <span className="text-[var(--text-secondary)]">{copy.status.visits}</span>
            <span className="font-bold text-[var(--text-primary)]">{usageMetrics.totalUsers.toLocaleString()}</span>
          </span>
        )}

        <span className="hidden xl:inline-flex"><UptimeClock /></span>
        
        <a href='https://ko-fi.com/M8D41ZYW4Z' target='_blank' className="pointer-events-auto hover:opacity-80 transition-opacity ml-1 hidden 2xl:flex items-center">
          <span className="rounded-full border border-[var(--border-primary)]/80 bg-[rgba(15,23,32,0.9)] px-2.5 xl:px-3 py-1 text-[9px] xl:text-[10px] 2xl:text-[11px] font-semibold tracking-[0.14em] xl:tracking-[0.16em] text-[var(--text-primary)]">{copy.status.supportProject}</span>
        </a>
      </motion.div>}

      {/* ── MOBILE: Compact top status ── */}
      {isMobile && showAuxiliaryHud && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="absolute top-3 right-3 z-[200] pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--border-primary)]/70 bg-[rgba(15,23,32,0.92)] px-2.5 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
            <span className={`h-1.5 w-1.5 rounded-full ${backendStatus === 'connected' ? 'bg-[var(--alert-green)]' : backendStatus === 'error' ? 'bg-[var(--alert-red)]' : 'bg-[var(--gold-primary)]'} animate-aegis-pulse`} />
            <span className="text-[7px] font-mono font-bold tracking-[0.18em] text-[var(--text-primary)]">{backendStatus === 'connected' ? copy.focus.live : backendStatus === 'error' ? copy.focus.degraded : copy.focus.syncing}</span>
            <span className="text-[var(--border-primary)]/70">•</span>
            <span className="text-[7px] font-mono tracking-[0.18em] text-[var(--text-muted)]">{copy.status.alerts}</span>
            <span className="text-[9px] font-bold tabular-nums" style={{ color: activeIntelAlerts > 0 ? '#FF9500' : 'var(--alert-green)' }}>{activeIntelAlerts}</span>
          </div>
          <a href='https://ko-fi.com/M8D41ZYW4Z' target='_blank' className="glass-panel px-2.5 py-1.5 flex items-center gap-1.5 text-[7px] font-mono tracking-[0.18em] hover:opacity-80 transition-opacity border-[var(--border-primary)]/80 bg-[rgba(15,23,32,0.92)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold-primary)] animate-aegis-pulse" />
            <span className="text-[var(--text-primary)] font-bold">{copy.status.supportProjectCompact}</span>
          </a>
        </motion.div>
      )}



      {/* ── LEFT HUD (desktop): Layers + Stats + focused desk ── */}
      {showDesktopRails && <div className="desktop-panel absolute left-4 xl:left-5 top-20 bottom-24 xl:bottom-24 w-[15.75rem] xl:w-[16.5rem] 2xl:w-[17.25rem] flex flex-col gap-2.5 z-[200] min-h-0 pointer-events-none overflow-y-auto styled-scrollbar pr-1">
        {showLayers && (
          <>
            <LayerPanel data={dataWithSdk} activeLayers={activeLayers} setActiveLayers={setActiveLayers} locale={locale} />
            <ViewPresets locale={locale} onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMapView(v => ({ ...v, zoom })); }} />
          </>
        )}

        <div className="glass-panel pointer-events-auto overflow-hidden border border-[var(--border-primary)]/70 bg-[linear-gradient(180deg,rgba(12,21,30,0.94),rgba(15,25,36,0.9))]">
          <div className="flex items-center justify-between border-b border-[var(--border-primary)]/40 px-3 py-2">
            <div>
              <div className="text-[8px] font-mono tracking-[0.22em] text-[var(--text-secondary)]">{copy.status.focusedDesk}</div>
              <div className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-[var(--text-primary)]">{copy.status.focusedDeskHint}</div>
            </div>
          </div>
          <div className="flex gap-1.5 p-2">
            <button onClick={() => setLeftRailFocus('markets')} className={`flex-1 rounded-xl border px-2 py-1.5 text-[7px] font-mono tracking-[0.16em] transition-colors ${leftRailFocus === 'markets' ? 'border-[rgba(34,211,238,0.45)] bg-[rgba(34,211,238,0.12)] text-[var(--cyan-primary)]' : 'border-white/8 bg-white/[0.03] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>MARKETS</button>
            <button onClick={() => setLeftRailFocus('flow')} className={`flex-1 rounded-xl border px-2 py-1.5 text-[7px] font-mono tracking-[0.16em] transition-colors ${leftRailFocus === 'flow' ? 'border-[rgba(212,175,55,0.45)] bg-[rgba(212,175,55,0.12)] text-[var(--gold-primary)]' : 'border-white/8 bg-white/[0.03] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>FLOW</button>
            <button onClick={() => setLeftRailFocus('intel')} className={`flex-1 rounded-xl border px-2 py-1.5 text-[7px] font-mono tracking-[0.16em] transition-colors ${leftRailFocus === 'intel' ? 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.12)] text-[var(--alert-green)]' : 'border-white/8 bg-white/[0.03] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>INTEL</button>
          </div>
        </div>
        {leftRailFocus === 'flow' && showScmPanel && <ScmPanel data={dataWithSdk} />}
        {leftRailFocus === 'markets' && showMarkets && <MarketsPanel data={dataWithSdk} spaceWeather={spaceWeather} />}
        {leftRailFocus === 'intel' && showIntel && <IntelFeed data={dataWithSdk} onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} />}
      </div>}

      {/* ── RIGHT HUD (desktop): Search + focused desk ── */}
      {showDesktopRails && <div className="desktop-panel absolute right-4 xl:right-5 top-20 bottom-24 xl:bottom-24 w-[16rem] xl:w-[17rem] 2xl:w-[18rem] flex flex-col gap-2.5 z-[200] min-h-0 pointer-events-auto overflow-y-auto styled-scrollbar pr-1">
        <IncidentFusionStrip
          backendStatus={backendStatus}
          trackedEntityCount={trackedEntityCount}
          activeIntelAlerts={activeIntelAlerts}
          maritimePressure={maritimePressure}
          newsCount={data.news?.length || 0}
          earthquakeCount={data.earthquakes?.length || 0}
          gdeltCount={data.gdelt?.length || 0}
          operationalModeLabel={operationalModeLabel}
          variant="rail"
        />

        <NasaMissionStrip
          locale={locale}
          events={nasaEventMesh?.events || []}
          source={nasaEventMesh?.source}
          updatedAt={nasaEventMesh?.fetched_at}
          totalOpen={nasaEventMesh?.total_open}
        />

        <div className="glass-panel overflow-hidden border border-[var(--border-primary)]/80 bg-[linear-gradient(180deg,rgba(14,24,34,0.94),rgba(16,27,39,0.88))] shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
          <div className="flex items-center justify-between border-b border-[var(--border-primary)]/45 px-3.5 py-2.5">
            <div>
              <div className="text-[8px] font-mono tracking-[0.26em] text-[var(--text-secondary)]">{copy.status.commandRail}</div>
              <div className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-[var(--text-primary)]">{commandRailFocus}</div>
            </div>
            <div className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-1 text-[7px] font-mono tracking-[0.16em] text-[var(--cyan-primary)]">
              {copy.status.searchShareRecon}
            </div>
          </div>
          <div className="space-y-2.5 p-3">
            <div className="flex gap-2 items-start">
              <div className="flex-1"><SearchBar onLocate={(result) => setFlyToLocation({ lat: result.lat, lng: result.lng, zoom: result.zoom, bbox: result.bbox, label: result.label, ts: Date.now() })} /></div>
              <div className="relative"><SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} /></div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[7px] font-mono tracking-[0.16em] text-[var(--text-muted)]">
              {copy.status.searchRailHint}
            </div>
          </div>
        </div>

        <div className="glass-panel overflow-hidden border border-[var(--border-primary)]/70 bg-[linear-gradient(180deg,rgba(12,21,30,0.94),rgba(15,25,36,0.9))] shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
          <div className="flex items-center justify-between border-b border-[var(--border-primary)]/40 px-3 py-2">
            <div>
              <div className="text-[8px] font-mono tracking-[0.22em] text-[var(--text-secondary)]">{copy.status.deskStack}</div>
              <div className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-[var(--text-primary)]">{copy.status.deskStackHint}</div>
            </div>
          </div>
          <div className="flex gap-1.5 p-2">
            <button onClick={() => setRightRailFocus('alerts')} className={`flex-1 rounded-xl border px-2 py-1.5 text-[7px] font-mono tracking-[0.16em] transition-colors ${rightRailFocus === 'alerts' ? 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.12)] text-[var(--alert-green)]' : 'border-white/8 bg-white/[0.03] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{copy.status.newswire}</button>
            <button onClick={() => setRightRailFocus('recon')} className={`flex-1 rounded-xl border px-2 py-1.5 text-[7px] font-mono tracking-[0.16em] transition-colors ${rightRailFocus === 'recon' ? 'border-[rgba(34,211,238,0.45)] bg-[rgba(34,211,238,0.12)] text-[var(--cyan-primary)]' : 'border-white/8 bg-white/[0.03] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{copy.status.recon}</button>
          </div>
        </div>
        {rightRailFocus === 'recon' && <OsintPanel onSweepVisualize={setSweepData} onScanGeolocate={(target: string, payload: OsintGeolocatePayload) => {
          setScanTargets(prev => {
            const existing = prev.filter(t => t.id !== target);
            return [{ id: target, timestamp: Date.now(), ...payload }, ...existing].slice(0, 10);
          });
          setFlyToLocation({ lat: payload.lat, lng: payload.lng, ts: Date.now() });
        }} />}
        {rightRailFocus === 'alerts' && <LiveAlerts data={dataWithSdk} onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} onWatchFeed={(url, name) => { setLiveFeedUrl(url); setLiveFeedName(name); }} />}
      </div>}

      {showAuxiliaryHud && <AiAnalyst data={dataWithSdk} />}

      {/* ── LIVE FEED VIEWER OVERLAY ── */}
      <AnimatePresence>
        {liveFeedUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setLiveFeedUrl(null)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="w-[90vw] max-w-[900px] flex flex-col relative rounded-xl overflow-hidden border border-[var(--border-primary)] shadow-2xl bg-black"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#111] border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF4081] animate-aegis-pulse" />
                  <span className="text-[12px] font-mono font-bold text-white tracking-wider">{liveFeedName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[9px] font-bold">{copy.status.liveStream}</span>
                  {!liveFeedEmbedAllowed && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[9px]">{copy.status.externalOnly}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={getYouTubeWatchUrl(liveFeedUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--border-primary)] hover:bg-[var(--gold-primary)] hover:text-black text-white transition-colors text-[11px] font-mono"
                  >
                    <span>{copy.status.openInYouTube}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button onClick={() => setLiveFeedUrl(null)} className="text-white/70 hover:text-white transition-colors p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body — iframe or external card */}
              {liveFeedEmbedAllowed ? (
                <div className="w-full aspect-video relative bg-black">
                  <iframe
                    src={liveFeedUrl}
                    className="w-full h-full absolute inset-0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-black/95">
                  <div className="text-center px-8">
                    <div className="w-14 h-14 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center mx-auto mb-4">
                      <ExternalLink className="w-6 h-6 text-[#39FF14]" />
                    </div>
                    <p className="text-[13px] font-mono font-bold text-white tracking-widest mb-2">EMBED RESTRICTED</p>
                    <p className="text-[11px] font-mono text-white/50 mb-6 max-w-xs">
                      {liveFeedName} does not allow third-party embedding. Click below to open the live stream directly.
                    </p>
                    <a
                      href={getYouTubeWatchUrl(liveFeedUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded border border-[#39FF14]/40 text-[#39FF14] font-mono text-[12px] hover:bg-[#39FF14]/10 transition-colors tracking-wider"
                    >
                      <ExternalLink className="w-4 h-4" />
                      OPEN {copy.status.liveStream}
                    </a>
                  </div>
                </div>
              )}

              {/* Footer — only show for embeddable feeds */}
              {liveFeedEmbedAllowed && (
                <div className="bg-[#111]/90 px-4 py-2.5 border-t border-[var(--border-primary)] flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[var(--gold-primary)] shrink-0" />
                  <span className="text-[11px] font-mono text-white/70 leading-relaxed">
                    If you see &ldquo;Video unavailable&rdquo;, use <strong className="text-[var(--gold-primary)]">{copy.status.openInYouTube}</strong> above.
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MOBILE UI ═══ */}
      {isMobile && isEarthOps && (
        <>
          {/* Mobile Bottom Navigation */}
          <div className="mobile-nav">
            <div className="glass-panel mobile-nav-inner">
              {[
                { id: 'layers' as const, icon: Layers, label: locale === 'es' ? 'CAPAS' : 'LAYERS' },
                { id: 'markets' as const, icon: BarChart3, label: copy.status.markets },
                { id: 'intel' as const, icon: Newspaper, label: copy.status.intel },
                { id: 'recon' as const, icon: Radar, label: copy.status.recon },
                { id: 'search' as const, icon: Search, label: copy.status.search },
              ].map(tab => (
                <button key={tab.id} onClick={() => setMobilePanel(mobilePanel === tab.id ? null : tab.id)}
                  className={`mobile-nav-btn ${mobilePanel === tab.id ? 'active' : ''}`}>
                  <tab.icon className={`w-4 h-4 ${tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : ''}`} />
                  <span className={tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : ''}>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Drawer */}
          <AnimatePresence>
            {mobilePanel && (
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-[52px] left-0 right-0 z-[400] glass-panel rounded-b-none overflow-y-auto styled-scrollbar"
                style={{ maxHeight: 'min(55vh, calc(100dvh - 100px))', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
              >
                <div className="mobile-drawer-handle" />
                <div className="px-3 pb-3">
                  <div className="sticky top-0 z-10 -mx-3 mb-2 border-b border-[var(--border-primary)]/35 bg-[linear-gradient(180deg,rgba(10,18,25,0.96),rgba(10,18,25,0.82))] px-3 pb-2 pt-1 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[7px] font-mono tracking-[0.22em] text-[var(--text-secondary)]">{copy.status.mobileCommandPanel}</div>
                        <span className="hud-text mt-1 block text-[9px] text-[var(--text-primary)]">
                          {mobilePanel === 'layers' ? copy.status.layersStats : mobilePanel === 'markets' ? copy.status.macroAtlas : mobilePanel === 'intel' ? copy.status.signalLedger : mobilePanel === 'recon' ? 'AEGIS RECON' : copy.status.search}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="rounded-full border border-[var(--border-primary)]/40 bg-white/[0.04] px-2 py-1 text-[7px] font-mono tracking-[0.18em] text-[var(--text-secondary)]">
                          {backendStatus === 'connected' ? copy.focus.live : backendStatus === 'error' ? copy.focus.degraded : copy.focus.syncing}
                        </div>
                        <button onClick={() => setMobilePanel(null)} className="text-[var(--text-muted)] p-1"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-[var(--border-secondary)]/35 bg-black/20 px-2 py-2">
                      <div className="text-[6px] font-mono tracking-[0.22em] text-[var(--text-muted)]">{copy.status.mode}</div>
                      <div className="mt-1 text-[9px] font-mono leading-tight text-[var(--text-primary)]">{operationalModeLabel}</div>
                    </div>
                    <div className="rounded-lg border border-[var(--border-secondary)]/35 bg-black/20 px-2 py-2 text-center">
                      <div className="text-[6px] font-mono tracking-[0.22em] text-[var(--text-muted)]">{copy.status.alerts}</div>
                      <div className="mt-1 text-[11px] font-bold tabular-nums" style={{ color: activeIntelAlerts > 0 ? '#FF9500' : 'var(--alert-green)' }}>{activeIntelAlerts}</div>
                    </div>
                    <div className="rounded-lg border border-[var(--border-secondary)]/35 bg-black/20 px-2 py-2 text-center">
                      <div className="text-[6px] font-mono tracking-[0.22em] text-[var(--text-muted)]">{copy.status.tracked}</div>
                      <div className="mt-1 text-[11px] font-bold tabular-nums text-[var(--gold-primary)]">{trackedEntityCount.toLocaleString()}</div>
                    </div>
                  </div>
                  {mobilePanel === 'layers' && (
                    <>
                      <div className="glass-panel-sm p-2 mb-2">
                        <div className="grid grid-cols-5 gap-1 text-center">
                          <div><div className="hud-label" style={{fontSize:'6px'}}>AIR</div><div className="hud-value text-[9px]">{totalFlights.toLocaleString()}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>SAT</div><div className="hud-value text-[9px]">{(data.satellites?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>CAM</div><div className="hud-value text-[9px]">{(data.cameras?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>WX</div><div className="hud-value text-[9px]" style={{color:'var(--accent-weather)'}}>{(data.weather_events?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'6px'}}>NUC</div><div className="hud-value text-[9px]" style={{color:'var(--accent-nuclear)'}}>{(data.infrastructure?.length||0)}</div></div>
                        </div>
                      </div>
                      <LayerPanel data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} locale={locale} />
                      <div className="mt-2">
                        <ViewPresets locale={locale} onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMapView(v => ({ ...v, zoom })); setMobilePanel(null); }} />
                      </div>
                    </>
                  )}
                  {mobilePanel === 'markets' && <MarketsPanel data={data} spaceWeather={spaceWeather} />}
                  {mobilePanel === 'intel' && <IntelFeed data={data} onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />}
                  {mobilePanel === 'search' && (
                    <div className="space-y-2">
                      <SearchBar onLocate={(result) => { setFlyToLocation({ lat: result.lat, lng: result.lng, zoom: result.zoom, bbox: result.bbox, label: result.label, ts: Date.now() }); setMobilePanel(null); }} />
                      <div className="flex justify-end">
                        <SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} />
                      </div>
                    </div>
                  )}
                  {mobilePanel === 'recon' && (
                    <div className="space-y-2">
                      <OsintPanel isOpen={true} onClose={() => setMobilePanel(null)} isMobile={true} onSweepVisualize={setSweepData} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── BOTTOM CENTER (desktop) ── */}
      {showDesktopBottomBar && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3, duration: 0.8 }} className="desktop-only absolute bottom-5 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto">
          <div className="glass-panel px-5 py-2.5 flex items-center gap-0 aegis-glow relative overflow-hidden" style={{ borderImage: 'linear-gradient(90deg, rgba(212,175,55,0.05), rgba(212,175,55,0.2), rgba(212,175,55,0.05)) 1', borderImageSlice: 1, borderWidth: '1px', borderStyle: 'solid' }}>

            {/* Animated scan line sweeping across the bar */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              <div className="absolute top-0 bottom-0 w-[60px] bg-gradient-to-r from-transparent via-[var(--gold-primary)]/[0.07] to-transparent" style={{ animation: 'hud-scanline 4s ease-in-out infinite' }} />
            </div>

            {/* COORDINATES */}
            <div className="flex flex-col items-center min-w-[110px] px-3">
              <div className="hud-label">COORDINATES</div>
              <div ref={coordsDisplayRef} className="text-[10px] font-mono font-bold text-[var(--gold-primary)] tracking-wide tabular-nums">—</div>
            </div>

            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />

            {/* LOCATION */}
            <div className="flex flex-col items-center min-w-[160px] max-w-[280px] px-3">
              <div className="hud-label">LOCATION</div>
              <div className="text-[9px] text-[var(--text-secondary)] font-mono truncate max-w-[280px]">{locationLabel || 'Hover over map...'}</div>
            </div>

            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />

            {/* ZOOM */}
            <div className="flex flex-col items-center px-3">
              <div className="hud-label">ZOOM</div>
              <div className="text-[10px] font-mono font-bold text-[var(--gold-primary)] tabular-nums">{mapView.zoom.toFixed(1)}</div>
            </div>

            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />

            {/* ACTIVE LAYERS */}
            <div className="flex flex-col items-center px-3 min-w-[60px]">
              <div className="hud-label">ACTIVE LAYERS</div>
              <div className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-[var(--gold-primary)]" />
                <span className="text-[10px] font-mono font-bold text-[var(--gold-primary)] tabular-nums">{Object.values(activeLayers).filter(Boolean).length}</span>
              </div>
            </div>

            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />

            {/* DATA FEEDS */}
            <div className="flex flex-col items-center px-3 min-w-[60px]">
              <div className="hud-label">FEEDS</div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-[var(--cyan-primary)]" />
                <span className="text-[10px] font-mono font-bold text-[var(--cyan-primary)] tabular-nums">{Object.values(activeLayers).filter(Boolean).length}</span>
              </div>
            </div>

            <div className="w-px h-8 bg-gradient-to-b from-transparent via-[var(--border-primary)] to-transparent flex-shrink-0" />

            {/* ENTITIES */}
            <div className="flex flex-col items-center px-3 min-w-[70px]">
              <div className="hud-label">ENTITIES</div>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3 text-[var(--alert-green)]" />
                <ActiveEntityCount data={data} />
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* ── Scale Bar (desktop) ── */}
      {showDesktopBottomBar && <div className="desktop-only absolute bottom-[4.5rem] left-[18.5rem] xl:left-[20rem] z-[201] pointer-events-none">
        <ScaleBar zoom={mapView.zoom} latitude={mapView.latitude} />
      </div>}

      {/* ── Region Dossier ── */}
      {(regionDossier || dossierLoading) && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-16 md:top-20 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[300] md:w-[480px] max-h-[65vh] overflow-y-auto styled-scrollbar">
          <div className="glass-panel p-5 aegis-glow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-mono font-bold text-[var(--gold-primary)] tracking-wider">REGION DOSSIER</h2>
              <button onClick={() => { setRegionDossier(null); setDossierLoading(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">✕</button>
            </div>
            {dossierLoading ? (
              <div className="text-center py-8">
                <div className="w-5 h-5 border-2 border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest">COMPILING INTEL...</span>
              </div>
            ) : regionDossier && (
              <div className="space-y-3">
                <div><div className="hud-label mb-0.5">LOCATION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.location?.display_name}</div></div>
                {regionDossier.country && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><div className="hud-label mb-0.5">COUNTRY</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.flag} {regionDossier.country.name}</div></div>
                    <div><div className="hud-label mb-0.5">CAPITAL</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.capital}</div></div>
                    <div><div className="hud-label mb-0.5">POPULATION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.population?.toLocaleString()}</div></div>
                    <div><div className="hud-label mb-0.5">REGION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.subregion || regionDossier.country.region}</div></div>
                    <div><div className="hud-label mb-0.5">LANGUAGES</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.languages?.join(', ')}</div></div>
                    <div><div className="hud-label mb-0.5">AREA</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.area?.toLocaleString()} km²</div></div>
                  </div>
                )}
                {regionDossier.head_of_state && (<div><div className="hud-label mb-0.5">HEAD OF STATE</div><div className="text-xs text-[var(--gold-primary)]">{regionDossier.head_of_state.name}</div><div className="text-[8px] text-[var(--text-muted)]">{regionDossier.head_of_state.position}</div></div>)}
                {regionDossier.wikipedia && (<div><div className="hud-label mb-1">INTELLIGENCE BRIEF</div><div className="flex gap-3">{regionDossier.wikipedia.thumbnail && <Image src={regionDossier.wikipedia.thumbnail} alt="" width={56} height={56} unoptimized className="w-14 h-14 rounded object-cover flex-shrink-0" /> }<p className="text-[8px] text-[var(--text-secondary)] leading-relaxed">{regionDossier.wikipedia.extract}</p></div></div>)}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Camera Viewer ── */}
      <CameraViewer
        camera={activeCamera}
        onClose={() => setActiveCamera(null)}
        onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })}
      />


      {/* ── OVERLAYS ── */}
      <div className="vignette absolute inset-0 pointer-events-none z-[2]" />
      <div className="crt-scanlines absolute inset-0 pointer-events-none z-[3] opacity-[0.02]" />
      {/* Corner frames — using explicit classes for Tailwind JIT compatibility */}
      {[
        { pos: 'top-0 left-0', vAnchor: 'top-0', hAnchor: 'left-0', hGrad: 'bg-gradient-to-r', vGrad: 'bg-gradient-to-b' },
        { pos: 'top-0 right-0', vAnchor: 'top-0', hAnchor: 'right-0', hGrad: 'bg-gradient-to-l', vGrad: 'bg-gradient-to-b' },
        { pos: 'bottom-0 left-0', vAnchor: 'bottom-0', hAnchor: 'left-0', hGrad: 'bg-gradient-to-r', vGrad: 'bg-gradient-to-t' },
        { pos: 'bottom-0 right-0', vAnchor: 'bottom-0', hAnchor: 'right-0', hGrad: 'bg-gradient-to-l', vGrad: 'bg-gradient-to-t' },
      ].map((c, i) => (
        <div key={i} className={`absolute ${c.pos} w-16 h-16 pointer-events-none z-[1]`}>
          <div className={`absolute ${c.vAnchor} ${c.hAnchor} w-full h-[1px] ${c.hGrad} from-[var(--gold-primary)]/30 to-transparent`} />
          <div className={`absolute ${c.vAnchor} ${c.hAnchor} w-[1px] h-full ${c.vGrad} from-[var(--gold-primary)]/30 to-transparent`} />
        </div>
      ))}

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcuts />

      {/* ── GLOBAL STATUS TICKER (bottom) ── */}
      {showAuxiliaryHud && <GlobalStatusBar />}

      {/* Shortcut hint */}
      <div className="desktop-only absolute bottom-[26px] right-5 z-[200] pointer-events-none text-[6px] font-mono text-[var(--text-muted)]/40 tracking-widest">
        [?] SHORTCUTS · [F] FULLSCREEN · [S] SHARE · [R] RESET VIEW
      </div>


    </main>
  );
}
