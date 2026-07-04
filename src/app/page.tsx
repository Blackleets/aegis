'use client';

import { useEffect, useState, useRef, useCallback, useMemo, type ComponentType, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, BarChart3, X, Globe, MapPinned, Satellite, Moon, ExternalLink, AlertTriangle, Activity, Database, Wifi } from 'lucide-react';
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
import IncidentFusionStrip from '@/components/dashboard/IncidentFusionStrip';
import NasaMissionStrip, { type NasaEventItem } from '@/components/dashboard/NasaMissionStrip';
import { DEFAULT_LOCALE, getDashboardCopy, isLocale, type Locale } from '@/lib/i18n';

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
      <div className="rounded-2xl border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(5,13,22,0.72))] px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[7px] font-mono uppercase tracking-[0.24em] text-cyan-200">
          <span>AEGIS VECTOR · GPS MODE</span>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-1.5 py-0.5 text-[6px] text-emerald-100/80">REAL ROUTES</span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[6px] text-cyan-100/70">Drive · Walk · Cycle</span>
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">Elige destino, bloquea GPS y entra en navegación real</div>
        <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.12em] text-[var(--text-secondary)]">Usa tu ubicación, rutas reales y el cockpit inferior para seguir el trayecto sin tapar la Tierra.</div>
      </div>
      {routeError && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/8 px-3 py-2 text-[8px] font-mono uppercase tracking-[0.14em] text-rose-300">
          {routeError}
        </div>
      )}
      {searchBar}
      <div className="flex justify-end">
        {sharePanel}
      </div>
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

/** Extracts a watchable YouTube URL from embed/channel URLs */
function getYouTubeWatchUrl(url: string): string {
  if (url.includes('channel=')) return `https://www.youtube.com/channel/${url.split('channel=')[1].split('&')[0]}/live`;
  if (url.includes('/embed/')) return `https://www.youtube.com/watch?v=${url.split('/embed/')[1].split('?')[0]}`;
  return url;
}

function formatRouteDistance(distanceMeters: number) {
  return distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${distanceMeters} m`;
}

function formatRouteDuration(durationSeconds: number) {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.max(1, Math.round((durationSeconds % 3600) / 60));
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

function formatCoordinateLabel(coordinate: Coordinate) {
  return `${coordinate.lat.toFixed(3)}, ${coordinate.lng.toFixed(3)}`;
}

function formatStepDistance(distanceMeters: number) {
  return distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${Math.max(1, Math.round(distanceMeters))} m`;
}

function formatRouteModeLabel(mode: 'driving' | 'walking' | 'cycling') {
  if (mode === 'walking') return 'WALK';
  if (mode === 'cycling') return 'CYCLE';
  return 'DRIVE';
}

