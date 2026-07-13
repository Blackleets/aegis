'use client';

import { useEffect, useState, useRef, useCallback, useMemo, type ComponentType, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, MapPinned, Satellite, Moon } from 'lucide-react';
import IntelFeed from '@/components/IntelFeed';
import MarketsPanel from '@/components/MarketsPanel';
import ScmPanel from '@/components/ScmPanel';
import SearchBar, { type RouteRequest } from '@/components/SearchBar';
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
import BottomDesktopHud from '@/components/dashboard/BottomDesktopHud';
import DesktopOpsRails from '@/components/dashboard/DesktopOpsRails';
import LiveFeedOverlay from '@/components/dashboard/LiveFeedOverlay';
import RegionDossierOverlay, { type RegionDossierData } from '@/components/dashboard/RegionDossierOverlay';
import IncidentFusionStrip from '@/components/dashboard/IncidentFusionStrip';
import NasaMissionStrip, { type NasaEventItem } from '@/components/dashboard/NasaMissionStrip';
import MobileCommandDrawer from '@/components/dashboard/MobileCommandDrawer';
import RouteCockpitDesktop from '@/components/dashboard/RouteCockpitDesktop';
import RouteCockpitMobile from '@/components/dashboard/RouteCockpitMobile';
import SplashScreen from '@/components/dashboard/SplashScreen';
import TopHudOverlays from '@/components/dashboard/TopHudOverlays';
import { DEFAULT_LOCALE, getDashboardCopy, isLocale, type Locale } from '@/lib/i18n';
import { type ActiveLayers, type BoundingBox, type Coordinate, type FlyToLocation, type MapView, type RouteOption, type RouteRiskSummary, type RouteSnapshot, type RouteStep, computeBearing, countSignalsNearRoute, distanceMetersBetween, distanceToRoutePath, formatEtaLabel, formatProgressLabel, getClosestStepIndex, getYouTubeWatchUrl, localizeRouteInstruction } from '@/lib/routing-shell';
import { getNextSimulationIndex, shouldRerouteNavigation } from '@/lib/vector-navigation';

const AegisMap = dynamic(() => import('@/components/AegisMap'), { ssr: false });
const LayerPanel = dynamic(() => import('@/components/LayerPanel'));
const CameraViewer = dynamic(() => import('@/components/CameraViewer'));
const OsintPanel = dynamic(() => import('@/components/OsintPanel'));

type DashboardMode = 'earth' | 'solar' | 'focus';
type MobilePanel = 'layers' | 'markets' | 'intel' | 'search' | 'recon';
type MobileNavGlyphProps = { className?: string };

type MobileDrawerHeaderSummaryProps = {
  commandPanelLabel: string;
  panelTitle: string;
  backendStatusLabel: string;
  modeLabel: string;
  alertsLabel: string;
  trackedLabel: string;
  operationalModeLabel: string;
  activeIntelAlerts: number;
  trackedEntityCount: number;
  onClose: () => void;
};

type MobileLayersMetricsProps = {
  totalFlights: number;
  satelliteCount: number;
  cameraCount: number;
  weatherEventCount: number;
  infrastructureCount: number;
};

type MobileLayersPanelProps = {
  metrics: ReactNode;
  layerPanel: ReactNode;
  presets: ReactNode;
};

type MobileSearchPanelProps = {
  searchBar: ReactNode;
  sharePanel: ReactNode;
  routeError: string | null;
};

type MobileReconPanelProps = {
  osintPanel: ReactNode;
};

function AegisLayersGlyph({ className }: MobileNavGlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3.5 20 7.4 12 11.3 4 7.4 12 3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m5.4 11.2 6.6 3.2 6.6-3.2M5.4 15.1l6.6 3.2 6.6-3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity=".75" />
    </svg>
  );
}

function AegisMarketsGlyph({ className }: MobileNavGlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 18.5h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".55" />
      <path d="M6.5 16V9.5M12 16V5.5M17.5 16v-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m5 11.8 4.1-3.1 3.2 2.4 5.7-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity=".85" />
    </svg>
  );
}

function AegisIntelGlyph({ className }: MobileNavGlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M7 4.5h8.5L19 8v11.5H7V4.5Z" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
      <path d="M15.5 4.8V8H19M9.5 11h6M9.5 14h6M9.5 17h3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity=".75" />
      <path d="M5 7.5v12h11" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" opacity=".45" />
    </svg>
  );
}

function AegisReconGlyph({ className }: MobileNavGlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3.8v3M12 17.2v3M3.8 12h3M17.2 12h3" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path d="M12 7.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Z" stroke="currentColor" strokeWidth="1.45" />
      <path d="M12 10.1a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8Z" fill="currentColor" opacity=".85" />
      <path d="M16.2 7.8a7.8 7.8 0 0 1 0 8.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

function AegisVectorGlyph({ className }: MobileNavGlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Z" stroke="currentColor" strokeWidth="1.45" opacity=".8" />
      <path d="m12 7.4 2.2 4.6 4.5 2-4.5.9-2.2 3.7-2.2-3.7-4.5-.9 4.5-2L12 7.4Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M12 11.1v2.8M10.6 12.5h2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".75" />
    </svg>
  );
}

