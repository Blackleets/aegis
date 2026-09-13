'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Newspaper,
  RadioTower,
  Maximize2,
  Minimize2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CloudLightning,
  Flame,
  Mountain,
  Waves,
  Swords,
} from 'lucide-react';
import {
  buildSituationalRadar,
  filterAlertsByChip,
  kindLabelEs,
  relativeTimeEs,
  severityLabelEs,
  SITUATIONAL_FILTER_CHIPS,
  type SituationalAlert,
  type SituationalFilterChip,
  type SituationalKind,
  type SituationalRadarSnapshot,
  type SituationalSeverity,
} from '@/lib/situational-alerts';

interface NewsItem {
  id?: string;
  title?: string;
  description?: string;
  source?: string;
  coords?: [number, number] | null;
  published?: string;
  risk_score?: number;
  link?: string;
}

interface EarthquakeItem {
  id?: string;
  magnitude: number;
  place: string;
  lat: number;
  lng: number;
  depth?: number;
  tsunami?: boolean;
  url?: string;
  time?: string | number;
}

interface LiveAlertsData {
  news?: NewsItem[];
  earthquakes?: EarthquakeItem[];
}

interface LiveAlertsProps {
  data: LiveAlertsData;
  onLocate: (lat: number, lng: number) => void;
  onWatchFeed?: (url: string, name: string) => void;
}

const SEVERITY_COLORS: Record<SituationalSeverity, string> = {
  critical: '#FF4D6D',
  high: '#FF7A59',
  elevated: '#F59E0B',
  moderate: '#EAB308',
  low: '#34D399',
};

function KindIcon({ kind }: { kind: SituationalKind }) {
  const className = 'h-3.5 w-3.5 flex-shrink-0';
  switch (kind) {
    case 'earthquake':
      return <AlertTriangle className={className} />;
    case 'wildfire':
      return <Flame className={className} />;
    case 'volcano':
      return <Mountain className={className} />;
    case 'storm':
    case 'weather':
      return <CloudLightning className={className} />;
    case 'flood':
      return <Waves className={className} />;
    case 'conflict':
      return <Swords className={className} />;
    case 'news':
      return <Newspaper className={className} />;
    default:
      return <RadioTower className={className} />;
  }
}

function statusLabelEs(status: SituationalRadarSnapshot['status']): string {
  if (status === 'ok') return 'Fuentes OK';
  if (status === 'degraded') return 'Fuentes degradadas';
  return 'Fuentes no disponibles';
}

