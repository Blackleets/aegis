'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, MapPin, Navigation, LocateFixed, Route, Car, Footprints, Bike, Sparkles, Radar, Crosshair, Plus, Flag, GitCommitHorizontal } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   AEGIS — Search / Locate Bar
   Coordinate and place name search with geocoding + route from user location
   ═══════════════════════════════════════════════════════════════ */

export interface SearchResult {
  label: string;
  lat: number;
  lng: number;
  bbox?: [west: number, south: number, east: number, north: number] | null;
  zoom?: number;
  kind?: string;
}

export interface RouteRequest {
  destination: SearchResult;
  origin: { lat: number; lng: number };
  mode: 'driving' | 'walking' | 'cycling';
  waypoints: SearchResult[];
}

interface SearchBarProps {
  onLocate: (result: SearchResult) => void;
  onRoute?: (request: RouteRequest) => void | Promise<void>;
  defaultOpen?: boolean;
  variant?: 'default' | 'mobile-nav';
}


type GeoState = 'idle' | 'locating' | 'ready' | 'denied' | 'error';

type NavigatorWithPermissions = Navigator & {
  permissions?: {
    query?: (descriptor: { name: 'geolocation' }) => Promise<{ state: PermissionState }>;
  };
};

const MAX_WAYPOINTS = 3;

function formatCoordinateChip(lat: number, lng: number) {
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

function sameResult(a: SearchResult, b: SearchResult) {
  return a.label === b.label && Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lng - b.lng) < 0.000001;
}

const ROUTE_MODE_META = {
  driving: {
    label: 'Coche',
    detail: 'Ruta más rápida',
    Icon: Car,
  },
  walking: {
    label: 'A pie',
    detail: 'Trayecto peatonal',
    Icon: Footprints,
  },
  cycling: {
    label: 'Bici',
    detail: 'Ruta urbana equilibrada',
    Icon: Bike,
  },
} as const;