function formatEtaLabel(durationSeconds: number) {
  const eta = new Date(Date.now() + durationSeconds * 1000);
  return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatProgressLabel(completedDistance: number, totalDistance: number) {
  if (totalDistance <= 0) return '0%';
  const ratio = Math.max(0, Math.min(1, completedDistance / totalDistance));
  return `${Math.round(ratio * 100)}%`;
}

function computeBearing(from: Coordinate, to: Coordinate) {
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function distanceMetersBetween(a: Coordinate, b: Coordinate) {
  const R = 6371000;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function distanceToRouteStep(position: Coordinate, step: RouteStep) {
  const points = step.geometry.length > 0
    ? step.geometry.map(([lng, lat]) => ({ lat, lng }))
    : step.maneuver.location
      ? [{ lat: step.maneuver.location[1], lng: step.maneuver.location[0] }]
      : [];
  if (!points.length) return Number.POSITIVE_INFINITY;
  return Math.min(...points.map((point) => distanceMetersBetween(position, point)));
}

function getClosestStepIndex(position: Coordinate, steps: RouteStep[]) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  steps.forEach((step, index) => {
    const distance = distanceToRouteStep(position, step);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function distanceToRoutePath(position: Coordinate, coordinates: [number, number][]) {
  if (!coordinates.length) return Number.POSITIVE_INFINITY;
  let bestDistance = Number.POSITIVE_INFINITY;
  const stride = coordinates.length > 180 ? 3 : 1;
  for (let index = 0; index < coordinates.length; index += stride) {
    const [lng, lat] = coordinates[index];
    const distance = distanceMetersBetween(position, { lat, lng });
    if (distance < bestDistance) bestDistance = distance;
  }
  return bestDistance;
}

function getItemCoordinate(item: unknown): Coordinate | null {
  if (!item || typeof item !== 'object') return null;
  const candidate = item as { lat?: unknown; lng?: unknown; coords?: unknown };
  if (typeof candidate.lat === 'number' && typeof candidate.lng === 'number') {
    return { lat: candidate.lat, lng: candidate.lng };
  }
  if (Array.isArray(candidate.coords) && candidate.coords.length >= 2 && typeof candidate.coords[0] === 'number' && typeof candidate.coords[1] === 'number') {
    return { lng: candidate.coords[0], lat: candidate.coords[1] };
  }
  return null;
}

function countSignalsNearRoute(items: unknown[] | undefined, routeCoordinates: [number, number][], thresholdMeters: number) {
  if (!Array.isArray(items) || !items.length || routeCoordinates.length < 2) return 0;
  return items.reduce((count, item) => {
    const coordinate = getItemCoordinate(item);
    if (!coordinate) return count;
    return distanceToRoutePath(coordinate, routeCoordinates) <= thresholdMeters ? count + 1 : count;
  }, 0);
}

type Coordinate = { lat: number; lng: number };
type BoundingBox = [west: number, south: number, east: number, north: number];
type FlyToLocation = Coordinate & { ts: number; zoom?: number; bbox?: BoundingBox | null; label?: string };
type MapView = { zoom: number; latitude: number };
type ActiveLayers = Record<string, boolean>;

interface RouteStep {
  index: number;
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  name: string;
  mode: string;
  maneuver: {
    type: string;
    modifier: string | null;
    location: [number, number] | null;
    bearingAfter: number | null;
    bearingBefore: number | null;
    exit: number | null;
  };
  geometry: [number, number][];
}

interface RouteOption {
  id: string;
  label: string;
  coordinates: [number, number][];
  bbox?: BoundingBox | null;
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
}

interface RouteRiskSummary {
  score: number;
  level: 'low' | 'elevated' | 'high';
  nearbySignals: number;
  counts: {
    incidents: number;
    earthquakes: number;
    weather: number;
    fires: number;
    jamming: number;
  };
}

interface RouteSnapshot {
  origin: Coordinate;
  destination: FlyToLocation;
  waypoints: FlyToLocation[];
  mode: 'driving' | 'walking' | 'cycling';
  activeRouteId: string;
  coordinates: [number, number][];
  bbox?: BoundingBox | null;
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
  alternatives: RouteOption[];
}

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
    timezones?: string[];
  };
  head_of_state?: { name?: string; position?: string };
  wikipedia?: { thumbnail?: string; extract?: string };
  live_context?: {
    local_time?: string;
    timezone?: string;
    timezone_abbr?: string;
    weather?: {
      temperature_c?: number;
      feels_like_c?: number;
      wind_kmh?: number;
      summary?: string;
      is_day?: boolean;
    };
    nearby_cameras?: {
      count?: number;
      countries?: string[];
      closest?: {
        name?: string;
        city?: string;
        country?: string;
        source?: string;
        distance_km?: number;
      };
    };
    nearby_weather?: {
      count?: number;
      radius_km?: number;
    };
  };
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
    if (!navigationActive || !routeSnapshot || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const heading = typeof position.coords.heading === 'number' && Number.isFinite(position.coords.heading)
          ? position.coords.heading
          : null;

        setUserLocation(nextLocation);

        const previous = lastNavigationLocationRef.current;
        const computedBearing = heading ?? (previous ? computeBearing(previous, nextLocation) : null);
        if (computedBearing !== null) setNavigationBearing(computedBearing);

        if (routeSnapshot.steps.length > 0) {
          setCurrentRouteStepIndex(getClosestStepIndex(nextLocation, routeSnapshot.steps));
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
  }, [navigationActive, routeSnapshot]);

  const clearNavigationState = useCallback(() => {
    setRouteSnapshot(null);
    setUserLocation(null);
    setRouteError(null);
    setNavigationActive(false);
    setNavigationBearing(null);
    setCurrentRouteStepIndex(0);
    lastNavigationLocationRef.current = null;
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

  const currentRouteStep = routeSnapshot?.steps?.[currentRouteStepIndex] ?? null;
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
    ? 'ROUTING'
    : navigationActive
      ? 'FOLLOW LIVE'
      : routeSnapshot
        ? 'ROUTE READY'
        : userLocation
          ? 'GPS LOCKED'
          : 'GPS REQUIRED';

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
          sweepData={sweepData as { center: { lat: number; lng: number }; devices: unknown[] } | null}
          scanTargets={scanTargets}
          currentLocation={userLocation}
          routeDestination={routeSnapshot?.destination ? { lat: routeSnapshot.destination.lat, lng: routeSnapshot.destination.lng } : null}
          routePath={routeSnapshot?.coordinates ?? []}
          navigationActive={navigationActive}
          navigationBearing={navigationBearing}
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
          setShowSplash(false);
          setDashboardMode('solar');
          setSelectedCelestialBody(prev => prev === 'earth' ? 'mars' : prev);
        }}
        onFocus={() => {
          setShowSplash(false);
          setDashboardMode('focus');
          setSelectedCelestialBody('earth');
        }}
      />

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
                      <div className="text-[8px] font-mono uppercase tracking-[0.28em] text-cyan-200">AEGIS VECTOR · GPS</div>
                      <div className="mt-1 text-[10px] font-semibold tracking-[0.06em] text-white">
                        {routeLoading ? 'Plotting route from live position…' : 'Immersive nav opens from the edge, not over Earth'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVectorDockOpen(false)}
                      className="rounded-full border border-white/10 px-2 py-1 text-[8px] font-mono text-[var(--text-muted)] hover:text-white"
                      aria-label="Close AEGIS VECTOR dock"
                    >
                      Close
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
                  <div className="mt-2 rounded-2xl border border-cyan-300/14 bg-cyan-400/[0.055] px-3 py-2 text-[7px] font-mono uppercase tracking-[0.15em] text-cyan-100/65">
                    GPS / route mode stays docked aside so the planet remains the scene.
                  </div>
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

      {!isMobile && earthNavigationMode && routeSnapshot && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
          className="absolute right-4 top-[6.25rem] z-[210] w-[min(24rem,calc(100vw-3rem))] pointer-events-auto md:right-5"
        >
          <div className="rounded-[1.35rem] border border-cyan-400/18 bg-[rgba(8,18,28,0.88)] px-3.5 py-3 shadow-[0_18px_52px_rgba(0,0,0,0.24)] backdrop-blur-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8 shrink-0 rounded-xl border border-cyan-400/20 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),rgba(8,18,28,0.08)_55%,rgba(8,18,28,0.02)_78%)]">
                    <div className="absolute inset-[5px] rounded-full border border-cyan-400/18" />
                    <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300" />
                  </div>
                  <div className="text-[8px] font-mono uppercase tracking-[0.26em] text-cyan-300">VECTOR MODE</div>
                </div>
                <div className="mt-1 text-sm font-semibold tracking-[0.06em] text-white">{routeSnapshot.destination.label}</div>
                <div className="mt-2 grid gap-2 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)] sm:grid-cols-2">
                  <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                    <div className="text-[7px] tracking-[0.2em] text-cyan-300">From</div>
                    <div className="mt-1 text-[10px] font-semibold tracking-[0.05em] text-white">Live position</div>
                    <div className="mt-0.5 text-[8px] text-[var(--text-secondary)]">{formatCoordinateLabel(routeSnapshot.origin)}</div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                    <div className="text-[7px] tracking-[0.2em] text-cyan-300">To</div>
                    <div className="mt-1 truncate text-[10px] font-semibold tracking-[0.05em] text-white">{routeSnapshot.destination.label}</div>
                    <div className="mt-0.5 text-[8px] text-[var(--text-secondary)]">{formatCoordinateLabel(routeSnapshot.destination)}</div>
                  </div>
                </div>
                {routeSnapshot.waypoints.length > 0 && (
                  <div className="mt-2 rounded-xl border border-[rgba(212,175,55,0.14)] bg-[rgba(212,175,55,0.06)] px-2.5 py-2">
                    <div className="text-[7px] font-mono uppercase tracking-[0.18em] text-[var(--gold-primary)]">Stops</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[7px] font-mono uppercase tracking-[0.14em] text-white/85">
                      {routeSnapshot.waypoints.map((waypoint, index) => (
                        <span key={`${waypoint.label}-${index}-${waypoint.lat}-${waypoint.lng}`} className="rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-2 py-1">
                          S{index + 1} · {waypoint.label ?? formatCoordinateLabel(waypoint)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-cyan-400/14 bg-cyan-400/[0.06] px-2.5 py-2">
                    <div className="text-[7px] font-mono uppercase tracking-[0.18em] text-cyan-300">Mode</div>
                    <div className="mt-1 text-[11px] font-semibold tracking-[0.05em] text-white">{formatRouteModeLabel(routeSnapshot.mode)}</div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                    <div className="text-[7px] font-mono uppercase tracking-[0.18em] text-cyan-300">Remaining</div>
                    <div className="mt-1 text-[11px] font-semibold tracking-[0.05em] text-white">{formatRouteDistance(remainingRouteDistance || routeSnapshot.distanceMeters)}</div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                    <div className="text-[7px] font-mono uppercase tracking-[0.18em] text-cyan-300">ETA</div>
                    <div className="mt-1 text-[11px] font-semibold tracking-[0.05em] text-white">{routeEtaLabel}</div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                    <div className="text-[7px] font-mono uppercase tracking-[0.18em] text-cyan-300">Progress</div>
                    <div className="mt-1 text-[11px] font-semibold tracking-[0.05em] text-white">{routeProgressLabel}</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  <span>{formatRouteDuration(routeSnapshot.durationSeconds)}</span>
                  <span>•</span>
                  <span>{navigationActive ? 'FOLLOW LIVE' : 'READY TO FOLLOW'}</span>
                  {routeRiskSummary && (
                    <>
                      <span>•</span>
                      <span className={routeRiskSummary.level === 'high' ? 'text-rose-300' : routeRiskSummary.level === 'elevated' ? 'text-amber-300' : 'text-emerald-300'}>
                        RISK {routeRiskSummary.score}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleNavigationFollow}
                  className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-400/18"
                >
                  {navigationActive ? 'Pause Vector' : 'Start Vector'}
                </button>
                <button
                  type="button"
                  onClick={clearNavigationState}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)] hover:text-white"
                >
                  Clear Route
                </button>
              </div>
            </div>
            {routeSnapshot.alternatives.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {routeSnapshot.alternatives.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectRouteOption(option.id)}
                    className={`rounded-full border px-2.5 py-1 text-[8px] font-mono uppercase tracking-[0.18em] transition-colors ${routeSnapshot.activeRouteId === option.id ? 'border-cyan-400/35 bg-cyan-400/14 text-cyan-200' : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)] hover:text-white'}`}
                  >
                    {option.label} · {formatRouteDuration(option.durationSeconds)}{option.id !== routeSnapshot.activeRouteId ? ` · ${option.durationSeconds >= routeSnapshot.durationSeconds ? '+' : '-'}${formatRouteDuration(Math.abs(option.durationSeconds - routeSnapshot.durationSeconds))}` : ''}
                  </button>
                ))}
              </div>
            )}
            {routeRiskSummary && (
              <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-[8px] font-mono uppercase tracking-[0.18em]">
                  <span className="text-cyan-300">Route Threat Scan</span>
                  <span className="text-[var(--text-secondary)]">{routeRiskSummary.nearbySignals} signals</span>
                  <span className={routeRiskSummary.level === 'high' ? 'text-rose-300' : routeRiskSummary.level === 'elevated' ? 'text-amber-300' : 'text-emerald-300'}>{routeRiskSummary.level}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  <span>Intel {routeRiskSummary.counts.incidents}</span>
                  <span>Quakes {routeRiskSummary.counts.earthquakes}</span>
                  <span>Weather {routeRiskSummary.counts.weather}</span>
                  <span>Fires {routeRiskSummary.counts.fires}</span>
                  <span>GPS {routeRiskSummary.counts.jamming}</span>
                </div>
              </div>
            )}
            {!routeRiskSummary && currentRouteStep && (
              <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-cyan-300">Next Turn</div>
                <div className="mt-1.5 text-[13px] font-semibold leading-snug text-white">{currentRouteStep.instruction}</div>
              </div>
            )}
            {routeRiskSummary && currentRouteStep && (
              <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-cyan-300">Next Turn</div>
                <div className="mt-1.5 text-[13px] font-semibold leading-snug text-white">{currentRouteStep.instruction}</div>
              </div>
            )}
          </div>
        </motion.div>
      )}

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

        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-primary)]/70 bg-[rgba(15,23,32,0.82)] px-2 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">{copy.status.sys} <span className={backendStatusAccentClass}>{backendStatusLabel}</span></span>

        {spaceWeather && <span className="hidden xl:inline">SOLAR: <span style={{ color: spaceWeather.storm_color, fontWeight: 700 }}>Kp{spaceWeather.kp_index}</span></span>}

        {/* Active Data Feeds */}
        <span className="hidden 2xl:inline-flex items-center gap-1">
          <Wifi className="w-3 h-3 text-[var(--cyan-primary)]" />
          <span className="text-[var(--cyan-primary)] font-bold">{activeLayerCount}</span>
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
      </motion.div>}

      {/* ── MOBILE: Compact top status ── */}
      {isMobile && showAuxiliaryHud && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="absolute top-3 right-3 z-[200] pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--border-primary)]/70 bg-[rgba(15,23,32,0.92)] px-2.5 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
            <span className={`h-1.5 w-1.5 rounded-full ${backendStatus === 'connected' ? 'bg-[var(--alert-green)]' : backendStatus === 'error' ? 'bg-[var(--alert-red)]' : 'bg-[var(--gold-primary)]'} animate-aegis-pulse`} />
            <span className="text-[7px] font-mono font-bold tracking-[0.18em] text-[var(--text-primary)]">{backendStatusLabel}</span>
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
      {showDesktopRails && <div className="desktop-panel absolute left-3.5 xl:left-4 top-20 bottom-24 xl:bottom-24 w-[14.25rem] xl:w-[15rem] 2xl:w-[15.75rem] flex flex-col gap-2 z-[200] min-h-0 pointer-events-none overflow-y-auto styled-scrollbar pr-1">
        {showLayers && (
          <>
            <LayerPanel data={dataWithSdk} activeLayers={activeLayers} setActiveLayers={setActiveLayers} locale={locale} />
            <ViewPresets locale={locale} onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMapView(v => ({ ...v, zoom })); }} />
          </>
        )}

        <div className="glass-panel pointer-events-auto overflow-hidden border border-[var(--border-primary)]/70 bg-[linear-gradient(180deg,rgba(12,21,30,0.94),rgba(15,25,36,0.9))]">
          <div className="flex items-center justify-between border-b border-[var(--border-primary)]/40 px-2.5 py-2">
            <div>
              <div className="text-[8px] font-mono tracking-[0.22em] text-[var(--text-secondary)]">{copy.status.focusedDesk}</div>
              <div className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-[var(--text-primary)]">{copy.status.focusedDeskHint}</div>
            </div>
          </div>
          <div className="flex gap-1.5 p-1.5">
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
      {showDesktopRails && <div className="desktop-panel absolute right-3.5 xl:right-4 top-20 bottom-24 xl:bottom-24 w-[14.75rem] xl:w-[15.5rem] 2xl:w-[16.25rem] flex flex-col gap-2 z-[200] min-h-0 pointer-events-auto overflow-y-auto styled-scrollbar pr-1">
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
          <div className="flex items-center justify-between border-b border-[var(--border-primary)]/45 px-3 py-2">
            <div>
              <div className="text-[8px] font-mono tracking-[0.26em] text-[var(--text-secondary)]">{copy.status.commandRail}</div>
              <div className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-[var(--text-primary)]">{commandRailFocus}</div>
            </div>
            <div className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-1 text-[7px] font-mono tracking-[0.16em] text-[var(--cyan-primary)]">
              {copy.status.searchShareRecon}
            </div>
          </div>
          <div className="space-y-2 p-2.5">
            <div className="rounded-2xl border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(7,15,24,0.38))] px-3 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.14)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[8px] font-mono tracking-[0.24em] text-cyan-300">AEGIS VECTOR PINNED</div>
                  <div className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">
                    {routeSnapshot ? 'Active route stays in the compact nav cockpit' : routeLoading ? 'Routing in progress from live GPS' : 'GPS route dock is reinforced at the Earth edge'}
                  </div>
                </div>
                <div className={`rounded-full border px-2 py-1 text-[7px] font-mono tracking-[0.16em] ${routeSnapshot || routeLoading ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200' : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)]'}`}>
                  {routeSnapshot ? 'ACTIVE' : routeLoading ? 'ROUTING' : 'PINNED'}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Visible above the globe so it no longer gets buried in this rail.
                </div>
                <div className="relative shrink-0">
                  <SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[7px] font-mono tracking-[0.16em] text-[var(--text-muted)]">
              {copy.status.searchRailHint}
            </div>
            {(routeSnapshot || routeLoading) && (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-mono tracking-[0.22em] text-cyan-300">NAV COCKPIT</div>
                    <div className="mt-1 text-[11px] font-semibold text-[var(--text-primary)]">
                      {routeLoading ? 'Calculando ruta…' : routeSnapshot?.destination.label}
                    </div>
                    {routeSnapshot && (
                      <div className="mt-2 rounded-xl border border-[rgba(212,175,55,0.14)] bg-[rgba(212,175,55,0.06)] px-2.5 py-2">
                        <div className="text-[7px] font-mono uppercase tracking-[0.18em] text-[var(--gold-primary)]">Stops</div>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[7px] font-mono uppercase tracking-[0.14em] text-white/85">
                          {routeSnapshot.waypoints.length > 0 ? routeSnapshot.waypoints.map((waypoint, index) => (
                            <span key={`${waypoint.label}-${index}-${waypoint.lat}-${waypoint.lng}`} className="rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-2 py-1">
                              S{index + 1}
                            </span>
                          )) : <span className="text-[var(--text-secondary)]">Direct route</span>}
                        </div>
                      </div>
                    )}
                    {routeSnapshot && (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                          <div className="text-cyan-300">Mode</div>
                          <div className="mt-1 text-[10px] font-semibold text-white">{formatRouteModeLabel(routeSnapshot.mode)}</div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                          <div className="text-cyan-300">ETA</div>
                          <div className="mt-1 text-[10px] font-semibold text-white">{routeEtaLabel}</div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                          <div className="text-cyan-300">Remaining</div>
                          <div className="mt-1 text-[10px] font-semibold text-white">{formatRouteDistance(remainingRouteDistance || routeSnapshot.distanceMeters)}</div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                          <div className="text-cyan-300">Progress</div>
                          <div className="mt-1 text-[10px] font-semibold text-white">{routeProgressLabel}</div>
                        </div>
                      </div>
                    )}
                    {routeSnapshot && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        <span>{formatRouteDuration(routeSnapshot.durationSeconds)}</span>
                        <span>•</span>
                        <span>{navigationActive ? '3D FOLLOW' : 'ROUTE LOCKED'}</span>
                        {routeRiskSummary && (
                          <>
                            <span>•</span>
                            <span className={routeRiskSummary.level === 'high' ? 'text-rose-300' : routeRiskSummary.level === 'elevated' ? 'text-amber-300' : 'text-emerald-300'}>RISK {routeRiskSummary.score}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {routeSnapshot && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={toggleNavigationFollow}
                        className="rounded-full border border-cyan-400/25 px-2 py-1 text-[7px] font-mono uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-400/10"
                      >
                        {navigationActive ? 'Pause Follow' : 'Start 3D Nav'}
                      </button>
                      <button
                        type="button"
                        onClick={clearNavigationState}
                        className="rounded-full border border-white/10 px-2 py-1 text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)] hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                {routeSnapshot?.alternatives.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {routeSnapshot.alternatives.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectRouteOption(option.id)}
                        className={`rounded-full border px-2 py-1 text-[7px] font-mono uppercase tracking-[0.16em] ${routeSnapshot.activeRouteId === option.id ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200' : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)] hover:text-white'}`}
                      >
                        {option.label} · {formatRouteDuration(option.durationSeconds)}{option.id !== routeSnapshot.activeRouteId ? ` · ${option.durationSeconds >= routeSnapshot.durationSeconds ? '+' : '-'}${formatRouteDuration(Math.abs(option.durationSeconds - routeSnapshot.durationSeconds))}` : ''}
                      </button>
                    ))}
                  </div>
                ) : null}
                {routeRiskSummary && (
                  <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    Threat scan · intel {routeRiskSummary.counts.incidents} · quakes {routeRiskSummary.counts.earthquakes} · weather {routeRiskSummary.counts.weather} · fires {routeRiskSummary.counts.fires} · gps {routeRiskSummary.counts.jamming}
                  </div>
                )}
                {routeSnapshot && currentRouteStep && (
                  <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                    <div className="text-[7px] font-mono tracking-[0.18em] text-cyan-300">NEXT MANEUVER</div>
                    <div className="mt-2 text-[12px] font-semibold leading-snug text-white">{currentRouteStep.instruction}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      <span>{formatStepDistance(currentRouteStep.distanceMeters)}</span>
                      <span>•</span>
                      <span>{formatRouteDistance(remainingRouteDistance || routeSnapshot.distanceMeters)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
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

      {showAuxiliaryHud && <AiAnalyst data={dataWithSdk} hideMobileTrigger />}

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
          {(routeSnapshot || routeLoading) && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.24 }}
              className="fixed bottom-[4.35rem] left-2 right-2 z-[360] pointer-events-auto"
            >
              <div className="overflow-hidden rounded-[1.15rem] border border-cyan-300/24 bg-[rgba(5,13,22,0.88)] shadow-[0_14px_40px_rgba(0,0,0,0.30),0_0_18px_rgba(34,211,238,0.10)] backdrop-blur-lg">
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <div className="relative h-8 w-8 shrink-0 rounded-full border border-cyan-300/28 bg-cyan-400/10">
                    <div className="absolute inset-[6px] rounded-full border border-cyan-200/30" />
                    <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[6px] font-mono uppercase tracking-[0.22em] text-cyan-300">
                      <span>AEGIS VECTOR MODE</span>
                      <span className={`rounded-full border px-1.5 py-0.5 text-[5px] ${navigationActive ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : routeSnapshot ? 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100/80' : 'border-amber-300/25 bg-amber-300/10 text-amber-200'}`}>{mobileVectorStatusLabel}</span>
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-1.5 py-0.5 text-[5px] text-emerald-100/75">FROM GPS</span>
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 text-[5px] text-cyan-100/75">Map clear</span>
                    </div>
                    <div className="mt-0.5 truncate text-[10px] font-semibold tracking-[0.04em] text-white">
                      {routeLoading ? 'Calculando ruta desde tu GPS…' : routeSnapshot?.destination.label}
                    </div>
                    {routeSnapshot && (
                      <div className="mt-1 rounded-xl border border-[rgba(212,175,55,0.14)] bg-[rgba(212,175,55,0.06)] px-2 py-1.5">
                        <div className="text-[6px] font-mono uppercase tracking-[0.18em] text-[var(--gold-primary)]">Stops</div>
                        <div className="mt-1 flex flex-wrap gap-1 text-[6px] font-mono uppercase tracking-[0.12em] text-white/85">
                          {routeSnapshot.waypoints.length > 0 ? routeSnapshot.waypoints.map((waypoint, index) => (
                            <span key={`${waypoint.label}-${index}-${waypoint.lat}-${waypoint.lng}`} className="rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-1.5 py-0.5">
                              S{index + 1}
                            </span>
                          )) : <span className="text-[var(--text-secondary)]">Direct route</span>}
                        </div>
                      </div>
                    )}
                    {routeSnapshot && (
                      <div className="mt-1 grid grid-cols-2 gap-1.5 text-[6px] font-mono uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
                          <div className="text-cyan-300">From</div>
                          <div className="mt-0.5 truncate text-[8px] font-semibold text-white">Live GPS</div>
                          <div className="mt-0.5 text-[6px] text-[var(--text-secondary)]">{formatCoordinateLabel(routeSnapshot.origin)}</div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
                          <div className="text-cyan-300">To</div>
                          <div className="mt-0.5 truncate text-[8px] font-semibold text-white">{routeSnapshot.destination.label}</div>
                          <div className="mt-0.5 text-[6px] text-[var(--text-secondary)]">{formatCoordinateLabel(routeSnapshot.destination)}</div>
                        </div>
                      </div>
                    )}
                    {routeSnapshot && (
                      <div className="mt-1 grid grid-cols-2 gap-1.5 text-[6px] font-mono uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
                          <div className="text-cyan-300">Mode</div>
                          <div className="mt-0.5 text-[8px] font-semibold text-white">{formatRouteModeLabel(routeSnapshot.mode)}</div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
                          <div className="text-cyan-300">ETA</div>
                          <div className="mt-0.5 text-[8px] font-semibold text-white">{routeEtaLabel}</div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
                          <div className="text-cyan-300">Remain</div>
                          <div className="mt-0.5 text-[8px] font-semibold text-white">{formatRouteDistance(remainingRouteDistance || routeSnapshot.distanceMeters)}</div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
                          <div className="text-cyan-300">Progress</div>
                          <div className="mt-0.5 text-[8px] font-semibold text-white">{routeProgressLabel}</div>
                        </div>
                      </div>
                    )}
                    {routeSnapshot && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[7px] font-mono uppercase tracking-[0.13em] text-[var(--text-secondary)]">
                        <span>{formatRouteDuration(routeSnapshot.durationSeconds)}</span>
                        <span>•</span>
                        <span className={navigationActive ? 'text-emerald-300' : 'text-cyan-200'}>{navigationActive ? 'FOLLOW LIVE' : 'READY'}</span>
                        {routeRiskSummary && <span className={routeRiskSummary.level === 'high' ? 'text-rose-300' : routeRiskSummary.level === 'elevated' ? 'text-amber-300' : 'text-emerald-300'}>RISK {routeRiskSummary.score}</span>}
                      </div>
                    )}
                  </div>
                  {routeSnapshot && (
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={toggleNavigationFollow}
                        className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[6px] font-mono uppercase tracking-[0.16em] text-cyan-100"
                      >
                        {navigationActive ? 'Pause' : 'Go'}
                      </button>
                      <button
                        type="button"
                        onClick={clearNavigationState}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[6px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                {routeSnapshot && currentRouteStep && (
                  <div className="border-t border-cyan-300/12 bg-cyan-400/[0.045] px-3 py-2">
                    <div className="text-[6px] font-mono uppercase tracking-[0.22em] text-cyan-300">Next maneuver</div>
                    <div className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-snug text-white/90">{currentRouteStep.instruction}</div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Mobile Bottom Navigation */}
          <div className="mobile-nav">
            <div className="glass-panel mobile-nav-inner">
              {mobileNavTabs.map(tab => (
                <button key={tab.id} onClick={() => setMobilePanel(mobilePanel === tab.id ? null : tab.id)}
                  className={`mobile-nav-btn ${mobilePanel === tab.id ? 'active' : ''}`}>
                  <tab.icon className={`w-4 h-4 ${tab.accent ? 'text-[var(--cyan-primary)]' : ''}`} />
                  <span className={tab.accent ? 'text-[var(--cyan-primary)]' : ''}>{tab.label}</span>
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
                style={{ maxHeight: mobilePanel === 'search' ? 'min(42vh, calc(100dvh - 130px))' : 'min(55vh, calc(100dvh - 100px))', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
              >
                <div className="mobile-drawer-handle" />
                <div className="px-3 pb-3">
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
                  {mobilePanel === 'layers' && (
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
                  {mobilePanel === 'markets' && <MarketsPanel data={data} spaceWeather={spaceWeather} />}
                  {mobilePanel === 'intel' && <IntelFeed data={data} onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />}
                  {mobilePanel === 'search' && (
                    <MobileSearchPanel
                      routeError={routeError}
                      searchBar={<SearchBar defaultOpen onLocate={(result) => { setFlyToLocation({ lat: result.lat, lng: result.lng, zoom: result.zoom, bbox: result.bbox, label: result.label, ts: Date.now() }); setMobilePanel(null); }} onRoute={async (request) => { await handleRouteRequest(request); setMobilePanel(null); }} />}
                      sharePanel={<SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} />}
                    />
                  )}
                  {mobilePanel === 'recon' && (
                    <MobileReconPanel
                      osintPanel={(
                        <>
                          <AegisAnalystDockButton />
                          <OsintPanel isOpen={true} onClose={() => setMobilePanel(null)} isMobile={true} onSweepVisualize={setSweepData} />
                        </>
                      )}
                    />
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
                <span className="text-[10px] font-mono font-bold text-[var(--gold-primary)] tabular-nums">{activeLayerCount}</span>
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
                {regionDossier.live_context && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="hud-label mb-0.5">LIVE TERRITORY CONTEXT</div>
                        <div className="text-[8px] text-[var(--text-muted)] tracking-[0.2em]">WEATHER • CLOCK • CAMERAS</div>
                      </div>
                      {regionDossier.live_context.local_time && (
                        <div className="text-right">
                          <div className="text-xs font-mono text-[var(--text-primary)]">{regionDossier.live_context.local_time}</div>
                          <div className="text-[8px] text-[var(--text-muted)]">{regionDossier.live_context.timezone_abbr || regionDossier.live_context.timezone}</div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/8 bg-black/20 p-2">
                        <div className="hud-label mb-1">SURFACE WEATHER</div>
                        <div className="text-xs text-[var(--text-primary)]">{regionDossier.live_context.weather?.summary || 'Unavailable'}</div>
                        <div className="text-[8px] text-[var(--text-muted)] mt-1">
                          {typeof regionDossier.live_context.weather?.temperature_c === 'number' ? `${Math.round(regionDossier.live_context.weather.temperature_c)}°C` : '—'}
                          {typeof regionDossier.live_context.weather?.feels_like_c === 'number' ? ` • feels ${Math.round(regionDossier.live_context.weather.feels_like_c)}°C` : ''}
                        </div>
                        <div className="text-[8px] text-[var(--text-muted)] mt-0.5">
                          {typeof regionDossier.live_context.weather?.wind_kmh === 'number' ? `Wind ${Math.round(regionDossier.live_context.weather.wind_kmh)} km/h` : 'No wind telemetry'}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-black/20 p-2">
                        <div className="hud-label mb-1">NEARBY CAMERAS</div>
                        <div className="text-xs text-[var(--text-primary)]">{regionDossier.live_context.nearby_cameras?.count ?? 0} live feeds</div>
                        <div className="text-[8px] text-[var(--text-muted)] mt-1">
                          {regionDossier.live_context.nearby_cameras?.countries?.length ? regionDossier.live_context.nearby_cameras.countries.join(', ') : 'No regional feed clusters'}
                        </div>
                        <div className="text-[8px] text-[var(--text-muted)] mt-0.5">
                          {regionDossier.live_context.nearby_cameras?.closest?.name
                            ? `${regionDossier.live_context.nearby_cameras.closest.name} • ${regionDossier.live_context.nearby_cameras.closest.distance_km?.toFixed?.(1) ?? regionDossier.live_context.nearby_cameras.closest.distance_km} km`
                            : 'No close camera selected'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/8 bg-black/20 p-2">
                        <div className="hud-label mb-1">NEARBY WEATHER EVENTS</div>
                        <div className="text-xs text-[var(--text-primary)]">{regionDossier.live_context.nearby_weather?.count ?? 0} open markers</div>
                        <div className="text-[8px] text-[var(--text-muted)] mt-1">Within {regionDossier.live_context.nearby_weather?.radius_km ?? 0} km of the selected territory</div>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-black/20 p-2">
                        <div className="hud-label mb-1">TIME ZONE</div>
                        <div className="text-xs text-[var(--text-primary)]">{regionDossier.live_context.timezone_abbr || regionDossier.live_context.timezone || 'Unavailable'}</div>
                        <div className="text-[8px] text-[var(--text-muted)] mt-1">Live context updates when you right-click or tap supported events.</div>
                      </div>
                    </div>
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