function AegisAnalystDockButton() {
  return (
    <div className="mb-2 overflow-hidden rounded-2xl border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.11),rgba(212,175,55,0.06)_52%,rgba(5,10,18,0.82))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[7px] font-mono uppercase tracking-[0.24em] text-cyan-200/80">AEGIS CORTEX</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">IA organizada dentro de RECON</div>
          <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.12em] text-[var(--text-secondary)]">No flota sobre el globo · abre briefing o dossier</div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('aegis:ai-analyst', { detail: { action: 'briefing' } }))}
            className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1.5 text-[7px] font-mono uppercase tracking-[0.16em] text-cyan-100"
          >
            Brief
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('aegis:ai-analyst', { detail: { action: 'fusion' } }))}
            className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1.5 text-[7px] font-mono uppercase tracking-[0.16em] text-amber-100"
          >
            Fusion
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('aegis:ai-analyst', { detail: { action: 'hermes' } }))}
            className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1.5 text-[7px] font-mono uppercase tracking-[0.16em] text-emerald-100"
          >
            Hermes
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileDrawerHeaderSummary({
  commandPanelLabel,
  panelTitle,
  backendStatusLabel,
  modeLabel,
  alertsLabel,
  trackedLabel,
  operationalModeLabel,
  activeIntelAlerts,
  trackedEntityCount,
  onClose,
}: MobileDrawerHeaderSummaryProps) {
  return (
    <>
      <div className="sticky top-0 z-10 -mx-3 mb-2 border-b border-[var(--border-primary)]/35 bg-[linear-gradient(180deg,rgba(10,18,25,0.96),rgba(10,18,25,0.82))] px-3 pb-2 pt-1 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[7px] font-mono tracking-[0.22em] text-[var(--text-secondary)]">{commandPanelLabel}</div>
            <span className="hud-text mt-1 block text-[9px] text-[var(--text-primary)]">{panelTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-[var(--border-primary)]/40 bg-white/[0.04] px-2 py-1 text-[7px] font-mono tracking-[0.18em] text-[var(--text-secondary)]">
              {backendStatusLabel}
            </div>
            <button onClick={onClose} className="text-[var(--text-muted)] p-1"><X className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      <div className="mb-2 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-[var(--border-secondary)]/35 bg-black/20 px-2 py-2">
          <div className="text-[6px] font-mono tracking-[0.22em] text-[var(--text-muted)]">{modeLabel}</div>
          <div className="mt-1 text-[9px] font-mono leading-tight text-[var(--text-primary)]">{operationalModeLabel}</div>
        </div>
        <div className="rounded-lg border border-[var(--border-secondary)]/35 bg-black/20 px-2 py-2 text-center">
          <div className="text-[6px] font-mono tracking-[0.22em] text-[var(--text-muted)]">{alertsLabel}</div>
          <div className="mt-1 text-[11px] font-bold tabular-nums" style={{ color: activeIntelAlerts > 0 ? '#FF9500' : 'var(--alert-green)' }}>{activeIntelAlerts}</div>
        </div>
        <div className="rounded-lg border border-[var(--border-secondary)]/35 bg-black/20 px-2 py-2 text-center">
          <div className="text-[6px] font-mono tracking-[0.22em] text-[var(--text-muted)]">{trackedLabel}</div>
          <div className="mt-1 text-[11px] font-bold tabular-nums text-[var(--gold-primary)]">{trackedEntityCount.toLocaleString()}</div>
        </div>
      </div>
    </>
  );
}

function MobileLayersMetrics({
  totalFlights,
  satelliteCount,
  cameraCount,
  weatherEventCount,
  infrastructureCount,
}: MobileLayersMetricsProps) {
  return (
    <div className="glass-panel-sm p-2 mb-2">
      <div className="grid grid-cols-5 gap-1 text-center">
        <div><div className="hud-label" style={{ fontSize: '6px' }}>AIR</div><div className="hud-value text-[9px]">{totalFlights.toLocaleString()}</div></div>
        <div><div className="hud-label" style={{ fontSize: '6px' }}>SAT</div><div className="hud-value text-[9px]">{satelliteCount}</div></div>
        <div><div className="hud-label" style={{ fontSize: '6px' }}>CAM</div><div className="hud-value text-[9px]">{cameraCount}</div></div>
        <div><div className="hud-label" style={{ fontSize: '6px' }}>WX</div><div className="hud-value text-[9px]" style={{ color: 'var(--accent-weather)' }}>{weatherEventCount}</div></div>
        <div><div className="hud-label" style={{ fontSize: '6px' }}>NUC</div><div className="hud-value text-[9px]" style={{ color: 'var(--accent-nuclear)' }}>{infrastructureCount}</div></div>
      </div>
    </div>
  );
}

function MobileLayersPanel({ metrics, layerPanel, presets }: MobileLayersPanelProps) {
  return (
    <>
      {metrics}
      {layerPanel}
      <div className="mt-2">
        {presets}
      </div>
    </>
  );
}

function MobileSearchPanel({ searchBar, sharePanel, routeError }: MobileSearchPanelProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-cyan-300/14 bg-[linear-gradient(135deg,rgba(10,22,34,0.82),rgba(4,12,20,0.68))] px-3 py-2.5">
        <div>
          <div className="text-[7px] font-mono uppercase tracking-[0.22em] text-cyan-200">GPS</div>
          <div className="mt-1 text-[9px] font-semibold text-white">Busca un destino y empieza la ruta.</div>
        </div>
        <div className="shrink-0">{sharePanel}</div>
      </div>
      {routeError && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/8 px-3 py-2 text-[8px] font-mono uppercase tracking-[0.14em] text-rose-300">
          {routeError}
        </div>
      )}
      {searchBar}
    </div>
  );
}

function MobileReconPanel({ osintPanel }: MobileReconPanelProps) {
  return <div className="space-y-2">{osintPanel}</div>;
}

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