function SearchBar({ onLocate, onRoute, defaultOpen = false, variant = 'default' }: SearchBarProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [value, setValue] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [geoError, setGeoError] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routingLabel, setRoutingLabel] = useState<string | null>(null);
  const [routeMode, setRouteMode] = useState<'driving' | 'walking' | 'cycling'>('driving');
  const [draftWaypoints, setDraftWaypoints] = useState<SearchResult[]>([]);
  const [lastResolvedQuery, setLastResolvedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchSeqRef = useRef(0);
  const quickSearches = ['Madrid', 'Ukraine', '40.4168,-3.7038'] as const;
  const normalizedQuery = value.trim();
  const showNoResults = normalizedQuery.length >= 2 && !loading && results.length === 0 && lastResolvedQuery === normalizedQuery;
  const isMobileNav = variant === 'mobile-nav';


  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as NavigatorWithPermissions;
    if (!nav.permissions?.query) return;

    let active = true;
    void nav.permissions.query({ name: 'geolocation' }).then((permission) => {
      if (!active) return;
      if (permission.state === 'denied') {
        setGeoState('denied');
        setGeoError('GPS bloqueado por el navegador. Toca el candado del sitio y permite ubicación para activar AEGIS VECTOR.');
      }
    }).catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      searchAbortRef.current?.abort();
    };
  }, []);

  const parseCoords = (s: string): { lat: number; lng: number } | null => {
    const m = s.trim().match(/^([+-]?\d+\.?\d*)[,\s]+([+-]?\d+\.?\d*)$/);
    if (!m) return null;
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
    return null;
  };

  const requestCurrentLocation = useCallback(async () => {
    if (currentLocation) {
      setGeoState('ready');
      return currentLocation;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoState('error');
      setGeoError('Geolocalización no disponible');
      return null;
    }

    const nav = navigator as NavigatorWithPermissions;
    if (nav.permissions?.query) {
      try {
        const permission = await nav.permissions.query({ name: 'geolocation' });
        if (permission.state === 'denied') {
          setGeoState('denied');
          setGeoError('GPS bloqueado por el navegador. En Chrome móvil: candado del sitio → Permisos → Ubicación → Permitir.');
          return null;
        }
      } catch {
        // Some mobile browsers do not expose permission state reliably. Fall through to native prompt.
      }
    }

    setGeoState('locating');
    setGeoError('');

    return new Promise<{ lat: number; lng: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(nextLocation);
          setGeoState('ready');
          resolve(nextLocation);
        },
        (error) => {
          const denied = error.code === error.PERMISSION_DENIED;
          setGeoState(denied ? 'denied' : 'error');
          setGeoError(denied ? 'GPS bloqueado por el navegador. Abre permisos del sitio y permite ubicación; luego pulsa Reintentar GPS.' : 'No se pudo obtener tu ubicación. Reintenta en exterior o activa alta precisión.');
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        },
      );
    });
  }, [currentLocation]);

  const handleSearch = useCallback(async (q: string) => {
    setValue(q);
    const coords = parseCoords(q);
    if (coords) {
      searchAbortRef.current?.abort();
      setResults([{ label: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`, ...coords, zoom: 12, kind: 'coordinates' }]);
      setLastResolvedQuery(q.trim());
      setLoading(false);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.trim().length < 2) {
      searchAbortRef.current?.abort();
      setResults([]);
      setLastResolvedQuery('');
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      const seq = ++searchSeqRef.current;
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&limit=6`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = await res.json();
        if (seq === searchSeqRef.current) {
          setResults(Array.isArray(data.results) ? data.results : []);
          setLastResolvedQuery(q.trim());
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        setResults([]);
        setLastResolvedQuery(q.trim());
      } finally {
        if (seq === searchSeqRef.current) {
          setLoading(false);
        }
      }
    }, 350);
  }, []);

  const resetAndClose = () => {
    setOpen(false);
    setValue('');
    setResults([]);
    setLoading(false);
    setLastResolvedQuery('');
    setRoutingLabel(null);
    setDraftWaypoints([]);
  };

  const handleSelect = (r: SearchResult) => {
    onLocate(r);
    resetAndClose();
  };

  const handleLocateMe = async () => {
    const location = await requestCurrentLocation();
    if (!location) return;
    onLocate({
      label: 'My location',
      lat: location.lat,
      lng: location.lng,
      zoom: 13,
      kind: 'user_location',
    });
  };

  const addWaypoint = (result: SearchResult) => {
    setDraftWaypoints((current) => {
      if (current.some((candidate) => sameResult(candidate, result))) return current;
      if (current.length >= MAX_WAYPOINTS) return current;
      return [...current, result];
    });
  };

  const removeWaypoint = (result: SearchResult) => {
    setDraftWaypoints((current) => current.filter((candidate) => !sameResult(candidate, result)));
  };

  const handleRoute = async (result: SearchResult) => {
    if (!onRoute) return;
    const location = await requestCurrentLocation();
    if (!location) return;
    setRoutingLabel(result.label);
    try {
      await onRoute({ origin: location, destination: result, mode: routeMode, waypoints: draftWaypoints });
      resetAndClose();
    } finally {
      setRoutingLabel(null);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={isMobileNav
          ? "inline-flex w-full items-center justify-between gap-3 rounded-[1.4rem] border border-cyan-300/24 bg-[linear-gradient(135deg,rgba(7,20,31,0.96),rgba(10,27,38,0.88))] px-4 py-3 text-left text-cyan-100 shadow-[0_18px_34px_rgba(0,0,0,0.28),0_0_18px_rgba(34,211,238,0.10)] transition-all hover:border-cyan-300/45 hover:bg-[linear-gradient(135deg,rgba(10,24,35,0.98),rgba(12,32,44,0.92))]"
          : "inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/[0.10] px-3.5 py-2 text-[9px] font-mono uppercase tracking-[0.16em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.10)] transition-all hover:border-cyan-300/55 hover:bg-cyan-400/[0.16] hover:text-white hover:shadow-[0_0_24px_rgba(34,211,238,0.18)]"}
      >
        {isMobileNav ? (
          <>
            <span className="flex min-w-0 items-center gap-3">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/28 bg-cyan-300/10">
                <Search className="h-4 w-4" />
                <span className="absolute inset-[7px] rounded-xl border border-cyan-200/16" />
              </span>
              <span className="min-w-0">
                <span className="block text-[9px] font-mono uppercase tracking-[0.22em] text-cyan-300">GPS</span>
                <span className="mt-1 block truncate text-[13px] font-semibold tracking-[0.03em] text-white">{geoState === 'ready' && currentLocation ? 'Buscar destino desde tu GPS' : 'Buscar destino y abrir navegación'}</span>
                <span className="mt-1 block text-[10px] text-cyan-100/62">{geoState === 'ready' && currentLocation ? `GPS listo · ${formatCoordinateChip(currentLocation.lat, currentLocation.lng)}` : 'Directo, limpio y rápido'}</span>
              </span>
            </span>
            <span className="rounded-full border border-cyan-300/22 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.18em] text-cyan-100">ABRIR</span>
          </>
        ) : (
          <>
            <span className="relative flex h-4 w-4 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-300/10">
              <Search className="w-2.5 h-2.5" />
            </span>
            {geoState === 'ready' && currentLocation ? `VECTOR GPS · ${formatCoordinateChip(currentLocation.lat, currentLocation.lng)}` : 'OPEN VECTOR NAV'}
          </>
        )}
      </button>
    );
  }

  return (
    <div className={`relative w-full space-y-2 ${isMobileNav ? 'space-y-3' : ''}`}>
      {isMobileNav ? null : (
        <div className="rounded-[1.55rem] border border-cyan-300/20 bg-[linear-gradient(145deg,rgba(5,14,24,0.96),rgba(9,23,34,0.90))] px-3.5 py-3 shadow-[0_22px_44px_rgba(0,0,0,0.28)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.24em] text-cyan-300">Mobile route shell</div>
              <div className="mt-1 text-[14px] font-semibold tracking-[0.02em] text-white">Busca, fija origen y navega sin tapar el mapa</div>
            </div>
            <div className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.18em] text-cyan-100">GPS</div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
              <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-cyan-300">Destino</div>
              <div className="mt-1 text-[11px] font-semibold text-white">Búsqueda directa</div>
              <div className="mt-1 text-[9px] text-cyan-100/62">Ciudad, dirección o lat,lng</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
              <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-emerald-300">Origen</div>
              <div className="mt-1 text-[11px] font-semibold text-white">GPS del móvil</div>
              <div className="mt-1 text-[9px] text-emerald-100/62">Bloqueo rápido y reintento</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
              <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--gold-primary)]">Ruta</div>
              <div className="mt-1 text-[11px] font-semibold text-white">Conducción limpia</div>
              <div className="mt-1 text-[9px] text-[var(--gold-primary)]/62">Drive · Walk · Cycle</div>
            </div>
          </div>
        </div>
      )}

      <div className={`flex items-center gap-2 ${isMobileNav ? 'rounded-[1.45rem] border border-cyan-300/20 bg-[rgba(4,14,24,0.92)] px-3.5 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.24)]' : 'glass-panel px-3 py-2.5 !border-[var(--border-active)]'}`}>
        <Search className="w-3.5 h-3.5 text-[var(--gold-primary)] flex-shrink-0" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => void handleSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') resetAndClose();
            if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]);
          }}
          placeholder={isMobileNav ? 'Busca un destino…' : 'ENTER PLACE OR COORDINATES TO PLOT A VECTOR...'}
          className={`flex-1 bg-transparent outline-none placeholder:text-[var(--text-muted)] ${isMobileNav ? 'text-[13px] text-white font-medium tracking-[0.02em]' : 'text-[10px] text-[var(--text-primary)] font-mono tracking-wider'}`}
        />
        {loading && <div className="w-3 h-3 border border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin" />}
        <button onClick={resetAndClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X className="w-3 h-3" />
        </button>
      </div>

      {isMobileNav ? null : (
        <div className={`grid gap-2 ${isMobileNav ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
          <div className="rounded-2xl border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.10),rgba(34,211,238,0.03))] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[7px] font-mono uppercase tracking-[0.2em] text-cyan-200">
              <Radar className="h-3 w-3" />
              Vector Index
            </div>
            <div className="mt-1 text-[9px] font-semibold tracking-[0.04em] text-white">Server geocode + coordinates</div>
            <div className="mt-1 text-[7px] font-mono uppercase tracking-[0.14em] text-cyan-100/70">City · address · country · lat,lng</div>
          </div>
          <div className="rounded-2xl border border-emerald-300/18 bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(16,185,129,0.03))] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[7px] font-mono uppercase tracking-[0.2em] text-emerald-200">
              <Crosshair className="h-3 w-3" />
              GPS Lock
            </div>
            <div className="mt-1 text-[9px] font-semibold tracking-[0.04em] text-white">Origin anchored from live device location</div>
            <div className="mt-1 text-[7px] font-mono uppercase tracking-[0.14em] text-emerald-100/70">High accuracy · live origin · fast retry</div>
          </div>
          <div className="rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[linear-gradient(180deg,rgba(212,175,55,0.10),rgba(212,175,55,0.03))] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[7px] font-mono uppercase tracking-[0.2em] text-[var(--gold-primary)]">
              <Sparkles className="h-3 w-3" />
              Route Builder
            </div>
            <div className="mt-1 text-[9px] font-semibold tracking-[0.04em] text-white">Premium planner over real OSRM routes</div>
            <div className="mt-1 text-[7px] font-mono uppercase tracking-[0.14em] text-[var(--gold-primary)]/75">Modes · stops · alternatives · nav cockpit</div>
          </div>
        </div>
      )}

      {isMobileNav ? null : (
        <div className={`flex flex-wrap items-center gap-1.5 ${isMobileNav ? 'text-[8px]' : 'text-[7px]'} font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]`}>
          <span className="mr-0.5">Try</span>
          {quickSearches.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => void handleSearch(sample)}
              className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[7px] text-[var(--text-secondary)] transition-colors hover:border-cyan-300/35 hover:bg-cyan-300/[0.08] hover:text-cyan-100"
            >
              {sample}
            </button>
          ))}
        </div>
      )}

      <div className={`rounded-[1.15rem] border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(6,18,27,0.88),rgba(7,15,24,0.58))] px-3 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.16)] ${isMobileNav ? 'rounded-[1.55rem] border-cyan-300/22 bg-[linear-gradient(180deg,rgba(7,20,30,0.98),rgba(4,12,20,0.90))] px-3.5 py-3.5 shadow-[0_24px_48px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.03)]' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[7px] font-mono uppercase tracking-[0.22em] text-cyan-300">{isMobileNav ? 'Ruta' : 'Vector Builder'}</div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.02em] text-white">{isMobileNav ? 'Usa tu GPS y elige cómo moverte.' : 'Choose transport profile, lock origin, and stage up to three intermediate stops.'}</div>
            {isMobileNav && (
              <div className="mt-1.5 text-[8px] font-mono uppercase tracking-[0.16em] text-cyan-100/58">Elige modo y abre la ruta al instante</div>
            )}
          </div>
          <div className="rounded-full border border-cyan-300/18 bg-cyan-300/[0.08] px-2.5 py-1 text-[7px] font-mono uppercase tracking-[0.18em] text-cyan-100/88">
            {ROUTE_MODE_META[routeMode].label}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleLocateMe()}
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/[0.10] px-2.5 py-1.5 text-[8px] font-mono uppercase tracking-[0.18em] text-cyan-100 hover:border-cyan-300/55 hover:bg-cyan-400/[0.16]"
          >
            <LocateFixed className="h-3 w-3" />
            {isMobileNav ? 'Usar mi GPS' : 'Lock GPS origin'}
          </button>
          {!isMobileNav && (
            <button
              type="button"
              onClick={() => setDraftWaypoints([])}
              disabled={draftWaypoints.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-secondary)] disabled:opacity-40"
            >
              <X className="h-3 w-3" />
              Clear stops
            </button>
          )}
        </div>

        <div className={`mt-3 grid gap-2 ${isMobileNav ? 'grid-cols-3' : 'sm:grid-cols-3'}`}>
          {((['driving', 'walking', 'cycling'] as const)).map((mode) => {
            const meta = ROUTE_MODE_META[mode];
            const Icon = meta.Icon;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setRouteMode(mode)}
                className={`rounded-2xl border px-3 py-2 text-left transition-all ${routeMode === mode ? 'border-cyan-300/38 bg-[linear-gradient(180deg,rgba(34,211,238,0.14),rgba(34,211,238,0.07))] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.03)]' : 'border-white/10 bg-white/[0.03] text-[var(--text-muted)] hover:border-cyan-300/20 hover:text-[var(--text-primary)]'} ${isMobileNav ? 'min-h-[88px]' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border p-1.5 ${routeMode === mode ? 'border-cyan-300/35 bg-cyan-300/10 text-cyan-200' : 'border-white/10 bg-white/[0.03]'}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <span>
                    <span className="block text-[8px] font-mono uppercase tracking-[0.2em]">{meta.label}</span>
                    <span className="mt-0.5 block text-[8px] font-medium tracking-[0.03em] opacity-80">{meta.detail}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {!isMobileNav && (
          <div className="mt-3 rounded-2xl border border-[rgba(212,175,55,0.14)] bg-[rgba(212,175,55,0.05)] px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[7px] font-mono uppercase tracking-[0.2em] text-[var(--gold-primary)]">Multi-stop plan</div>
                <div className="mt-1 text-[9px] font-semibold tracking-[0.04em] text-white">Origin → optional stops → final destination</div>
              </div>
              <div className="rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-2 py-1 text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--gold-primary)]/90">
                {draftWaypoints.length}/{MAX_WAYPOINTS} stops
              </div>
            </div>
            {draftWaypoints.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {draftWaypoints.map((stop, index) => (
                  <span
                    key={`${stop.label}-${index}-${stop.lat}-${stop.lng}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/18 bg-cyan-300/[0.08] px-2 py-1 text-[7px] font-mono uppercase tracking-[0.14em] text-cyan-100"
                  >
                    <GitCommitHorizontal className="h-3 w-3" />
                    S{index + 1} · {stop.label}
                    <button type="button" onClick={() => removeWaypoint(stop)} className="text-cyan-200/80 hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-[7px] font-mono uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Add intermediate stops from search results, then build the final leg on any target.
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {geoState === 'ready' && currentLocation && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-400/12 px-2.5 py-1.5 text-[8px] font-mono uppercase tracking-[0.18em] text-emerald-200">
              <Navigation className="h-3 w-3" />
              {isMobileNav ? `GPS listo · ${formatCoordinateChip(currentLocation.lat, currentLocation.lng)}` : `GPS ready · from ${formatCoordinateChip(currentLocation.lat, currentLocation.lng)}`}
            </span>
          )}
          {geoState === 'locating' && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/8 px-2.5 py-1.5 text-[8px] font-mono uppercase tracking-[0.18em] text-amber-300">
              <div className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin" />
              {isMobileNav ? 'Ubicando…' : 'Locating...'}
            </span>
          )}
          {!isMobileNav && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-2.5 py-1.5 text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--gold-primary)]/90">
              <Route className="h-3 w-3" />
              Premium route build ready
            </span>
          )}
        </div>
      </div>

      {geoError && (
        <div className={`rounded-2xl border px-3 py-2 text-[8px] font-mono uppercase tracking-[0.14em] ${geoState === 'denied' ? 'border-amber-300/25 bg-amber-400/10 text-amber-200' : 'border-rose-400/20 bg-rose-500/8 text-rose-300'}`}>
          <div>{geoError}</div>
          {geoState === 'denied' && (
            <button
              type="button"
              onClick={() => void requestCurrentLocation()}
              className="mt-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-2.5 py-1 text-[7px] font-mono uppercase tracking-[0.18em] text-amber-100"
            >
              Reintentar GPS
            </button>
          )}
        </div>
      )}

      {currentLocation && (
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.07] px-3 py-2 text-[8px] font-mono uppercase tracking-[0.14em] text-cyan-100/75">
          {isMobileNav ? `Ubicación activa · ${formatCoordinateChip(currentLocation.lat, currentLocation.lng)}` : `AEGIS VECTOR origin locked to live GPS · ${formatCoordinateChip(currentLocation.lat, currentLocation.lng)}`}
        </div>
      )}

      {loading && normalizedQuery.length >= 2 && (
        <div className="rounded-2xl border border-cyan-300/18 bg-cyan-400/[0.07] px-3 py-2 text-[8px] font-mono uppercase tracking-[0.14em] text-cyan-100/75">
          {isMobileNav ? `Buscando · ${normalizedQuery}` : `Searching vector index · ${normalizedQuery}`}
        </div>
      )}

      {showNoResults && (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.08] px-3 py-2 text-[8px] font-mono uppercase tracking-[0.14em] text-amber-100/80">
          {isMobileNav ? 'No encontramos ese destino todavía' : 'No vector found yet · try city, country, address or lat,lng'}
        </div>
      )}

      {results.length > 0 && (
        <div className={`absolute top-full left-0 right-0 mt-1 overflow-hidden overflow-y-auto styled-scrollbar z-50 ${isMobileNav ? 'rounded-[1.4rem] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(5,16,25,0.98),rgba(7,15,24,0.94))] shadow-[0_20px_44px_rgba(0,0,0,0.34)] max-h-[38vh]' : 'glass-panel shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-h-[320px]'}`}>
          {results.map((r, i) => {
            const isQueuedStop = draftWaypoints.some((candidate) => sameResult(candidate, r));
            const canAddStop = !isQueuedStop && draftWaypoints.length < MAX_WAYPOINTS;
            return (
              <div
                key={`${r.label}-${i}`}
                className={`border-b last:border-0 px-3 py-2.5 transition-colors ${isMobileNav ? 'border-cyan-300/10 hover:bg-cyan-300/[0.05]' : 'border-[var(--border-secondary)] hover:bg-[var(--hover-accent)]'}`}
              >
                <div className="flex items-start gap-2">
                  <button onClick={() => handleSelect(r)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0 text-[var(--gold-primary)]" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] font-mono text-[var(--text-secondary)] truncate">{r.label}</div>
                        <div className="mt-0.5 text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]">
                          {(r.kind || 'place').replace(/_/g, ' ')} · {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[6px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]">
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-0.5">{isMobileNav ? 'Destino' : 'Locate'}</span>
                          {isMobileNav ? <span className="rounded-full border border-cyan-300/16 bg-cyan-300/[0.06] px-1.5 py-0.5 text-cyan-100/75">Ruta real</span> : null}
                          {!isMobileNav && <span className="rounded-full border border-cyan-300/16 bg-cyan-300/[0.06] px-1.5 py-0.5 text-cyan-100/75">Vector target</span>}
                          {!isMobileNav && currentLocation ? <span className="rounded-full border border-emerald-300/16 bg-emerald-300/[0.06] px-1.5 py-0.5 text-emerald-100/75">GPS linked</span> : null}
                          {!isMobileNav && isQueuedStop ? <span className="rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-1.5 py-0.5 text-[var(--gold-primary)]/85">Queued stop</span> : null}
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-col gap-1">
                    {onRoute && (
                      <button
                        type="button"
                        onClick={() => void handleRoute(r)}
                        className="inline-flex items-center gap-1 rounded-full border border-cyan-400/15 bg-cyan-400/8 px-2 py-1 text-[7px] font-mono uppercase tracking-[0.16em] text-cyan-300 hover:border-cyan-400/35 hover:bg-cyan-400/12"
                        title="Route from my location"
                      >
                        <Flag className="h-3 w-3" />
                        {routingLabel === r.label ? (isMobileNav ? 'Abriendo…' : 'Routing...') : (isMobileNav ? 'Abrir ruta' : `Build ${ROUTE_MODE_META[routeMode].label}`)}
                      </button>
                    )}
                    {!isMobileNav && (
                      <button
                        type="button"
                        onClick={() => addWaypoint(r)}
                        disabled={!canAddStop}
                        className="inline-flex items-center gap-1 rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-2 py-1 text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--gold-primary)]/90 disabled:opacity-45"
                        title="Add intermediate stop"
                      >
                        <Plus className="h-3 w-3" />
                        {isQueuedStop ? 'Added' : draftWaypoints.length >= MAX_WAYPOINTS ? 'Max stops' : 'Add stop'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default memo(SearchBar);
