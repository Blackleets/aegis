'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertTriangle,
  Newspaper,
  Clock,
  RadioTower,
  Maximize2,
  Minimize2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface NewsItem {
  title?: string;
  description?: string;
  source?: string;
  coords?: [number, number];
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

interface AlertItem {
  type: 'news' | 'quake';
  title: string;
  description?: string;
  source: string;
  lat?: number;
  lng?: number;
  time?: string | number;
  severity: string;
  url?: string;
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

const RISK_COLORS: Record<string, string> = {
  HIGH: '#FF7A59',
  CRITICAL: '#FF4D6D',
  ELEVATED: '#F59E0B',
  MODERATE: '#EAB308',
  LOW: '#34D399',
};

function getTimeLabel(value?: string | number) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getTimestamp(value?: string | number) {
  if (typeof value === 'number') return value;
  return value ? Date.parse(value) : 0;
}

function getLastUpdatedLabel(value?: string) {
  if (!value) return 'waiting';
  const diffSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000));
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ago`;
}

function isBlockedSource(item: NewsItem) {
  const source = String(item.source || '').toLowerCase();
  const link = String(item.link || '').toLowerCase();
  return source.includes('t.me') || source.includes('telegram') || link.includes('t.me/') || link.includes('telegram.');
}

export default function LiveAlerts({ data, onLocate, onWatchFeed }: LiveAlertsProps) {
  const [expanded, setExpanded] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const [filter, setFilter] = useState<'all' | 'news' | 'quakes'>('all');
  const [liveData, setLiveData] = useState<LiveAlertsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [refreshing, setRefreshing] = useState(false);
  const effectiveData = liveData ?? data;

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      setRefreshing(true);
      try {
        const [newsResponse, quakeResponse] = await Promise.all([
          fetch('/api/news', { cache: 'no-store' }),
          fetch('/api/earthquakes', { cache: 'no-store' }),
        ]);

        if (cancelled) return;

        const nextNewsPayload = newsResponse.ok ? await newsResponse.json() as { news?: NewsItem[] } | NewsItem[] : undefined;
        const nextQuakesPayload = quakeResponse.ok ? await quakeResponse.json() as { earthquakes?: EarthquakeItem[] } | EarthquakeItem[] : undefined;
        const nextNews = Array.isArray(nextNewsPayload) ? nextNewsPayload : nextNewsPayload?.news;
        const nextQuakes = Array.isArray(nextQuakesPayload) ? nextQuakesPayload : nextQuakesPayload?.earthquakes;

        setLiveData((prev) => ({
          news: nextNews ?? prev?.news,
          earthquakes: nextQuakes ?? prev?.earthquakes,
        }));
        setLastUpdated(new Date().toISOString());
      } catch {
        // Keep last good payload.
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };

    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const alerts = useMemo(() => {
    const unified: AlertItem[] = [];

    (effectiveData.news || [])
      .filter((item) => !isBlockedSource(item))
      .forEach((item) => {
        unified.push({
          type: 'news',
          title: item.title || 'Untitled brief',
          description: item.description,
          source: item.source || 'News desk',
          lat: item.coords?.[0],
          lng: item.coords?.[1],
          time: item.published,
          severity: (item.risk_score ?? 1) >= 8 ? 'CRITICAL' : (item.risk_score ?? 1) >= 6 ? 'HIGH' : (item.risk_score ?? 1) >= 4 ? 'ELEVATED' : 'LOW',
          url: item.link,
        });
      });

    effectiveData.earthquakes?.slice(0, 8).forEach((quake) => {
      unified.push({
        type: 'quake',
        title: `M${quake.magnitude} · ${quake.place}`,
        source: 'USGS',
        lat: quake.lat,
        lng: quake.lng,
        time: quake.time,
        description: `${typeof quake.depth === 'number' ? `${quake.depth.toFixed(1)} km deep` : 'Depth unavailable'}${quake.tsunami ? ' · TSUNAMI FLAG' : ''}`,
        severity: quake.tsunami || quake.magnitude >= 6 ? 'CRITICAL' : quake.magnitude >= 4.5 ? 'HIGH' : quake.magnitude >= 3.5 ? 'ELEVATED' : 'MODERATE',
        url: quake.url || (quake.id ? `https://earthquake.usgs.gov/earthquakes/eventpage/${quake.id}` : undefined),
      });
    });

    return unified.sort((a, b) => getTimestamp(b.time) - getTimestamp(a.time));
  }, [effectiveData]);

  const filtered = filter === 'all'
    ? alerts
    : filter === 'news'
      ? alerts.filter((item) => item.type === 'news')
      : alerts.filter((item) => item.type === 'quake');

  const criticalCount = alerts.filter((item) => item.severity === 'CRITICAL').length;
  const newsCount = alerts.filter((item) => item.type === 'news').length;
  const geolocatedCount = alerts.filter((item) => item.lat !== undefined && item.lng !== undefined).length;

  const getIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'news':
        return Newspaper;
      case 'quake':
        return AlertTriangle;
      default:
        return Newspaper;
    }
  };

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
            <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-[var(--text-muted)]">Live incident desk</div>
            <div className="mt-1 text-[13px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">Realtime Newswire</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/10 bg-cyan-400/8 px-2 py-1 text-[7px] font-mono uppercase tracking-[0.16em] text-cyan-300">
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            {getLastUpdatedLabel(lastUpdated)}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMaximized(!maximized);
              if (!expanded && !maximized) setExpanded(true);
            }}
            className="rounded-full border border-white/10 p-1.5 hover:text-white"
            title={maximized ? 'Restore' : 'Maximize'}
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
            <div className="grid grid-cols-3 gap-2 pb-3">
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Critical</div>
                <div className="mt-1 text-[16px] font-semibold text-rose-300">{criticalCount}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">News</div>
                <div className="mt-1 text-[16px] font-semibold text-sky-300">{newsCount}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Geo-tagged</div>
                <div className="mt-1 text-[16px] font-semibold text-emerald-300">{geolocatedCount}</div>
              </div>
            </div>

            <div className="mb-2 text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Real-source incident desk · autorefresh 60s · news + seismic activity
            </div>

            <div className="mb-3 flex gap-1.5 overflow-x-auto">
              {(['all', 'news', 'quakes'] as const).map((entry) => (
                <button
                  key={entry}
                  onClick={() => setFilter(entry)}
                  className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] transition-all ${filter === entry ? 'border-[var(--border-active)] bg-white/[0.06] text-[var(--text-primary)]' : 'border-white/0 text-[var(--text-muted)] hover:border-white/8 hover:bg-white/[0.03] hover:text-[var(--text-secondary)]'}`}
                >
                  {entry}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto styled-scrollbar pb-4">
              {filtered.map((alert, index) => {
                const Icon = getIcon(alert.type);
                const sevColor = RISK_COLORS[alert.severity] || '#EAB308';

                return (
                  <div
                    key={`${alert.type}-${alert.title}-${index}`}
                    onClick={() => {
                      if (alert.lat !== undefined && alert.lng !== undefined) onLocate(alert.lat, alert.lng);
                    }}
                    className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-3 transition-colors hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-9 w-1 rounded-full" style={{ backgroundColor: sevColor, boxShadow: `0 0 10px ${sevColor}55` }} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: sevColor }} />
                          <span className="rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: `${sevColor}44`, color: sevColor }}>
                            {alert.severity}
                          </span>
                          <span className="ml-auto text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            {alert.type}
                          </span>
                        </div>

                        <div className="mt-2 text-[11px] font-semibold leading-snug text-[var(--text-primary)]">
                          {alert.type === 'news' ? alert.description || alert.title : alert.title}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                          <span>{alert.source}</span>
                          {alert.time && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getTimeLabel(alert.time)}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          {alert.lat !== undefined && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                              <MapPin className="h-3 w-3" />
                              Map focus
                            </span>
                          )}
                          {alert.url && (
                            <>
                              <a
                                href={alert.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--cyan-primary)] hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3 w-3" />
                                Read source
                              </a>
                              {onWatchFeed && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onWatchFeed(alert.url!, alert.source || alert.title);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-emerald-300"
                                >
                                  Live feed
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-3 py-6 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  No items for this desk view
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
