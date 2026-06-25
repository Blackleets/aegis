'use client';

import { useMemo, useState } from 'react';
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
  Earth,
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
  magnitude: number;
  place: string;
  lat: number;
  lng: number;
  time?: string;
}

interface FeedItem {
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  url: string;
  category: string;
  region: string;
}

interface AlertItem {
  type: 'news' | 'quake' | 'feed';
  title: string;
  description?: string;
  source: string;
  lat?: number;
  lng?: number;
  time?: string;
  severity: string;
  url?: string;
  feedUrl?: string;
  category?: string;
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

const BUILTIN_FEEDS: FeedItem[] = [
  { name: 'NBC News NOW', city: 'New York', country: 'US', lat: 40.759, lng: -73.98, url: 'https://www.youtube.com/embed/live_stream?channel=UCeY0bbntWzzVIaj2z3QigXg&autoplay=1&mute=1', category: 'mainstream', region: 'americas' },
  { name: 'CBS News 24/7', city: 'New York', country: 'US', lat: 40.764, lng: -73.973, url: 'https://www.youtube.com/embed/live_stream?channel=UC8p1vwvWtl6T73JiExfWs1g&autoplay=1&mute=1', category: 'mainstream', region: 'americas' },
  { name: 'ABC News Live', city: 'New York', country: 'US', lat: 40.763, lng: -73.979, url: 'https://www.youtube.com/embed/live_stream?channel=UCBi2mrWuNuyYy4gbM6fU18Q&autoplay=1&mute=1', category: 'mainstream', region: 'americas' },
  { name: 'Bloomberg TV', city: 'New York', country: 'US', lat: 40.756, lng: -73.988, url: 'https://www.youtube.com/embed/live_stream?channel=UC_vQ72b7v5n2938v9d5c80w&autoplay=1&mute=1', category: 'finance', region: 'americas' },
  { name: 'C-SPAN', city: 'Washington DC', country: 'US', lat: 38.897, lng: -77.036, url: 'https://www.youtube.com/embed/live_stream?channel=UCb--64Gl51jIEVE-GLDAVTg&autoplay=1&mute=1', category: 'government', region: 'americas' },
  { name: 'CBC News', city: 'Toronto', country: 'CA', lat: 43.644, lng: -79.387, url: 'https://www.youtube.com/embed/live_stream?channel=UCKy1dAqELon0zgzZPOz9SVw&autoplay=1&mute=1', category: 'mainstream', region: 'americas' },
  { name: 'Sky News', city: 'London', country: 'GB', lat: 51.5, lng: -0.118, url: 'https://www.youtube.com/embed/live_stream?channel=UCoMdktPbSTixAyNGwb-UYkQ&autoplay=1&mute=1', category: 'mainstream', region: 'europe' },
  { name: 'France 24 EN', city: 'Paris', country: 'FR', lat: 48.83, lng: 2.28, url: 'https://www.youtube.com/embed/live_stream?channel=UCQfwfsi5VrQ8yKZ-UWmAEFg&autoplay=1&mute=1', category: 'mainstream', region: 'europe' },
  { name: 'DW News', city: 'Berlin', country: 'DE', lat: 52.508, lng: 13.376, url: 'https://www.youtube.com/embed/live_stream?channel=UCknLrEdhRCp1aegoMqRaCZg&autoplay=1&mute=1', category: 'mainstream', region: 'europe' },
  { name: 'Euronews', city: 'Lyon', country: 'FR', lat: 45.764, lng: 4.836, url: 'https://www.youtube.com/embed/live_stream?channel=UCtUbOIRGKZkW7555n6x6q6g&autoplay=1&mute=1', category: 'mainstream', region: 'europe' },
  { name: 'TRT World', city: 'Istanbul', country: 'TR', lat: 41.008, lng: 28.978, url: 'https://www.youtube.com/embed/live_stream?channel=UC7fWeaHZQg1p9-4v98L1D1A&autoplay=1&mute=1', category: 'mainstream', region: 'europe' },
  { name: 'UKRINFORM', city: 'Kyiv', country: 'UA', lat: 50.45, lng: 30.523, url: 'https://www.youtube.com/embed/live_stream?channel=UCaDkCK6iFHPE0lmpaYL-WxQ&autoplay=1&mute=1', category: 'conflict', region: 'europe' },
  { name: 'Al Jazeera EN', city: 'Doha', country: 'QA', lat: 25.286, lng: 51.534, url: 'https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1&mute=1', category: 'mainstream', region: 'middleeast' },
  { name: 'Al Mayadeen', city: 'Beirut', country: 'LB', lat: 33.8886, lng: 35.4955, url: 'https://www.youtube.com/embed/live_stream?channel=UCZCFHCU-2eGF7V5ciMkoPHw&autoplay=1&mute=1', category: 'conflict', region: 'middleeast' },
  { name: 'LBCI Lebanon', city: 'Beirut', country: 'LB', lat: 33.893, lng: 35.5018, url: 'https://www.youtube.com/embed/live_stream?channel=UCpE6gpKewomi17XDyPfpFjA&autoplay=1&mute=1', category: 'mainstream', region: 'middleeast' },
  { name: 'NHK World', city: 'Tokyo', country: 'JP', lat: 35.69, lng: 139.692, url: 'https://www.youtube.com/embed/live_stream?channel=UCSPEjw8F2nQDtmUKPFNF7_A&autoplay=1&mute=1', category: 'mainstream', region: 'asia' },
  { name: 'CNA 24/7', city: 'Singapore', country: 'SG', lat: 1.29, lng: 103.852, url: 'https://www.youtube.com/embed/live_stream?channel=UC83jt4dlz1Gjl58fzQrrKZg&autoplay=1&mute=1', category: 'mainstream', region: 'asia' },
  { name: 'WION', city: 'New Delhi', country: 'IN', lat: 28.614, lng: 77.209, url: 'https://www.youtube.com/embed/live_stream?channel=UC_gUM8rL-Lrg6O3adPW9K1g&autoplay=1&mute=1', category: 'mainstream', region: 'asia' },
  { name: 'Arirang', city: 'Seoul', country: 'KR', lat: 37.566, lng: 126.978, url: 'https://www.youtube.com/embed/live_stream?channel=UCw9-5Y1CjW7Qy1Yf5q1y2-Q&autoplay=1&mute=1', category: 'mainstream', region: 'asia' },
  { name: 'ABC AU', city: 'Sydney', country: 'AU', lat: -33.868, lng: 151.209, url: 'https://www.youtube.com/embed/live_stream?channel=UC5iLnYoF4Ryb63YdGD9RfWQ&autoplay=1&mute=1', category: 'mainstream', region: 'asia' },
  { name: 'Africanews', city: 'Pointe-Noire', country: 'CG', lat: -4.778, lng: 11.865, url: 'https://www.youtube.com/embed/live_stream?channel=UC5T2fB_W0Z31T0c8yN36a8A&autoplay=1&mute=1', category: 'mainstream', region: 'africa' },
  { name: 'SABC News', city: 'Johannesburg', country: 'ZA', lat: -26.204, lng: 28.047, url: 'https://www.youtube.com/embed/live_stream?channel=UC8yH-uI81UUtEMDsowQyx1g&autoplay=1&mute=1', category: 'mainstream', region: 'africa' },
  { name: 'teleSUR EN', city: 'Caracas', country: 'VE', lat: 10.491, lng: -66.902, url: 'https://www.youtube.com/embed/live_stream?channel=UCmuTmpLY35O3csvhyA6vrkg&autoplay=1&mute=1', category: 'mainstream', region: 'americas' },
];

function getTimeLabel(value?: string) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function LiveAlerts({ data, onLocate, onWatchFeed }: LiveAlertsProps) {
  const [expanded, setExpanded] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const [filter, setFilter] = useState<'all' | 'news' | 'quakes' | 'feeds'>('all');

  const alerts = useMemo(() => {
    const unified: AlertItem[] = [];

    data.news?.forEach((item) => {
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

    data.earthquakes?.slice(0, 5).forEach((quake) => {
      unified.push({
        type: 'quake',
        title: `M${quake.magnitude} · ${quake.place}`,
        source: 'USGS',
        lat: quake.lat,
        lng: quake.lng,
        time: quake.time,
        severity: quake.magnitude >= 6 ? 'CRITICAL' : quake.magnitude >= 4.5 ? 'HIGH' : 'MODERATE',
      });
    });

    BUILTIN_FEEDS.forEach((feed) => {
      unified.push({
        type: 'feed',
        title: feed.name,
        source: `${feed.city}, ${feed.country}`,
        lat: feed.lat,
        lng: feed.lng,
        feedUrl: feed.url,
        severity: 'LOW',
        category: feed.category,
      });
    });

    return unified;
  }, [data.earthquakes, data.news]);

  const filtered = filter === 'all'
    ? alerts
    : filter === 'news'
      ? alerts.filter((item) => item.type === 'news')
      : filter === 'quakes'
        ? alerts.filter((item) => item.type === 'quake')
        : alerts.filter((item) => item.type === 'feed');

  const criticalCount = alerts.filter((item) => item.severity === 'CRITICAL').length;
  const liveFeedCount = alerts.filter((item) => item.type === 'feed').length;
  const geolocatedCount = alerts.filter((item) => item.lat !== undefined && item.lng !== undefined).length;

  const getIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'news':
        return Newspaper;
      case 'quake':
        return AlertTriangle;
      case 'feed':
        return Earth;
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
            <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-[var(--text-muted)]">Live desk</div>
            <div className="mt-1 text-[13px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">Pulsewire</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[var(--text-muted)]">
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
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Feeds</div>
                <div className="mt-1 text-[16px] font-semibold text-sky-300">{liveFeedCount}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Mapped</div>
                <div className="mt-1 text-[16px] font-semibold text-emerald-300">{geolocatedCount}</div>
              </div>
            </div>

            <div className="mb-3 flex gap-1.5 overflow-x-auto">
              {(['all', 'news', 'quakes', 'feeds'] as const).map((entry) => (
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
                      if (alert.feedUrl && onWatchFeed) onWatchFeed(alert.feedUrl, alert.title);
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
                          {alert.category && <span>{alert.category}</span>}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          {alert.lat !== undefined && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                              <MapPin className="h-3 w-3" />
                              Map focus
                            </span>
                          )}
                          {alert.url && (
                            <a
                              href={alert.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--cyan-primary)] hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Source
                            </a>
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
