'use client';

import { useEffect, useState, useRef, useCallback, useMemo, type ComponentType, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Globe, MapPinned, Satellite, Moon } from 'lucide-react';
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
import OperationalCaseCard from '@/components/dashboard/OperationalCaseCard';
import NasaMissionStrip, { type NasaEventItem } from '@/components/dashboard/NasaMissionStrip';
import MobileCommandDrawer from '@/components/dashboard/MobileCommandDrawer';
import RouteCockpitDesktop from '@/components/dashboard/RouteCockpitDesktop';
import RouteCockpitMobile from '@/components/dashboard/RouteCockpitMobile';
import RouteAlertPreferencesPanel from '@/components/dashboard/RouteAlertPreferencesPanel';
import SplashScreen from '@/components/dashboard/SplashScreen';
import TopHudOverlays from '@/components/dashboard/TopHudOverlays';
import { DEFAULT_LOCALE, getDashboardCopy, isLocale, type Locale } from '@/lib/i18n';
import { type ActiveLayers, type BoundingBox, type Coordinate, type FlyToLocation, type MapView, type RouteOption, type RouteRiskSummary, type RouteSnapshot, type RouteStep, computeBearing, countSignalsNearRoute, distanceMetersBetween, distanceToRoutePath, formatEtaLabel, formatProgressLabel, getClosestStepIndex, getYouTubeWatchUrl, localizeRouteInstruction } from '@/lib/routing-shell';
import { getArrivalThresholdMeters, getNextSimulationIndex, resolveNavigationBearing, shouldAcceptNavigationFix, shouldRerouteNavigation, snapNavigationToRoute, stabilizeNavigationCoordinate } from '@/lib/vector-navigation';
import { recommendRoute } from '@/lib/route-intelligence';
import { chooseRouteAlertChannel } from '@/lib/route-alert-priority';
import { vibrateForRouteAlert } from '@/lib/route-alert-haptics';
import { buildRouteAlertVoiceMessage, getRouteAlertGuidance, shouldAnnounceRouteAlertPhase } from '@/lib/route-alert-guidance';
import { resolveRouteAlertPosition } from '@/lib/route-alert-position';
import { formatRouteAlertAge, getAlertObservedAt, isRouteAlertFresh } from '@/lib/route-alert-freshness';
import { DEFAULT_ROUTE_ALERT_PREFERENCES, parseRouteAlertPreferences, type RouteAlertPreferences } from '@/lib/route-alert-preferences';
import { LIVE_HAZARD_REFRESH_MS, LIVE_TRAFFIC_REFRESH_MS, shouldRefreshNavigationData } from '@/lib/navigation-live-refresh';
import { isAcceptableLocalRiskFix, shouldMonitorLocalRisks } from '@/lib/local-risk-monitoring';
import { filterCctvByViewMode, type CctvDeliveryMetadata, type CctvViewMode } from '@/lib/cctv-feed';
import { buildOperationalCases, type OperationalSignal, type OperationalSignalSeverity } from '@/lib/operational-cases';
import {
  COMMUNITY_INCIDENTS_CHANGED_EVENT,
  COMMUNITY_INCIDENTS_STORAGE_KEY,
  createBrowserCommunityIncidentService,
} from '@/lib/browser-community-incidents';
import type { CommunityIncident, CommunityIncidentKind } from '@/lib/community-incidents';

const AegisMap = dynamic(() => import('@/components/AegisMap'), { ssr: false });
const LayerPanel = dynamic(() => import('@/components/LayerPanel'));
const CameraViewer = dynamic(() => import('@/components/CameraViewer'));
const OsintPanel = dynamic(() => import('@/components/OsintPanel'));

type DashboardMode = 'earth' | 'solar' | 'focus';
type MobilePanel = 'layers' | 'markets' | 'intel' | 'alerts' | 'search' | 'recon';
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
            <button type="button" onClick={onClose} className="text-[var(--text-muted)] p-1" aria-label="Cerrar panel"><X className="w-4 h-4" /></button>
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