export default function LiveAlerts({ data, onLocate, onWatchFeed }: LiveAlertsProps) {
  const [expanded, setExpanded] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const [filter, setFilter] = useState<SituationalFilterChip>('all');
  const [snapshot, setSnapshot] = useState<SituationalRadarSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  const buildFromProps = useCallback((): SituationalRadarSnapshot => {
    return buildSituationalRadar({
      earthquakes: (data.earthquakes || []) as Array<Record<string, unknown>>,
      quakeStatus: data.earthquakes?.length ? 'ok' : 'empty',
      news: (data.news || []) as Array<Record<string, unknown>>,
      newsStatus: data.news?.length ? 'ok' : 'empty',
      pulseEvents: [],
      pulseStatus: 'empty',
      weatherStatus: 'skipped',
      limit: 40,
    });
  }, [data.earthquakes, data.news]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const settled = await Promise.allSettled([
        fetch('/api/world-pulse', { cache: 'no-store' }),
        fetch('/api/news', { cache: 'no-store' }),
        fetch('/api/earthquakes', { cache: 'no-store' }),
        fetch('/api/weather', { cache: 'no-store' }),
      ]);

      const readJson = async (result: PromiseSettledResult<Response>) => {
        if (result.status !== 'fulfilled' || !result.value.ok) return null;
        try {
          return await result.value.json();
        } catch {
          return null;
        }
      };

      const [pulseJson, newsJson, quakeJson, weatherJson] = await Promise.all([
        readJson(settled[0]),
        readJson(settled[1]),
        readJson(settled[2]),
        readJson(settled[3]),
      ]);

      const pulseOk = settled[0].status === 'fulfilled' && settled[0].value.ok;
      const newsOk = settled[1].status === 'fulfilled' && settled[1].value.ok;
      const quakeOk = settled[2].status === 'fulfilled' && settled[2].value.ok;
      const weatherOk = settled[3].status === 'fulfilled' && settled[3].value.ok;

      const pulseEvents = Array.isArray(pulseJson?.events) ? pulseJson.events : [];
      const newsItems = Array.isArray(newsJson?.news)
        ? newsJson.news
        : Array.isArray(newsJson)
          ? newsJson
          : [];
      const quakes = Array.isArray(quakeJson?.earthquakes)
        ? quakeJson.earthquakes
        : Array.isArray(quakeJson)
          ? quakeJson
          : [];
      const weatherEvents = Array.isArray(weatherJson?.events) ? weatherJson.events : [];

      const next = buildSituationalRadar({
        pulseEvents,
        pulseStatus: pulseOk
          ? (pulseJson?.status === 'unavailable' ? 'unavailable' : pulseJson?.status === 'degraded' ? 'degraded' : 'ok')
          : 'error',
        earthquakes: quakes,
        quakeStatus: quakeOk ? (quakes.length ? 'ok' : 'empty') : 'error',
        news: newsItems,
        newsStatus: newsOk ? (newsItems.length ? 'ok' : 'empty') : 'error',
        weatherEvents,
        weatherStatus: weatherOk ? (weatherEvents.length ? 'ok' : 'empty') : 'error',
        limit: 40,
      });

      setSnapshot(next);
      setClock(Date.now());
    } catch {
      // Keep last good snapshot; never invent.
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Defer initial fetch so eslint react-hooks/set-state-in-effect stays happy.
    const boot = window.setTimeout(() => {
      void refresh();
    }, 0);
    const interval = window.setInterval(() => {
      void refresh();
    }, 45_000);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const effective = snapshot ?? buildFromProps();
  const filtered = useMemo(
    () => filterAlertsByChip(effective.alerts, filter),
    [effective.alerts, filter],
  );

  const criticalCount = effective.alerts.filter((a) => a.severity === 'critical').length;
  const geoCount = effective.alerts.filter((a) => a.lat !== undefined && a.lng !== undefined).length;
  const degraded = effective.status !== 'ok';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className={`glass-panel pointer-events-auto flex min-h-[200px] shrink-0 resize-y flex-col overflow-hidden border border-[var(--border-primary)]/70 bg-[linear-gradient(180deg,rgba(15,24,34,0.96),rgba(19,30,43,0.9))] transition-all duration-300 ${maximized ? 'fixed inset-4 z-[9999]' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        className="flex cursor-pointer items-center justify-between px-3.5 py-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[var(--border-primary)]/60 bg-white/[0.04]">
            <RadioTower className="h-4 w-4 text-[var(--cyan-primary)]" />
          </div>
          <div>
            <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Multi-fuente · fail-closed
            </div>
            <div className="mt-1 text-[13px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">
              Radar situacional
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/10 bg-cyan-400/8 px-2 py-1 text-[7px] font-mono uppercase tracking-[0.16em] text-cyan-300">
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            {relativeTimeEs(effective.fetchedAt, clock) || '—'}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void refresh();
            }}
            className="rounded-full border border-white/10 p-1.5 hover:text-white"
            title="Actualizar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMaximized(!maximized);
              if (!expanded && !maximized) setExpanded(true);
            }}
            className="rounded-full border border-white/10 p-1.5 hover:text-white"
            title={maximized ? 'Restaurar' : 'Maximizar'}
          >
            {maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-3.5 pb-3"
          >
            <div className="grid grid-cols-3 gap-2 pb-2">
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Críticos</div>
                <div className="mt-0.5 text-[15px] font-semibold text-rose-300">{criticalCount}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Activos</div>
                <div className="mt-0.5 text-[15px] font-semibold text-sky-300">{effective.alerts.length}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Con coords</div>
                <div className="mt-0.5 text-[15px] font-semibold text-emerald-300">{geoCount}</div>
              </div>
            </div>

            <div className={`mb-2 text-[8px] font-mono uppercase tracking-[0.16em] ${degraded ? 'text-amber-300/90' : 'text-[var(--text-muted)]'}`}>
              {statusLabelEs(effective.status)}
              {' · '}
              pulse + USGS + news
              {effective.sources.some((s) => s.name === 'Weather' && s.status === 'ok') ? ' + weather' : ''}
              {' · sin ruido comunitario'}
            </div>

            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
              {SITUATIONAL_FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilter(chip.id)}
                  className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] transition-all whitespace-nowrap ${filter === chip.id ? 'border-[var(--border-active)] bg-white/[0.06] text-[var(--text-primary)]' : 'border-white/0 text-[var(--text-muted)] hover:border-white/8 hover:bg-white/[0.03] hover:text-[var(--text-secondary)]'}`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="max-h-[min(52vh,420px)] flex-1 space-y-1.5 overflow-y-auto styled-scrollbar pb-3">
              {filtered.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  now={clock}
                  onLocate={onLocate}
                  onWatchFeed={onWatchFeed}
                />
              ))}

              {filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-3 py-6 text-center text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {effective.status === 'unavailable'
                    ? 'Fuentes no disponibles — sin eventos inventados'
                    : effective.status === 'degraded'
                      ? 'Sin eventos verificados en este filtro · fuentes degradadas'
                      : 'Sin alertas en este filtro'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AlertRow({
  alert,
  now,
  onLocate,
  onWatchFeed,
}: {
  alert: SituationalAlert;
  now: number;
  onLocate: (lat: number, lng: number) => void;
  onWatchFeed?: (url: string, name: string) => void;
}) {
  const sevColor = SEVERITY_COLORS[alert.severity];
  const hasCoords = alert.lat !== undefined && alert.lng !== undefined;

  return (
    <div
      className="rounded-xl border border-white/6 bg-white/[0.028] px-2.5 py-2 transition-colors hover:bg-white/[0.045]"
    >
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 h-8 w-0.5 shrink-0 rounded-full"
          style={{ backgroundColor: sevColor, boxShadow: `0 0 8px ${sevColor}44` }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span style={{ color: sevColor }}>
              <KindIcon kind={alert.kind} />
            </span>
            <span
              className="rounded-full border px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.14em]"
              style={{ borderColor: `${sevColor}44`, color: sevColor }}
            >
              {severityLabelEs(alert.severity)}
            </span>
            <span className="text-[7px] font-mono uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {kindLabelEs(alert.kind)}
            </span>
          </div>

          <div className="mt-1 text-[11px] font-semibold leading-snug text-[var(--text-primary)] line-clamp-2">
            {alert.title}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[8px] font-mono tracking-[0.04em] text-[var(--text-secondary)]">
            <span className="uppercase tracking-[0.12em]">{alert.source}</span>
            <span className="text-[var(--text-muted)]">·</span>
            <span>{relativeTimeEs(alert.observedAt, now)}</span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {hasCoords && (
              <button
                type="button"
                onClick={() => onLocate(alert.lat!, alert.lng!)}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] hover:border-cyan-400/30 hover:text-cyan-200"
              >
                <MapPin className="h-3 w-3" />
                Localizar
              </button>
            )}
            {alert.url && (
              <>
                <a
                  href={alert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--cyan-primary)] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Fuente
                </a>
                {onWatchFeed && (
                  <button
                    type="button"
                    onClick={() => onWatchFeed(alert.url!, alert.source || alert.title)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-emerald-300"
                  >
                    Live
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