type RegionDossier = RegionDossierData;

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
      dashboardMode: 'earth' as DashboardMode,
      selectedCelestialBody: 'earth' as CelestialBodyId,
      skipSplash: false,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get('lat') || '');
  const lon = parseFloat(params.get('lon') || '');
  const zoom = parseFloat(params.get('zoom') || '');
  const modeParam = params.get('mode');
  const bodyParam = params.get('body');
  const normalizedMode: DashboardMode = modeParam === 'solar' || modeParam === 'focus' ? modeParam : 'earth';
  const normalizedBody: CelestialBodyId = bodyParam === 'moon' || bodyParam === 'mars' || bodyParam === 'venus' || bodyParam === 'jupiter' || bodyParam === 'saturn' || bodyParam === 'neptune' || bodyParam === 'earth'
    ? bodyParam
    : normalizedMode === 'solar'
      ? 'mars'
      : 'earth';
  const skipSplash = params.get('nosplash') === '1';
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
    dashboardMode: normalizedMode,
    selectedCelestialBody: normalizedBody,
    skipSplash,
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({});

  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [mapView, setMapView] = useState<MapView>({ zoom: 2.5, latitude: 20 });
  const [flyToLocation, setFlyToLocation] = useState<FlyToLocation | null>(null);
  const [routeSnapshot, setRouteSnapshot] = useState<RouteSnapshot | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [navigationActive, setNavigationActive] = useState(false);
  const [navigationBearing, setNavigationBearing] = useState<number | null>(null);
  const [currentRouteStepIndex, setCurrentRouteStepIndex] = useState(0);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [navigationSpeedKmh, setNavigationSpeedKmh] = useState<number | null>(null);
  const [navigationRerouting, setNavigationRerouting] = useState(false);
  const [navigationSimulationActive, setNavigationSimulationActive] = useState(false);
  const [navigationArrived, setNavigationArrived] = useState(false);
  const [navigationVoiceEnabled, setNavigationVoiceEnabled] = useState(true);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);
  const mouseCoordsRef = useRef<Coordinate | null>(null);
  const coordsDisplayRef = useRef<HTMLDivElement>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [regionDossier, setRegionDossier] = useState<RegionDossier | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [activeCamera, setActiveCamera] = useState<ActiveCamera | null>(null);
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeather | null>(null);
  const [nasaEventMesh, setNasaEventMesh] = useState<NasaEventMesh | null>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [showMarkets, setShowMarkets] = useState(true);
  const [showScmPanel, setShowScmPanel] = useState(true);
  const [showIntel, setShowIntel] = useState(true);
  const [leftRailFocus, setLeftRailFocus] = useState<'markets' | 'flow' | 'intel'>('markets');
  const [rightRailFocus, setRightRailFocus] = useState<'alerts' | 'recon'>('alerts');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel | null>(null);
  const [vectorDockOpen, setVectorDockOpen] = useState(false);
  const [mobileModeDockCollapsed, setMobileModeDockCollapsed] = useState(true);
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
  const lastNavigationLocationRef = useRef<Coordinate | null>(null);
  const offRouteSinceRef = useRef<number | null>(null);
  const lastRerouteAtRef = useRef(0);
  const simulationIndexRef = useRef(0);
  const lastSpokenStepRef = useRef<number | null>(null);
  const lastNearSpokenStepRef = useRef<number | null>(null);
  const arrivalSpokenRef = useRef(false);
  const preNavigationMapStateRef = useRef<{ projection: 'globe' | 'mercator'; style: 'dark' | 'satellite' } | null>(null);
  const lastGeocodedPos = useRef<{ lat: number; lng: number } | null>(null);
  const lastGeocodeKeyRef = useRef<string>('');
  const lastLocationLabelRef = useRef<string>('');

  // ── DEFAULT: Most layers OFF — fast initial load ──
  const [activeLayers, setActiveLayers] = useState<ActiveLayers>(DEFAULT_ACTIVE_LAYERS);
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
    const urlState = getInitialUrlState();
    const storedLocale = window.localStorage.getItem('aegis-locale');

    const syncFromUrl = window.requestAnimationFrame(() => {
      setMapView(urlState.mapView);
      setFlyToLocation(urlState.flyToLocation);
      setActiveLayers(urlState.activeLayers);
      setDashboardMode(urlState.dashboardMode);
      setSelectedCelestialBody(urlState.selectedCelestialBody);
      if (isLocale(storedLocale)) setLocale(storedLocale);
      if (urlState.skipSplash || urlState.dashboardMode !== 'earth') setShowSplash(false);
    });

    return () => window.cancelAnimationFrame(syncFromUrl);
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
      p.set('mode', dashboardMode);
      p.set('body', selectedCelestialBody);
      const active = Object.entries(activeLayers).filter(([,v]) => v).map(([k]) => k).join(',');
      p.set('layers', active);
      const url = `${window.location.pathname}?${p.toString()}`;
      window.history.replaceState(null, '', url);
    }, 1500);
  }, [mapView, activeLayers, dashboardMode, selectedCelestialBody]);

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

  const loadRegionDossier = useCallback(async (coords: Coordinate) => {
    setDossierLoading(true);
    setRegionDossier(null);
    try {
      const res = await fetch(`/api/region-dossier?lat=${coords.lat}&lng=${coords.lng}`, { cache: 'no-store' });
      if (res.ok) setRegionDossier(await res.json() as RegionDossier);
    } catch (e) {
      console.warn('[AEGIS] Suppressed error:', e instanceof Error ? e.message : e);
    } finally {
      setDossierLoading(false);
    }
  }, []);

  // Region dossier (right-click)
  const handleRightClick = useCallback((coords: Coordinate) => {
    void loadRegionDossier(coords);
  }, [loadRegionDossier]);

  // Entity click handler (hoisted from JSX to comply with Rules of Hooks — Fixes #113)
  const handleEntityClick = useCallback((entity: ActiveCamera) => {
    if (entity?.type === 'cctv') setActiveCamera(entity);
    if (entity?.type === 'live_news' && entity.url) {
      setLiveFeedUrl(entity.url);
      setLiveFeedName(entity.name);
      setLiveFeedEmbedAllowed(entity.embed_allowed !== false);
    }

    const contextualTypes = new Set(['weather_event', 'incident', 'fire', 'earthquake', 'infrastructure', 'radiation']);
    if (
      contextualTypes.has(String(entity?.type || ''))
      && typeof entity?.lat === 'number'
      && typeof entity?.lng === 'number'
    ) {
      void loadRegionDossier({ lat: entity.lat, lng: entity.lng });
    }
  }, [loadRegionDossier]);

  const handleRouteRequest = useCallback(async ({ origin, destination, mode, waypoints }: RouteRequest) => {
    const previousMapState = { projection: mapProjection, style: mapStyle };
    setRouteError(null);
    setRouteLoading(true);
    try {
      const params = new URLSearchParams({
        fromLat: String(origin.lat),
        fromLng: String(origin.lng),
        toLat: String(destination.lat),
        toLng: String(destination.lng),
        mode,
      });
      waypoints.forEach((waypoint) => {
        params.append('via', `${waypoint.lat},${waypoint.lng}`);
      });

      const response = await fetch(`/api/route?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || 'Route unavailable');
      }

      const route = await response.json() as {
        mode: 'driving' | 'walking' | 'cycling';
        routeId: string;
        label?: string;
        coordinates: [number, number][];
        bbox?: BoundingBox | null;
        distanceMeters: number;
        durationSeconds: number;
        steps: RouteStep[];
        alternatives?: RouteOption[];
        waypoints?: Array<{ lat: number; lng: number }>;
      };

      const routeOptions = Array.isArray(route.alternatives) && route.alternatives.length > 0
        ? route.alternatives
        : [{
            id: route.routeId,
            label: route.label || 'FASTEST',
            coordinates: route.coordinates,
            bbox: route.bbox ?? destination.bbox ?? null,
            distanceMeters: route.distanceMeters,
            durationSeconds: route.durationSeconds,
            steps: route.steps ?? [],
          }];

      setUserLocation(origin);
      setNavigationActive(true);
      setNavigationBearing(route.steps?.[0]?.maneuver.bearingAfter ?? null);
      setCurrentRouteStepIndex(0);
      lastNavigationLocationRef.current = origin;
      setRouteSnapshot({
        origin,
        destination,
        waypoints: waypoints.map((waypoint) => ({
          lat: waypoint.lat,
          lng: waypoint.lng,
          zoom: waypoint.zoom,
          bbox: waypoint.bbox ?? null,
          label: waypoint.label,
          ts: Date.now(),
        })),
        mode: route.mode,
        activeRouteId: route.routeId,
        coordinates: route.coordinates,
        bbox: route.bbox ?? destination.bbox ?? null,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        steps: route.steps ?? [],
        alternatives: routeOptions,
      });
      if (!preNavigationMapStateRef.current) {
        preNavigationMapStateRef.current = previousMapState;
      }
      setDashboardMode('earth');
      setSelectedCelestialBody('earth');
      setMapProjection('mercator');
      setMapStyle('dark');
      setLocationLabel(destination.label);
      setFlyToLocation({
        lat: destination.lat,
        lng: destination.lng,
        zoom: destination.zoom ?? 11,
        bbox: route.bbox ?? destination.bbox ?? null,
        label: destination.label,
        ts: Date.now(),
      });
      setMobilePanel(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to compute route';
      setRouteError(message);
      console.warn('[AEGIS] Route request failed:', message);
    } finally {
      setRouteLoading(false);
    }
  }, [mapProjection, mapStyle]);

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
      await fetchEndpoint('/api/earthquakes', undefined, { cache: 'no-store' });
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
      setInterval(() => fetchEndpoint('/api/earthquakes', undefined, { cache: 'no-store' }), 20000),
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

  const activeLayerCount = useMemo(
    () => Object.values(activeLayers).filter(Boolean).length,
    [activeLayers],
  );

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

  useEffect(() => {
    if (!navigationActive || navigationSimulationActive || !routeSnapshot || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const heading = typeof position.coords.heading === 'number' && Number.isFinite(position.coords.heading)
          ? position.coords.heading
          : null;
        const accuracy = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null;
        const speedKmh = typeof position.coords.speed === 'number' && Number.isFinite(position.coords.speed)
          ? Math.max(0, position.coords.speed * 3.6)
          : null;

        setUserLocation(nextLocation);
        setGpsAccuracyMeters(accuracy);
        setNavigationSpeedKmh(speedKmh);

        const previous = lastNavigationLocationRef.current;
        const computedBearing = heading ?? (previous ? computeBearing(previous, nextLocation) : null);
        if (computedBearing !== null) setNavigationBearing(computedBearing);

        if (routeSnapshot.steps.length > 0) {
          const closestStepIndex = getClosestStepIndex(nextLocation, routeSnapshot.steps);
          setCurrentRouteStepIndex((currentIndex) => Math.max(currentIndex, Math.min(currentIndex + 1, closestStepIndex)));
        }

        const offRouteDistance = distanceToRoutePath(nextLocation, routeSnapshot.coordinates);
        const gpsReliable = accuracy !== null && accuracy <= 45;
        if (gpsReliable && offRouteDistance > 85) {
          offRouteSinceRef.current ??= Date.now();
          const deviationDuration = Date.now() - offRouteSinceRef.current;
          const rerouteCooldownElapsed = Date.now() - lastRerouteAtRef.current > 30_000;
          if (shouldRerouteNavigation({
            offRouteDistanceMeters: offRouteDistance,
            gpsAccuracyMeters: accuracy,
            deviationDurationMs: deviationDuration,
            cooldownElapsedMs: Date.now() - lastRerouteAtRef.current,
          }) && rerouteCooldownElapsed && !navigationRerouting) {
            lastRerouteAtRef.current = Date.now();
            offRouteSinceRef.current = null;
            setNavigationRerouting(true);
            void handleRouteRequest({
              origin: { ...nextLocation, ts: Date.now(), label: 'GPS actual' },
              destination: routeSnapshot.destination,
              mode: routeSnapshot.mode,
              waypoints: routeSnapshot.waypoints,
            }).finally(() => setNavigationRerouting(false));
          }
        } else {
          offRouteSinceRef.current = null;
        }

        if (distanceMetersBetween(nextLocation, routeSnapshot.destination) <= 30) {
          setNavigationArrived(true);
          setNavigationActive(false);
        }

        lastNavigationLocationRef.current = nextLocation;
      },
      (error) => {
        console.warn('[AEGIS] Navigation watch failed:', error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [handleRouteRequest, navigationActive, navigationRerouting, navigationSimulationActive, routeSnapshot]);

  useEffect(() => {
    if (!navigationSimulationActive || !navigationActive || !routeSnapshot || routeSnapshot.coordinates.length < 2) return;
    const timer = window.setInterval(() => {
      const currentIndex = simulationIndexRef.current;
      const nextIndex = getNextSimulationIndex(currentIndex, routeSnapshot.coordinates.length);
      const [lng, lat] = routeSnapshot.coordinates[nextIndex];
      const [previousLng, previousLat] = routeSnapshot.coordinates[Math.max(0, nextIndex - 1)];
      const nextLocation = { lat, lng };

      setUserLocation(nextLocation);
      setGpsAccuracyMeters(4);
      setNavigationSpeedKmh(routeSnapshot.mode === 'walking' ? 5 : routeSnapshot.mode === 'cycling' ? 18 : 42);
      setNavigationBearing(computeBearing({ lat: previousLat, lng: previousLng }, nextLocation));
      const closestStepIndex = getClosestStepIndex(nextLocation, routeSnapshot.steps);
      setCurrentRouteStepIndex((currentIndexValue) => Math.max(currentIndexValue, Math.min(currentIndexValue + 1, closestStepIndex)));
      simulationIndexRef.current = nextIndex;

      if (nextIndex >= routeSnapshot.coordinates.length - 1) {
        setNavigationArrived(true);
        setNavigationSimulationActive(false);
        setNavigationActive(false);
      }
    }, 900);
    return () => window.clearInterval(timer);
  }, [navigationActive, navigationSimulationActive, routeSnapshot]);

  const clearNavigationState = useCallback(() => {
    setRouteSnapshot(null);
    setUserLocation(null);
    setRouteError(null);
    setNavigationActive(false);
    setNavigationBearing(null);
    setCurrentRouteStepIndex(0);
    setGpsAccuracyMeters(null);
    setNavigationSpeedKmh(null);
    setNavigationRerouting(false);
    setNavigationSimulationActive(false);
    setNavigationArrived(false);
    simulationIndexRef.current = 0;
    offRouteSinceRef.current = null;
    lastNavigationLocationRef.current = null;
    const previousMapState = preNavigationMapStateRef.current;
    if (previousMapState) {
      setMapProjection(previousMapState.projection);
      setMapStyle(previousMapState.style);
      preNavigationMapStateRef.current = null;
    }
  }, []);

  const selectRouteOption = useCallback((routeId: string) => {
    setRouteSnapshot((current) => {
      if (!current) return current;
      const option = current.alternatives.find((candidate) => candidate.id === routeId);
      if (!option) return current;
      setCurrentRouteStepIndex(0);
      setNavigationBearing(option.steps?.[0]?.maneuver.bearingAfter ?? null);
      setFlyToLocation({
        lat: current.destination.lat,
        lng: current.destination.lng,
        zoom: current.destination.zoom ?? 11,
        bbox: option.bbox ?? current.destination.bbox ?? null,
        label: current.destination.label,
        ts: Date.now(),
      });
      return {
        ...current,
        activeRouteId: option.id,
        coordinates: option.coordinates,
        bbox: option.bbox ?? current.destination.bbox ?? null,
        distanceMeters: option.distanceMeters,
        durationSeconds: option.durationSeconds,
        steps: option.steps,
      };
    });
  }, []);

  const toggleNavigationFollow = useCallback(() => {
    if (!routeSnapshot) return;
    setNavigationActive((value) => !value);
  }, [routeSnapshot]);

  const toggleNavigationSimulation = useCallback(() => {
    if (!routeSnapshot) return;
    setNavigationArrived(false);
    setNavigationActive(true);
    setNavigationSimulationActive((active) => {
      if (!active) simulationIndexRef.current = 0;
      return !active;
    });
  }, [routeSnapshot]);

  const toggleNavigationVoice = useCallback(() => {
    setNavigationVoiceEnabled((enabled) => {
      if (enabled && typeof window !== 'undefined') window.speechSynthesis?.cancel();
      return !enabled;
    });
  }, []);

  const currentRouteStep = routeSnapshot?.steps?.[currentRouteStepIndex] ?? null;
  const nextRouteStep = routeSnapshot?.steps?.[currentRouteStepIndex + 1] ?? null;
  const currentStepDistanceMeters = currentRouteStep?.maneuver.location && userLocation
    ? Math.round(distanceMetersBetween(userLocation, { lat: currentRouteStep.maneuver.location[1], lng: currentRouteStep.maneuver.location[0] }))
    : currentRouteStep?.distanceMeters ?? null;

  const speakNavigationMessage = useCallback((message: string) => {
    if (!navigationVoiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'es-ES';
    utterance.rate = 0.96;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [navigationVoiceEnabled]);

  useEffect(() => {
    if (!navigationActive || !currentRouteStep || lastSpokenStepRef.current === currentRouteStep.index) return;
    lastSpokenStepRef.current = currentRouteStep.index;
    lastNearSpokenStepRef.current = null;
    arrivalSpokenRef.current = false;
    const distanceMeters = currentStepDistanceMeters ?? currentRouteStep.distanceMeters;
    const distance = `${Math.max(10, Math.round(distanceMeters / 10) * 10)} metros. `;
    speakNavigationMessage(`${distance}${localizeRouteInstruction(currentRouteStep.instruction)}`);
  }, [currentRouteStep, currentStepDistanceMeters, navigationActive, speakNavigationMessage]);

  useEffect(() => {
    if (!navigationActive || !currentRouteStep || currentStepDistanceMeters === null || currentStepDistanceMeters > 90 || currentStepDistanceMeters < 12) return;
    if (lastNearSpokenStepRef.current === currentRouteStep.index) return;
    lastNearSpokenStepRef.current = currentRouteStep.index;
    speakNavigationMessage(`En ${Math.max(20, Math.round(currentStepDistanceMeters / 10) * 10)} metros, ${localizeRouteInstruction(currentRouteStep.instruction)}`);
  }, [currentRouteStep, currentStepDistanceMeters, navigationActive, speakNavigationMessage]);

  useEffect(() => {
    if (!navigationArrived) {
      arrivalSpokenRef.current = false;
      return;
    }
    if (arrivalSpokenRef.current) return;
    arrivalSpokenRef.current = true;
    speakNavigationMessage('Has llegado a tu destino. La ruta ha finalizado.');
  }, [navigationArrived, speakNavigationMessage]);

  useEffect(() => {
    if ((!navigationActive || !navigationVoiceEnabled) && typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, [navigationActive, navigationVoiceEnabled]);
  const remainingRouteDistance = routeSnapshot
    ? routeSnapshot.steps.slice(currentRouteStepIndex).reduce((sum, step) => sum + step.distanceMeters, 0)
    : 0;
  const completedRouteDistance = routeSnapshot
    ? Math.max(0, routeSnapshot.distanceMeters - (remainingRouteDistance || routeSnapshot.distanceMeters))
    : 0;
  const routeProgressLabel = routeSnapshot
    ? formatProgressLabel(completedRouteDistance, routeSnapshot.distanceMeters)
    : '0%';
  const routeEtaLabel = routeSnapshot
    ? formatEtaLabel(Math.max(0, routeSnapshot.durationSeconds))
    : '--:--';
  const routeRiskSummary = useMemo<RouteRiskSummary | null>(() => {
    if (!routeSnapshot || routeSnapshot.coordinates.length < 2) return null;

    const incidents = countSignalsNearRoute([...(data.news || []), ...(data.gdelt || [])], routeSnapshot.coordinates, 20000);
    const earthquakes = countSignalsNearRoute(data.earthquakes, routeSnapshot.coordinates, 50000);
    const weather = countSignalsNearRoute(data.weather_events, routeSnapshot.coordinates, 35000);
    const fires = countSignalsNearRoute(data.fires, routeSnapshot.coordinates, 25000);
    const jamming = countSignalsNearRoute(data.gps_jamming, routeSnapshot.coordinates, 60000);
    const nearbySignals = incidents + earthquakes + weather + fires + jamming;
    const score = incidents * 3 + earthquakes * 4 + weather * 2 + fires * 2 + jamming * 5;
    const level: RouteRiskSummary['level'] = score >= 14 ? 'high' : score >= 6 ? 'elevated' : 'low';

    return {
      score,
      level,
      nearbySignals,
      counts: { incidents, earthquakes, weather, fires, jamming },
    };
  }, [routeSnapshot, data.news, data.gdelt, data.earthquakes, data.weather_events, data.fires, data.gps_jamming]);
  const earthNavigationMode = selectedCelestialBody === 'earth' && (navigationActive || routeSnapshot !== null || routeLoading);
  const mobileVectorStatusLabel = routeLoading
    ? 'CALCULANDO'
    : navigationActive
      ? 'SIGUIENDO'
      : routeSnapshot
        ? 'RUTA LISTA'
        : userLocation
          ? 'GPS LISTO'
          : 'GPS REQUERIDO';

  const isEarthOps = dashboardMode === 'earth';
  const isSolarView = dashboardMode === 'solar';
  const isFocusView = dashboardMode === 'focus';
  const showEarthOperationalShell = selectedCelestialBody === 'earth' && !isSolarView;
  const showDesktopRails = !isMobile && isEarthOps && selectedCelestialBody === 'earth';
  const showDesktopBottomBar = !isMobile && isEarthOps && selectedCelestialBody === 'earth' && !earthNavigationMode;
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

  const backendStatusLabel = backendStatus === 'connected'
    ? copy.focus.live
    : backendStatus === 'error'
      ? copy.focus.degraded
      : copy.focus.syncing;

  const backendStatusAccentClass = backendStatus === 'connected'
    ? 'text-[var(--alert-green)]'
    : backendStatus === 'error'
      ? 'text-[var(--alert-red)]'
      : 'text-[var(--gold-primary)]';

  const mobilePanelTitle = mobilePanel === 'layers'
    ? copy.status.layersStats
    : mobilePanel === 'markets'
      ? copy.status.macroAtlas
      : mobilePanel === 'intel'
        ? copy.status.signalLedger
        : mobilePanel === 'recon'
          ? 'AEGIS RECON'
          : copy.status.search;

  const mobileNavTabs = useMemo<Array<{ id: MobilePanel; icon: ComponentType<MobileNavGlyphProps>; label: string; accent?: boolean }>>(() => ([
    { id: 'layers', icon: AegisLayersGlyph, label: locale === 'es' ? 'CAPAS' : 'LAYERS' },
    { id: 'markets', icon: AegisMarketsGlyph, label: copy.status.markets },
    { id: 'intel', icon: AegisIntelGlyph, label: copy.status.intel },
    { id: 'recon', icon: AegisReconGlyph, label: 'CORTEX', accent: true },
    { id: 'search', icon: AegisVectorGlyph, label: locale === 'es' ? 'GPS' : 'VECTOR' },
  ]), [copy.status.intel, copy.status.markets, locale]);

  return (
    <main className="fixed inset-0 w-full h-full bg-[var(--bg-void)] overflow-hidden">
      <SplashScreen showSplash={showSplash} />



      {/* ── MAP ── */}
      <ErrorBoundary name="Map">
        <AegisMap
          data={dataWithSdk}
          activeLayers={activeLayers}
          projection={mapProjection}
          mapStyle={mapStyle}
          onEntityClick={handleEntityClick}
          onMouseCoords={handleMouseCoords}
          onRightClick={handleRightClick}
          onViewStateChange={setMapView}
          flyToLocation={flyToLocation}
          sweepData={sweepData as { center: { lat: number; lng: number }; devices: unknown[] } | null}
          scanTargets={scanTargets}
          currentLocation={userLocation}
          routeDestination={routeSnapshot?.destination ? { lat: routeSnapshot.destination.lat, lng: routeSnapshot.destination.lng } : null}
          routePath={routeSnapshot?.coordinates ?? []}
          navigationActive={navigationActive}
          navigationBearing={navigationBearing}
          navigationMode={routeSnapshot?.mode ?? 'driving'}
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

      {(!isMobile || !navigationActive) && <ModeDock
        mode={dashboardMode}
        locale={locale}
        isMobile={isMobile}
        collapsed={isMobile && mobileModeDockCollapsed}
        onToggleCollapsed={() => setMobileModeDockCollapsed(prev => !prev)}
        onLocaleChange={setLocale}
        onEarthOps={() => {
          setDashboardMode('earth');
          setSelectedCelestialBody('earth');
          setMobileModeDockCollapsed(isMobile);
        }}
        onSolarView={() => {
          setShowSplash(false);
          setDashboardMode('solar');
          setSelectedCelestialBody(prev => prev === 'earth' ? 'mars' : prev);
          setMobileModeDockCollapsed(isMobile);
        }}
        onFocus={() => {
          setShowSplash(false);
          setDashboardMode('focus');
          setSelectedCelestialBody('earth');
          setMobileModeDockCollapsed(isMobile);
        }}
      />}

      {!isMobile && isEarthOps && selectedCelestialBody === 'earth' && !routeSnapshot && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.15, duration: 0.35 }}
            onClick={() => setVectorDockOpen(open => !open)}
            className="desktop-only absolute bottom-[8.7rem] left-[18.6rem] z-[214] pointer-events-auto rounded-full border border-cyan-300/35 bg-[rgba(6,18,27,0.82)] px-3 py-2 text-[8px] font-mono uppercase tracking-[0.2em] text-cyan-100 shadow-[0_10px_30px_rgba(0,0,0,0.24),0_0_18px_rgba(34,211,238,0.10)] backdrop-blur-md transition-all hover:border-cyan-300/60 hover:bg-cyan-400/[0.12] xl:left-[20rem]"
            aria-label="Open AEGIS VECTOR GPS navigation"
          >
            <span className="flex items-center gap-2">
              <span className="relative h-5 w-5 rounded-full border border-cyan-300/35 bg-cyan-300/10">
                <span className="absolute inset-[5px] rounded-full border border-cyan-200/35" />
                <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
              </span>
              <span className="leading-tight">
                <span className="block">NAV / GPS</span>
                <span className="block text-[6px] tracking-[0.22em] text-cyan-100/55">Earth clear</span>
              </span>
            </span>
          </motion.button>

          <AnimatePresence>
            {!isMobile && vectorDockOpen && (
              <motion.div
                initial={{ opacity: 0, x: -12, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -12, scale: 0.98 }}
                transition={{ duration: 0.22 }}
                className="desktop-only absolute left-[18.6rem] top-[10.5rem] z-[214] w-[min(22rem,calc(100vw-39rem))] min-w-[18rem] pointer-events-auto xl:left-[20rem]"
              >
                <div className="relative overflow-hidden rounded-[1.2rem] border border-cyan-300/28 bg-[linear-gradient(135deg,rgba(7,15,24,0.94),rgba(5,22,32,0.88)_52%,rgba(34,211,238,0.08))] px-3 py-2.5 shadow-[0_18px_54px_rgba(0,0,0,0.26),0_0_22px_rgba(34,211,238,0.10)] backdrop-blur-lg">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[8px] font-mono uppercase tracking-[0.24em] text-cyan-200">AEGIS GPS</div>
                      <div className="mt-1 text-[10px] font-semibold tracking-[0.04em] text-white">
                        {routeLoading ? 'Calculando ruta…' : 'Buscar destino y abrir ruta'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVectorDockOpen(false)}
                      className="rounded-full border border-white/10 px-2 py-1 text-[8px] font-mono text-[var(--text-muted)] hover:text-white"
                      aria-label="Cerrar panel GPS"
                    >
                      Cerrar
                    </button>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <SearchBar defaultOpen onLocate={(result) => setFlyToLocation({ lat: result.lat, lng: result.lng, zoom: result.zoom, bbox: result.bbox, label: result.label, ts: Date.now() })} onRoute={async (request) => { await handleRouteRequest(request); setVectorDockOpen(false); }} />
                    </div>
                    <div className="relative shrink-0">
                      <SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} />
                    </div>
                  </div>
                  {routeError && (
                    <div className="mt-2 rounded-2xl border border-rose-400/20 bg-rose-500/8 px-3 py-2 text-[7px] font-mono uppercase tracking-[0.15em] text-rose-300">
                      {routeError}
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

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
              className="glass-panel flex min-w-[4.5rem] flex-col items-center gap-1 px-2.5 py-2 pointer-events-auto hover:border-[var(--gold-primary)]/40 transition-colors group relative"
              title={mapProjection === 'globe' ? copy.controls.switch2d : copy.controls.switch3d}
            >
              {mapProjection === 'globe' ? (
                <MapPinned className="w-4 h-4 text-[var(--gold-primary)] group-hover:scale-110 transition-transform" />
              ) : (
                <Globe className="w-4 h-4 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />
              )}
              <span className="text-[7px] font-mono font-bold tracking-[0.14em] text-[var(--text-primary)] leading-none">
                {mapProjection === 'globe' ? 'MAPA' : 'GLOBO'}
              </span>
              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[var(--text-muted)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity glass-panel px-2 py-1 z-[300]">
                {mapProjection === 'globe' ? copy.controls.map2d : copy.controls.globe3d}
              </span>
            </button>

            <button
              onClick={() => setMapStyle(s => s === 'dark' ? 'satellite' : 'dark')}
              className="glass-panel flex min-w-[4.8rem] flex-col items-center gap-1 px-2.5 py-2 pointer-events-auto hover:border-[var(--gold-primary)]/40 transition-colors group relative"
              title={mapStyle === 'dark' ? copy.controls.satelliteView : copy.controls.nightView}
            >
              {mapStyle === 'dark' ? (
                <Satellite className="w-4 h-4 text-[var(--alert-green)] group-hover:scale-110 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--cyan-primary)] group-hover:scale-110 transition-transform" />
              )}
              <span className="text-[7px] font-mono font-bold tracking-[0.14em] text-[var(--text-primary)] leading-none">
                {mapStyle === 'dark' ? 'COLOR' : 'NOCHE'}
              </span>
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

      {!isMobile && earthNavigationMode && routeSnapshot && (
        <RouteCockpitDesktop
          routeSnapshot={routeSnapshot}
          navigationActive={navigationActive}
          remainingRouteDistance={remainingRouteDistance}
          routeEtaLabel={routeEtaLabel}
          routeProgressLabel={routeProgressLabel}
          routeRiskSummary={routeRiskSummary}
          currentRouteStep={currentRouteStep}
          onToggleNavigationFollow={toggleNavigationFollow}
          onClearNavigationState={clearNavigationState}
          onSelectRouteOption={selectRouteOption}
        />
      )}

      <TopHudOverlays
        showAuxiliaryHud={showAuxiliaryHud}
        isMobile={isMobile}
        headerBadge={copy.header.badge}
        headerSubtitle={copy.header.subtitle}
        systemLabel={copy.status.sys}
        feedsLabel={copy.status.feeds}
        liveLabel={copy.status.live}
        visitsLabel={copy.status.visits}
        alertsLabel={copy.status.alerts}
        backendStatus={backendStatus}
        backendStatusLabel={backendStatusLabel}
        backendStatusAccentClass={backendStatusAccentClass}
        activeLayerCount={activeLayerCount}
        activeIntelAlerts={activeIntelAlerts}
        usageMetrics={usageMetrics}
        spaceWeather={spaceWeather}
        zuluClock={<ZuluClock />}
        uptimeClock={<UptimeClock />}
      />



      <DesktopOpsRails
        showDesktopRails={showDesktopRails}
        showLayers={showLayers}
        leftRailFocus={leftRailFocus}
        rightRailFocus={rightRailFocus}
        onLeftRailFocusChange={setLeftRailFocus}
        onRightRailFocusChange={setRightRailFocus}
        focusedDeskLabel={copy.status.focusedDesk}
        focusedDeskHint={copy.status.focusedDeskHint}
        commandRailLabel={copy.status.commandRail}
        commandRailFocus={commandRailFocus}
        searchShareReconLabel={copy.status.searchShareRecon}
        searchRailHint={copy.status.searchRailHint}
        deskStackLabel={copy.status.deskStack}
        deskStackHint={copy.status.deskStackHint}
        newswireLabel={copy.status.newswire}
        reconLabel={copy.status.recon}
        showScmPanel={showScmPanel}
        showMarkets={showMarkets}
        showIntel={showIntel}
        leftLayersContent={(
          <>
            <LayerPanel data={dataWithSdk} activeLayers={activeLayers} setActiveLayers={setActiveLayers} locale={locale} />
            <ViewPresets locale={locale} onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMapView(v => ({ ...v, zoom })); }} />
          </>
        )}
        flowContent={<ScmPanel data={dataWithSdk} />}
        marketsContent={<MarketsPanel data={dataWithSdk} spaceWeather={spaceWeather} />}
        intelContent={<IntelFeed data={dataWithSdk} onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} />}
        incidentFusionStrip={(
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
        )}
        nasaMissionStrip={(
          <NasaMissionStrip
            locale={locale}
            events={nasaEventMesh?.events || []}
            source={nasaEventMesh?.source}
            updatedAt={nasaEventMesh?.fetched_at}
            totalOpen={nasaEventMesh?.total_open}
          />
        )}
        sharePanel={<SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} />}
        alertsContent={<LiveAlerts data={dataWithSdk} onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })} onWatchFeed={(url, name) => { setLiveFeedUrl(url); setLiveFeedName(name); }} />}
        reconContent={<OsintPanel onSweepVisualize={setSweepData} onScanGeolocate={(target: string, payload: OsintGeolocatePayload) => {
          setScanTargets(prev => {
            const existing = prev.filter(t => t.id !== target);
            return [{ id: target, timestamp: Date.now(), ...payload }, ...existing].slice(0, 10);
          });
          setFlyToLocation({ lat: payload.lat, lng: payload.lng, ts: Date.now() });
        }} />}
        routeSnapshot={routeSnapshot}
        routeLoading={routeLoading}
        navigationActive={navigationActive}
        routeEtaLabel={routeEtaLabel}
        routeProgressLabel={routeProgressLabel}
        remainingRouteDistance={remainingRouteDistance}
        routeRiskSummary={routeRiskSummary}
        currentRouteStep={currentRouteStep}
        onToggleNavigationFollow={toggleNavigationFollow}
        onClearNavigationState={clearNavigationState}
        onSelectRouteOption={selectRouteOption}
      />

      {showAuxiliaryHud && <AiAnalyst data={dataWithSdk} hideMobileTrigger />}

      <LiveFeedOverlay
        liveFeedUrl={liveFeedUrl}
        liveFeedName={liveFeedName}
        liveFeedEmbedAllowed={liveFeedEmbedAllowed}
        liveStreamLabel={copy.status.liveStream}
        externalOnlyLabel={copy.status.externalOnly}
        openInYouTubeLabel={copy.status.openInYouTube}
        watchUrl={liveFeedUrl ? getYouTubeWatchUrl(liveFeedUrl) : ''}
        onClose={() => setLiveFeedUrl(null)}
      />

      {/* ═══ MOBILE UI ═══ */}
      {isMobile && isEarthOps && (
        <>
          {(routeSnapshot || routeLoading) && (
            <RouteCockpitMobile
              routeLoading={routeLoading}
              routeSnapshot={routeSnapshot}
              navigationActive={navigationActive}
              mobileVectorStatusLabel={mobileVectorStatusLabel}
              routeEtaLabel={routeEtaLabel}
              routeProgressLabel={routeProgressLabel}
              remainingRouteDistance={remainingRouteDistance}
              routeRiskSummary={routeRiskSummary}
              currentRouteStep={currentRouteStep}
              nextRouteStep={nextRouteStep}
              currentStepDistanceMeters={currentStepDistanceMeters}
              gpsAccuracyMeters={gpsAccuracyMeters}
              navigationSpeedKmh={navigationSpeedKmh}
              navigationRerouting={navigationRerouting}
              navigationSimulationActive={navigationSimulationActive}
              navigationArrived={navigationArrived}
              navigationVoiceEnabled={navigationVoiceEnabled}
              onToggleNavigationFollow={toggleNavigationFollow}
              onClearNavigationState={clearNavigationState}
              onOpenSearch={() => setMobilePanel('search')}
              onToggleSimulation={toggleNavigationSimulation}
              onToggleVoice={toggleNavigationVoice}
              onSelectRouteOption={selectRouteOption}
            />
          )}

          {!navigationActive && <MobileCommandDrawer
            mobileNavTabs={mobileNavTabs}
            mobilePanel={mobilePanel}
            onTogglePanel={(panel) => setMobilePanel(mobilePanel === panel ? null : panel)}
            headerSummary={(
              <MobileDrawerHeaderSummary
                commandPanelLabel={copy.status.mobileCommandPanel}
                panelTitle={mobilePanelTitle}
                backendStatusLabel={backendStatusLabel}
                modeLabel={copy.status.mode}
                alertsLabel={copy.status.alerts}
                trackedLabel={copy.status.tracked}
                operationalModeLabel={operationalModeLabel}
                activeIntelAlerts={activeIntelAlerts}
                trackedEntityCount={trackedEntityCount}
                onClose={() => setMobilePanel(null)}
              />
            )}
            layersContent={(
              <MobileLayersPanel
                metrics={(
                  <MobileLayersMetrics
                    totalFlights={totalFlights}
                    satelliteCount={data.satellites?.length || 0}
                    cameraCount={data.cameras?.length || 0}
                    weatherEventCount={data.weather_events?.length || 0}
                    infrastructureCount={data.infrastructure?.length || 0}
                  />
                )}
                layerPanel={<LayerPanel data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} locale={locale} />}
                presets={<ViewPresets locale={locale} onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMapView(v => ({ ...v, zoom })); setMobilePanel(null); }} />}
              />
            )}
            marketsContent={<MarketsPanel data={data} spaceWeather={spaceWeather} />}
            intelContent={<IntelFeed data={data} onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />}
            searchContent={(
              <MobileSearchPanel
                routeError={routeError}
                searchBar={<SearchBar variant="mobile-nav" defaultOpen onLocate={(result) => { setFlyToLocation({ lat: result.lat, lng: result.lng, zoom: result.zoom, bbox: result.bbox, label: result.label, ts: Date.now() }); setMobilePanel(null); }} onRoute={async (request) => { await handleRouteRequest(request); setMobilePanel(null); }} />}
                sharePanel={<SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} />}
              />
            )}
            reconContent={(
              <MobileReconPanel
                osintPanel={(
                  <>
                    <AegisAnalystDockButton />
                    <OsintPanel isOpen={true} onClose={() => setMobilePanel(null)} isMobile={true} onSweepVisualize={setSweepData} />
                  </>
                )}
              />
            )}
          />}
        </>
      )}

      <BottomDesktopHud
        showDesktopBottomBar={showDesktopBottomBar}
        coordsDisplayRef={coordsDisplayRef}
        locationLabel={locationLabel}
        zoom={mapView.zoom}
        activeLayerCount={activeLayerCount}
        entityCount={<ActiveEntityCount data={data} />}
        scaleBar={<ScaleBar zoom={mapView.zoom} latitude={mapView.latitude} />}
      />

      <RegionDossierOverlay
        regionDossier={regionDossier}
        dossierLoading={dossierLoading}
        onClose={() => { setRegionDossier(null); setDossierLoading(false); }}
      />

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