function MobileSearchPanel({ searchBar, routeError }: MobileSearchPanelProps) {
  return (
    <div className="space-y-2">
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

/** Real entity count â€” no fake throughput metrics */
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
  id?: string;
  published?: string;
  risk_score?: number;
  coords_default?: boolean;
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
  earthquakes?: (DashboardEntity & { id?: string; magnitude?: number; place?: string; depth?: number; time?: number })[];
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
  aviation_alerts?: DashboardEntity[];
  sdk_entities?: unknown[];
}

interface NearbyEarthquakeAlert {
  id: string;
  magnitude: number;
  place: string;
  distanceMeters: number;
  depth?: number;
  time: number;
  source: 'USGS';
}

interface NearbyContextAlert {
  id: string;
  kind: 'traffic-camera' | 'wildfire' | 'volcano' | 'severe-weather' | `community-${CommunityIncidentKind}`;
  title: string;
  detail: string;
  distanceMeters: number;
  source: string;
  severity: 'info' | 'warning' | 'critical';
  observedAt: number | null;
}

interface RouteRecommendation {
  routeId: string;
  label: string;
  reason: string;
  nearbySignals: number;
  durationSeconds: number;
  savingsSeconds: number;
  signalReduction: number;
  shouldSwitch: boolean;
  confidence: 'high' | 'medium';
}

interface TrafficInsight {
  status: 'loading' | 'live' | 'unavailable';
  configured?: boolean;
  source: string;
  delaySeconds?: number;
  trafficLengthMeters?: number;
  travelTimeSeconds?: number;
  freeFlowTimeSeconds?: number | null;
  level?: 'clear' | 'light' | 'moderate' | 'heavy';
  checkedAt?: string;
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
  const [trafficInsight, setTrafficInsight] = useState<TrafficInsight | null>(null);
  const [navigationActive, setNavigationActive] = useState(false);
  const [navigationBearing, setNavigationBearing] = useState<number | null>(null);
  const [currentRouteStepIndex, setCurrentRouteStepIndex] = useState(0);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [navigationSpeedKmh, setNavigationSpeedKmh] = useState<number | null>(null);
  const [navigationRerouting, setNavigationRerouting] = useState(false);
  const [navigationSimulationActive, setNavigationSimulationActive] = useState(false);
  const [navigationArrived, setNavigationArrived] = useState(false);
  const [navigationVoiceEnabled, setNavigationVoiceEnabled] = useState(true);
  const [nearbyEarthquakeAlert, setNearbyEarthquakeAlert] = useState<NearbyEarthquakeAlert | null>(null);
  const [nearbyContextAlert, setNearbyContextAlert] = useState<NearbyContextAlert | null>(null);
  const [communityIncidents, setCommunityIncidents] = useState<CommunityIncident[]>([]);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);
  const mouseCoordsRef = useRef<Coordinate | null>(null);
  const coordsDisplayRef = useRef<HTMLDivElement>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [regionDossier, setRegionDossier] = useState<RegionDossier | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [activeCamera, setActiveCamera] = useState<ActiveCamera | null>(null);
  const [cctvViewMode, setCctvViewMode] = useState<CctvViewMode>('all');
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
  const [mapProjection, setMapProjection] = useState<'globe'|'mercator'>('mercator');
  const [ambientMotionEnabled, setAmbientMotionEnabled] = useState(false);
  const ambientMotionPreferenceLoadedRef = useRef(false);
  const [routeAlertPreferences, setRouteAlertPreferences] = useState<RouteAlertPreferences>(DEFAULT_ROUTE_ALERT_PREFERENCES);
  const routeAlertPreferencesLoadedRef = useRef(false);
  const [selectedCelestialBody, setSelectedCelestialBody] = useState<CelestialBodyId>('earth');

  const [mapStyle, setMapStyle] = useState<'dark'|'satellite'>('dark');
  const [sweepData, setSweepData] = useState<unknown>(null);
  const [scanTargets, setScanTargets] = useState<ScanTarget[]>([]);

  const isMobile = useIsMobile();
  const geocodeCache = useRef<Map<string, string>>(new Map());
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const lastNavigationLocationRef = useRef<Coordinate | null>(null);
  const lastNavigationBearingRef = useRef<number | null>(null);
  const lastAcceptedGpsAtRef = useRef(0);
  const offRouteSinceRef = useRef<number | null>(null);
  const offRouteFixCountRef = useRef(0);
  const lastRerouteAtRef = useRef(0);
  const simulationIndexRef = useRef(0);
  const lastSpokenStepRef = useRef<number | null>(null);
  const lastNearSpokenStepRef = useRef<number | null>(null);
  const spokenEarthquakePhasesRef = useRef<Set<string>>(new Set());
  const alertedEarthquakeIdsRef = useRef<Set<string>>(new Set());
  const alertedContextIdsRef = useRef<Set<string>>(new Set());
  const notifiedRouteAlertIdsRef = useRef<Set<string>>(new Set());
  const hapticRouteAlertIdsRef = useRef<Set<string>>(new Set());
  const spokenContextPhasesRef = useRef<Set<string>>(new Set());
  const arrivalSpokenRef = useRef(false);
  const preNavigationMapStateRef = useRef<{ projection: 'globe' | 'mercator'; style: 'dark' | 'satellite' } | null>(null);
  const lastGeocodedPos = useRef<{ lat: number; lng: number } | null>(null);
  const lastGeocodeKeyRef = useRef<string>('');
  const lastLocationLabelRef = useRef<string>('');

  // â”€â”€ DEFAULT: Most layers OFF â€” fast initial load â”€â”€
  const [activeLayers, setActiveLayers] = useState<ActiveLayers>(DEFAULT_ACTIVE_LAYERS);
  const [liveFeedUrl, setLiveFeedUrl] = useState<string | null>(null);
  const [liveFeedName, setLiveFeedName] = useState('');
  const [liveFeedEmbedAllowed, setLiveFeedEmbedAllowed] = useState(true);

  useEffect(() => {
    const enabled = window.localStorage.getItem('aegis:ambient-motion') !== 'paused';
    queueMicrotask(() => {
      ambientMotionPreferenceLoadedRef.current = true;
      setAmbientMotionEnabled(enabled);
    });
  }, []);

  useEffect(() => {
    if (!ambientMotionPreferenceLoadedRef.current) return;
    window.localStorage.setItem('aegis:ambient-motion', ambientMotionEnabled ? 'active' : 'paused');
  }, [ambientMotionEnabled]);

  useEffect(() => {
    const stored = window.localStorage.getItem('aegis:route-alert-preferences');
    queueMicrotask(() => {
      routeAlertPreferencesLoadedRef.current = true;
      setRouteAlertPreferences(parseRouteAlertPreferences(stored));
    });
  }, []);

  useEffect(() => {
    if (!routeAlertPreferencesLoadedRef.current) return;
    window.localStorage.setItem('aegis:route-alert-preferences', JSON.stringify(routeAlertPreferences));
  }, [routeAlertPreferences]);

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
        if (d < 0.5) return; // increased threshold â€” fewer geocode calls
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

  // Entity click handler (hoisted from JSX to comply with Rules of Hooks â€” Fixes #113)
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

  const handleRouteRequest = useCallback(async ({ origin, destination, mode, waypoints, startImmediately = false }: RouteRequest) => {
    const previousMapState = { projection: mapProjection, style: mapStyle };
    setRouteError(null);
    setRouteLoading(true);
    setTrafficInsight(mode === 'driving' ? { status: 'loading', source: 'TomTom Traffic' } : null);
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

      if (mode === 'driving') {
        const trafficParams = new URLSearchParams({
          fromLat: String(origin.lat),
          fromLng: String(origin.lng),
          toLat: String(destination.lat),
          toLng: String(destination.lng),
        });
        void fetch(`/api/traffic/route?${trafficParams.toString()}`, { cache: 'no-store' })
          .then(async (trafficResponse) => {
            const payload = await trafficResponse.json() as TrafficInsight;
            setTrafficInsight(payload.status === 'live' ? payload : { ...payload, status: 'unavailable' });
          })
          .catch(() => setTrafficInsight({ status: 'unavailable', source: 'TomTom Traffic' }));
      }

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
      setGpsAccuracyMeters(origin.accuracy ?? null);
      setNavigationActive(startImmediately);
      setNavigationSimulationActive(false);
      setNavigationArrived(false);
      const initialBearing = route.steps?.[0]?.maneuver.bearingAfter ?? null;
      lastNavigationBearingRef.current = initialBearing;
      lastAcceptedGpsAtRef.current = Date.now();
      setNavigationBearing(initialBearing);
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

  useEffect(() => {
    if (!navigationActive || routeSnapshot?.mode !== 'driving') return;

    let lastRefreshAt = 0;
    const refreshLiveTraffic = () => {
      const now = Date.now();
      if (!shouldRefreshNavigationData(lastRefreshAt, now)) return;
      lastRefreshAt = now;
      const currentLocation = lastNavigationLocationRef.current ?? routeSnapshot.origin;
      const trafficParams = new URLSearchParams({
        fromLat: String(currentLocation.lat),
        fromLng: String(currentLocation.lng),
        toLat: String(routeSnapshot.destination.lat),
        toLng: String(routeSnapshot.destination.lng),
      });
      void fetch(`/api/traffic/route?${trafficParams.toString()}`, { cache: 'no-store' })
        .then(async (response) => {
          const payload = await response.json() as TrafficInsight;
          setTrafficInsight(payload.status === 'live' ? payload : { ...payload, status: 'unavailable' });
        })
        .catch(() => setTrafficInsight({ status: 'unavailable', source: 'TomTom Traffic' }));
    };

    const refreshWhenVisible = () => {
      if (!document.hidden) refreshLiveTraffic();
    };

    refreshLiveTraffic();
    const interval = window.setInterval(refreshLiveTraffic, LIVE_TRAFFIC_REFRESH_MS);
    window.addEventListener('online', refreshLiveTraffic);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', refreshLiveTraffic);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [navigationActive, routeSnapshot]);

  // â”€â”€ SHARED FETCH UTILITY (Fixes #107 â€” single definition, not 3 copies) â”€â”€
  const fetchEndpoint = useCallback(async (url: string, transform?: (d: unknown) => Partial<DashboardData>, options?: RequestInit): Promise<boolean> => {
    if (typeof document !== 'undefined' && document.hidden) return false;
    try {
      const res = await fetch(url, { cache: 'no-store', ...options });
      if (res.ok) {
        const json = await res.json() as unknown;
        const nextData = transform ? transform(json) : (json as Partial<DashboardData>);
        setData(prev => ({ ...prev, ...nextData }));
        setBackendStatus('connected');
        return true;
      }
      setBackendStatus('error');
    } catch (e) {
      console.warn('[AEGIS] Suppressed error:', e instanceof Error ? e.message : e);
      setBackendStatus('error');
    }
    return false;
  }, []);

  useEffect(() => {
    if (!shouldMonitorLocalRisks(navigationActive, routeAlertPreferences.localMonitoring)) return;
    let lastRefreshAt = 0;
    const refreshNavigationHazards = () => {
      const now = Date.now();
      if (!shouldRefreshNavigationData(lastRefreshAt, now)) return;
      lastRefreshAt = now;
      void fetchEndpoint('/api/fires', (payload) => {
        const value = payload as { fires?: DashboardEntity[] };
        return { fires: value.fires || [] };
      }, { cache: 'no-store' });
      void fetchEndpoint('/api/weather', (payload) => {
        const value = payload as { events?: DashboardEntity[] };
        return { weather_events: value.events || [] };
      }, { cache: 'no-store' });
    };

    const refreshWhenVisible = () => {
      if (!document.hidden) refreshNavigationHazards();
    };

    refreshNavigationHazards();
    const interval = window.setInterval(refreshNavigationHazards, LIVE_HAZARD_REFRESH_MS);
    window.addEventListener('online', refreshNavigationHazards);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', refreshNavigationHazards);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchEndpoint, navigationActive, routeAlertPreferences.localMonitoring]);

  // â”€â”€ PROGRESSIVE DATA LOADING (request-optimized) â”€â”€
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

    // Polling â€” OPTIMIZED intervals to minimize edge requests
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

  // â”€â”€ LAYER-AWARE DATA LOADING â€” only fetch when layer is toggled ON â”€â”€
  const layerFetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const loadLayerOnce = (
      key: string,
      url: string,
      transform?: (payload: Record<string, unknown>) => Partial<DashboardData>,
    ) => {
      if (layerFetchedRef.current.has(key)) return;
      void fetchEndpoint(
        url,
        transform ? (payload) => transform(payload as Record<string, unknown>) : undefined,
      ).then((loaded) => {
        if (loaded) layerFetchedRef.current.add(key);
      });
    };

    // Flights
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      loadLayerOnce('flights', '/api/flights');
    }
    // Satellites
    if (activeLayers.satellites) {
      loadLayerOnce('satellites', '/api/satellites');
    }
    // Fires
    if (activeLayers.fires) {
      loadLayerOnce('fires', '/api/fires');
    }
    // CCTV
    if (activeLayers.cctv) {
      loadLayerOnce('cctv', '/api/cctv?region=all&v=2');
    }
    // Maritime
    if (activeLayers.maritime) {
      loadLayerOnce('maritime', '/api/maritime', d => ({ maritime_ports: d.ports as DashboardEntity[], maritime_chokepoints: d.chokepoints as DashboardEntity[], maritime_ships: d.ships as DashboardEntity[] }));
    }
    // Balloons
    if (activeLayers.balloons) {
      loadLayerOnce('balloons', '/api/balloons', d => ({ balloons: d.balloons as DashboardEntity[] }));
    }
    // Radiation
    if (activeLayers.radiation) {
      loadLayerOnce('radiation', '/api/radiation', d => ({ radiation: d.stations as DashboardEntity[] }));
    }
    // Live News
    if (activeLayers.live_news) {
      loadLayerOnce('live_news', '/api/live-news', d => ({ live_feeds: d.feeds as DashboardEntity[] }));
    }
    // Weather
    if (activeLayers.weather) {
      loadLayerOnce('weather', '/api/weather', d => ({ weather_events: d.events as DashboardEntity[] }));
    }
    // Infrastructure
    if (activeLayers.infrastructure) {
      loadLayerOnce('infrastructure', '/api/infrastructure', d => ({ infrastructure: d.infrastructure as DashboardEntity[] }));
    }
    // Global Incidents (GDELT)
    if (activeLayers.global_incidents) {
      loadLayerOnce('gdelt', '/api/gdelt', d => ({ gdelt: d.events as DashboardData['gdelt'] }));
    }

  }, [activeLayers, fetchEndpoint]);

  // â”€â”€ LAYER-AWARE POLLING â€” only poll data for active layers â”€â”€
  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      intervals.push(setInterval(() => fetchEndpoint('/api/flights'), 45000)); // ADS-B positions: 45s freshness window
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
    if (activeLayers.fires) {
      intervals.push(setInterval(() => fetchEndpoint('/api/fires'), 300000)); // NASA FIRMS: 5m
    }
    if (activeLayers.weather) {
      intervals.push(setInterval(() => fetchEndpoint('/api/weather', d => ({ weather_events: d.events })), 120000)); // 2m
    }
    if (activeLayers.cctv) {
      intervals.push(setInterval(() => fetchEndpoint('/api/cctv?region=all&v=2'), 120000)); // 2m
    }
    if (activeLayers.global_incidents) {
      intervals.push(setInterval(() => fetchEndpoint('/api/gdelt', d => ({ gdelt: d.events })), 120000)); // 2m
    }
    if (activeLayers.live_news) {
      intervals.push(setInterval(() => fetchEndpoint('/api/live-news', d => ({ live_feeds: d.feeds })), 300000)); // 5m
    }
    if (activeLayers.satellites) {
      intervals.push(setInterval(() => fetchEndpoint('/api/satellites'), 120000)); // 2m
    }
    return () => intervals.forEach(clearInterval);
  }, [activeLayers, fetchEndpoint]);

  // Reactive layer fetch: handled by layerFetchedRef above (no duplicate)

  // â”€â”€ AEGIS SDK â€” Intelligence Fusion Layer â”€â”€
  // Produces node coordinates for the SDK network mesh visualization.
  // Does NOT duplicate existing layer visuals â€” SDK layer is LINES ONLY.
  // Cameras are excluded â€” they have their own dedicated layer.
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

    // Air domain (nodes only â€” no visual duplication)
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
        properties: { domain: 'AIR', name: typeof f.callsign === 'string' ? f.callsign.trim() || 'TRACK' : 'TRACK', source: typeof f.source === 'string' ? f.source : 'adsb.lol' },
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

    // Events â€” Earthquakes
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

  const mapData = useMemo<DashboardData>(() => ({
    ...dataWithSdk,
    cameras: filterCctvByViewMode(
      dataWithSdk.cameras as Array<DashboardEntity & CctvDeliveryMetadata> | undefined,
      cctvViewMode,
    ),
  }), [cctvViewMode, dataWithSdk]);

  const handleCctvViewModeChange = useCallback((mode: CctvViewMode) => {
    setCctvViewMode(mode);
  }, []);

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
    const verifiedAviationAlerts = (data.aviation_alerts || []).filter((item) => item.level === 'critical').length;
    return highRiskNews + significantQuakes + verifiedAviationAlerts;
  }, [data.news, data.earthquakes, data.aviation_alerts]);

  const maritimePressure = useMemo(() => {
    const congestedPorts = (data.maritime_ports || []).filter((port) => port.congestion === 'SEVERE' || port.congestion === 'CONGESTED').length;
    const riskyChokepoints = (data.maritime_chokepoints || []).filter((point) => point.risk === 'CRITICAL' || point.risk === 'HIGH').length;
    return congestedPorts + riskyChokepoints;
  }, [data.maritime_ports, data.maritime_chokepoints]);

  const operationalCases = useMemo(() => {
    const signals: OperationalSignal[] = [];
    const severityFromScore = (score: number): OperationalSignalSeverity => (
      score >= 8 ? 'critical' : score >= 5 ? 'warning' : 'info'
    );
    for (const item of data.news || []) {
      if (!item.coords || item.coords_default || !item.title || !item.source) continue;
      const observedAt = Date.parse(item.published || '');
      if (!Number.isFinite(observedAt)) continue;
      signals.push({
        id: item.id || `${item.source}-${item.title}-${observedAt}`,
        kind: 'news',
        title: item.title,
        source: item.source,
        latitude: item.coords[0],
        longitude: item.coords[1],
        observedAt,
        severity: severityFromScore(typeof item.risk_score === 'number' ? item.risk_score : 1),
      });
    }
    for (const item of data.earthquakes || []) {
      if (typeof item.lat !== 'number' || typeof item.lng !== 'number' || typeof item.time !== 'number') continue;
      const magnitude = typeof item.magnitude === 'number' ? item.magnitude : 0;
      signals.push({
        id: item.id || `quake-${item.time}-${item.lat}-${item.lng}`,
        kind: 'earthquake',
        title: `Terremoto M${magnitude.toFixed(1)} Â· ${item.place || 'ubicaciÃ³n sin nombre'}`,
        source: 'USGS',
        latitude: item.lat,
        longitude: item.lng,
        observedAt: item.time,
        severity: magnitude >= 5 ? 'critical' : magnitude >= 4 ? 'warning' : 'info',
      });
    }
    for (const incident of communityIncidents) {
      signals.push({
        id: incident.id,
        kind: `community-${incident.kind}`,
        title: `Reporte comunitario Â· ${incident.kind.replaceAll('_', ' ')}`,
        source: 'Comunidad local',
        latitude: incident.location.latitude,
        longitude: incident.location.longitude,
        observedAt: Date.parse(incident.lastReportedAt),
        severity: ['accident', 'fire', 'flood', 'road_closure'].includes(incident.kind) ? 'critical' : 'warning',
      });
    }
    return buildOperationalCases(signals);
  }, [communityIncidents, data.earthquakes, data.news]);

  useEffect(() => {
    if (!navigationActive || navigationSimulationActive || !routeSnapshot || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const rawLocation = {
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

        const previous = lastNavigationLocationRef.current;
        const now = Date.now();
        const elapsedMs = lastAcceptedGpsAtRef.current > 0 ? now - lastAcceptedGpsAtRef.current : 1_000;
        if (!shouldAcceptNavigationFix({
          previous,
          next: rawLocation,
          gpsAccuracyMeters: accuracy,
          speedKmh,
          elapsedMs,
        })) {
          setGpsAccuracyMeters(accuracy);
          return;
        }
        lastAcceptedGpsAtRef.current = now;

        const stabilizedLocation = stabilizeNavigationCoordinate(previous, rawLocation, accuracy, speedKmh);
        const routeMatch = snapNavigationToRoute(stabilizedLocation, routeSnapshot.coordinates, accuracy);
        const nextLocation = routeMatch.coordinate;

        setUserLocation(nextLocation);
        setGpsAccuracyMeters(accuracy);
        setNavigationSpeedKmh(speedKmh);

        const computedBearing = resolveNavigationBearing({
          previousBearing: lastNavigationBearingRef.current,
          deviceHeading: heading,
          previousCoordinate: previous,
          currentCoordinate: nextLocation,
          gpsAccuracyMeters: accuracy,
          speedKmh,
        });
        if (computedBearing !== null) {
          lastNavigationBearingRef.current = computedBearing;
          setNavigationBearing(computedBearing);
        }

        if (routeSnapshot.steps.length > 0) {
          const closestStepIndex = getClosestStepIndex(nextLocation, routeSnapshot.steps);
          setCurrentRouteStepIndex((currentIndex) => Math.max(currentIndex, Math.min(currentIndex + 1, closestStepIndex)));
        }

        // Deviation is measured from the stabilized raw fix, never the snapped marker,
        // so map matching cannot hide a genuine departure from the route.
        const offRouteDistance = distanceToRoutePath(stabilizedLocation, routeSnapshot.coordinates);
        const gpsReliable = accuracy !== null && accuracy <= 45;
        if (gpsReliable && offRouteDistance > 85) {
          offRouteFixCountRef.current += 1;
          offRouteSinceRef.current ??= Date.now();
          const deviationDuration = Date.now() - offRouteSinceRef.current;
          const rerouteCooldownElapsed = Date.now() - lastRerouteAtRef.current > 30_000;
          if (shouldRerouteNavigation({
            offRouteDistanceMeters: offRouteDistance,
            gpsAccuracyMeters: accuracy,
            deviationDurationMs: deviationDuration,
            cooldownElapsedMs: Date.now() - lastRerouteAtRef.current,
            consecutiveOffRouteFixes: offRouteFixCountRef.current,
          }) && rerouteCooldownElapsed && !navigationRerouting) {
            lastRerouteAtRef.current = Date.now();
            offRouteSinceRef.current = null;
            offRouteFixCountRef.current = 0;
            setNavigationRerouting(true);
            void handleRouteRequest({
              origin: { ...stabilizedLocation, ts: Date.now(), label: 'GPS actual' },
              destination: routeSnapshot.destination,
              mode: routeSnapshot.mode,
              waypoints: routeSnapshot.waypoints,
              startImmediately: true,
            }).finally(() => setNavigationRerouting(false));
          }
        } else {
          offRouteSinceRef.current = null;
          offRouteFixCountRef.current = 0;
        }

        const arrivalThreshold = getArrivalThresholdMeters(routeSnapshot.mode, accuracy, speedKmh);
        if (distanceMetersBetween(stabilizedLocation, routeSnapshot.destination) <= arrivalThreshold) {
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
    if (
      navigationActive
      || !routeAlertPreferences.localMonitoring
      || typeof navigator === 'undefined'
      || !navigator.geolocation
    ) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null;
        if (!isAcceptableLocalRiskFix(accuracy)) return;
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGpsAccuracyMeters(accuracy);
      },
      (error) => {
        console.warn('[AEGIS] Local risk watch failed:', error.message);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 20_000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [navigationActive, routeAlertPreferences.localMonitoring]);

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
    setTrafficInsight(null);
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
    offRouteFixCountRef.current = 0;
    lastNavigationLocationRef.current = null;
    lastNavigationBearingRef.current = null;
    lastAcceptedGpsAtRef.current = 0;
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const refreshCommunityIncidents = async () => {
      try {
        const incidents = await createBrowserCommunityIncidentService(window.localStorage)
          .active(new Date().toISOString());
        if (!cancelled) setCommunityIncidents(incidents.filter(({ status }) => status === 'active'));
      } catch {
        if (!cancelled) setCommunityIncidents([]);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === COMMUNITY_INCIDENTS_STORAGE_KEY) void refreshCommunityIncidents();
    };
    const handleIncidentChange = () => void refreshCommunityIncidents();

    void refreshCommunityIncidents();
    window.addEventListener('storage', handleStorage);
    window.addEventListener(COMMUNITY_INCIDENTS_CHANGED_EVENT, handleIncidentChange);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(COMMUNITY_INCIDENTS_CHANGED_EVENT, handleIncidentChange);
    };
  }, []);

  useEffect(() => {
    const monitoringRisks = shouldMonitorLocalRisks(navigationActive, routeAlertPreferences.localMonitoring);
    if (!monitoringRisks || !userLocation || !routeAlertPreferences.earthquakes) {
      queueMicrotask(() => setNearbyEarthquakeAlert(null));
      return;
    }

    const now = Date.now();
    const nearby = (data.earthquakes || [])
      .flatMap((earthquake) => {
        if (typeof earthquake.lat !== 'number' || typeof earthquake.lng !== 'number' || typeof earthquake.magnitude !== 'number' || typeof earthquake.time !== 'number') return [];
        const ageMs = now - earthquake.time;
        if (ageMs < -300000 || ageMs > 86400000) return [];
        const directDistanceMeters = Math.round(distanceMetersBetween(userLocation, earthquake));
        const routePosition = navigationActive && routeSnapshot
          ? resolveRouteAlertPosition({
              user: userLocation,
              alert: earthquake,
              routeCoordinates: routeSnapshot.coordinates,
              corridorMeters: 25_000,
              maxAheadMeters: 25_000,
            })
          : null;
        if (navigationActive && routeSnapshot && !routePosition) return [];
        const distanceMeters = directDistanceMeters;
        if (distanceMeters > 25_000) return [];
        return [{
          id: earthquake.id || `${earthquake.time}-${earthquake.lat}-${earthquake.lng}`,
          magnitude: earthquake.magnitude,
          place: earthquake.place || 'ubicaciÃ³n sin nombre',
          distanceMeters,
          depth: earthquake.depth,
          time: earthquake.time,
          source: 'USGS' as const,
        }];
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters || b.magnitude - a.magnitude)[0];

    if (!nearby) {
      queueMicrotask(() => setNearbyEarthquakeAlert(null));
      return;
    }

    setNearbyEarthquakeAlert((current) => {
      if (current?.id === nearby.id) return nearby;
      if (alertedEarthquakeIdsRef.current.has(nearby.id)) return current;
      alertedEarthquakeIdsRef.current.add(nearby.id);

      return nearby;
    });
  }, [data.earthquakes, navigationActive, routeAlertPreferences.earthquakes, routeAlertPreferences.localMonitoring, routeSnapshot, userLocation]);

  useEffect(() => {
    const monitoringRisks = shouldMonitorLocalRisks(navigationActive, routeAlertPreferences.localMonitoring);
    if (!monitoringRisks || !userLocation) {
      queueMicrotask(() => setNearbyContextAlert(null));
      return;
    }

    const candidates: Array<NearbyContextAlert & { priority: number }> = [];
    const now = Date.now();
    const alertDistance = (entity: DashboardEntity, corridorMeters: number, maxAheadMeters: number) => {
      if (typeof entity.lat !== 'number' || typeof entity.lng !== 'number') return null;
      if (navigationActive && routeSnapshot) {
        const routePosition = resolveRouteAlertPosition({
          user: userLocation,
          alert: entity as Coordinate,
          routeCoordinates: routeSnapshot.coordinates,
          corridorMeters,
          maxAheadMeters,
        });
        if (!routePosition) return null;
        const directDistanceMeters = Math.round(distanceMetersBetween(userLocation, entity as Coordinate));
        if (directDistanceMeters > maxAheadMeters) return null;
        return corridorMeters <= 100 ? routePosition.distanceAheadMeters : directDistanceMeters;
      }
      const distanceMeters = Math.round(distanceMetersBetween(userLocation, entity as Coordinate));
      return distanceMeters <= maxAheadMeters ? distanceMeters : null;
    };
    const near = (entity: DashboardEntity, latDelta: number, lngDelta: number) =>
      typeof entity.lat === 'number' && typeof entity.lng === 'number'
      && Math.abs(entity.lat - userLocation.lat) <= latDelta
      && Math.abs(entity.lng - userLocation.lng) <= lngDelta;

    for (const camera of navigationActive ? data.cameras || [] : []) {
      if (!routeAlertPreferences.trafficCameras || !near(camera, 0.006, 0.009)) continue;
      const distanceMeters = alertDistance(camera, 100, 500);
      if (distanceMeters === null) continue;
      const id = `camera-${String(camera.id || `${camera.lat}-${camera.lng}`)}`;
      candidates.push({
        id,
        kind: 'traffic-camera',
        title: 'CÃ¡mara de trÃ¡fico prÃ³xima',
        detail: String(camera.name || camera.city || 'Punto de observaciÃ³n vial'),
        distanceMeters,
        source: String(camera.source || 'organismo vial'),
        severity: 'info',
        observedAt: now,
        priority: 1,
      });
    }

    const communityMeta: Record<CommunityIncidentKind, {
      title: string;
      detail: string;
      severity: NearbyContextAlert['severity'];
      priority: number;
    }> = {
      accident: { title: 'Accidente reportado', detail: 'Reduce la velocidad y mantÃ©n distancia', severity: 'critical', priority: 5 },
      camera: { title: 'CÃ¡mara reportada', detail: 'Punto seÃ±alado por la comunidad local', severity: 'info', priority: 1 },
      fire: { title: 'Incendio reportado', detail: 'Posible humo o intervenciÃ³n de emergencia', severity: 'critical', priority: 5 },
      flood: { title: 'InundaciÃ³n reportada', detail: 'La vÃ­a podrÃ­a no ser transitable', severity: 'critical', priority: 5 },
      road_closure: { title: 'Cierre de vÃ­a reportado', detail: 'PrepÃ¡rate para una posible ruta alternativa', severity: 'critical', priority: 6 },
      road_hazard: { title: 'Peligro en la vÃ­a', detail: 'Circula con precauciÃ³n', severity: 'warning', priority: 4 },
    };

    for (const incident of navigationActive ? communityIncidents : []) {
     ß¾µÒÚ$z{-®éÜj×#¢G¶FöÖ–ä6öÆ÷'Ó¶&÷&FW#£‚6öÆ–BG¶FöÖ–ä6öÆ÷'ÓC¶&6¶w&÷VæC¢G¶FöÖ–ä6öÆ÷'Óƒ¶F—7Æ“¦–æÆ–æRÖ&Æö6³¶Ö&v–â×F÷£Gƒ²#äõTâ4õU$4R(isÂöà¢ÂöF—cæ“°¢Ò“°¢Ò“° ¢òò)H)HvVæW&–2†÷fW"f÷"6Æ–6¶&ÆW2)H)H ¢²v6öæfÆ–7BÖ–6öç2rÂv67GbÖF÷G2rÂvWÖ6ÇW7FW'2rÂvWÖ6—&6ÆW2rÂw6BÖF÷G2rÂvf—&W2Ö†VBrÂvvFVÇBÖF÷G2rÂvvFVÇBÖ†÷G7÷BÖ6÷&RrÂvvFVÇBÖ†÷G7÷BÖ†ÆòrÂwvVF†W"ÖF÷G2rÂv–æg&ÖF÷G2rÂvÖ&—F–ÖRÖF÷G2rÂv6†ö¶RÖF÷G2rÂvæWw2ÖF÷G2rÂw6–v–çBÖæWw2ÖF÷G2rÂv&ÆÆööâÖF÷G2rÂw&BÖF÷G2rÂw6†—ÖF÷G2rÂw7vVWÖFWf–6RÖF÷G2rÂw66â×F&vWG2ÖF÷G2rÂw6F²×6VrÂw6F²×6VÖvÆ÷rrÂw6F²Ö—"rÂw6F²Ö—"ÖvÆ÷rrÂw6F²Ö–çFVÂrÂw6F²Ö–çFVÂÖvÆ÷ruÒæf÷$V6‚†Æ–W"Óâ°¢Öæöâ‚vÖ÷W6VVçFW"rÂÆ–W"Â‚’Óâ²ÖævWD6çf2‚’ç7G–ÆRæ7W'6÷"Òwö–çFW"s²Ò“°¢Öæöâ‚vÖ÷W6VÆVfRrÂÆ–W"Â‚’Óâ²ÖævWD6çf2‚’ç7G–ÆRæ7W'6÷"Òrs²Ò“°¢Ò“° ¢òò)H)H66âF&vWG26Æ–6²)H)H ¢Öæöâ‚v6Æ–6²rÂw66â×F&vWG2ÖF÷G2rÂ†S¢fVGW&TWfVçB’Óâ°¢6öç7BÒRæfVGW&W3òå³Óòç&÷W'F–W3°¢–b‚’&WGW&ã°¢6öç7B6ö÷&G2ÒRæfVGW&W5³ÒævVöÖWG'’æ6ö÷&F–æFW2ç6Æ–6R‚“°¢÷W†6ö÷&G2ÂÆF—b7G–ÆSÒ"G·7G–ÆWÖ&÷&FW#£‚6öÆ–B&v&ƒ#SRÃcÃcÃãR“²#à¢ÆF—b7G–ÆSÒ&6öÆ÷#¢4dc4C4C¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£s¶Ö&v–âÖ&÷GFöÓ£gƒ²#ï	øêòD$tUC¢G·æ–GÓÂöF—cà¢ÆF—b7G–ÆSÒ&föçB×6—¦S£—ƒ¶6öÆ÷#¢4S„SdS¶Ö&v–âÖ&÷GFöÓ£‡ƒ²#âG·æ6—G’ÇÂuVæ¶æ÷vâwÒÂG·æ6÷VçG'’ÇÂuVæ¶æ÷vâwÒ(	BG·æ—7ÇÂuVæ¶æ÷vâ•5wÓÂöF—cà¢ÆF—b7G–ÆSÒ&F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£Gƒ¶föçB×6—¦S£—ƒ²#à¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#åE•SÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢3STdc²#âG²‡çG—RÇÂuTä´äõtâr’çFõWW$66R‚—ÓÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#ä4ôõ$E3Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG¶6ö÷&G5³ÒçFôf—†VBƒ2—Ü+ÂG¶6ö÷&G5³ÒçFôf—†VBƒ2—Ü+Â÷7ããÂöF—cà¢ÂöF—cà¢ÂöF—cæ“°¢Ò“° ¢òò)H)H44Ò7WÆ–W'2)H)H ¢Öæöâ‚v6Æ–6²rÂw66ÒÖF÷G2rÂRÓâ°¢–b‚RæfVGW&W3òæÆVæwF‚’&WGW&ã°¢6öç7BÒRæfVGW&W5³Òç&÷W'F–W22VçF—G•&÷W'F–W3°¢6öç7B6ö÷&G2Ò†RæfVGW&W5³ÒævVöÖWG'’’æ6ö÷&F–æFW3°¢6öç7B6öÆ÷"Òç&—6µöÆWfVÂÓÓÒt5$•D”4Âròr4dcsCBr¢ç&—6µöÆWfVÂÓÓÒt„”t‚ròr4dc“Sr¢r3$4CBs°¢6öç7B7F—fUF‡&VG2Òæ7F—fU÷F‡&VG2ò¥4ôâç'6R‡æ7F—fU÷F‡&VG2’¢µÓ°¢ ¢ÆWBF‡&VG4‡FÖÂÒrs°¢–b†7F—fUF‡&VG2æÆVæwF‚â’°¢F‡&VG4‡FÖÂÒÆF—b7G–ÆSÒ&Ö&v–â×F÷£‡ƒ·FF–ær×F÷£gƒ¶&÷&FW"×F÷£‚6öÆ–BG¶6öÆ÷'ÓC¶6öÆ÷#¢G¶6öÆ÷'Ó¶föçB×6—¦S£—ƒ¶föçB×vV–v‡C¦&öÆC²#à¢5D•dRD…$TE3£Æ'"óâG¶7F—fUF‡&VG2æÖ‚‡C¢7G&–ær’Óâ)ªG·GÖ’æ¦ö–â‚sÆ'"óâr—Ð¢ÂöF—cæ°¢Ð ¢÷W†6ö÷&G2ÂÆF—b7G–ÆSÒ"G·7G–ÆWÖ&÷&FW#£‚6öÆ–BG¶6öÆ÷'ÓC²#à¢ÆF—b7G–ÆSÒ&6öÆ÷#¢G¶6öÆ÷'Ó¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£s¶Ö&v–âÖ&÷GFöÓ£Gƒ²#ï	øú"G·ææÖWÓÂöF—cà¢ÆF—b7G–ÆSÒ&föçB×6—¦S£—ƒ¶6öÆ÷#¢6¶Ö&v–âÖ&÷GFöÓ£‡ƒ²#âG·æ6FVv÷'—ÒÂG·æ6—G—ÒÂG·æ6÷VçG'—ÓÂöF—cà¢ÆF—b7G–ÆSÒ&F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g#¶v£Gƒ¶föçB×6—¦S£ƒ²#à¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC¶föçB×6—¦S£—ƒ²#å44Ò$•4²ÄUdTÃÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢G¶6öÆ÷'Ó¶föçB×vV–v‡C¦&öÆC²#âG·ç&—6µöÆWfVÇÓÂ÷7ããÂöF—cà¢ÂöF—cà¢G·F‡&VG4‡FÖÇÐ¢ÂöF—cæ“°¢Ò“° ¢òò)H)H•7vVWFWf–6R6Æ–6²)H)H ¢Öæöâ‚v6Æ–6²rÂw7vVWÖFWf–6RÖF÷G2rÂ†S¢fVGW&TWfVçB’Óâ°¢6öç7BÒRæfVGW&W3òå³Óòç&÷W'F–W3°¢–b‚’&WGW&ã°¢6öç7B6ö÷&G2ÒRæfVGW&W5³ÒævVöÖWG'’æ6ö÷&F–æFW2ç6Æ–6R‚“°¢6öç7B÷'G2Ò¥4ôâç'6R‡ç÷'G2ÇÂuµÒr“°¢6öç7BgVÆç2Ò¥4ôâç'6R‡çgVÆç2ÇÂuµÒr“°¢6öç7B†÷7FæÖW2Ò¥4ôâç'6R‡æ†÷7FæÖW2ÇÂuµÒr“°¢6öç7B&—6´6öÆ÷'3¢&V6÷&CÇ7G&–ærÂ7G&–æsâÒ²5$•D”4Ã¢r4dc4C4BrÂ„”tƒ¢r4dcd#rÂÔTD•TÓ¢r4ddCsrÂÄõs¢r3sddc2rÂ”ädó¢r3T3TSBrÓ°¢÷W†6ö÷&G2ÂÆF—b7G–ÆSÒ&föçBÖfÖ–Ç“¦Ööæ÷76S¶föçB×6—¦S£ƒ¶6öÆ÷#¢4S„SdS²#à¢ÆF—b7G–ÆSÒ&föçB×6—¦S£7ƒ¶föçB×vV–v‡C¦&öÆC¶Ö&v–âÖ&÷GFöÓ£gƒ¶6öÆ÷#¢G·æ6öÆ÷'Ó²#âG·æFWf–6U÷G—WÓÂöF—cà¢ÆF—b7G–ÆSÒ&föçB×6—¦S£'ƒ¶Ö&v–âÖ&÷GFöÓ£‡ƒ¶6öÆ÷#¢6ffc²#âG·æ—ÓÂöF—cà¢G¶†÷7FæÖW2æÆVæwF‚âòÆF—b7G–ÆSÒ&föçB×6—¦S£—ƒ¶6öÆ÷#¢3„ƒƒƒ¶Ö&v–âÖ&÷GFöÓ£gƒ²#âG¶†÷7FæÖW2æ¦ö–â‚rÂr—ÓÂöF—cæ¢rwÐ¢ÆF—b7G–ÆSÒ&F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£gƒ¶Ö&v–âÖ&÷GFöÓ£‡ƒ²#à¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#åõ%E3Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG·÷'G2æÆVæwF‡ÓÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#å$•4³Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢G·&—6´6öÆ÷'5·ç&—6µöÆWfVÅÒÇÂr3ccbwÓ²#âG·ç&—6µöÆWfVÇÓÂ÷7ããÂöF—cà¢ÂöF—cà¢ÆF—b7G–ÆSÒ&föçB×6—¦S£—ƒ¶6öÆ÷#¢3„ƒƒƒ¶Ö&v–âÖ&÷GFöÓ£gƒ²#ä÷Vã¢G·÷'G2ç6Æ–6RƒÂ"’æ¦ö–â‚rÂr—ÒG·÷'G2æÆVæwF‚â"òrâââr¢rwÓÂöF—cà¢G·gVÆç2æÆVæwF‚âòÆF—b7G–ÆSÒ&föçB×6—¦S£—ƒ¶6öÆ÷#¢4dc4C4C¶Ö&v–âÖ&÷GFöÓ£gƒ²#î)ª5dW3¢G·gVÆç2ç6Æ–6RƒÂR’æ¦ö–â‚rÂr—ÒG·gVÆç2æÆVæwF‚âRò²G·gVÆç2æÆVæwF‚ÒWÒÖ÷&V¢rwÓÂöF—cæ¢rwÐ¢ÂöF—cæ“°¢Ò“° ¢òò)H)H&ÆÆööç2ò6öæFW2)H)H ¢Öæöâ‚v6Æ–6²rÂv&ÆÆööâÖF÷G2rÂRÓâ°¢–b‚RæfVGW&W3òæÆVæwF‚’&WGW&ã°¢6öç7BÒRæfVGW&W5³Òç&÷W'F–W22VçF—G•&÷W'F–W3°¢6öç7B6ö÷&G2Ò†RæfVGW&W5³ÒævVöÖWG'’’æ6ö÷&F–æFW3°¢÷W†6ö÷&G2ÂÆF—b7G–ÆSÒ"G·7G–ÆWÖ&÷&FW#£‚6öÆ–BG·æ6öÆ÷'ÓC²#à¢ÆF—b7G–ÆSÒ&6öÆ÷#¢G·æ6öÆ÷'Ó¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£s¶ÆWGFW"×76–æs£ãVÓ¶Ö&v–âÖ&÷GFöÓ£Gƒ²#ï	øè‚G·æ6ÆÇ6–vçÓÂöF—cà¢ÆF—b7G–ÆSÒ&föçB×6—¦S£—ƒ¶6öÆ÷#¢6¶Ö&v–âÖ&÷GFöÓ£‡ƒ²#âG·çG—RçFõWW$66R‚—Òò5DEU3¢G·ç7FGW2çFõWW$66R‚—ÓÂöF—cà¢ÆF—b7G–ÆSÒ&F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£Gƒ¶föçB×6—¦S£—ƒ²#à¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#äÅD•ETDSÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG·æÇF—GVFWÒÓÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#å5TTCÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG´ÖF‚ç&÷VæB‡ç7VVB—Ò¶ÒöƒÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#ådU%B$DSÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢G·çfW'F–6Å&FRâòr3Scsbr¢r4dc4C4BwÓ²#âG·çfW'F–6Å&FRçFôf—†VBƒ—ÒÒ÷3Â÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#åDTÕÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG·çFV×W&GW&WÜ+3Â÷7ããÂöF—cà¢ÂöF—cà¢ÂöF—cæ“°¢Ò“° ¢òò)H)H&F–F–öâ)H)H ¢Öæöâ‚v6Æ–6²rÂw&BÖF÷G2rÂRÓâ°¢–b‚RæfVGW&W3òæÆVæwF‚’&WGW&ã°¢6öç7BÒRæfVGW&W5³Òç&÷W'F–W22VçF—G•&÷W'F–W3°¢6öç7B6ö÷&G2Ò†RæfVGW&W5³ÒævVöÖWG'’’æ6ö÷&F–æFW3°¢6öç7B6öÆ÷"Òç7FGW2ÓÓÒtDätU"ròr4dcsCBr¢ç7FGW2ÓÓÒut$ä”ärròr4dc“Sr¢r4#Ct$2s°¢÷W†6ö÷&G2ÂÆF—b7G–ÆSÒ"G·7G–ÆWÖ&÷&FW#£‚6öÆ–BG¶6öÆ÷'ÓC²#à¢ÆF—b7G–ÆSÒ&6öÆ÷#¢G¶6öÆ÷'Ó¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£s¶Ö&v–âÖ&÷GFöÓ£Gƒ²#î)Š.ûˆòG·ææÖWÓÂöF—cà¢ÆF—b7G–ÆSÒ&föçB×6—¦S£—ƒ¶6öÆ÷#¢6¶Ö&v–âÖ&÷GFöÓ£‡ƒ²#âG·æ6—G—ÒÂG·æ6÷VçG'—ÓÂöF—cà¢ÆF—b7G–ÆSÒ&F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g#¶v£Gƒ¶föçB×6—¦S£ƒ²#à¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC¶föçB×6—¦S£—ƒ²#å$TD”äsÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢G¶6öÆ÷'Ó¶föçB×vV–v‡C¦&öÆC²#âG·ç&VF–æwÒå7böƒÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC¶föçB×6—¦S£—ƒ²#å5DEU3Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢G¶6öÆ÷'Ó²#âG·ç7FGW7ÓÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC¶föçB×6—¦S£—ƒ²#ääUEtõ$³Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG·ææWGv÷&·ÓÂ÷7ããÂöF—cà¢ÂöF—cà¢ÂöF—cæ“°¢Ò“° ¢òò)H)HÖ&—F–ÖR6†—2)H)H ¢Öæöâ‚v6Æ–6²rÂw6†—ÖF÷G2rÂRÓâ°¢–b‚RæfVGW&W3òæÆVæwF‚’&WGW&ã°¢6öç7BÒRæfVGW&W5³Òç&÷W'F–W22VçF—G•&÷W'F–W3°¢6öç7B6ö÷&G2Ò†RæfVGW&W5³ÒævVöÖWG'’’æ6ö÷&F–æFW3°¢6öç7B6öÆ÷"ÒçG—RÓÓÒvÖ–Æ—F'’ròr4dcsCBr¢çG—RÓÓÒwFæ¶W"ròr4dc“Sr¢r3$4CBs°¢÷W†6ö÷&G2ÂÆF—b7G–ÆSÒ"G·7G–ÆWÖ&÷&FW#£‚6öÆ–BG¶6öÆ÷'ÓC²#à¢ÆF—b7G–ÆSÒ&F—7Æ“¦fÆWƒ¶§W7F–g’Ö6öçFVçC§76RÖ&WGvVVã¶Ö&v–âÖ&÷GFöÓ£Gƒ²#à¢Ç7â7G–ÆSÒ&6öÆ÷#¢G¶6öÆ÷'Ó¶föçB×6—¦S£'ƒ¶föçB×vV–v‡C£s¶ÆWGFW"×76–æs£ãVÓ²#ï	ùª"G·ææÖWÓÂ÷7ãà¢Ç7â7G–ÆSÒ&6öÆ÷#¢6¶föçB×6—¦S£—ƒ²#âG·æfÆwÓÂ÷7ãà¢ÂöF—cà¢ÆF—b7G–ÆSÒ&F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£Gƒ¶föçB×6—¦S£—ƒ²#à¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#åE•SÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢G¶6öÆ÷'Ó²#âG·çG—RçFõWW$66R‚—ÓÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#å5TTCÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG·ç7VVGÒ¶æ÷G3Â÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#ä„TD”äsÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG·æ†VF–æwÜ+Â÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#äDU5CÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG·æFW7F–æF–öâÇÂuTä´äõtâwÓÂ÷7ããÂöF—cà¢ÂöF—cà¢ÂöF—cæ“°¢Ò“° ¢òò)H)HvVF†W"WfVçG2„ä4TôäUB’)H)H ¢Öæöâ‚v6Æ–6²rÂwvVF†W"ÖF÷G2rÂRÓâ°¢–b‚RæfVGW&W3òæÆVæwF‚’&WGW&ã°¢6öç7BÒRæfVGW&W5³Òç&÷W'F–W22VçF—G•&÷W'F–W3°¢6öç7B6ö÷&G2Ò†RæfVGW&W5³ÒævVöÖWG'’’æ6ö÷&F–æFW3°¢6öç7B–6öäVÖö¦’Òæ–6öâÓÓÒv7–6ÆöæRrò	øÈr¢æ–6öâÓÓÒwföÆ6æòrò	øÈ²r¢~)ªs°¢÷W†6ö÷&G2ÂÆF—b7G–ÆSÒ"G·7G–ÆWÖ&÷&FW#£‚6öÆ–B&v&ƒ##BÃcBÃ#SÃã2“²#à¢ÆF—b7G–ÆSÒ&6öÆ÷#¢4SCd#¶föçB×6—¦S£Gƒ¶föçB×vV–v‡C£s¶Ö&v–âÖ&÷GFöÓ£gƒ²#âG¶–6öäVÖö¦—ÒG·çG—RÇÂuvVF†W"WfVçBwÓÂöF—cà¢ÆF—b7G–ÆSÒ&föçB×6—¦S£ƒ¶6öÆ÷#¢4S„SdS¶Ö&v–âÖ&÷GFöÓ£‡ƒ¶Æ–æRÖ†V–v‡C£ãC²#âG·çF—FÆRÇÂuVæ¶æ÷vâWfVçBwÓÂöF—cà¢ÆF—b7G–ÆSÒ&F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£Gƒ¶föçB×6—¦S£—ƒ¶Ö&v–âÖ&÷GFöÓ£‡ƒ²#à¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#å4UdU$•E“Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢G·ç6WfW&—G’ÓÓÒv†–v‚ròr4dcsCBr¢r4ddCswÓ²#âG²‡ç6WfW&—G—ÇÂvÆ÷rr’çFõWW$66R‚—ÓÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#ä4ôõ$E3Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG¶6ö÷&G5³ÒçFôf—†VBƒ2—Ü+ÂG¶6ö÷&G5³ÒçFôf—†VBƒ2—Ü+Â÷7ããÂöF—cà¢ÂöF—cà¢ÆF—b7G–ÆSÒ&F—7Æ“¦fÆWƒ¶v£gƒ²#à¢G·ç6÷W&6RòÆ‡&VcÒ"G·ç6÷W&6WÒ"F&vWCÒ%ö&Ææ²"7G–ÆSÒ"G¶Æ–æµ7G–ÆWÖ6öÆ÷#¢4SCd#¶&÷&FW#£‚6öÆ–B&v&ƒ##BÃcBÃ#SÃãB“¶&6¶w&÷VæC§&v&ƒ##BÃcBÃ#SÃã“²#ï	ù:4õU$4SÂöæ¢rwÐ¢Æ‡&VcÒ&‡GG3¢òöVöæWBæw6f2ææ6æv÷bö’÷c2öWfVçG2òG·æ–BÇÂrwÒ"F&vWCÒ%ö&Ææ²"7G–ÆSÒ"G¶Æ–æµ7G–ÆWÖ6öÆ÷#¢4CDc3s¶&÷&FW#£‚6öÆ–B&v&ƒ#"ÃsRÃSRÃãB“¶&6¶w&÷VæC§&v&ƒ#"ÃsRÃSRÃã“²#ï	ù»ûˆòä4TôäUCÂöà¢ÂöF—cà¢ÂöF—cæ“°¢öäVçF—G”6Æ–6³òâ‡²G—S¢wvVF†W%öWfVçBrÂÆC¢6ö÷&G5³ÒÂÆæs¢6ö÷&G5³ÒÂF—FÆS¢çF—FÆRÂ6WfW&—G“¢ç6WfW&—G’Â6÷W&6S¢ç6÷W&6RÂ–C¢æ–BÒ“°¢Ò“° ¢òò)H)HçV6ÆV"–æg&7G'V7GW&R)H)H ¢Öæöâ‚v6Æ–6²rÂv–æg&ÖF÷G2rÂRÓâ°¢–b‚RæfVGW&W3òæÆVæwF‚’&WGW&ã°¢6öç7BÒRæfVGW&W5³Òç&÷W'F–W22VçF—G•&÷W'F–W3°¢6öç7B6ö÷&G2Ò†RæfVGW&W5³ÒævVöÖWG'’’æ6ö÷&F–æFW3°¢6öç7B7FGW46öÆ÷"Òç7FGW2æ–æ6ÇVFW2‚u4T•4Ô”2$•4²r’òr4dc“Sr¢ç7FGW2ÓÓÒt7F—fR6öæfÆ–7B¦öæRròr4dcsCBr¢ç7FGW2ÓÓÒt÷W&F–öæÂròr3sddc2r¢r3sSsSsRs°¢÷W†6ö÷&G2ÂÆF—b7G–ÆSÒ"G·7G–ÆWÖ&÷&FW#£‚6öÆ–B&v&ƒ‚Ã#SRÃ2Ãã2“²#à¢ÆF—b7G–ÆSÒ&6öÆ÷#¢3sddc3¶föçB×6—¦S£Gƒ¶föçB×vV–v‡C£s¶Ö&v–âÖ&÷GFöÓ£Gƒ²#î)Š.ûˆòG·ææÖRÇÂtçV6ÆV"f6–Æ—G’wÓÂöF—cà¢ÆF—b7G–ÆSÒ&F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£gƒ¶föçB×6—¦S£—ƒ¶Ö&v–âÖ&÷GFöÓ£‡ƒ²#à¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#å5DEU3Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢G·7FGW46öÆ÷'Ó²#âG·ç7FGW2ÇÂ~(	BwÓÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#ä4•E“Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG·æ6—G’ÇÂ~(	BwÒÂG·æ6÷VçG'’ÇÂrwÓÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#å$T5Dõ%3Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢3sddc3²#âG·ç&V7F÷'2ÇÂ~(	BwÓÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#ä44•E“Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG·æ66—G”Õròæ66—G”ÕrçFôÆö6ÆU7G&–ær‚’²rÕrr¢~(	BwÓÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#äõtäU#Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG·æ÷væW"ÇÂ~(	BwÓÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC²#ä4ôõ$E3Â÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS²#âG¶6ö÷&G5³ÒçFôf—†VBƒ2—Ü+ÂG¶6ö÷&G5³ÒçFôf—†VBƒ2—Ü+Â÷7ããÂöF—cà¢ÂöF—cà¢Æ‡&VcÒ&‡GG3¢ò÷wwrævöövÆRæ6öÒöÖ2ôG¶6ö÷&G5³×ÒÂG¶6ö÷&G5³×ÒÃG¢öFFÒ6ÓS2"F&vWCÒ%ö&Ææ²"7G–ÆSÒ"G¶Æ–æµ7G–ÆWÖ6öÆ÷#¢3sddc3¶&÷&FW#£‚6öÆ–B&v&ƒ‚Ã#SRÃ2ÃãB“¶&6¶w&÷VæC§&v&ƒ‚Ã#SRÃ2Ãã“²#å4DTÄÄ•DRd”UsÂöà¢ÂöF—cæ“°¢öäVçF—G”6Æ–6³òâ‡²G—S¢v–æg&7G'V7GW&RrÂÆC¢6ö÷&G5³ÒÂÆæs¢6ö÷&G5³ÒÂæÖS¢ææÖRÂ7FGW3¢ç7FGW2Â6÷VçG'“¢æ6÷VçG'’Ò“°¢Ò“° ¢òò)H)HÖ&—F–ÖR÷'G2bæfÂ&6W2)H)H ¢Öæöâ‚v6Æ–6²rÂvÖ&—F–ÖRÖF÷G2rÂRÓâ°¢6öç7BÒRæfVGW&W3òå³Óòç&÷W'F–W3°¢–b‚’&WGW&ã°¢6öç7B6ö÷&G2Ò†RæfVGW&W2³ÒævVöÖWG'’’æ6ö÷&F–æFW3°¢6öç7BG—T6öÆ÷"ÒçG—RÓÓÒvæfÂròr4dc4C4Br¢çG—RÓÓÒvVæW&w’ròr4dc“Sr¢r3$4CBs°¢6öç7BG—TÆ&VÂÒçG—RÓÓÒvæfÂròtädÂ$4Rr¢çG—RÓÓÒvVæW&w’ròtTäU$u’õ%Br¢t4ôåD”äU"õ%Bs°¢ ¢6öç7B6öævW7F–öä‡FÖÂÒæ6öævW7F–öâò ¢ÆF—b7G–ÆSÒ&Ö&v–â×F÷£‡ƒ·FF–ær×F÷£gƒ¶&÷&FW"×F÷£‚6öÆ–B&v&ƒ#SRÃ#SRÃ#SRÃã“²#à¢ÆF—b7G–ÆSÒ&F—7Æ“¦w&–C¶w&–B×FV×ÆFRÖ6öÇVÖç3£g"g#¶v£Gƒ²#à¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC¶föçB×6—¦S£—ƒ²#ä4ôätU5D”ôãÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢G·æ6öævW7F–öâÓÓÒu4UdU$Rròr4dcsCBr¢æ6öævW7F–öâÓÓÒt4ôätU5DTBròr4dc“Sr¢r3ScsbwÓ¶föçB×vV–v‡C¦&öÆC¶föçB×6—¦S£ƒ²#âG·æ6öævW7F–öçÓÂ÷7ããÂöF—cà¢ÆF—cãÇ7â7G–ÆSÒ&6öÆ÷#¢3T3TSC¶föçB×6—¦S£—ƒ²#äU5BâEtTÄÂD”ÔSÂ÷7ããÆ'"óãÇ7â7G–ÆSÒ&6öÆ÷#¢4S„SdS¶föçB×vV–v‡C¦&öÆC¶föçB×6—¦S£ƒ²#âG·æGvVÆÅ÷F–ÖRÇÂuVæ¶æ÷vâwÓÂ÷7ããÂöF—cà¢ÂöF—cà¢ÂöF—cæ¢rs° ¢÷W†6ö÷&G2ÂÆF—b7G–ÆSÒ"G·7G–ÆWÖ&÷&FW#£‚6öÆ–BG·G—T6öÆ÷'ÓC²#à¢ÆF—b7G–ÆSÒ&6öÆ÷#¢G·G—T6öÆ÷'Ó¶föçB×vV–v‡C¦&öÆC¶föçB×6—¦S£ƒ¶Ö&v–âÖ&÷GFöÓ£Gƒ²#âG·ææÖWÓÂöF—cà¢ÆF—b7G–ÆSÒ&6öÆ÷#¢3“““¶föçB×6—¦S£—ƒ¶Ö&v–âÖ&÷GFöÓ£gƒ²#âG·G—TÆ&VÇÒ(	BG·æ6÷VçG'—ÓÂöF—cà¢G·çföÇVÖRòÆF—b7G–ÆSÒ&föçB×6—¦S£—ƒ¶6öÆ÷#¢6²#åföÇVÖS¢Ç7â7G–ÆSÒ&6öÆ÷#¢G·G—T6öÆ÷'Ó¶föçB×vV–v‡C¦&öÆC²#âG·çföÇVÖWÓÂ÷7ããÂöF—cæ¢rwÐ¢G·æfÆVWBòÆF—b7G–ÆSÒ&föçB×6—¦S£—ƒ¶6öÆ÷#¢6²#äfÆVWC¢Ç7â7G–ÆSÒ&6öÆ÷#¢G·G—T6öÆ÷'Ó¶föçB×vV–v‡C¦&öÆC²#âG·æfÆVWGÓÂ÷7ããÂöF—cæ¢rwÐ¢G·ç&æ²òÆF—b7G–ÆSÒ&föçB×6—¦S£—ƒ¶6öÆ÷#¢6²#ävÆö&Â&æ³¢Ç7â7G–ÆSÒ&6öÆ÷#¢G·G—T6öÆ÷'Ó¶föçB×vV–v‡C¦&öÆC²#â2G·ç&æ·ÓÂ÷7ããÂöF—cæ¢rwÐ¢G¶6öævW7F–öä‡FÖÇÐ¢ÂöF—cæ“°¢Ò“° ¢òò)H)HÖ&—F–ÖR6†ö¶Wö–çG2)H)H ¢Öæöâ‚v6Æ–6²rÂv6†ö¶RÖF÷G2rÂRÓâ°¢6öç7BÒRæfVGW&W3òå³Óòç&÷W'F–W3°¢–b‚’&WGW&ã°¢6öç7B6ö÷&G2Ò†RæfVGW&W2³ÒævVöÖWG'’’æ6ö÷&F–æFW3°¢6öç7B&—6´6öÂÒç&—6²ÓÓÒt5$•D”4Âròr4dcsCBr¢ç&—6²ÓÓÒt„”t‚ròr4dc“Sr¢ç&—6²ÓÓÒtTÄUdDTBròr4ddCsr¢r3Scsbs°¢÷W†6ö÷&G2ÂÆF—b7G–ÆSÒ"G·7G–ÆWÖ&÷&FW#£‚6öÆ–BG·&—6´6öÇÓC²#à¢ÆF—b7G–ÆSÒ&6öÆ÷#¢4dc“S¶föçB×vV–v‡C¦&öÆC¶föçB×6—¦S£ƒ¶Ö&v–âÖ&÷GFöÓ£Gƒ²#âG·ææÖWÓÂöF—cà¢ÆF—b7G–ÆSÒ&föçB×6—¦S£—ƒ¶6öÆ÷#¢6²#åG&ff–3¢Ç7â7G–ÆSÒ&6öÆ÷#¢6ffc²#âG·çG&ff–7ÓÂ÷7ããÂöF—cà¢ÆF—b7G–ÆSÒ&föçB×6—¦S£—ƒ¶6öÆ÷#¢6²#å&—6³¢Ç7â7G–ÆSÒ&6öÆ÷#¢G·&—6´6öÇÓ¶föçB×vV–v‡C¦&öÆC²#âG·ç&—6·ÓÂ÷7ããÂöF—cà¢ÂöF—cæ“°¢Ò“° ¢òò)H)HÆ—fRæWw2†÷Vç2fVVBf–WvW"’)H)H ¢Öæöâ‚v6Æ–6²rÂvæWw2ÖF÷G2rÂRÓâ°¢6öç7BÒRæfVGW&W3òå³Óòç&÷W'F–W3°¢–b‚’&WGW&ã°¢öäVçF—G”6Æ–6³òâ‡°¢G—S¢vÆ—fUöæWw2rÀ¢æÖS¢ææÖRÀ¢6—G“¢æ6—G’À¢6÷VçG'“¢æ6÷VçG'’À¢W&Ã¢çW&ÂÀ¢6FVv÷'“¢æ6FVv÷'’À¢VÖ&VEöÆÆ÷vVC¢æVÖ&VEöÆÆ÷vVBÓÒfÇ6RbbæVÖ&VEöÆÆ÷vVBÓÒvfÇ6RrÀ¢Ò“°¢Ò“° ¢&WGW&â‚’Óâ°¢–b†Ö÷W6Tg&ÖR’v–æF÷ræ6æ6VÄæ–ÖF–öäg&ÖR†Ö÷W6Tg&ÖR“°¢÷W&Vbæ7W'&VçCòç&VÖ÷fR‚“°¢Öç&VÖ÷fR‚“°¢Ö&Vbæ7W'&VçBÒçVÆÃ°¢6WDÖ&VG’†fÇ6R“°¢Ó°¢ÒÂ¶Ç”Vv—4vÆö&U7G–Æ–ærÂ7&VFTF÷BÂ7&VFT–6öâÂ7&VFTæf–vF–öä'&÷rÂöäVçF—G”6Æ–6²ÂöäÖ÷W6T6ö÷&G2Âöå&–v‡D6Æ–6²Âöåf–Wu7FFT6†ævUÒ“° ¢òòF’ôæ–v‡@¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂÖ&Vbæ7W'&VçB’&WGW&ã°¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢6öç7BWFFRÒ‚’Óâ°¢6öç7B7&2ÒÖævWE6÷W&6R‚vF’Öæ–v‡Br’2vVô§6öå6÷W&6T†æFÆRÂVæFVf–æVC°¢–b‚7&2’&WGW&ã°¢–b‚7F—fTÆ–W'2æF•öæ–v‡B’²7&2ç6WDFF„TÕE•ôd2“²&WGW&ã²Ð¢7&2ç6WDFF‡²G—S¢tfVGW&T6öÆÆV7F–öârÂfVGW&W3¢·²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uöÇ–vöârÂ6ö÷&F–æFW3¢¶6ö×WFU6öÆ%FW&Ö–æF÷"‚•ÒÒÂ&÷W'F–W3¢·ÒÕÒÒ“°¢Ó° ¢6öç7B—bÒ6WD–çFW'fÂ‡WFFRÂ3“²òòRÖ–â‡v2Ö–â(	B6†F÷r&&VÇ’Ö÷fW2¢&WGW&â‚’Óâ6ÆV$–çFW'fÂ†—b“°¢ÒÂ¶Ö&VG’Â7F—fTÆ–W'2æF•öæ–v‡EÒ“° ¢òò†VÇW"Fò6WBvVô¥4ôà¢6öç7B6WDvVòÒW6T6ÆÆ&6²‚‡6÷W&6S¢7G&–ærÂfVGW&W3¢vVô§6öäfVGW&UµÒ’Óâ°¢6öç7B7&2ÒÖ&Vbæ7W'&VçCòævWE6÷W&6R‡6÷W&6R’2vVô§6öå6÷W&6T†æFÆRÂVæFVf–æVC°¢–b‡7&2’7&2ç6WDFF‡²G—S¢tfVGW&T6öÆÆV7F–öârÂfVGW&W2Ò“°¢ÒÂµÒ“° ¢6öç7B6WEf—2ÒW6T6ÆÆ&6²‚†–G3¢7G&–æuµÒÂf—6–&ÆS¢&ööÆVâ’Óâ°¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢–b‚Ö’&WGW&ã°¢–G2æf÷$V6‚†–BÓâ²–b†ÖævWDÆ–W"†–B’’Öç6WDÆ–÷WE&÷W'G’†–BÂwf—6–&–Æ—G’rÂf—6–&ÆRòwf—6–&ÆRr¢væöæRr“²Ò“°¢ÒÂµÒ“° ¢6öç7BÇ”FF—fTFV6ÇWGFW"ÒW6T6ÆÆ&6²‚‚’Óâ°¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢–b‚Ö’&WGW&ã° ¢6öç7B—4vÆö&RÒ&ö¦V7F–öâÓÓÒvvÆö&Rs°¢6öç7B—4÷fW'f–WrÒ—4vÆö&RbbFF—fU¦ööÒÃÒtÄô$UôõdU%d”Uuõ¤ôôÓ°¢6öç7B—4FWF–ÂÒFF—fU¦ööÒãÒtÄô$UôDUD”Åõ¤ôôÓ° ¢6WEf—2…²ââäõdU%d”UuôÄ$TÅôÄ”U%5ÒÂ—4÷fW'f–Wr“°¢6WEf—2…²ââäõdU%d”UuôtÄõuôÄ”U%5ÒÂ—4÷fW'f–WrÇÂ—4FWF–Â“°¢6WEf—2…²ââäõdU%d”Uuõ4T4ôäD%•ôDõEôÄ”U%5ÒÂ—4÷fW'f–Wr“°¢6WEf—2…²ââäõdU%d”Uuõ4T4ôäD%•õ5”Ô$ôÅôÄ”U%5ÒÂ—4÷fW'f–Wr“° ¢–b†ÖævWDÆ–W"‚v6öæfÆ–7BÖ–6öç2r’’°¢Öç6WDÆ–÷WE&÷W'G’‚v6öæfÆ–7BÖ–6öç2rÂwf—6–&–Æ—G’rÂ7F—fTÆ–W'2æ6öæfÆ–7E÷¦öæW2ÓÒfÇ6Ròwf—6–&ÆRr¢væöæRr“°¢Öç6WE–çE&÷W'G’‚v6öæfÆ–7BÖ–6öç2rÂwFW‡BÖ÷6—G’rÂ—4÷fW'f–Wròãc"¢ã’“°¢Ð ¢–b†ÖævWDÆ–W"‚vvFVÇBÖ†÷G7÷BÖ6÷&Rr’’°¢Öç6WE–çE&÷W'G’‚vvFVÇBÖ†÷G7÷BÖ6÷&RrÂv6—&6ÆRÖ÷6—G’rÂ—4÷fW'f–Wròãs‚¢ã“b“°¢Öç6WE–çE&÷W'G’‚vvFVÇBÖ†÷G7÷BÖ6÷&RrÂv6—&6ÆR×7G&ö¶RÖ÷6—G’rÂ—4÷fW'f–WròãS"¢ãs‚“°¢Ð ¢–b†ÖævWDÆ–W"‚vvFVÇBÖ†÷G7÷BÖ†Æòr’’°¢Öç6WE–çE&÷W'G’‚vvFVÇBÖ†÷G7÷BÖ†ÆòrÂv6—&6ÆRÖ÷6—G’rÂ—4÷fW'f–Wròãb¢²v–çFW'öÆFRrÅ²vÆ–æV"uÒÅ²w¦ööÒuÒÂÃãÂRÃãbÂÃã#%Ò“°¢Ð ¢–b†ÖævWDÆ–W"‚vvFVÇBÖF÷G2r’’°¢Öç6WE–çE&÷W'G’‚vvFVÇBÖF÷G2rÂv6—&6ÆRÖ÷6—G’rÂ—4÷fW'f–WròãB¢ãs"“°¢Öç6WE–çE&÷W'G’‚vvFVÇBÖF÷G2rÂv6—&6ÆR×7G&ö¶RÖ÷6—G’rÂ—4÷fW'f–Wròã#"¢ã3‚“°¢Ð ¢–b†ÖævWDÆ–W"‚vF’Öæ–v‡BÖf–ÆÂr’’°¢Öç6WE–çE&÷W'G’‚vF’Öæ–v‡BÖf–ÆÂrÂvf–ÆÂÖ÷6—G’rÂ—4÷fW'f–Wròã‚¢&ö¦V7F–öâÓÓÒvvÆö&RròãR¢ãb“°¢Ð¢ÒÂ¶7F—fTÆ–W'2æ6öæfÆ–7E÷¦öæW2ÂFF—fU¦ööÒÂ&ö¦V7F–öâÂ6WEf—5Ò“° ¢òòfÆ–v‡BFF(i"vVô¥4ôâ„uR&VæFW&VB¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã° ¢6öç7BfÆ–DfÆ–v‡G2Ò†'#¢ÖVçF—G•µÒÒµÒ’Óâ'"æf–ÇFW"‚†b’ÓâG—VöbbæÆBÓÓÒvçVÖ&W"rbbG—VöbbæÆærÓÓÒvçVÖ&W"r“°¢6öç7BFôfVGW&W2Ò†'#¢ÖVçF—G•µÒÒµÒ’ÓâfÆ–DfÆ–v‡G2†'"’æÖ‚†b’Óâ‡°¢G—S¢tfVGW&Rr26öç7BÀ¢vVöÖWG'“¢²G—S¢uö–çBr26öç7BÂ6ö÷&F–æFW3¢¶bæÆær2çVÖ&W"ÂbæÆB2çVÖ&W%ÒÒÀ¢&÷W'F–W3¢²6ÆÇ6–vã¢bæ6ÆÇ6–vâÂ†VF–æs¢bæ†VF–ærÇÂÂÇC¢bæÇBÂÖöFVÃ¢bæÖöFVÂÂ7VVEö¶æ÷G3¢bç7VVEö¶æ÷G2Â&Vv—7G&F–öã¢bç&Vv—7G&F–öâÂ–6ó#C¢bæ–6ó#BÂ7Vv³¢bç7Vv²Â6÷W&6S¢bç6÷W&6RÇÂvG6"æÆöÂrÂg&W6†æW73¢bæg&W6†æW72ÇÂwVæ¶æ÷vârÂ÷6—F–öåövU÷6V6öæG3¢bç÷6—F–öåövU÷6V6öæG2ÂÆW'EöÆWfVÃ¢†bæÆW'B2²ÆWfVÃó¢7G&–ærÒÂçVÆÂ“òæÆWfVÂÇÂvæöæRrÂÆW'E÷F—FÆS¢†bæÆW'B2²F—FÆSó¢7G&–ærÒÂçVÆÂ“òçF—FÆRÇÂrrÂÆW'EöWf–FVæ6S¢†bæÆW'B2²Wf–FVæ6Só¢7G&–ærÒÂçVÆÂ“òæWf–FVæ6RÇÂrrÒÀ¢Ò’“°¢6öç7BFõG&–ÄfVGW&W2Ò†'#¢ÖVçF—G•µÒÒµÒ’ÓâfÆ–DfÆ–v‡G2†'"’æÖ‚†b’Óâ°¢6öç7B6ö÷&F–æFW2ÒvWDfÆ–v‡EG&–Ä6ö÷&F–æFW2†b“°¢–b‚6ö÷&F–æFW2’&WGW&âçVÆÃ°¢&WGW&â°¢G—S¢tfVGW&Rr26öç7BÀ¢vVöÖWG'“¢²G—S¢tÆ–æU7G&–ærr26öç7BÂ6ö÷&F–æFW2ÒÀ¢&÷W'F–W3¢²6ÆÇ6–vã¢bæ6ÆÇ6–vâÂ†VF–æs¢bæ†VF–ærÇÂÂ7VVEö¶æ÷G3¢bç7VVEö¶æ÷G2ÂÇC¢bæÇBÒÀ¢Ó°¢Ò’æf–ÇFW"‚†fVGW&R“¢fVGW&R—2vVô§6öäfVGW&RÓâfVGW&RÓÒçVÆÂ“° ¢6WDvVò‚vfÆ–v‡G2rÂ7F—fTÆ–W'2æfÆ–v‡G2òFôfVGW&W2†FFæ6öÖÖW&6–ÅöfÆ–v‡G2’¢µÒ“°¢6WDvVò‚vfÆ–v‡B×G&–Ç2rÂ7F—fTÆ–W'2æfÆ–v‡G2òFõG&–ÄfVGW&W2†FFæ6öÖÖW&6–ÅöfÆ–v‡G2’¢µÒ“°¢6WDvVò‚w&—fFRÖfÂrÂ7F—fTÆ–W'2ç&—fFRòFôfVGW&W2†FFç&—fFUöfÆ–v‡G2’¢µÒ“°¢6WDvVò‚w&—fFR×G&–Ç2rÂ7F—fTÆ–W'2ç&—fFRòFõG&–ÄfVGW&W2†FFç&—fFUöfÆ–v‡G2’¢µÒ“°¢6WDvVò‚v¦WG2rÂ7F—fTÆ–W'2æ¦WG2òFôfVGW&W2†FFç&—fFUö¦WG2’¢µÒ“°¢6WDvVò‚v¦WB×G&–Ç2rÂ7F—fTÆ–W'2æ¦WG2òFõG&–ÄfVGW&W2†FFç&—fFUö¦WG2’¢µÒ“°¢6WDvVò‚vÖ–Æ—F'’rÂ7F—fTÆ–W'2æÖ–Æ—F'’òFôfVGW&W2†FFæÖ–Æ—F'•öfÆ–v‡G2’¢µÒ“°¢6WDvVò‚vÖ–Æ—F'’×G&–Ç2rÂ7F—fTÆ–W'2æÖ–Æ—F'’òFõG&–ÄfVGW&W2†FFæÖ–Æ—F'•öfÆ–v‡G2’¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFæ6öÖÖW&6–ÅöfÆ–v‡G2ÂFFç&—fFUöfÆ–v‡G2ÂFFç&—fFUö¦WG2ÂFFæÖ–Æ—F'•öfÆ–v‡G2Â7F—fTÆ–W'2æfÆ–v‡G2Â7F—fTÆ–W'2ç&—fFRÂ7F—fTÆ–W'2æ¦WG2Â7F—fTÆ–W'2æÖ–Æ—F'’Â6WDvVõÒ“° ¢òò)H)HDT4õUÄTBÄ”U"$TäDU$U%2…W&f÷&Öæ6R÷F–Ö—¦VB’)H)H  ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6WDvVò‚vV'F‡V¶W2rÂ7F—fTÆ–W'2æV'F‡V¶W2bbFFæV'F‡V¶W2òFFæV'F‡V¶W0¢æf–ÇFW"‚†W¢ÖVçF—G’’ÓâG—VöbWæÆærÓÓÒvçVÖ&W"rbbG—VöbWæÆBÓÓÒvçVÖ&W"r¢æÖ‚†W¢ÖVçF—G’’Óâ‡°¢G—S¢tfVGW&RrÀ¢vVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢¶WæÆærÂWæÆEÒÒÀ¢&÷W'F–W3¢°¢–C¢Wæ–BÀ¢Övæ—GVFS¢WæÖvæ—GVFRÀ¢Æ6S¢WçÆ6RÀ¢FWFƒ¢WæFWF‚À¢F–ÖS¢WçF–ÖRÀ¢G7VæÖ“¢WçG7VæÖ’À¢6÷W&6S¢Wç6÷W&6RÇÂuU4u2rÀ¢ÒÀ¢Ò’’¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFæV'F‡V¶W2Â7F—fTÆ–W'2æV'F‡V¶W2Â6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂ7F—fTÆ–W'2æV'F‡V¶W2ÇÂ'&’æ—4'&’†FFæV'F‡V¶W2’’&WGW&ã° ¢6öç7BfÆ–DWfVçG2ÒFFæV'F‡V¶W2æf–ÇFW"‚†WfVçC¢ÖVçF—G’’Óâ€¢G—VöbWfVçBæ–BÓÓÒw7G&–ærp¢bbG—VöbWfVçBæÆBÓÓÒvçVÖ&W"p¢bbG—VöbWfVçBæÆærÓÓÒvçVÖ&W"p¢bbG—VöbWfVçBæÖvæ—GVFRÓÓÒvçVÖ&W"p¢’“° ¢–b‡6VVäV'F‡V¶T–G5&Vbæ7W'&VçBÓÓÒçVÆÂ’°¢6VVäV'F‡V¶T–G5&Vbæ7W'&VçBÒæWr6WB‡fÆ–DWfVçG2æÖ‚†WfVçB’Óâ7G&–ær†WfVçBæ–B’’“°¢6öç7Bg&W6†W7BÒ²ââçfÆ–DWfVçG5Ð¢æf–ÇFW"‚†WfVçB’Óâ—5&V6VçDV'F‡V¶R„çVÖ&W"†WfVçBçF–ÖR’’¢ç6÷'B‚†Â"’ÓâçVÖ&W"†"çF–ÖR’ÒçVÖ&W"†çF–ÖR’•³Ó°¢–b†g&W6†W7B’fÆ–DWfVçG2ç7Æ–6RƒÂfÆ–DWfVçG2æÆVæwF‚Âg&W6†W7B“°¢VÇ6RfÆ–DWfVçG2æÆVæwF‚Ò°¢ÒVÇ6R°¢6öç7BVç6VVâÒf–æDæWtV'F‡V¶W2‡fÆ–DWfVçG2Â6VVäV'F‡V¶T–G5&Vbæ7W'&VçB“°¢fÆ–DWfVçG2ç7Æ–6RƒÂfÆ–DWfVçG2æÆVæwF‚ÂââçVç6VVâ“°¢Vç6VVâæf÷$V6‚‚†WfVçB’Óâ6VVäV'F‡V¶T–G5&Vbæ7W'&VçCòæFB…7G&–ær†WfVçBæ–B’’“°¢Ð ¢–b‡fÆ–DWfVçG2æÆVæwF‚ÓÓÒ’&WGW&ã° ¢6öç7B7F'FVDBÒW&f÷&Öæ6Rææ÷r‚“°¢V'F‡V¶UVÇ6W5&Vbæ7W'&VçBçW6‚‚ââçfÆ–DWfVçG2ç6Æ–6RƒÂ‚’æÖ‚†WfVçB’Óâ‡°¢–C¢7G&–ær†WfVçBæ–B’À¢ÆC¢çVÖ&W"†WfVçBæÆB’À¢Ææs¢çVÖ&W"†WfVçBæÆær’À¢Övæ—GVFS¢çVÖ&W"†WfVçBæÖvæ—GVFR’À¢FWFƒ¢çVÖ&W"†WfVçBæFWF‚’ÇÂÀ¢G7VæÖ“¢WfVçBçG7VæÖ’ÓÓÒG'VRÇÂWfVçBçG7VæÖ’ÓÓÒÀ¢7F'FVDBÀ¢Ò’’“° ¢–b†V'F‡V¶UVÇ6Tg&ÖU&Vbæ7W'&VçBÓÒçVÆÂ’&WGW&ã° ¢ÆWBÆ7EVÇ6U&VæFW$BÒ°¢6öç7Bæ–ÖFUVÇ6W2Ò†æ÷s¢çVÖ&W"’Óâ°¢6öç7BGW&F–öä×2ÒC#°¢–b†Fö7VÖVçBæ†–FFVâ’°¢V'F‡V¶UVÇ6W5&Vbæ7W'&VçBÒµÓ°¢V'F‡V¶UVÇ6Tg&ÖU&Vbæ7W'&VçBÒçVÆÃ°¢6WDvVò‚vV'F‡V¶R×VÇ6W2rÂµÒ“°¢&WGW&ã°¢Ð¢–b†æ÷rÒÆ7EVÇ6U&VæFW$BÂ32’°¢V'F‡V¶UVÇ6Tg&ÖU&Vbæ7W'&VçBÒv–æF÷rç&WVW7Dæ–ÖF–öäg&ÖR†æ–ÖFUVÇ6W2“°¢&WGW&ã°¢Ð¢Æ7EVÇ6U&VæFW$BÒæ÷s°¢V'F‡V¶UVÇ6W5&Vbæ7W'&VçBÒV'F‡V¶UVÇ6W5&Vbæ7W'&VçBæf–ÇFW"‚‡VÇ6R’Óâæ÷rÒVÇ6Rç7F'FVDBÂGW&F–öä×2“° ¢6öç7BfVGW&W3¢vVô§6öäfVGW&UµÒÒV'F‡V¶UVÇ6W5&Vbæ7W'&VçBæÖ‚‡VÇ6R’Óâ‡°¢G—S¢tfVGW&RrÀ¢vVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢·VÇ6RæÆærÂVÇ6RæÆEÒÒÀ¢&÷W'F–W3¢°¢–C¢VÇ6Ræ–BÀ¢Övæ—GVFS¢VÇ6RæÖvæ—GVFRÀ¢&öw&W73¢ÖF‚æÖ–âƒÂ†æ÷rÒVÇ6Rç7F'FVDB’òGW&F–öä×2’À¢6WfW&—G“¢vWDV'F‡V¶U6WfW&—G’‡²Övæ—GVFS¢VÇ6RæÖvæ—GVFRÂFWFƒ¢VÇ6RæFWF‚ÂG7VæÖ“¢VÇ6RçG7VæÖ’Ò’À¢ÒÀ¢Ò’“°¢6WDvVò‚vV'F‡V¶R×VÇ6W2rÂfVGW&W2“° ¢–b†V'F‡V¶UVÇ6W5&Vbæ7W'&VçBæÆVæwF‚â’°¢V'F‡V¶UVÇ6Tg&ÖU&Vbæ7W'&VçBÒv–æF÷rç&WVW7Dæ–ÖF–öäg&ÖR†æ–ÖFUVÇ6W2“°¢ÒVÇ6R°¢V'F‡V¶UVÇ6Tg&ÖU&Vbæ7W'&VçBÒçVÆÃ°¢6WDvVò‚vV'F‡V¶R×VÇ6W2rÂµÒ“°¢Ð¢Ó° ¢V'F‡V¶UVÇ6Tg&ÖU&Vbæ7W'&VçBÒv–æF÷rç&WVW7Dæ–ÖF–öäg&ÖR†æ–ÖFUVÇ6W2“°¢ÒÂ¶Ö&VG’ÂFFæV'F‡V¶W2Â7F—fTÆ–W'2æV'F‡V¶W2Â6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ‚’Óâ°¢–b†V'F‡V¶UVÇ6Tg&ÖU&Vbæ7W'&VçBÓÒçVÆÂ’°¢v–æF÷ræ6æ6VÄæ–ÖF–öäg&ÖR†V'F‡V¶UVÇ6Tg&ÖU&Vbæ7W'&VçB“°¢V'F‡V¶UVÇ6Tg&ÖU&Vbæ7W'&VçBÒçVÆÃ°¢Ð¢ÒÂµÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6WDvVò‚w6FVÆÆ—FW2rÂ7F—fTÆ–W'2ç6FVÆÆ—FW2bbFFç6FVÆÆ—FW2òFFç6FVÆÆ—FW2æÖ‚‡3¢ÖVçF—G’’Óâ‡²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢·2æÆærÂ2æÆEÒÒÂ&÷W'F–W3¢²æÖS¢2ææÖRÂ6öÆ÷#¢2æ6öÆ÷"ÂÖ—76–öã¢2æÖ—76–öâÂÇC¢2æÇBÂæ÷&D–C¢2ææ÷&D–BÒÒ’’¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFç6FVÆÆ—FW2Â7F—fTÆ–W'2ç6FVÆÆ—FW2Â6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6öç7B–æ6–FVçG2Ò7F—fTÆ–W'2ævÆö&Åö–æ6–FVçG2bbFFævFVÇBòFFævFVÇBæf–ÇFW"‚†S¢ÖVçF—G’’ÓâG—VöbRæÆærÓÓÒvçVÖ&W"rbbG—VöbRæÆBÓÓÒvçVÖ&W"r’¢µÓ°¢6WDvVò‚vvFVÇBrÂ–æ6–FVçG2æÖ‚†S¢ÖVçF—G’’Óâ‡°¢G—S¢tfVGW&RrÀ¢vVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢¶RæÆærÂRæÆEÒÒÀ¢&÷W'F–W3¢°¢æÖS¢RææÖRÀ¢F—FÆS¢RçF—FÆRÀ¢W&Ã¢RçW&ÂÀ¢6÷W&6S¢Rç6÷W&6RÀ¢6WfW&—G“¢Rç6WfW&—G’À¢F†VÖS¢RçF†VÖRÀ¢ÖVçF–öç3¢RæÖVçF–öç2À¢FFS¢RæFFRÀ¢gW6–öå66÷&S¢vWDgW6–öå66÷&R†R’À¢ÒÀ¢Ò’’“° ¢6öç7B†÷G7÷DÖÒæWrÖÇ7G&–ærÂÖVçF—G’b²gW6–öå66÷&S¢çVÖ&W"Óâ‚“°¢–æ6–FVçG2æf÷$V6‚‚†–æ6–FVçC¢ÖVçF—G’’Óâ°¢6öç7BgW6–öå66÷&RÒvWDgW6–öå66÷&R†–æ6–FVçB“°¢6öç7BÆ&VÂÒvWD†÷G7÷DÆ&VÂ†–æ6–FVçB“°¢6öç7BW†—7F–ærÒ†÷G7÷DÖævWB†Æ&VÂ“°¢–b‚W†—7F–ærÇÂgW6–öå66÷&RâW†—7F–ærægW6–öå66÷&R’°¢†÷G7÷DÖç6WB†Æ&VÂÂ²ââæ–æ6–FVçBÂgW6–öå66÷&RÒ“°¢Ð¢Ò“° ¢6öç7B†÷G7÷DfVGW&W2Ò'&’æg&öÒ††÷G7÷DÖçfÇVW2‚’¢ç6÷'B‚†Â"’Óâ"ægW6–öå66÷&RÒægW6–öå66÷&R¢ç6Æ–6RƒÂR¢æÖ‚†–æ6–FVçBÂ–æFW‚’Óâ‡°¢G—S¢tfVGW&Rr26öç7BÀ¢vVöÖWG'“¢²G—S¢uö–çBr26öç7BÂ6ö÷&F–æFW3¢¶–æ6–FVçBæÆærÂ–æ6–FVçBæÆEÒÒÀ¢&÷W'F–W3¢°¢æÖS¢–æ6–FVçBææÖRÀ¢F—FÆS¢–æ6–FVçBçF—FÆRÀ¢W&Ã¢–æ6–FVçBçW&ÂÀ¢6÷W&6S¢–æ6–FVçBç6÷W&6RÀ¢6WfW&—G“¢–æ6–FVçBç6WfW&—G’À¢F†VÖS¢–æ6–FVçBçF†VÖRÀ¢ÖVçF–öç3¢–æ6–FVçBæÖVçF–öç2À¢FFS¢–æ6–FVçBæFFRÀ¢gW6–öå66÷&S¢–æ6–FVçBægW6–öå66÷&RÀ¢†÷G7÷DÆ&VÃ¢vWD†÷G7÷DÆ&VÂ†–æ6–FVçB’À¢&–÷&—G•&æ³¢–æFW‚²À¢ÒÀ¢Ò’“°¢6WDvVò‚vvFVÇBÖ†÷G7÷G2rÂ†÷G7÷DfVGW&W2“°¢ÒÂ¶Ö&VG’ÂFFævFVÇBÂ7F—fTÆ–W'2ævÆö&Åö–æ6–FVçG2Â6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6WDvVò‚vw2Ö¦ÖÖ–ærrÂ7F—fTÆ–W'2æw5ö¦ÖÖ–ærbbFFæw5ö¦ÖÖ–æròFFæw5ö¦ÖÖ–æræÖ‚‡£¢ÖVçF—G’’Óâ‡²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢·¢æÆærÂ¢æÆEÒÒÂ&÷W'F–W3¢²6WfW&—G“¢¢ç6WfW&—G’ÒÒ’’¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFæw5ö¦ÖÖ–ærÂ7F—fTÆ–W'2æw5ö¦ÖÖ–ærÂ6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6öç7B6ÖW&2Ò—4÷fW'f–WtÖöFP¢òF¶UF÷VçF—F–W2†FFæ6ÖW&2ÂõdU%d”UuôTåD•E•ôÄ”Ô•E2æ67GbÂ†3¢ÖVçF—G’’Óâ66÷&T67GdFVÆ—fW'’†2’²çVÖ&W"†2ç&–÷&—G’óò2ç&æ²óò’¢¢†FFæ6ÖW&2ÇÂµÒ“°¢6WDvVò‚v67GbrÂ7F—fTÆ–W'2æ67Gbbb6ÖW&2ò6ÖW&2æÖ‚†3¢ÖVçF—G’’Óâ‡²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢¶2æÆærÂ2æÆEÒÒÂ&÷W'F–W3¢²–C¢2æ–BÂæÖS¢2ææÖRÂ6—G“¢2æ6—G’Â6÷VçG'“¢2æ6÷VçG'’Â6÷W&6S¢2ç6÷W&6RÂfVVE÷W&Ã¢2æfVVE÷W&ÂÂ7G&VÕ÷W&Ã¢2ç7G&VÕ÷W&ÂÂ7G&VÕ÷G—S¢2ç7G&VÕ÷G—RÂW‡FW&æÅ÷W&Ã¢2æW‡FW&æÅ÷W&ÂÂ&Vg&W6…ö–çFW'fÅ÷6V6öæG3¢2ç&Vg&W6…ö–çFW'fÅ÷6V6öæG2Â6GW&VEöC¢2æ6GW&VEöBÂÆ—fUöÖöFS¢2æÆ—fUöÖöFRÒÒ’’¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFæ6ÖW&2Â7F—fTÆ–W'2æ67GbÂ—4÷fW'f–WtÖöFRÂ6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6WDvVò‚vf—&W2rÂ7F—fTÆ–W'2æf—&W2bbFFæf—&W2òFFæf—&W2æÖ‚†c¢ÖVçF—G’’Óâ‡²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢¶bæÆærÂbæÆEÒÒÂ&÷W'F–W3¢²'&–v‡FæW73¢bæ'&–v‡FæW72ÒÒ’’¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFæf—&W2Â7F—fTÆ–W'2æf—&W2Â6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6öç7BvVF†W$WfVçG2Ò—4÷fW'f–WtÖöFP¢òF¶UF÷VçF—F–W2†FFçvVF†W%öWfVçG2ÂõdU%d”UuôTåD•E•ôÄ”Ô•E2çvVF†W"Â‡s¢ÖVçF—G’’ÓâvWE6WfW&—G•vV–v‡B‡rç6WfW&—G’’¢¢†FFçvVF†W%öWfVçG2ÇÂµÒ“°¢6WDvVò‚wvVF†W"rÂ7F—fTÆ–W'2çvVF†W"bbvVF†W$WfVçG2òvVF†W$WfVçG2æÖ‚‡s¢ÖVçF—G’’Óâ‡²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢·ræÆærÂræÆEÒÒÂ&÷W'F–W3¢²F—FÆS¢rçF—FÆRÂG—S¢rçG—RÂ–6öã¢ræ–6öâÂ6WfW&—G“¢rç6WfW&—G’Â6÷W&6S¢rç6÷W&6RÂ–C¢ræ–BÒÒ’’¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFçvVF†W%öWfVçG2Â7F—fTÆ–W'2çvVF†W"Â—4÷fW'f–WtÖöFRÂ6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6öç7B–æg&7G'V7GW&T—FV×2Ò—4÷fW'f–WtÖöFP¢òF¶UF÷VçF—F–W2†FFæ–æg&7G'V7GW&RÂõdU%d”UuôTåD•E•ôÄ”Ô•E2æ–æg&7G'V7GW&RÂ†“¢ÖVçF—G’’ÓâçVÖ&W"†’æ66—G”Õróò’²„çVÖ&W"†’ç&V7F÷'2óò’¢#’¢¢†FFæ–æg&7G'V7GW&RÇÂµÒ“°¢6WDvVò‚v–æg&7G'V7GW&RrÂ7F—fTÆ–W'2æ–æg&7G'V7GW&Rbb–æg&7G'V7GW&T—FV×2ò–æg&7G'V7GW&T—FV×2æÖ‚†“¢ÖVçF—G’’Óâ‡²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢¶’æÆærÂ’æÆEÒÒÂ&÷W'F–W3¢²æÖS¢’ææÖRÂ6—G“¢’æ6—G’Â6÷VçG'“¢’æ6÷VçG'’Â7FGW3¢’ç7FGW2Â&V7F÷'3¢’ç&V7F÷'2Â66—G”Õs¢’æ66—G”ÕrÂ÷væW#¢’æ÷væW"ÒÒ’’¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFæ–æg&7G'V7GW&RÂ7F—fTÆ–W'2æ–æg&7G'V7GW&RÂ—4÷fW'f–WtÖöFRÂ6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6öç7B÷'G2Ò—4÷fW'f–WtÖöFP¢òF¶UF÷VçF—F–W2†FFæÖ&—F–ÖU÷÷'G2ÂõdU%d”UuôTåD•E•ôÄ”Ô•E2æÖ&—F–ÖU÷'G2Â‡¢ÖVçF—G’’ÓâçVÖ&W"‡ç&æ²óòçföÇVÖRóò’¢¢†FFæÖ&—F–ÖU÷÷'G2ÇÂµÒ“°¢6öç7B6†ö¶Wö–çG2Ò—4÷fW'f–WtÖöFP¢òF¶UF÷VçF—F–W2†FFæÖ&—F–ÖUö6†ö¶Wö–çG2ÂõdU%d”UuôTåD•E•ôÄ”Ô•E2æÖ&—F–ÖT6†ö¶Wö–çG2Â†3¢ÖVçF—G’’ÓâvWE6WfW&—G•vV–v‡B†2ç&—6²’¢¢†FFæÖ&—F–ÖUö6†ö¶Wö–çG2ÇÂµÒ“°¢6öç7B6†—2Ò—4÷fW'f–WtÖöFP¢òF¶UF÷VçF—F–W2†FFæÖ&—F–ÖU÷6†—2ÂõdU%d”UuôTåD•E•ôÄ”Ô•E2æÖ&—F–ÖU6†—2Â‡3¢ÖVçF—G’’Óâ°¢6öç7BG—UvV–v‡BÒ7G&–ær‡2çG—RÇÂrr’çFôÆ÷vW$66R‚’ÓÓÒvÖ–Æ—F'’rò3¢7G&–ær‡2çG—RÇÂrr’çFôÆ÷vW$66R‚’ÓÓÒwFæ¶W"ròƒ¢“°¢&WGW&âG—UvV–v‡B²çVÖ&W"‡2ç7VVBóò“°¢Ò¢¢†FFæÖ&—F–ÖU÷6†—2ÇÂµÒ“°¢6WDvVò‚vÖ&—F–ÖRrÂ7F—fTÆ–W'2æÖ&—F–ÖRbb÷'G2ò÷'G2æÖ‚‡¢ÖVçF—G’’Óâ‡²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢·æÆærÂæÆEÒÒÂ&÷W'F–W3¢²æÖS¢ææÖRÂ6÷VçG'“¢æ6÷VçG'’ÂG—S¢çG—RÂföÇVÖS¢çföÇVÖRÂfÆVWC¢æfÆVWBÂ&æ³¢ç&æ²ÒÒ’’¢µÒ“°¢6WDvVò‚vÖ&—F–ÖRÖ6†ö¶RrÂ7F—fTÆ–W'2æÖ&—F–ÖRbb6†ö¶Wö–çG2ò6†ö¶Wö–çG2æÖ‚†3¢ÖVçF—G’’Óâ‡²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢¶2æÆærÂ2æÆEÒÒÂ&÷W'F–W3¢²æÖS¢2ææÖRÂG&ff–3¢2çG&ff–2Â&—6³¢2ç&—6²ÒÒ’’¢µÒ“°¢6WDvVò‚vÖ&—F–ÖR×6†—2rÂ7F—fTÆ–W'2æÖ&—F–ÖRbb6†—2ò6†—2æÖ‚‡3¢ÖVçF—G’’Óâ‡²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢·2æÆærÂ2æÆEÒÒÂ&÷W'F–W3¢²æÖS¢2ææÖRÇÂ2æÖ×6“òçFõ7G&–ær‚’ÂG—S¢2çG—RÇÂv6&vòrÂ7VVC¢2ç7VVBÂ†VF–æs¢2æ†VF–ærÂFW7F–æF–öã¢2æFW7F–æF–öâÂfÆs¢2æfÆrÒÒ’’¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFæÖ&—F–ÖU÷÷'G2ÂFFæÖ&—F–ÖUö6†ö¶Wö–çG2ÂFFæÖ&—F–ÖU÷6†—2Â7F—fTÆ–W'2æÖ&—F–ÖRÂ—4÷fW'f–WtÖöFRÂ6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6öç7B&ÆÆööç2Ò—4÷fW'f–WtÖöFP¢òF¶UF÷VçF—F–W2†FFæ&ÆÆööç2ÂõdU%d”UuôTåD•E•ôÄ”Ô•E2æ&ÆÆööç2Â†#¢ÖVçF—G’’ÓâçVÖ&W"†"æÇF—GVFRóò’²çVÖ&W"†"ç7VVBóò’¢¢†FFæ&ÆÆööç2ÇÂµÒ“°¢6WDvVò‚v&ÆÆööç2rÂ7F—fTÆ–W'2æ&ÆÆööç2bb&ÆÆööç2ò&ÆÆööç2æÖ‚†#¢ÖVçF—G’’Óâ‡²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢¶"æÆærÂ"æÆEÒÒÂ&÷W'F–W3¢²6ÆÇ6–vã¢"æ6ÆÇ6–vâÂG—S¢"çG—RÂ7FGW3¢"ç7FGW2ÂÇF—GVFS¢"æÇF—GVFRÂ7VVC¢"ç7VVBÂfW'F–6Å&FS¢"çfW'F–6Å&FRÂFV×W&GW&S¢"çFV×W&GW&RÂ6öÆ÷#¢"æ6öÆ÷"ÒÒ’’¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFæ&ÆÆööç2Â7F—fTÆ–W'2æ&ÆÆööç2Â—4÷fW'f–WtÖöFRÂ6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6öç7B&F–F–öå7FF–öç2Ò—4÷fW'f–WtÖöFP¢òF¶UF÷VçF—F–W2†FFç&F–F–öâÂõdU%d”UuôTåD•E•ôÄ”Ô•E2ç&F–F–öâÂ‡#¢ÖVçF—G’’ÓâçVÖ&W"‡"ç&VF–æróò’²vWE6WfW&—G•vV–v‡B‡"ç7FGW2’¢¢†FFç&F–F–öâÇÂµÒ“°¢6WDvVò‚w&F–F–öârÂ7F—fTÆ–W'2ç&F–F–öâbb&F–F–öå7FF–öç2ò&F–F–öå7FF–öç2æÖ‚‡#¢ÖVçF—G’’Óâ‡²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢·"æÆærÂ"æÆEÒÒÂ&÷W'F–W3¢²æÖS¢"ææÖRÂ6—G“¢"æ6—G’Â6÷VçG'“¢"æ6÷VçG'’Â&VF–æs¢"ç&VF–ærÂ7FGW3¢"ç7FGW2ÂæWGv÷&³¢"ææWGv÷&²ÒÒ’’¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFç&F–F–öâÂ7F—fTÆ–W'2ç&F–F–öâÂ—4÷fW'f–WtÖöFRÂ6WDvVõÒ“° ¢òò)Y)YTt•24D²(	BÆGF–6R6Vç6÷"ÖW6‚)Y)Y ¢òò×VÇF’×v—ö–çB&÷WFW2G&6–ær&VÂ×v÷&ÆB6†—–ærÆæW2Â—"6÷'&–F÷'2ÂæB–çFVÂÆ–æW0¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6WDvVò‚w6F²ÖVçF—F–W2rÂµÒ“° ¢–b‚7F—fTÆ–W'2ç6Fµ÷7G&VÒ’°¢6WDvVò‚w6F²ÖÆ–æ·2rÂµÒ“°¢&WGW&ã°¢Ð ¢òò7Æ–æR7W'fRvVæW&F÷"f÷"VÇG&×6Öö÷F‚F‡0¢6öç7B7Æ–æT7W'fRÒ‡ö–çG3¢¶çVÖ&W"ÆçVÖ&W%ÕµÒÂ6VvÖVçG2ÒR“¢¶çVÖ&W"ÆçVÖ&W%ÕµÒÓâ°¢–b‡ö–çG2æÆVæwF‚Â"’&WGW&âö–çG3°¢6öç7B&W3¢¶çVÖ&W"ÆçVÖ&W%ÕµÒÒµÓ°¢6öç7BÒ²ââçö–çG5Ó°¢çVç6†–gB‡³Ò“²òòGWÆ–6FRf—'7@¢çW6‚‡·æÆVæwF‚ÓÒ“²òòGWÆ–6FRÆ7@¢f÷"†ÆWB’Ò²’ÂæÆVæwF‚Ò#²’²²’°¢f÷"†ÆWBBÒ²BÃÒ²B³Ò÷6VvÖVçG2’°¢6öç7BC"ÒB§BÂC2ÒC"§C°¢6öç7B‚ÒãR¢‚ƒ"§¶•Õ³Ò’²‚×¶’ÓÕ³Ò²¶’³Õ³Ò’§B²ƒ"§¶’ÓÕ³ÒÒR§¶•Õ³Ò²B§¶’³Õ³ÒÒ¶’³%Õ³Ò’§C"²‚×¶’ÓÕ³Ò²2§¶•Õ³ÒÒ2§¶’³Õ³Ò²¶’³%Õ³Ò’§C2“°¢6öç7B’ÒãR¢‚ƒ"§¶•Õ³Ò’²‚×¶’ÓÕ³Ò²¶’³Õ³Ò’§B²ƒ"§¶’ÓÕ³ÒÒR§¶•Õ³Ò²B§¶’³Õ³ÒÒ¶’³%Õ³Ò’§C"²‚×¶’ÓÕ³Ò²2§¶•Õ³ÒÒ2§¶’³Õ³Ò²¶’³%Õ³Ò’§C2“°¢&W2çW6‚…·‚Ç•Ò“°¢Ð¢Ð¢&WGW&â&W3°¢Ó° ¢òò&÷WFR'V–ÆFW"(	BÆ–W27Æ–æR6Öö÷F†–æp¢6öç7B&÷WFRÒ‡v—ö–çG3¢6ö÷&F–æFW5µÒÂ&÷3¢VçF—G•&÷W'F–W2“¢vVô§6öäfVGW&RÓâ‡°¢G—S¢tfVGW&Rr26öç7BÀ¢vVöÖWG'“¢²G—S¢tÆ–æU7G&–ærr26öç7BÂ6ö÷&F–æFW3¢7Æ–æT7W'fR‡v—ö–çG2’ÒÀ¢&÷W'F–W3¢&÷2À¢Ò“° ¢6öç7BÆ–æ·3¢vVô§6öäfVGW&UµÒÒµÓ° ¢òò)H)HÔ$•D”ÔS¢&VÂ6†—–ærÆæRv—ö–çG2‡7G&–7FÇ’÷fW"vFW"’)H)H  ¢Æ–æ·2çW6‚‡&÷WFR…°¢³#ãCrÃ3ã#5ÒÂ³#"ãRÃ3ãUÒÂ³#ãÃ#bãÒÂ³’ãÃ#BãÒÂ³bãÃ#ãÒÂ³ãÃRãÒÂ³’ãÃãÒÂ³RãÃBãÒÂ³2ãƒBÃã#eÐ¢ÒÂ²g&öÔæÖS¢u6†æv†’rÂFôæÖS¢u6–æv÷&RrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³2ãƒBÃã#eÒÂ³2ãÃã…ÒÂ³ãÃBãÒÂ³“bãÃbãÒÂ³ƒ‚ãÃbãÒÂ³ƒãÃRãUÒÂ³sãÃ‚ãÒÂ³cãÃ"ãÒÂ³S"ãÃBãÒÂ³CRãÃ"ãÒÂ³C2ã32Ã"ãS…Ð¢ÒÂ²g&öÔæÖS¢u6–æv÷&RrÂFôæÖS¢t&"VÂÔÖæFV"rÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³C2ã32Ã"ãS…ÒÂ³CãÃrãÒÂ³3‚ãÃ#ãÒÂ³3RãÃ#RãÒÂ³3"ã3BÃ3ãC5Ð¢ÒÂ²g&öÔæÖS¢t&"VÂÔÖæFV"rÂFôæÖS¢u7VW¢6æÂrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³3"ã3BÃ3ãC5ÒÂ³3"ã2Ã3ã5ÒÂ³3ãRÃ3ã…ÒÂ³#bãÃ3BãÒÂ³‚ãÃ3RãÒÂ³RãÃ3bãÒÂ³ãÃ3rãUÒÂ³bãÃ3‚ãÒÂ³ãÃ3bãUÒÂ²ÓRã3RÃ3bãÐ¢ÒÂ²g&öÔæÖS¢u7VW¢6æÂrÂFôæÖS¢tv–'&ÇF"rÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢²ÓRã3RÃ3bãÒÂ²Ó’ãÃ3bãÒÂ²ÓãÃ3‚ãÒÂ²ÓãÃC2ãÒÂ²Ó‚ãÃCRãÒÂ²ÓRãRÃC‚ãUÒÂ²Ó"ãÃC’ãUÒÂ³ãRÃSãÒÂ³2ãRÃSãUÒÂ³BãSÃSã“Ð¢ÒÂ²g&öÔæÖS¢tv–'&ÇF"rÂFôæÖS¢u&÷GFW&FÒrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³#ãCrÃ3ã#5ÒÂ³#2ãÃ3ãUÒÂ³3ãÃ3ãÒÂ³CãÃ3BãÒÂ³SãÃCãÒÂ³cRãÃC2ãÒÂ³ƒãÃCBãÒÂ³#ãÃC2ãÒÂ³##ãÃ3‚ãÒÂ³#3RãÃ3BãÒÂ³#Cãs2Ã32ãsEÐ¢ÒÂ²g&öÔæÖS¢u6†æv†’rÂFôæÖS¢tÆ÷2ævVÆW2rÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³2ãƒBÃã#eÒÂ³RãÃBãÒÂ³’ãÃãÒÂ³ãÃRãÒÂ³bãÃ#ãÒÂ³’ãÃ#BãÒÂ³#ãÃ#bãÒÂ³#BãÃ3ãÒÂ³#rãÃ3"ãÒÂ³#’ãBÃ3RãÐ¢ÒÂ²g&öÔæÖS¢u6–æv÷&RrÂFôæÖS¢t'W6ârÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³BãSÃSã“ÒÂ³2ãRÃSãUÒÂ³ãRÃSãÒÂ²Ó"ãÃC’ãUÒÂ²ÓRãRÃC‚ãUÒÂ²Ó‚ãÃCRãÒÂ²ÓãÃC2ãÒÂ²ÓãÃ3‚ãÒÂ²Ó‚ãÃ#RãÒÂ²Ó#RãÃRãÒÂ²Ó#ãÃãÒÂ²ÓãÂÓ#ãÒÂ³RãÂÓ3"ãÒÂ³‚ãCrÂÓ3Bã3eÐ¢ÒÂ²g&öÔæÖS¢u&÷GFW&FÒrÂFôæÖS¢t6RöbvööB†÷RrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³‚ãCrÂÓ3Bã3eÒÂ³#"ãÂÓ3RãÒÂ³3ãÂÓ32ãÒÂ³CãÂÓ#ãÒÂ³CRãÂÓãÒÂ³S"ãÃRãÒÂ³SbãÃBãÒÂ³S’ãÃ#"ãÒÂ³Sbã#RÃ#bãSuÐ¢ÒÂ²g&öÔæÖS¢t6RöbvööB†÷RrÂFôæÖS¢u7G&—Böb†÷&×W¢rÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ós’ãc‚Ã’ã…ÒÂ²Ós’ãÃãÒÂ²ÓsRãÃRãÒÂ²Ós"ãÃ#ãÒÂ²ÓcRãÃ3ãÒÂ²ÓSãÃC"ãÒÂ²Ó3ãÃC‚ãÒÂ²ÓãÃC’ãÒÂ²ÓRãRÃC‚ãUÒÂ²Ó"ãÃC’ãUÒÂ³ãRÃSãÒÂ³BãSÃSã“Ð¢ÒÂ²g&öÔæÖS¢uæÖrÂFôæÖS¢u&÷GFW&FÒrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ó‚ã#rÃ32ãsEÒÂ²Ó‚ãÃ3"ãÒÂ²ÓRãÃ#bãÒÂ²ÓRãÃ‚ãÒÂ²Ó“RãÃ2ãÒÂ²ÓƒRãÃ‚ãÒÂ²ÓƒãÃrãUÒÂ²Ós’ãc‚Ã’ã…Ð¢ÒÂ²g&öÔæÖS¢tÆ÷2ævVÆW2rÂFôæÖS¢uæÖrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢²ÓCbã3ÂÓ#2ã“UÒÂ²ÓCBãÂÓ#RãÒÂ²Ó3ãÂÓ#‚ãÒÂ²ÓRãÂÓ3ãÒÂ³ãÂÓ3"ãÒÂ³ãÂÓ32ãÒÂ³‚ãCrÂÓ3Bã3eÐ¢ÒÂ²g&öÔæÖS¢u6çF÷2rÂFôæÖS¢t6RöbvööB†÷RrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³SRãbÃ#RãÒÂ³SBãRÃ#RãUÒÂ³S2ãÃ#Rã…ÒÂ³SãÃ#bãÒÂ³SãbÃ#bãcEÐ¢ÒÂ²g&öÔæÖS¢tGV&’rÂFôæÖS¢u&2FçW&rÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³s’ãƒBÃbã“EÒÂ³ƒãÃRãUÒÂ³ƒ‚ãÃbãÒÂ³“bãÃbãÒÂ³ãÃBãÒÂ³2ãÃã…ÒÂ³2ãƒBÃã#eÐ¢ÒÂ²g&öÔæÖS¢t6öÆöÖ&òrÂFôæÖS¢u6–æv÷&RrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÒ’“° ¢òò)H)H•"4õ%$”Dõ%3¢†–v‚ÇF—GVFR7Æ–æVB7W'fW2)H)H  ¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ós2ãs‚ÃCãcEÒÂ²ÓcRãÃCBãÒÂ²ÓSãÃSãÒÂ²Ó3RãÃS2ãÒÂ²Ó#ãÃS2ãUÒÂ²ÓãÃS"ãUÒÂ²ÓãCbÃSãCuÐ¢ÒÂ²g&öÔæÖS¢t¤d²æWr–÷&²rÂFôæÖS¢tÆöæFöâ†VF‡&÷rrÂFöÖ–ã¢t•"rÂ6÷W&6S¢tE2Ô"ò÷Vå6·’rÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢²ÓãCbÃSãCuÒÂ³‚ãÃC‚ãÒÂ³‚ãÃCBãÒÂ³#‚ãƒÃCã#uÒÂ³3RãÃ3rãÒÂ³C"ãÃ3"ãÒÂ³SãÃ#‚ãÒÂ³SRã3bÃ#Rã#UÐ¢ÒÂ²g&öÔæÖS¢tÆöæFöârÂFôæÖS¢tGV&’rÂFöÖ–ã¢t•"rÂ6÷W&6S¢tE2Ô"ò÷Vå6·’rÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³SRã3bÃ#Rã#UÒÂ³cRãÃ#ãÒÂ³sRãÃRãÒÂ³ƒRãÃãÒÂ³“RãÃRãÒÂ³2ã“’Ãã3eÒÂ³ãÃ‚ãÒÂ³‚ãÃbãÒÂ³#RãÃ#RãÒÂ³3"ãÃ3ãÒÂ³3’ãs’Ã3RãcÐ¢ÒÂ²g&öÔæÖS¢tGV&’rÂFôæÖS¢uFö·–òrÂFöÖ–ã¢t•"rÂ6÷W&6S¢tE2Ô"ò÷Vå6·’rÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³3’ãs’Ã3RãcÒÂ³C‚ãÃ3‚ãÒÂ³S‚ãÃCãÒÂ³sãÃC2ãÒÂ³ƒãÃCBãÒÂ³“RãÃC2ãÒÂ³#ãÃCãÒÂ³##RãÃ3‚ãÒÂ³#3RãÃ3bãÒÂ³#CãS’Ã32ã“EÐ¢ÒÂ²g&öÔæÖS¢uFö·–òrÂFôæÖS¢tÄ‚rÂFöÖ–ã¢t•"rÂ6÷W&6S¢tE2Ô"ò÷Vå6·’rÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ó‚ãCÃ32ã“EÒÂ²ÓãÃ3RãÒÂ²ÓãÃ3rãÒÂ²Ó“ãÃ3’ãÒÂ²ÓƒãÃCãÒÂ²Ós2ãs‚ÃCãcEÐ¢ÒÂ²g&öÔæÖS¢tÄ‚rÂFôæÖS¢t¤d²rÂFöÖ–ã¢t•"rÂ6÷W&6S¢tE2Ô"ò÷Vå6·’rÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³#‚ãƒÃCã#uÒÂ³CãÃC"ãÒÂ³S"ãÃC"ãUÒÂ³cRãÃC2ãÒÂ³s‚ãÃC2ãÒÂ³“ãÃC"ãUÒÂ³2ãÃCãUÒÂ³bãcÃCã…Ð¢ÒÂ²g&öÔæÖS¢t—7Fæ'VÂrÂFôæÖS¢t&V–¦–ærrÂFöÖ–ã¢t•"rÂ6÷W&6S¢tE2Ô"ò÷Vå6·’rÒ’“° ¢òò)H)HädÂô”åDTÃ¢fÆVWBFWÆ÷–ÖVçB6÷'&–F÷'2‡6Öö÷F‚7W'fW2’)H)H  ¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ósbã32Ã3bã“UÒÂ²Óc‚ãÃ3‚ãÒÂ²ÓSRãÃC"ãÒÂ²ÓCãÃCbãÒÂ²Ó#RãÃC’ãÒÂ²ÓãÃSãUÒÂ²ÓãÃSãƒÐ¢ÒÂ²g&öÔæÖS¢tæ÷&föÆ²ä2rÂFôæÖS¢u÷'G6Ö÷WF‚…&÷–Âæg’’rÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tæfÂ–çFVÆÆ–vVæ6RrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ósbã32Ã3bã“UÒÂ²ÓcRãÃ3rãÒÂ²ÓCRãÃ3bãUÒÂ²Ó#RãÃ3bãÒÂ²ÓãÃ3bãÒÂ²ÓRã3RÃ3bãÒÂ³"ãÃ3rãÒÂ³ãÃ3‚ãÒÂ³#ãÃ3rãÒÂ³#‚ãÃ3bãÒÂ³3Rãƒ’Ã3Bãƒ•Ð¢ÒÂ²g&öÔæÖS¢tæ÷&föÆ²ä2rÂFôæÖS¢uF'GW2…'W76–â&6R’rÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tæfÂ–çFVÆÆ–vVæ6RrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢²ÓrãRÃ3"ãc•ÒÂ²Ó3ãÃ#’ãÒÂ²ÓCRãÃ#RãÒÂ²ÓSrã“rÃ#ã3UÒÂ²ÓsãÃ#RãÒÂ²ÓƒãÃ#’ãÒÂ²Ó“"ãÃ3ãÒÂ²Ó#RãÃ32ãÒÂ²Ó#RãÃ3BãÒÂ²Ó##ã32Ã3Rã#…Ð¢ÒÂ²g&öÔæÖS¢u6âF–Vvòä"rÂFôæÖS¢u–ö¶÷7V¶ƒwF‚fÆVWB’rÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tæfÂ–çFVÆÆ–vVæ6RrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³3’ãcrÃ3Rã#…ÒÂ³3ãÃ3ãÒÂ³#ãÃ#"ãÒÂ³ãÃ"ãÒÂ³BãÃã35ÒÂ³“RãÃRãÒÂ³ƒRãÃãÒÂ³s‚ãÃRãÒÂ³s"ãƒBÃ‚ã“5Ð¢ÒÂ²g&öÔæÖS¢u–ö¶÷7V¶rÂFôæÖS¢t×VÖ&’„–æF–âæg’’rÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tæfÂ–çFVÆÆ–vVæ6RrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³32ãC"Ãc’ãuÒÂ³3RãÃcRãÒÂ³3ãÃS‚ãÒÂ³#‚ãÃS"ãÒÂ³3ãÃCbãÒÂ³32ãÃC"ãÒÂ³3ãÃ3‚ãÒÂ³3Rãƒ’Ã3Bãƒ•Ð¢ÒÂ²g&öÔæÖS¢u6WfW&öÖ÷'6²„æ÷'F†W&âfÆVWB’rÂFôæÖS¢uF'GW2rÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tæfÂ–çFVÆÆ–vVæ6RrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³ã3’Ã#ã#ÒÂ³"ãÃ#BãÒÂ³RãÃ#‚ãÒÂ³‚ãÃ3"ãÒÂ³#ãC2Ã3bã•Ð¢ÒÂ²g&öÔæÖS¢u¦†æ¦–ær…Ä6÷WF†W&âF†VFW"’rÂFôæÖS¢u–ævFò…Äæ÷'F†W&âF†VFW"’rÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tæfÂ–çFVÆÆ–vVæ6RrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³Rã“2ÃC2ã%ÒÂ³‚ãÃCãÒÂ³"ãÃ3’ãÒÂ³‚ãÃ3rãUÒÂ³#RãÃ3bãÒÂ³3ãÃ3RãÒÂ³3Rãƒ’Ã3Bãƒ•Ð¢ÒÂ²g&öÔæÖS¢uF÷VÆöâ„Ö&–æRæF–öæÆR’rÂFôæÖS¢uF'GW2rÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tæfÂ–çFVÆÆ–vVæ6RrÒ’“° ¢Æ–æ·2çW6‚‡&÷WFR…°¢³s"ãƒBÃ‚ã“5ÒÂ³c‚ãÃ#ãÒÂ³c2ãÃ#2ãUÒÂ³S‚ãÃ#RãÒÂ³Sbã#RÃ#bãSuÐ¢ÒÂ²g&öÔæÖS¢t×VÖ&’…vW7FW&âæfÂ6öÖÖæB’rÂFôæÖS¢u7G&—Böb†÷&×W¢rÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tæfÂ–çFVÆÆ–vVæ6RrÂW&Ã¢v‡GG3¢ò÷wwræ–æF–ææg’ææ–2æ–âö6öçFVçB÷vW7FW&âÖæfÂÖ6öÖÖæBrÒ’“° ¢òò)H)HDD•D”ôäÂ„”t‚Ôd”DTÄ•E’$õUDU2)H)H  ¢òòÖ&—F–ÖS¢U2vW7B6ö7B(i"†v–’(i"wVÒ(i"F—và¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ó#"ãC"Ã3rãsuÒÂ²Ó3ãÃ3BãÒÂ²ÓCãÃ#’ãÒÂ²ÓSãÃ#BãÒÂ²ÓSrãƒbÃ#ã3Ð¢ÒÂ²g&öÔæÖS¢u6âg&æ6—66òrÂFôæÖS¢t†öæöÇVÇRrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÂW&Ã¢v‡GG3¢ò÷wwræÖ&–æWG&ff–2æ6öÒöVâö—2ö†öÖRö6VçFW'ƒ¢ÓCö6VçFW'“£#’÷¦ööÓ£BrÒ’“°¢ ¢Æ–æ·2çW6‚‡&÷WFR…°¢²ÓSrãƒbÃ#ã3ÒÂ²ÓsãÃ‚ãÒÂ²ÓƒãÃbãUÒÂ²Ó#ãÃBãÒÂ²Ó#Rã#RÃ2ãCEÐ¢ÒÂ²g&öÔæÖS¢t†öæöÇVÇRrÂFôæÖS¢twVÒrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÂW&Ã¢v‡GG3¢ò÷wwræÖ&–æWG&ff–2æ6öÒöVâö—2ö†öÖRö6VçFW'ƒ¢Ósö6VçFW'“£‚÷¦ööÓ£BrÒ’“°¢ ¢Æ–æ·2çW6‚‡&÷WFR…°¢³CBãsRÃ2ãCEÒÂ³3RãÃ‚ãÒÂ³#RãÃ#2ãÒÂ³#ãRÃ#RãEÐ¢ÒÂ²g&öÔæÖS¢twVÒrÂFôæÖS¢uF—V’rÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÂW&Ã¢v‡GG3¢ò÷wwræÖ&–æWG&ff–2æ6öÒöVâö—2ö†öÖRö6VçFW'ƒ£3Rö6VçFW'“£‚÷¦ööÓ£RrÒ’“° ¢òòÖ&—F–ÖS¢U2V7B6ö7B(i"wVÆböbÖW†–6ð¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ósbã2Ã3bã…ÒÂ²ÓsRãÃ3BãÒÂ²Ós’ãÃ3ãÒÂ²ÓƒãÃ#bãÒÂ²Óƒ"ãÃ#BãÒÂ²ÓƒbãÃ#RãÒÂ²Ó“ãÃ#rãÒÂ²Ó“Bã‚Ã#’ã5Ð¢ÒÂ²g&öÔæÖS¢tæ÷&föÆ²rÂFôæÖS¢tvÇfW7FöârÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÂW&Ã¢v‡GG3¢ò÷wwræÖ&–æWG&ff–2æ6öÒöVâö—2ö†öÖRö6VçFW'ƒ¢ÓƒRö6VçFW'“£#b÷¦ööÓ£RrÒ’“° ¢òòÖ&—F–ÖS¢WW&÷R(i"vW7Bg&–6¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ó’ãBÃ3‚ãs%ÒÂ²Ó"ãÃ3BãÒÂ²ÓRãÃ#‚ãÒÂ²ÓrãÃ#"ãÒÂ²ÓrãS2ÃBãsÐ¢ÒÂ²g&öÔæÖS¢tÆ—6&öârÂFôæÖS¢tF¶"rÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÂW&Ã¢v‡GG3¢ò÷wwræÖ&–æWG&ff–2æ6öÒöVâö—2ö†öÖRö6VçFW'ƒ¢ÓRö6VçFW'“£#R÷¦ööÓ£BrÒ’“°¢ ¢Æ–æ·2çW6‚‡&÷WFR…°¢²ÓrãS2ÃBãsÒÂ²ÓRãÃ’ãÒÂ²ÓãÃRãÒÂ²ÓRãÃBãÒÂ³ãÃBãUÒÂ³2ãBÃbãEÐ¢ÒÂ²g&öÔæÖS¢tF¶"rÂFôæÖS¢tÆv÷2rÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÂW&Ã¢v‡GG3¢ò÷wwræÖ&–æWG&ff–2æ6öÒöVâö—2ö†öÖRö6VçFW'ƒ¢ÓRö6VçFW'“£B÷¦ööÓ£RrÒ’“° ¢òòÖ&—F–ÖS¢W7G&Æ–(i"¦à¢Æ–æ·2çW6‚‡&÷WFR…°¢³Sã"ÂÓ32ã…ÒÂ³S2ãÂÓ#RãÒÂ³SRãÂÓRãÒÂ³SBãÂÓRãÒÂ³SãÃRãÒÂ³CRãÃRãÒÂ³CãÃ#RãÒÂ³3’ãrÃ3RãeÐ¢ÒÂ²g&öÔæÖS¢u7–FæW’rÂFôæÖS¢uFö·–òrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÂW&Ã¢v‡GG3¢ò÷wwræÖ&–æWG&ff–2æ6öÒöVâö—2ö†öÖRö6VçFW'ƒ£CRö6VçFW'“£÷¦ööÓ£2rÒ’“° ¢òòÖ&—F–ÖS¢W7G&Æ–(i"6–æv÷&P¢Æ–æ·2çW6‚‡&÷WFR…°¢³Rã‚ÂÓ3ã•ÒÂ³2ãÂÓ#RãÒÂ³ãÂÓRãÒÂ³rãÂÓRãÒÂ³RãÃãÒÂ³2ã‚Ãã%Ð¢ÒÂ²g&öÔæÖS¢uW'F‚rÂFôæÖS¢u6–æv÷&RrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÂW&Ã¢v‡GG3¢ò÷wwræÖ&–æWG&ff–2æ6öÒöVâö—2ö†öÖRö6VçFW'ƒ£ö6VçFW'“¢ÓR÷¦ööÓ£BrÒ’“° ¢òò—#¢G&ç2×öÆ"å’Fò&V–¦–æp¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ós2ãs‚ÃCãcEÒÂ²ÓsRãÃSRãÒÂ²Ós‚ãÃsãÒÂ²ÓƒãÃƒRãÒÂ³ãÃƒãÒÂ³RãÃcãÒÂ³bãcÃCã…Ð¢ÒÂ²g&öÔæÖS¢t¤d²rÂFôæÖS¢t&V–¦–ærrÂFöÖ–ã¢t•"rÂ6÷W&6S¢tE2Ô"ò÷Vå6·’rÂW&Ã¢v‡GG3¢ò÷wwræfÆ–v‡G&F##Bæ6öÒócRãÂÓsRãóBrÒ’“° ¢òò—#¢6÷WF‚ÖW&–6FòWW&÷P¢Æ–æ·2çW6‚‡&÷WFR…°¢²ÓCbãc2ÂÓ#2ãSUÒÂ²ÓCãÂÓRãÒÂ²Ó3RãÂÓRãÒÂ²Ó3ãÃRãÒÂ²Ó#ãÃRãÒÂ²ÓRãÃ#RãÒÂ²ÓãÃ3RãÒÂ²ÓãCbÃSãCuÐ¢ÒÂ²g&öÔæÖS¢u6òVÆòrÂFôæÖS¢tÆöæFöârÂFöÖ–ã¢t•"rÂ6÷W&6S¢tE2Ô"ò÷Vå6·’rÂW&Ã¢v‡GG3¢ò÷wwræfÆ–v‡G&F##Bæ6öÒóRãÂÓ#ãóBrÒ’“° ¢òò—#¢Ö–FFÆRV7BFòW7G&Æ–¢Æ–æ·2çW6‚‡&÷WFR…°¢³SRã3bÃ#Rã#UÒÂ³cRãÃRãÒÂ³sRãÃRãÒÂ³ƒRãÂÓRãÒÂ³ãÂÓRãÒÂ³RãÂÓ#RãÒÂ³3ãÂÓ3ãÒÂ³Sã"ÂÓ32ã…Ð¢ÒÂ²g&öÔæÖS¢tGV&’rÂFôæÖS¢u7–FæW’rÂFöÖ–ã¢t•"rÂ6÷W&6S¢tE2Ô"ò÷Vå6·’rÂW&Ã¢v‡GG3¢ò÷wwræfÆ–v‡G&F##Bæ6öÒòÓRãÃ“ãóBrÒ’“° ¢òò–çFVÃ¢G&ç2ÔFÆçF–27V'6VFF6&ÆR…DBÓBWV—fÆVçB¢Æ–æ·2çW6‚‡&÷WFR…°¢²ÓsBãÃCã%ÒÂ²ÓcRãÃC"ãÒÂ²ÓSãÃCbãÒÂ²Ó3RãÃC‚ãÒÂ²Ó#ãÃC’ãÒÂ²ÓRãÃSãÒÂ³BãRÃS"ãÐ¢ÒÂ²g&öÔæÖS¢tæWr¦W'6W’ÆæF–ærrÂFôæÖS¢tWW&÷RÆæF–ærrÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tvÆö&Â7V'6V6&ÆRæWGv÷&²rÂW&Ã¢v‡GG3¢ò÷wwrç7V&Ö&–æV6&ÆVÖæ6öÒòrÒ’“° ¢òò–çFVÃ¢G&ç2Õ6–f–27V'6VFF6&ÆR„d5DU"WV—fÆVçB¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ó#BãÃC2ãÒÂ²Ó3RãÃCRãÒÂ²ÓSãÃCrãÒÂ²ÓcRãÃC‚ãÒÂ²ÓƒRãÃCrãÒÂ²Ó#RãÃC"ãÒÂ²Ó##ãÃ3RãÐ¢ÒÂ²g&öÔæÖS¢t÷&VvöâÆæF–ærrÂFôæÖS¢t¦âÆæF–ærrÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tvÆö&Â7V'6V6&ÆRæWGv÷&²rÂW&Ã¢v‡GG3¢ò÷wwrç7V&Ö&–æV6&ÆVÖæ6öÒòrÒ’“° ¢òò–çFVÃ¢ÖVF—FW'&æVâ7V'6V6&ÆR…4TÔÔRÕtR¢Æ–æ·2çW6‚‡&÷WFR…°¢³Rã2ÃC2ã5ÒÂ³ãÃ3‚ãÒÂ³‚ãÃ3RãÒÂ³#RãÃ32ãÒÂ³3ã"Ã3ã%Ð¢ÒÂ²g&öÔæÖS¢tÖ'6V–ÆÆRrÂFôæÖS¢tÆW†æG&–rÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tvÆö&Â7V'6V6&ÆRæWGv÷&²rÂW&Ã¢v‡GG3¢ò÷wwrç7V&Ö&–æV6&ÆVÖæ6öÒòrÒ’“° ¢òòÖ&—F–ÖS¢7VW¢Fò×VÖ&’„&&–â6V¢Æ–æ·2çW6‚‡&÷WFR…°¢³3"ã3BÃ3ãC5ÒÂ³3RãÃ#RãÒÂ³3‚ãÃ#ãÒÂ³CãÃrãÒÂ³C2ã32Ã"ãS…ÒÂ³CRãÃ"ãÒÂ³S"ãÃBãÒÂ³cãÃRãÒÂ³c‚ãÃrãÒÂ³s"ãƒBÃ‚ã“5Ð¢ÒÂ²g&öÔæÖS¢u7VW¢6æÂrÂFôæÖS¢t×VÖ&’rÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÂW&Ã¢v‡GG3¢ò÷wwræÖ&–æWG&ff–2æ6öÒöVâö—2ö†öÖRö6VçFW'ƒ£cö6VçFW'“£R÷¦ööÓ£RrÒ’“° ¢òòÖ&—F–ÖS¢6RöbvööB†÷RFòW7G&Æ–…6÷WF†W&âö6Vâ¢Æ–æ·2çW6‚‡&÷WFR…°¢³‚ãCrÂÓ3Bã3eÒÂ³CãÂÓCãÒÂ³cãÂÓC"ãÒÂ³ƒãÂÓC2ãÒÂ³ãÂÓCãÒÂ³Rã‚ÂÓ3ã•Ð¢ÒÂ²g&öÔæÖS¢t6RöbvööB†÷RrÂFôæÖS¢uW'F‚rÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÂW&Ã¢v‡GG3¢ò÷wwræÖ&–æWG&ff–2æ6öÒöVâö—2ö†öÖRö6VçFW'ƒ£sö6VçFW'“¢ÓC÷¦ööÓ£2rÒ’“° ¢òòÖ&—F–ÖS¢æÖ6æÂFòfÇ&—6ò…6÷WF‚ÖW&–6vW7B6ö7B¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ós’ãc‚Ã’ã…ÒÂ²ÓƒãÃ"ãÒÂ²ÓƒãRÂÓRãÒÂ²Ós‚ãÂÓRãÒÂ²ÓsBãÂÓ#RãÒÂ²ÓsãbÂÓ32ãÐ¢ÒÂ²g&öÔæÖS¢uæÖ6æÂrÂFôæÖS¢ufÇ&—6òrÂFöÖ–ã¢u4TrÂ6÷W&6S¢t•2Ö&—F–ÖRrÂW&Ã¢v‡GG3¢ò÷wwræÖ&–æWG&ff–2æ6öÒöVâö—2ö†öÖRö6VçFW'ƒ¢Ós‚ö6VçFW'“¢ÓR÷¦ööÓ£BrÒ’“° ¢òò—#¢ÆöæFöâFò6–æv÷&P¢Æ–æ·2çW6‚‡&÷WFR…°¢²ÓãCbÃSãCuÒÂ³RãÃC‚ãÒÂ³3RãÃC"ãÒÂ³SRãÃ3RãÒÂ³sãÃ#RãÒÂ³ƒRãÃRãÒÂ³“RãÃ‚ãÒÂ³2ã‚Ãã%Ð¢ÒÂ²g&öÔæÖS¢tÆöæFöârÂFôæÖS¢u6–æv÷&RrÂFöÖ–ã¢t•"rÂ6÷W&6S¢tE2Ô"ò÷Vå6·’rÂW&Ã¢v‡GG3¢ò÷wwræfÆ–v‡G&F##Bæ6öÒóSRãÃ3RãóBrÒ’“° ¢òò—#¢æWr–÷&²Fò'VVæ÷2—&W0¢Æ–æ·2çW6‚‡&÷WFR…°¢²Ós2ãs‚ÃCãcEÒÂ²ÓsãÃ#ãÒÂ²ÓcRãÃãÒÂ²ÓSRãÂÓRãÒÂ²ÓS‚ãBÂÓ3BãeÐ¢ÒÂ²g&öÔæÖS¢t¤d²æWr–÷&²rÂFôæÖS¢t'VVæ÷2—&W2rÂFöÖ–ã¢t•"rÂ6÷W&6S¢tE2Ô"ò÷Vå6·’rÂW&Ã¢v‡GG3¢ò÷wwræfÆ–v‡G&F##Bæ6öÒòÓcRãÃãóBrÒ’“° ¢òò—#¢Fö·–òFò7–FæW¢Æ–æ·2çW6‚‡&÷WFR…°¢³3’ãrÃ3RãeÒÂ³C"ãÃ#ãÒÂ³CRãÃãÒÂ³C‚ãÂÓRãÒÂ³Sã"ÂÓ32ã…Ð¢ÒÂ²g&öÔæÖS¢uFö·–òrÂFôæÖS¢u7–FæW’rÂFöÖ–ã¢t•"rÂ6÷W&6S¢tE2Ô"ò÷Vå6·’rÂW&Ã¢v‡GG3¢ò÷wwræfÆ–v‡G&F##Bæ6öÒóCRãÃãóBrÒ’“° ¢òò–çFVÃ¢&7F–2G&öÂ&÷WFR„æ÷'F†W&âfÆVWB¢Æ–æ·2çW6‚‡&÷WFR…°¢³32ãC"Ãc’ãuÒÂ³#ãÃs"ãÒÂ³ãÃsRãÒÂ²Ó#ãÃs"ãÒÂ²Ó3ãÃcRãÐ¢ÒÂ²g&öÔæÖS¢u6WfW&öÖ÷'6²rÂFôæÖS¢tw&VVæÆæB6VrÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tæfÂ–çFVÆÆ–vVæ6RrÂW&Ã¢v‡GG3¢ò÷wwræöFæ’æv÷brÒ’“° ¢òò–çFVÃ¢6÷WF‚6†–æ6V6'&–W"G&öÀ¢Æ–æ·2çW6‚‡&÷WFR…°¢³#rãbÃ#bã%ÒÂ³#2ãÃ#BãÒÂ³‚ãÃ#ãÒÂ³BãÃRãÒÂ³"ãÃãÐ¢ÒÂ²g&öÔæÖS¢tö¶–ævrÂFôæÖS¢u6÷WF‚6†–æ6VrÂFöÖ–ã¢t”åDTÂrÂ6÷W&6S¢tæfÂ–çFVÆÆ–vVæ6RrÂW&Ã¢v‡GG3¢ò÷wwræöFæ’æv÷brÒ’“° ¢6WDvVò‚w6F²ÖÆ–æ·2rÂ—4÷fW'f–WtÖöFRòÆ–æ·2ç6Æ–6RƒÂõdU%d”UuôTåD•E•ôÄ”Ô•E2ç6F´Æ–æ·2’¢Æ–æ·2“°¢ÒÂ¶Ö&VG’Â7F—fTÆ–W'2ç6Fµ÷7G&VÒÂ—4÷fW'f–WtÖöFRÂ6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6öç7BÆ—fTfVVG2Ò—4÷fW'f–WtÖöFP¢òF¶UF÷VçF—F–W2†FFæÆ—fUöfVVG2ÂõdU%d”UuôTåD•E•ôÄ”Ô•E2æÆ—fTæWw2Â†c¢ÖVçF—G’’ÓâçVÖ&W"†bç&–÷&—G’óòbç&æ²óòbç66÷&Róò’¢¢†FFæÆ—fUöfVVG2ÇÂµÒ“°¢6WDvVò‚vÆ—fRÖæWw2rÂ7F—fTÆ–W'2æÆ—fUöæWw2bbÆ—fTfVVG2òÆ—fTfVVG2æÖ‚†c¢ÖVçF—G’’Óâ‡²G—S¢tfVGW&RrÂvVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢¶bæÆærÂbæÆEÒÒÂ&÷W'F–W3¢²æÖS¢bææÖRÂ6—G“¢bæ6—G’Â6÷VçG'“¢bæ6÷VçG'’ÂW&Ã¢bçW&ÂÂ6FVv÷'“¢bæ6FVv÷'’ÂVÖ&VEöÆÆ÷vVC¢bæVÖ&VEöÆÆ÷vVBÓÒfÇ6RÒÒ’’¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFæÆ—fUöfVVG2Â7F—fTÆ–W'2æÆ—fUöæWw2Â—4÷fW'f–WtÖöFRÂ6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6öç7B—FV×2Ò—4÷fW'f–WtÖöFP¢òF¶UF÷VçF—F–W2†FFææWw2ÂõdU%d”UuôTåD•E•ôÄ”Ô•E2ç6–v–çDæWw2Â†ã¢ÖVçF—G’’ÓâçVÖ&W"†âç&—6µ÷66÷&Róò’²vWE&V6Væ7•vV–v‡B†âçV&Æ—6†VEöBóòâæFFR’¢¢†FFææWw2ÇÂµÒ“°¢6WDvVò‚w6–v–çBÖæWw2rÂ7F—fTÆ–W'2ææWw5ö–çFVÂbb—FV×2æÆVæwF‚â ¢ò—FV×2æf–ÇFW"‚†ã¢ÖVçF—G’’Óââæ6ö÷&G3òæÆVæwF‚ÓÓÒ"’æÖ‚†ã¢ÖVçF—G’’Óâ‡°¢G—S¢tfVGW&RrÀ¢vVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢¶âæ6ö÷&G5³ÒÂâæ6ö÷&G5³ÕÒÒÀ¢&÷W'F–W3¢²F—FÆS¢âçF—FÆRÂ6÷W&6S¢âç6÷W&6RÂ&—6µ÷66÷&S¢âç&—6µ÷66÷&RÂÆ–æ³¢âæÆ–æ²Ð¢Ò’¢¢µÒ“°¢ÒÂ¶Ö&VG’ÂFFææWw2Â7F—fTÆ–W'2ææWw5ö–çFVÂÂ—4÷fW'f–WtÖöFRÂ6WDvVõÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢òò)H)H4ôädÄ”5B¤ôäU2(	B6VçFW"×ö–çBv&æ–ærÖ&¶W'2)H)H ¢6öç7B4ôädÄ”5Eõ¤ôäU2Ò°¢²Æ&VÃ¢uTµ$”äRt"rÂ6WfW&—G“¢wv"rÂÆC¢C‚ãRÂÆæs¢3ã"ÒÀ¢²Æ&VÃ¢tt¤4ôädÄ”5BrÂ6WfW&—G“¢wv"rÂÆC¢3ã3RÂÆæs¢3Bã3RÒÀ¢²Æ&VÃ¢tÄT$äôâ$õ$DU"rÂ6WfW&—G“¢v†–v‚rÂÆC¢32ãBÂÆæs¢3Rã‚ÒÀ¢²Æ&VÃ¢u5TDâ4•d”Ât"rÂ6WfW&—G“¢wv"rÂÆC¢RãÂÆæs¢3ãÒÀ¢²Æ&VÃ¢tÕ”äÔ"4ôädÄ”5BrÂ6WfW&—G“¢wv"rÂÆC¢’ãRÂÆæs¢“bãRÒÀ¢²Æ&VÃ¢tE$2T5DU$â4ôädÄ”5BrÂ6WfW&—G“¢wv"rÂÆC¢ÓãÂÆæs¢#‚ãRÒÀ¢²Æ&VÃ¢u”TÔTât"rÂ6WfW&—G“¢wv"rÂÆC¢RãRÂÆæs¢C‚ãÒÀ¢²Æ&VÃ¢u5•$”rÂ6WfW&—G“¢v†–v‚rÂÆC¢3RãÂÆæs¢3‚ãRÒÀ¢²Æ&VÃ¢uD•tâ5E$•BrÂ6WfW&—G“¢vVÆWfFVBrÂÆC¢#BãÂÆæs¢’ãRÒÀ¢²Æ&VÃ¢t´õ$TâDÕ¢rÂ6WfW&—G“¢vVÆWfFVBrÂÆC¢3‚ã2ÂÆæs¢#rãÒÀ¢²Æ&VÃ¢u4„TÂ”å5D$”Ä•E’rÂ6WfW&—G“¢v†–v‚rÂÆC¢BãÂÆæs¢RãÒÀ¢²Æ&VÃ¢u4ôÔÄ”rÂ6WfW&—G“¢v†–v‚rÂÆC¢RãÂÆæs¢CbãÒÀ¢²Æ&VÃ¢u$TB4TD…$TBrÂ6WfW&—G“¢v†–v‚rÂÆC¢bãÂÆæs¢CãÒÀ¢Ó°¢6öç7B6öæfÆ–7DfVGW&W2Ò4ôädÄ”5Eõ¤ôäU2æÖ‡¢Óâ‡°¢G—S¢tfVGW&Rr26öç7BÀ¢vVöÖWG'“¢²G—S¢uö–çBr26öç7BÂ6ö÷&F–æFW3¢·¢æÆærÂ¢æÆEÒÒÀ¢&÷W'F–W3¢²Æ&VÃ¢¢æÆ&VÂÂ6WfW&—G“¢¢ç6WfW&—G’ÒÀ¢Ò’“°¢6WDvVò‚v6öæfÆ–7B×¦öæW2rÂ6öæfÆ–7DfVGW&W2“°¢ÒÂ¶Ö&VG’Â6WDvVõÒ“°  ¢òòf—6–&–Æ—G¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢6WEf—2…²vWÖ6ÇW7FW'2rÂvWÖ6ÇW7FW"Ö6÷VçBrÂvWÖ6—&6ÆW2rÂvWÖÆ&VÂrÂvW×VÇ6R×&–ærrÂvW×VÇ6RÖ6÷&RuÒÂ7F—fTÆ–W'2æV'F‡V¶W2“°¢6WEf—2…²w6BÖF÷G2rÂw6BÖvÆ÷ruÒÂ7F—fTÆ–W'2ç6FVÆÆ—FW2“°¢6WEf—2…²vvFVÇBÖF÷G2rÂvvFVÇBÖ†÷G7÷BÖ†ÆòrÂvvFVÇBÖ†÷G7÷BÖ6÷&RrÂvvFVÇBÖ†÷G7÷BÖÆ&VÂuÒÂ7F—fTÆ–W'2ævÆö&Åö–æ6–FVçG2“°¢6WEf—2…²v¦ÒÖf–ÆÂrÂv¦ÒÖÆ&VÂuÒÂ7F—fTÆ–W'2æw5ö¦ÖÖ–ær“°¢6WEf—2…²vF’Öæ–v‡BÖf–ÆÂuÒÂ7F—fTÆ–W'2æF•öæ–v‡B“°¢6WEf—2…²vfÂÖ6öÖÖW&6–ÂuÒÂ7F—fTÆ–W'2æfÆ–v‡G2“°¢6WEf—2…²vfÂ×&—fFRuÒÂ7F—fTÆ–W'2ç&—fFR“°¢6WEf—2…²vfÂÖ¦WG2uÒÂ7F—fTÆ–W'2æ¦WG2“°¢6WEf—2…²vfÂÖÖ–Æ—F'’uÒÂ7F—fTÆ–W'2æÖ–Æ—F'’“°¢6WEf—2…²v67GbÖvÆ÷rrÂv67GbÖF÷G2rÂv67GbÖÆ&VÂuÒÂ7F—fTÆ–W'2æ67Gb“°¢6WEf—2…²vf—&W2Ö†VBuÒÂ7F—fTÆ–W'2æf—&W2“°¢6WEf—2…²wvVF†W"ÖvÆ÷rrÂwvVF†W"ÖF÷G2rÂwvVF†W"ÖÆ&VÂuÒÂ7F—fTÆ–W'2çvVF†W"“°¢6WEf—2…²v–æg&ÖvÆ÷rrÂv–æg&ÖF÷G2rÂv–æg&ÖÆ&VÂuÒÂ7F—fTÆ–W'2æ–æg&7G'V7GW&R“°¢6WEf—2…²vÖ&—F–ÖRÖvÆ÷rrÂvÖ&—F–ÖRÖF÷G2rÂvÖ&—F–ÖRÖÆ&VÂuÒÂ7F—fTÆ–W'2æÖ&—F–ÖR“°¢6WEf—2…²v6†ö¶RÖvÆ÷rrÂv6†ö¶RÖF÷G2rÂv6†ö¶RÖÆ&VÂuÒÂ7F—fTÆ–W'2æÖ&—F–ÖR“°¢6WEf—2…²w6†—ÖF÷G2rÂw6†—ÖÆ&VÂuÒÂ7F—fTÆ–W'2æÖ&—F–ÖR“°¢6WEf—2…²væWw2ÖvÆ÷rrÂvæWw2ÖF÷G2rÂvæWw2ÖÆ&VÂuÒÂ7F—fTÆ–W'2æÆ—fUöæWw2“°¢6WEf—2…²w6–v–çBÖæWw2ÖvÆ÷rrÂw6–v–çBÖæWw2ÖF÷G2rÂw6–v–çBÖæWw2ÖÆ&VÂuÒÂ7F—fTÆ–W'2ææWw5ö–çFVÂ“°¢6WEf—2…²v6öæfÆ–7BÖ–6öç2uÒÂ7F—fTÆ–W'2æ6öæfÆ–7E÷¦öæW2ÓÒfÇ6R“° ¢6WEf—2…²v&ÆÆööâÖF÷G2rÂv&ÆÆööâÖÆ&VÂuÒÂ7F—fTÆ–W'2æ&ÆÆööç2“°¢6WEf—2…²w&BÖvÆ÷rrÂw&BÖF÷G2rÂw&BÖÆ&VÂuÒÂ7F—fTÆ–W'2ç&F–F–öâ“°¢6WEf—2…²w6F²×6VÖvÆ÷rrÂw6F²Ö—"ÖvÆ÷rrÂw6F²Ö–çFVÂÖvÆ÷rrÂw6F²×6VrÂw6F²Ö—"rÂw6F²Ö–çFVÂuÒÂ7F—fTÆ–W'2ç6Fµ÷7G&VÒÓÒfÇ6R“°¢òò7vVWÆ–W'2Çv—2f—6–&ÆRv†VâFF—2&W6VçB†6öçG&öÆÆVB'’W6TVffV7B¢6WEf—2…²w7vVWÖ6öææV7F–öç2rÂw7vVW×VÇ6R×&–ærrÂw7vVWÖFWf–6RÖvÆ÷rrÂw7vVWÖFWf–6RÖF÷G2rÂw7vVWÖFWf–6RÖÆ&VÇ2uÒÂG'VR“°¢Ç”FF—fTFV6ÇWGFW"‚“°¢ÒÂ¶Ö&VG’Â7F—fTÆ–W'2Â6WEf—2ÂÇ”FF—fTFV6ÇWGFW%Ò“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢Ç”FF—fTFV6ÇWGFW"‚“°¢ÒÂ¶Ö&VG’ÂFF—fU¦ööÒÂ&ö¦V7F–öâÂÇ”FF—fTFV6ÇWGFW%Ò“° ¢òò•7vVWf—7VÆ—¦F–öà¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’’&WGW&ã°¢–b‚7vVWFFòæFWf–6W3òæÆVæwF‚’°¢6WDvVò‚v—×7vVWÖFWf–6W2rÂµÒ“°¢6WDvVò‚v—×7vVW×VÇ6RrÂµÒ“°¢6WDvVò‚v—×7vVWÖ6öææV7F–öç2rÂµÒ“°¢&WGW&ã°¢Ð ¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢–b‚Ö’&WGW&ã° ¢6öç7B²6VçFW"ÂFWf–6W2ÒÒ7vVWFF°¢6öç7B6VçFW$6ö÷&C¢¶çVÖ&W"ÂçVÖ&W%ÒÒ¶6VçFW"æÆærÂ6VçFW"æÆEÓ° ¢òò7v—F6‚FòvÆö&RæBfÇ’FòF†R7vVWÆö6F–öà¢G'’°¢†Ö2ÖÆ–'&VvÂäÖb²6WE&ö¦V7F–öãó¢‡&ö¦V7F–öã¢²G—S¢vÖW&6F÷"rÂvvÆö&RrÒ’Óâfö–BÒ’ç6WE&ö¦V7F–öâ‡²G—S¢vvÆö&RrÒ“°¢Ç”Vv—4vÆö&U7G–Æ–ær†ÖÂvvÆö&RrÂÖ7G–ÆR“°¢Ò6F6‚²ò¢&ö¦V7F–öâÖ’æ÷B&R7W÷'FVB¢òÐ ¢ÖæfÇ•Fò‡²6VçFW#¢6VçFW$6ö÷&BÂ¦ööÓ¢BÂ—F6ƒ¢SÂ&V&–æs¢Ó#ÂGW&F–öã¢3ÂW76VçF–Ã¢G'VRÒ“° ¢òò6WB6VçFW"VÇ6P¢6WDvVò‚v—×7vVW×VÇ6RrÂ·°¢G—S¢tfVGW&Rr26öç7BÀ¢vVöÖWG'“¢²G—S¢uö–çBr26öç7BÂ6ö÷&F–æFW3¢6VçFW$6ö÷&BÒÀ¢&÷W'F–W3¢²—¢7vVWFFçF&vWEö—ÒÀ¢ÕÒ“° ¢òò'V–ÆBFWf–6RfVGW&W27&VB–â6—&6ÆR&÷VæB6VçFW ¢6öç7BÆÄFWf–6TfVGW&W2ÒFWf–6W2æÖ‚†C¢7vVWFWf–6RÂ“¢çVÖ&W"’Óâ°¢6öç7BævÆRÒ†’òFWf–6W2æÆVæwF‚’¢ÖF‚å’¢#°¢6öç7B&F—W2Òã²‚†’Rr²’¢ãB“°¢6öç7BDÆærÒ6VçFW$6ö÷&E³Ò²ÖF‚æ6÷2†ævÆR’¢&F—W2¢ƒòÖF‚æ6÷2†6VçFW"æÆB¢ÖF‚å’òƒ’“°¢6öç7BDÆBÒ6VçFW$6ö÷&E³Ò²ÖF‚ç6–â†ævÆR’¢&F—W3°¢&WGW&â°¢G—S¢tfVGW&Rr26öç7BÀ¢vVöÖWG'“¢²G—S¢uö–çBr26öç7BÂ6ö÷&F–æFW3¢¶DÆærÂDÆEÒÒÀ¢&÷W'F–W3¢°¢—¢Bæ—ÂFWf–6U÷G—S¢BæFWf–6U÷G—RÂFWf–6Uö–6öã¢BæFWf–6Uö–6öâÀ¢6öÆ÷#¢BæFWf–6Uö6öÆ÷"Â&—6µöÆWfVÃ¢Bç&—6µöÆWfVÂÀ¢÷'G3¢¥4ôâç7G&–æv–g’†Bç÷'G2’Â†÷7FæÖW3¢¥4ôâç7G&–æv–g’†Bæ†÷7FæÖW2’À¢gVÆç3¢¥4ôâç7G&–æv–g’†BçgVÆç2’Â7W3¢¥4ôâç7G&–æv–g’†Bæ7W2’ÂFw3¢¥4ôâç7G&–æv–g’†BçFw2’À¢ÒÀ¢Ó°¢Ò“° ¢òò6öææV7F–öâÆ–æW2g&öÒ6VçFW"FòV6‚FWf–6P¢6öç7B6öææV7F–öäfVGW&W2ÒÆÄFWf–6TfVGW&W2æÖ‚†b’Óâ‡°¢G—S¢tfVGW&Rr26öç7BÀ¢vVöÖWG'“¢²G—S¢tÆ–æU7G&–ærr26öç7BÂ6ö÷&F–æFW3¢¶6VçFW$6ö÷&BÂbævVöÖWG'’æ6ö÷&F–æFW5ÒÒÀ¢&÷W'F–W3¢²6öÆ÷#¢bç&÷W'F–W2æ6öÆ÷"ÒÀ¢Ò’“° ¢òò7FvvW"F†RV&æ6RgFW"72fÇ•Fò6ö×ÆWFW0¢6öç7BF–ÖW"Ò6WEF–ÖV÷WB‚‚’Óâ°¢6WDvVò‚v—×7vVWÖ6öææV7F–öç2rÂ6öææV7F–öäfVGW&W2“°¢6öç7B&F6…6—¦RÒS°¢6öç7B&F6†W2ÒÖF‚æ6V–Â†ÆÄFWf–6TfVGW&W2æÆVæwF‚ò&F6…6—¦R“°¢f÷"†ÆWB"Ò²"Â&F6†W3²"²²’°¢6WEF–ÖV÷WB‚‚’Óâ°¢6WDvVò‚v—×7vVWÖFWf–6W2rÂÆÄFWf–6TfVGW&W2ç6Æ–6RƒÂ†"²’¢&F6…6—¦R’“°¢ÒÂ"¢“°¢Ð¢ÒÂ3“° ¢&WGW&â‚’Óâ6ÆV%F–ÖV÷WB‡F–ÖW"“°¢ÒÂ¶Ç”Vv—4vÆö&U7G–Æ–ærÂÖ&VG’Â7vVWFFÂ6WDvVòÂÖ7G–ÆUÒ“° ¢òò66âF&vWG2f—7VÆ—¦F–öà¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂÖ&Vbæ7W'&VçBÇÂ66åF&vWG2’&WGW&ã°¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢ ¢6öç7BfVGW&W2Ò66åF&vWG2æÖ‡BÓâ‡°¢G—S¢tfVGW&Rr26öç7BÀ¢vVöÖWG'“¢²G—S¢uö–çBr26öç7BÂ6ö÷&F–æFW3¢·BæÆærÂBæÆEÒÒÀ¢&÷W'F–W3¢²ââçBÐ¢Ò’“°¢ ¢6öç7B7&2ÒÖævWE6÷W&6R‚w66â×F&vWG2r’2ÖÆ–'&VvÂävVô¥4ôå6÷W&6S°¢–b‡7&2’7&2ç6WDFF‡²G—S¢tfVGW&T6öÆÆV7F–öârÂfVGW&W2Ò“°¢ÒÂ·66åF&vWG2ÂÖ&VG•Ò“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂÖ&Vbæ7W'&VçB’&WGW&ã°¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢6öç7B&÷WFU6÷W&6RÒÖævWE6÷W&6R‚wW6W"×&÷WFRr’2ÖÆ–'&VvÂävVô¥4ôå6÷W&6S°¢6öç7BÖ&¶W%6÷W&6RÒÖævWE6÷W&6R‚w&÷WFRÖÖ&¶W'2r’2ÖÆ–'&VvÂävVô¥4ôå6÷W&6S° ¢–b‡&÷WFU6÷W&6R’°¢&÷WFU6÷W&6Rç6WDFF‡°¢G—S¢tfVGW&T6öÆÆV7F–öârÀ¢fVGW&W3¢&÷WFUF‚æÆVæwF‚ãÒ ¢ò·°¢G—S¢tfVGW&RrÀ¢vVöÖWG'“¢²G—S¢tÆ–æU7G&–ærrÂ6ö÷&F–æFW3¢&÷WFUF‚ÒÀ¢&÷W'F–W3¢²Æ&VÃ¢tTt•2dT5Dõ"rÂÖöFS¢æf–vF–öä7F—fRòvföÆÆ÷rr¢w&VG’rÒÀ¢ÕÐ¢¢µÒÀ¢Ò“°¢Ð ¢–b†Ö&¶W%6÷W&6R’°¢6öç7BÖ&¶W$fVGW&W3¢vVô§6öäfVGW&UµÒÒµÓ°¢–b†7W'&VçDÆö6F–öâ’°¢Ö&¶W$fVGW&W2çW6‚‡°¢G—S¢tfVGW&RrÀ¢vVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢¶7W'&VçDÆö6F–öâæÆærÂ7W'&VçDÆö6F–öâæÆEÒÒÀ¢&÷W'F–W3¢°¢&öÆS¢v÷&–v–ârÀ¢Æ&VÃ¢v–æF÷ræ–ææW%v–GF‚Âsc‚òrr¢u2G¶w467W&7”ÖWFW'2ÓÒçVÆÂò+G´ÖF‚ç&÷VæB†w467W&7”ÖWFW'2—ÖÖ¢rwÖÀ¢&V&–æs¢æf–vF–öä&V&–æróòÀ¢67W&7“¢w467W&7”ÖWFW'2À¢ÒÀ¢Ò“°¢Ð¢–b‡&÷WFTFW7F–æF–öâ’°¢Ö&¶W$fVGW&W2çW6‚‡°¢G—S¢tfVGW&RrÀ¢vVöÖWG'“¢²G—S¢uö–çBrÂ6ö÷&F–æFW3¢·&÷WFTFW7F–æF–öâæÆærÂ&÷WFTFW7F–æF–öâæÆEÒÒÀ¢&÷W'F–W3¢²&öÆS¢vFW7F–æF–öârÂÆ&VÃ¢v–æF÷ræ–ææW%v–GF‚Âsc‚òrr¢tDU5BrÒÀ¢Ò“°¢Ð¢Ö&¶W%6÷W&6Rç6WDFF‡²G—S¢tfVGW&T6öÆÆV7F–öârÂfVGW&W3¢Ö&¶W$fVGW&W2Ò“°¢Ð¢ÒÂ¶7W'&VçDÆö6F–öâÂw467W&7”ÖWFW'2ÂÖ&VG’Âæf–vF–öä7F—fRÂæf–vF–öä&V&–ærÂ&÷WFTFW7F–æF–öâÂ&÷WFUF…Ò“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂÖ&Vbæ7W'&VçBÇÂ7W'&VçDÆö6F–öâ’&WGW&ã°¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢6öç7B7F'FVDBÒW&f÷&Öæ6Rææ÷r‚“°¢ÆWBæ–ÖF–öäg&ÖRÒ°¢ÆWBÆ7E–çDBÒ° ¢6öç7Bæ–ÖFRÒ†æ÷s¢çVÖ&W"’Óâ°¢–b†æ÷rÒÆ7E–çDBãÒC’°¢Æ7E–çDBÒæ÷s°¢6öç7Bg&ÖRÒvWDw5VÇ6Tg&ÖR†æ÷rÒ7F'FVDBÂw467W&7”ÖWFW'2“°¢–b†ÖævWDÆ–W"‚w&÷WFR×÷6—F–öâ×VÇ6Rr’’°¢Öç6WE–çE&÷W'G’‚w&÷WFR×÷6—F–öâ×VÇ6RrÂv6—&6ÆR×&F—W2rÂg&ÖRçVÇ6U&F—W2“°¢Öç6WE–çE&÷W'G’‚w&÷WFR×÷6—F–öâ×VÇ6RrÂv6—&6ÆRÖ÷6—G’rÂg&ÖRçVÇ6T÷6—G’“°¢Öç6WE–çE&÷W'G’‚w&÷WFR×÷6—F–öâ×VÇ6RrÂv6—&6ÆRÖ6öÆ÷"rÂg&ÖRæ6öÆ÷"“°¢Ð¢–b†ÖævWDÆ–W"‚w&÷WFR×÷6—F–öâÖ67W&7’r’’°¢Öç6WE–çE&÷W'G’‚w&÷WFR×÷6—F–öâÖ67W&7’rÂv6—&6ÆR×&F—W2rÂg&ÖRæ67W&7•&F—W2“°¢Öç6WE–çE&÷W'G’‚w&÷WFR×÷6—F–öâÖ67W&7’rÂv6—&6ÆRÖ6öÆ÷"rÂg&ÖRæ6öÆ÷"“°¢Öç6WE–çE&÷W'G’‚w&÷WFR×÷6—F–öâÖ67W&7’rÂv6—&6ÆR×7G&ö¶RÖ6öÆ÷"rÂg&ÖRæ6öÆ÷"“°¢Ð¢–b†ÖævWDÆ–W"‚w&÷WFR×÷6—F–öâÖ6÷&Rr’’°¢Öç6WE–çE&÷W'G’‚w&÷WFR×÷6—F–öâÖ6÷&RrÂv6—&6ÆRÖ6öÆ÷"rÂg&ÖRæ6öÆ÷"“°¢Ð¢Ð¢æ–ÖF–öäg&ÖRÒ&WVW7Dæ–ÖF–öäg&ÖR†æ–ÖFR“°¢Ó°¢æ–ÖF–öäg&ÖRÒ&WVW7Dæ–ÖF–öäg&ÖR†æ–ÖFR“°¢&WGW&â‚’Óâ6æ6VÄæ–ÖF–öäg&ÖR†æ–ÖF–öäg&ÖR“°¢ÒÂ¶7W'&VçDÆö6F–öâÂw467W&7”ÖWFW'2ÂÖ&VG•Ò“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂÖ&Vbæ7W'&VçBÇÂ7W'&VçDÆö6F–öâÇÂæf–vF–öä7F—fR’&WGW&ã°¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢6öç7B—4Öö&–ÆTæf–vF–öâÒv–æF÷ræ–ææW%v–GF‚Âscƒ°¢6öç7B6ÖW&&W6WBÒvWEfV7F÷$6ÖW&&W6WB†æf–vF–öäÖöFRÂ—4Öö&–ÆTæf–vF–öâ“°¢6öç7Bæ÷rÒFFRææ÷r‚“°¢6öç7BÆ7D6VçFW"ÒÆ7Dæd6ÖW&6VçFW%&Vbæ7W'&VçC°¢–b‚6†÷VÆEWFFTæf–vF–öä6ÖW&†Æ7D6VçFW"Â7W'&VçDÆö6F–öâÂæ÷rÒÆ7Dæd6ÖW&WFFU&Vbæ7W'&VçB’’&WGW&ã°¢6öç7BæW‡D&V&–ærÒ6Öö÷F„æf–vF–öä&V&–ær†Æ7Dæd6ÖW&&V&–æu&Vbæ7W'&VçBÂæf–vF–öä&V&–æróòÖævWD&V&–ær‚’“° ¢Æ7Dæd6ÖW&WFFU&Vbæ7W'&VçBÒæ÷s°¢Æ7Dæd6ÖW&6VçFW%&Vbæ7W'&VçBÒ7W'&VçDÆö6F–öã°¢Æ7Dæd6ÖW&&V&–æu&Vbæ7W'&VçBÒæW‡D&V&–æs°¢6öç7B6ÖW&F&vWBÒvWDæf–vF–öä6ÖW&F&vWB†7W'&VçDÆö6F–öâÂæW‡D&V&–ærÂ6ÖW&&W6WBæÆöö´†VDÖWFW'2“° ¢ÖæV6UFò‡°¢6VçFW#¢¶6ÖW&F&vWBæÆærÂ6ÖW&F&vWBæÆEÒÀ¢¦ööÓ¢6ÖW&&W6WBç¦ööÒÀ¢—F6ƒ¢6ÖW&&W6WBç—F6‚À¢&V&–æs¢æW‡D&V&–ærÀ¢FF–æs¢—4Öö&–ÆTæf–vF–öà¢ò²F÷¢"Â&÷GFöÓ¢ƒbÂÆVgC¢‚Â&–v‡C¢‚Ð¢¢²F÷¢‚Â&÷GFöÓ¢SbÂÆVgC¢cBÂ&–v‡C¢cBÒÀ¢GW&F–öã¢6ÖW&&W6WBæGW&F–öä×2À¢W76VçF–Ã¢G'VRÀ¢Ò“°¢ÒÂ¶7W'&VçDÆö6F–öâÂÖ&VG’Âæf–vF–öä7F—fRÂæf–vF–öä&V&–ærÂæf–vF–öäÖöFUÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂÖ&Vbæ7W'&VçB’&WGW&ã°¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢6öç7B'V–ÆF–æw5f—6–&ÆRÒæf–vF–öä7F—fRbb&ö¦V7F–öâÓÓÒvÖW&6F÷"s°¢–b†ÖævWDÆ–W"‚wfV7F÷"Ó6BÖ'V–ÆF–æw2r’’°¢Öç6WDÆ–÷WE&÷W'G’‚wfV7F÷"Ó6BÖ'V–ÆF–æw2rÂwf—6–&–Æ—G’rÂ'V–ÆF–æw5f—6–&ÆRòwf—6–&ÆRr¢væöæRr“°¢Ð¢–b†ÖævWDÆ–W"‚wfV7F÷"Ö'V–ÆF–ærÖfö÷G&–çG2r’’°¢Öç6WDÆ–÷WE&÷W'G’‚wfV7F÷"Ö'V–ÆF–ærÖfö÷G&–çG2rÂwf—6–&–Æ—G’rÂ'V–ÆF–æw5f—6–&ÆRòwf—6–&ÆRr¢væöæRr“°¢Ð ¢òòF†Ræf–vF–öâ6ÖW&÷vç2—F6‚â6V6öæB—F6‚ÖöæÇ’V6UFò†W&Rv÷VÆ@¢òò6æ6VÂF†R6VçFW"÷¦ööÒG&ç6—F–öâæB7G&æBdT5Dõ"–â÷fW'f–Wrà¢ÒÂ¶Ö&VG’Âæf–vF–öä7F—fRÂæf–vF–öäÖöFRÂ&ö¦V7F–öåÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂÖ&Vbæ7W'&VçB’&WGW&ã°¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢6öç7B÷W&F–öæÅ6÷W&6W2ÒæWr6WB…°¢vfÆ–v‡G2rÂvÖ–Æ—F'’rÂv¦WG2rÂw&—fFRÖfÂrÂvfÆ–v‡B×G&–Ç2rÂvÖ–Æ—F'’×G&–Ç2rÀ¢v¦WB×G&–Ç2rÂw&—fFR×G&–Ç2rÂw6FVÆÆ—FW2rÂvvFVÇBrÂvvFVÇBÖ†÷G7÷G2rÀ¢vw2Ö¦ÖÖ–ærrÂv67GbrÂvf—&W2rÂwvVF†W"rÂv–æg&7G'V7GW&RrÂvÖ&—F–ÖRrÀ¢vÖ&—F–ÖRÖ6†ö¶RrÂvÖ&—F–ÖR×6†—2rÂvÆ—fRÖæWw2rÂw6–v–çBÖæWw2rÂv6öæfÆ–7B×¦öæW2rÀ¢wv"ÖÆW'G2×F&vWG2rÂwv"ÖÆW'G2ÖÆ–æW2rÂv&ÆÆööç2rÂw&F–F–öârÂw6F²ÖVçF—F–W2rÀ¢w6F²ÖÆ–æ·2rÂv—×7vVWÖFWf–6W2rÂv—×7vVW×VÇ6RrÂv—×7vVWÖ6öææV7F–öç2rÂw66â×F&vWG2rÀ¢Ò“° ¢–b†æf–vF–öä7F—fR’°¢f÷"†6öç7BÆ–W"öbÖævWE7G–ÆR‚’æÆ–W'2óòµÒ’°¢6öç7B6÷W&6RÒG—VöbÆ–W"ç6÷W&6RÓÓÒw7G&–ærròÆ–W"ç6÷W&6R¢rs°¢–b‚÷W&F–öæÅ6÷W&6W2æ†2‡6÷W&6R’’6öçF–çVS°¢6öç7Bf—6–&–Æ—G’ÒÖævWDÆ–÷WE&÷W'G’†Æ–W"æ–BÂwf—6–&–Æ—G’r“°¢&Tæf–vF–öäÆ–W%f—6–&–Æ—G•&Vbæ7W'&VçBç6WB†Æ–W"æ–BÂG—Vöbf—6–&–Æ—G’ÓÓÒw7G&–ærròf—6–&–Æ—G’¢wf—6–&ÆRr“°¢Öç6WDÆ–÷WE&÷W'G’†Æ–W"æ–BÂwf—6–&–Æ—G’rÂvæöæRr“°¢Ð¢&WGW&ã°¢Ð ¢f÷"†6öç7B¶Æ–W$–BÂf—6–&–Æ—G•Òöb&Tæf–vF–öäÆ–W%f—6–&–Æ—G•&Vbæ7W'&VçB’°¢–b†ÖævWDÆ–W"†Æ–W$–B’’Öç6WDÆ–÷WE&÷W'G’†Æ–W$–BÂwf—6–&–Æ—G’rÂf—6–&–Æ—G’“°¢Ð¢&Tæf–vF–öäÆ–W%f—6–&–Æ—G•&Vbæ7W'&VçBæ6ÆV"‚“°¢ÒÂ¶Ö&VG’Âæf–vF–öä7F—fUÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂÖ&Vbæ7W'&VçBÇÂ&ö¦V7F–öâÓÒvvÆö&RrÇÂæf–vF–öä7F—fRÇÂÖ&–VçDÖ÷F–öäVæ&ÆVB’&WGW&ã°¢–b‡v–æF÷ræÖF6„ÖVF–‚r‡&VfW'2×&VGV6VBÖÖ÷F–öã¢&VGV6R’r’æÖF6†W2’&WGW&ã° ¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢ÆWBg&ÖRÒ°¢ÆWBÆ7EF–ÖRÒW&f÷&Öæ6Rææ÷r‚“°¢6öç7BÔ…ô”DÄUõ5”åõ¤ôôÒÒ"ãC°¢6öç7B7–äFVw&VW5W%6V6öæBÒv–æF÷ræ–ææW%v–GF‚Â#BòãCR¢ãƒ°¢vÆö&U7–åW6UVçF–Å&Vbæ7W'&VçBÒÖF‚æÖ‚†vÆö&U7–åW6UVçF–Å&Vbæ7W'&VçBÂFFRææ÷r‚’²#“° ¢6öç7B7–âÒ‡F–ÖW7F×¢çVÖ&W"’Óâ°¢–b‚Ö&Vbæ7W'&VçB’&WGW&ã°¢g&ÖRÒv–æF÷rç&WVW7Dæ–ÖF–öäg&ÖR‡7–â“° ¢–b€¢FF—fU¦ööÒâÔ…ô”DÄUõ5”åõ¤ôôÐ¢ÇÂFFRææ÷r‚’ÂvÆö&U7–åW6UVçF–Å&Vbæ7W'&Vç@¢ÇÂÖæ—4Ö÷f–ær‚¢’°¢Æ7EF–ÖRÒF–ÖW7F×°¢&WGW&ã°¢Ð ¢6öç7BFVÇF×2ÒÖF‚æÖ‚ƒÂF–ÖW7F×ÒÆ7EF–ÖR“°¢–b†FVÇF×2Â’&WGW&ã°¢6öç7BFVÇF6V6öæG2ÒFVÇF×2ò°¢Æ7EF–ÖRÒF–ÖW7F×°¢–b†FVÇF6V6öæG2ÃÒ’&WGW&ã° ¢6öç7B6VçFW"ÒÖævWD6VçFW"‚“°¢Öæ§V×Fò‡²6VçFW#¢¶æ÷&ÖÆ—¦TÆöæv—GVFR†6VçFW"æÆærÒFVÇF6V6öæG2¢7–äFVw&VW5W%6V6öæB’Â6VçFW"æÆEÒÒ“°¢Ó° ¢g&ÖRÒv–æF÷rç&WVW7Dæ–ÖF–öäg&ÖR‡7–â“°¢&WGW&â‚’Óâv–æF÷ræ6æ6VÄæ–ÖF–öäg&ÖR†g&ÖR“°¢ÒÂ¶FF—fU¦ööÒÂÖ&–VçDÖ÷F–öäVæ&ÆVBÂÖ&VG’Âæf–vF–öä7F—fRÂ&ö¦V7F–öåÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂÖ&Vbæ7W'&VçBÇÂæf–vF–öä7F—fRÇÂÖ&–VçDÖ÷F–öäVæ&ÆVB’&WGW&ã°¢–b‡v–æF÷ræÖF6„ÖVF–‚r‡&VfW'2×&VGV6VBÖÖ÷F–öã¢&VGV6R’r’æÖF6†W2’&WGW&ã° ¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢6öç7B7F'FVDBÒW&f÷&Öæ6Rææ÷r‚“°¢ÆWBæ–ÖF–öäg&ÖRÒ°¢ÆWBÆ7E&VæFW$BÒ° ¢6öç7B6WD÷6—G’Ò†Æ–W$–C¢7G&–ærÂ&÷W'G“¢7G&–ærÂfÇVS¢çVÖ&W"’Óâ°¢–b†ÖævWDÆ–W"†Æ–W$–B’’Öç6WE–çE&÷W'G’†Æ–W$–BÂ&÷W'G’ÂfÇVR“°¢Ó° ¢6öç7Bæ–ÖFT÷W&F–öæÄÆ–W'2Ò†æ÷s¢çVÖ&W"’Óâ°¢æ–ÖF–öäg&ÖRÒv–æF÷rç&WVW7Dæ–ÖF–öäg&ÖR†æ–ÖFT÷W&F–öæÄÆ–W'2“°¢–b†Fö7VÖVçBæ†–FFVâÇÂæ÷rÒÆ7E&VæFW$BÂcb’&WGW&ã°¢Æ7E&VæFW$BÒæ÷s° ¢6öç7BÖ÷F–öâÒvWDÆ—fTÖ÷F–öäg&ÖR†æ÷rÒ7F'FVDB“°¢6WD÷6—G’‚vf—&W2Ö†VBrÂv6—&6ÆRÖ÷6—G’rÂÖ÷F–öâæf—&T÷6—G’“°¢6WD÷6—G’‚vvFVÇBÖ†÷G7÷BÖ†ÆòrÂv6—&6ÆRÖ÷6—G’rÂÖ÷F–öâæ†÷G7÷D÷6—G’“°¢6WD÷6—G’‚w6BÖvÆ÷rrÂv6—&6ÆRÖ÷6—G’rÂÖ÷F–öâç6FVÆÆ—FTvÆ÷t÷6—G’“°¢6WD÷6—G’‚w6†—ÖF÷G2rÂv6—&6ÆRÖ÷6—G’rÂÖ÷F–öâç6†—÷6—G’“°¢²wG&–ÂÖ6öÖÖW&6–ÂrÂwG&–Â×&—fFRrÂwG&–ÂÖ¦WG2rÂwG&–ÂÖÖ–Æ—F'’uÒæf÷$V6‚‚†Æ–W$–B’Óâ°¢6WD÷6—G’†Æ–W$–BÂvÆ–æRÖ÷6—G’rÂÖ÷F–öâçG&–Ä÷6—G’“°¢Ò“°¢Ó° ¢æ–ÖF–öäg&ÖRÒv–æF÷rç&WVW7Dæ–ÖF–öäg&ÖR†æ–ÖFT÷W&F–öæÄÆ–W'2“°¢&WGW&â‚’Óâv–æF÷ræ6æ6VÄæ–ÖF–öäg&ÖR†æ–ÖF–öäg&ÖR“°¢ÒÂ¶Ö&–VçDÖ÷F–öäVæ&ÆVBÂÖ&VG’Âæf–vF–öä7F—fUÒ“° ¢òòfÇ’×Fð¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂÖ&Vbæ7W'&VçBÇÂfÇ•FôÆö6F–öâ’&WGW&ã°¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢6öç7BF&vWE¦ööÒÒfÇ•FôÆö6F–öâç¦ööÒóò‡&ö¦V7F–öâÓÓÒvvÆö&Rròrã"¢“° ¢–b†æf–vF–öä7F—fRbb7W'&VçDÆö6F–öâbbv–æF÷ræ–ææW%v–GF‚Âsc‚’°¢6öç7B6ÖW&&W6WBÒvWEfV7F÷$6ÖW&&W6WB†æf–vF–öäÖöFRÂG'VR“°¢6öç7BæW‡D&V&–ærÒ6Öö÷F„æf–vF–öä&V&–ær†Æ7Dæd6ÖW&&V&–æu&Vbæ7W'&VçBÂæf–vF–öä&V&–æróòÖævWD&V&–ær‚’“°¢6öç7B6ÖW&F&vWBÒvWDæf–vF–öä6ÖW&F&vWB†7W'&VçDÆö6F–öâÂæW‡D&V&–ærÂ6ÖW&&W6WBæÆöö´†VDÖWFW'2“°¢ÖæV6UFò‡°¢6VçFW#¢¶6ÖW&F&vWBæÆærÂ6ÖW&F&vWBæÆEÒÀ¢¦ööÓ¢6ÖW&&W6WBç¦ööÒÀ¢—F6ƒ¢6ÖW&&W6WBç—F6‚À¢&V&–æs¢æW‡D&V&–ærÀ¢FF–æs¢²F÷¢"Â&÷GFöÓ¢ƒbÂÆVgC¢‚Â&–v‡C¢‚ÒÀ¢GW&F–öã¢6ÖW&&W6WBæGW&F–öä×2À¢W76VçF–Ã¢G'VRÀ¢Ò“°¢&WGW&ã°¢Ð ¢–b†fÇ•FôÆö6F–öâæ&&÷‚’°¢6öç7B·vW7BÂ6÷WF‚ÂV7BÂæ÷'F…ÒÒfÇ•FôÆö6F–öâæ&&÷ƒ°¢Öæf—D&÷VæG2€¢µ·vW7BÂ6÷WF…ÒÂ¶V7BÂæ÷'F…ÕÒÀ¢°¢FF–æs¢²F÷¢ƒÂ&÷GFöÓ¢ƒÂÆVgC¢ƒÂ&–v‡C¢ƒÒÀ¢Ö…¦ööÓ¢ÖF‚æÖ‚‡F&vWE¦ööÒÂB’À¢GW&F–öã¢##À¢Ð¢“°¢&WGW&ã°¢Ð ¢ÖæfÇ•Fò‡°¢6VçFW#¢¶fÇ•FôÆö6F–öâæÆærÂfÇ•FôÆö6F–öâæÆEÒÀ¢¦ööÓ¢F&vWE¦ööÒÀ¢—F6ƒ¢&ö¦V7F–öâÓÓÒvvÆö&RròC"¢‡v–æF÷ræ–ææW%v–GF‚Âsc‚òc"¢’À¢GW&F–öã¢#CÀ¢W76VçF–Ã¢G'VRÀ¢Ò“°¢ÒÂ¶7W'&VçDÆö6F–öâÂfÇ•FôÆö6F–öâÂÖ&VG’Âæf–vF–öä7F—fRÂæf–vF–öä&V&–ærÂæf–vF–öäÖöFRÂ&ö¦V7F–öåÒ“° ¢òòG–æÖ–2&ö¦V7F–öâ7v—F6†–ær†Æ–v‡GvV–v‡B(	BæòFW'&–âDTÒ¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂÖ&Vbæ7W'&VçB’&WGW&ã°¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢G'’°¢†Ö2ÖÆ–'&VvÂäÖb²6WE&ö¦V7F–öãó¢‡&ö¦V7F–öã¢²G—S¢vÖW&6F÷"rÂvvÆö&RrÒ’Óâfö–BÒ’ç6WE&ö¦V7F–öâ‡²G—S¢&ö¦V7F–öâÒ“°¢Ç”Vv—4vÆö&U7G–Æ–ær†ÖÂ&ö¦V7F–öâÂÖ7G–ÆR“°¢–b‡&ö¦V7F–öâÓÓÒvvÆö&Rr’°¢–b‚æf–vF–öä7F—fRbb7W'&VçDÆö6F–öâ’°¢6öç7B—46ö×7Ef–Ww÷'BÒv–æF÷ræ–ææW%v–GF‚Âscƒ°¢ÖæV6UFò‡²6VçFW#¢³Â—46ö×7Ef–Ww÷'Bò"¢3ÒÂ¦ööÓ¢ÖF‚æÖ–â†ÖævWE¦ööÒ‚’Â—46ö×7Ef–Ww÷'BòãS"¢ãƒ"’Â—F6ƒ¢—46ö×7Ef–Ww÷'Bò¢"ÂGW&F–öã¢#Ò“°¢Ð¢ÒVÇ6R–b†æf–vF–öä7F—fRbb7W'&VçDÆö6F–öâ’°¢òò&ö¦V7F–öâ6†ævW26æ6VÂ–âÖfÆ–v‡BÖÆ–'&R6ÖW&G&ç6—F–öç2â&RÖÇ’F†P¢òò6ö×ÆWFRdT5Dõ"6ÖW&†W&RÂgFW"6WE&ö¦V7F–öâÂ6ò—F6‚ÖöæÇ’G&ç6—F–öà¢òò6ææ÷BÆVfRæf–vF–öâ7G&æFVBBF†R&Wf–÷W2vÆö&R¦ööÒà¢6öç7B—4Öö&–ÆTæf–vF–öâÒv–æF÷ræ–ææW%v–GF‚Âscƒ°¢6öç7B6ÖW&&W6WBÒvWEfV7F÷$6ÖW&&W6WB†æf–vF–öäÖöFRÂ—4Öö&–ÆTæf–vF–öâ“°¢6öç7BæW‡D&V&–ærÒ6Öö÷F„æf–vF–öä&V&–ær†Æ7Dæd6ÖW&&V&–æu&Vbæ7W'&VçBÂæf–vF–öä&V&–æróòÖævWD&V&–ær‚’“°¢6öç7B6ÖW&F&vWBÒvWDæf–vF–öä6ÖW&F&vWB†7W'&VçDÆö6F–öâÂæW‡D&V&–ærÂ6ÖW&&W6WBæÆöö´†VDÖWFW'2“°¢ÖæV6UFò‡°¢6VçFW#¢¶6ÖW&F&vWBæÆærÂ6ÖW&F&vWBæÆEÒÀ¢¦ööÓ¢6ÖW&&W6WBç¦ööÒÀ¢—F6ƒ¢6ÖW&&W6WBç—F6‚À¢&V&–æs¢æW‡D&V&–ærÀ¢FF–æs¢—4Öö&–ÆTæf–vF–öà¢ò²F÷¢"Â&÷GFöÓ¢ƒbÂÆVgC¢‚Â&–v‡C¢‚Ð¢¢²F÷¢‚Â&÷GFöÓ¢SbÂÆVgC¢cBÂ&–v‡C¢cBÒÀ¢GW&F–öã¢ƒSÀ¢W76VçF–Ã¢G'VRÀ¢Ò“°¢ÒVÇ6R°¢ÖæV6UFò‡²—F6ƒ¢Â&V&–æs¢ÂGW&F–öã¢ƒÒ“°¢Ð¢Ò6F6‚†R’°¢6öç6öÆRçv&â‚u&ö¦V7F–öâ7v—F6‚f–ÆVC¢rÂR“°¢Ð¢ÒÂ¶Ç”Vv—4vÆö&U7G–Æ–ærÂ7W'&VçDÆö6F–öâÂÖ&VG’Âæf–vF–öä7F—fRÂæf–vF–öä&V&–ærÂæf–vF–öäÖöFRÂ&ö¦V7F–öâÂÖ7G–ÆUÒ“° ¢W6TVffV7B‚‚’Óâ°¢–b†æf–vF–öä7F—fR’&WGW&ã°¢Æ7Dæd6ÖW&6VçFW%&Vbæ7W'&VçBÒçVÆÃ°¢Æ7Dæd6ÖW&&V&–æu&Vbæ7W'&VçBÒçVÆÃ°¢Æ7Dæd6ÖW&WFFU&Vbæ7W'&VçBÒ°¢ÒÂ¶æf–vF–öä7F—fUÒ“° ¢òò6FVÆÆ—FRòvÆö&R&W6VçFF–öâ7v—F6†–æp¢W6TVffV7B‚‚’Óâ°¢–b‚Ö&VG’ÇÂÖ&Vbæ7W'&VçB’&WGW&ã°¢&We7G–ÆU&Vbæ7W'&VçBÒÖ7G–ÆS°¢6öç7BÖÒÖ&Vbæ7W'&VçC°¢6öç7B6†÷VÆE6†÷u6FVÆÆ—FTÆ–W"ÒÖ7G–ÆRÓÓÒw6FVÆÆ—FRs° ¢G'’°¢–b‡6†÷VÆE6†÷u6FVÆÆ—FTÆ–W"’°¢–b‚ÖævWE6÷W&6R‚w6FVÆÆ—FR×F–ÆW2r’’°¢ÖæFE6÷W&6R‚w6FVÆÆ—FR×F–ÆW2rÂ°¢G—S¢w&7FW"rÀ¢F–ÆW3¢²v‡GG3¢ò÷6W'fW"æ&6v—6öæÆ–æRæ6öÒô&4t•2÷&W7B÷6W'f–6W2õv÷&ÆEô–ÖvW'’ôÖ6W'fW"÷F–ÆR÷·§Ò÷·—Ò÷·‡ÒuÒÀ¢F–ÆU6—¦S¢#SbÀ¢Ö‡¦ööÓ¢‚À¢Ò“°¢Ð ¢–b‚ÖævWDÆ–W"‚w6FVÆÆ—FRÖÆ–W"r’’°¢ÖæFDÆ–W"€¢°¢–C¢w6FVÆÆ—FRÖÆ–W"rÀ¢G—S¢w&7FW"rÀ¢6÷W&6S¢w6FVÆÆ—FR×F–ÆW2rÀ¢–çC¢°¢w&7FW"Ö÷6—G’s¢ã“"À¢w&7FW"×6GW&F–öâs¢ã#"À¢w&7FW"Ö6öçG&7Bs¢ãÀ¢w&7FW"Ö'&–v‡FæW72ÖÖ–âs¢ã"À¢w&7FW"Ö'&–v‡FæW72ÖÖ‚s¢ã“bÀ¢ÒÀ¢ÒÀ¢vF’Öæ–v‡BÖf–ÆÂrÀ¢“°¢ÒVÇ6R°¢Öç6WDÆ–÷WE&÷W'G’‚w6FVÆÆ—FRÖÆ–W"rÂwf—6–&–Æ—G’rÂwf—6–&ÆRr“°¢Ð¢ÒVÇ6R–b†ÖævWDÆ–W"‚w6FVÆÆ—FRÖÆ–W"r’’°¢Öç6WDÆ–÷WE&÷W'G’‚w6FVÆÆ—FRÖÆ–W"rÂwf—6–&–Æ—G’rÂvæöæRr“°¢Ð ¢Ç”Vv—4vÆö&U7G–Æ–ær†ÖÂ&ö¦V7F–öâÂÖ7G–ÆR“°¢Ò6F6‚†R’°¢6öç6öÆRçv&â‚u7G–ÆR7v—F6‚f–ÆVC¢rÂR“°¢Ð¢ÒÂ¶Ç”Vv—4vÆö&U7G–Æ–ærÂÖ&VG’ÂÖ7G–ÆRÂ&ö¦V7F–öåÒ“° ¢&WGW&âÆF—b&Vc×¶6öçF–æW%&VgÒ6Æ74æÖSÒ&'6öÇWFR–ç6WBÓrÖgVÆÂ‚ÖgVÆÂ"óã°§Ð ¦W‡÷'BFVfVÇBÖVÖò„Vv—4Ö“°