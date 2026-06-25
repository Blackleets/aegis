'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Orbit,
  Zap,
  Shield,
  Droplets,
  Gem,
  Bitcoin,
  LineChart,
} from 'lucide-react';

interface MarketTicker {
  price?: number;
  up?: boolean;
  change_percent?: number;
}

interface SpaceWeatherData {
  storm_color: string;
  kp_index: number | string;
  storm_level: string;
  solar_flares?: Array<{ class: string }>;
}

interface MarketsData {
  scm_alerts?: string[];
  [key: string]: Record<string, MarketTicker> | string[] | undefined;
}

interface MarketsPanelData {
  markets?: MarketsData;
}

interface MarketsPanelProps {
  data: MarketsPanelData;
  spaceWeather?: SpaceWeatherData;
}

const SECTIONS = [
  { key: 'indices', label: 'Indices', icon: LineChart },
  { key: 'stocks', label: 'Defense', icon: Shield },
  { key: 'oil', label: 'Energy', icon: Droplets },
  { key: 'commodities', label: 'Materials', icon: Gem },
  { key: 'crypto', label: 'Digital', icon: Bitcoin },
] as const;

function formatPrice(value?: number) {
  if (typeof value !== 'number') return '--';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(2);
}

function TickerRow({ name, data: ticker }: { name: string; data: MarketTicker }) {
  if (!ticker) return null;

  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.025] px-3 py-2.5 transition-colors hover:bg-white/[0.045]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[8px] font-mono uppercase tracking-[0.26em] text-[var(--text-muted)]">Asset</div>
          <div className="mt-1 text-[11px] font-semibold tracking-[0.06em] text-[var(--text-primary)]">{name}</div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">Price</div>
          <div className="mt-1 text-[12px] font-semibold tabular-nums text-[var(--text-primary)]">{formatPrice(ticker.price)}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${ticker.up ? 'bg-emerald-500/12 text-emerald-300' : 'bg-rose-500/12 text-rose-300'}`}>
          {ticker.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {ticker.up ? 'Bid Strength' : 'Risk-Off'}
        </span>
        <span className={`text-[10px] font-semibold tabular-nums ${ticker.up ? 'text-emerald-300' : 'text-rose-300'}`}>
          {ticker.change_percent && ticker.change_percent > 0 ? '+' : ''}
          {ticker.change_percent?.toFixed(2) ?? '--'}%
        </span>
      </div>
    </div>
  );
}

export default function MarketsPanel({ data, spaceWeather }: MarketsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState<(typeof SECTIONS)[number]['key']>('stocks');
  const markets = useMemo(() => data.markets || {}, [data.markets]);

  const activeEntries = useMemo(() => {
    const section = markets[activeSection];
    if (!section || Array.isArray(section)) return [];
    return Object.entries(section) as Array<[string, MarketTicker]>;
  }, [activeSection, markets]);

  const risingCount = activeEntries.filter(([, ticker]) => ticker?.up).length;
  const fallingCount = activeEntries.filter(([, ticker]) => ticker && ticker.up === false).length;
  const alertCount = markets.scm_alerts?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="glass-panel pointer-events-auto overflow-hidden border border-[var(--border-primary)]/70 bg-[linear-gradient(180deg,rgba(14,24,34,0.96),rgba(17,29,41,0.92))] p-3.5"
    >
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[var(--border-primary)]/60 bg-white/[0.04] text-[var(--text-primary)]">
            <Orbit className="h-4 w-4 text-[var(--cyan-primary)]" />
          </div>
          <div className="text-left">
            <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-[var(--text-muted)]">Macro board</div>
            <div className="mt-1 text-[13px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">Macro Atlas</div>
          </div>
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Live
          </span>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Advancers</div>
                <div className="mt-1 text-[16px] font-semibold text-emerald-300">{risingCount}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Decliners</div>
                <div className="mt-1 text-[16px] font-semibold text-rose-300">{fallingCount}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">SCM flags</div>
                <div className="mt-1 text-[16px] font-semibold text-amber-300">{alertCount}</div>
              </div>
            </div>

            {spaceWeather && (
              <div className="mt-3 rounded-2xl border px-3 py-3" style={{ borderColor: `${spaceWeather.storm_color}33`, background: `linear-gradient(135deg, ${spaceWeather.storm_color}12, transparent)` }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Zap className="h-3.5 w-3.5" style={{ color: spaceWeather.storm_color }} />
                      <span className="text-[8px] font-mono uppercase tracking-[0.24em]">Orbital weather</span>
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-[var(--text-primary)]">Kp {spaceWeather.kp_index} · {spaceWeather.storm_level}</div>
                  </div>
                  {spaceWeather.solar_flares?.[0] && (
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      Flare {spaceWeather.solar_flares[0].class}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.key;
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-semibold tracking-[0.14em] transition-all ${active ? 'border-[var(--border-active)] bg-white/[0.06] text-[var(--text-primary)]' : 'border-white/0 text-[var(--text-muted)] hover:border-white/8 hover:bg-white/[0.03] hover:text-[var(--text-secondary)]'}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {section.label}
                  </button>
                );
              })}
            </div>

            {alertCount > 0 && (
              <div className="mt-3 space-y-2">
                {markets.scm_alerts?.slice(0, 2).map((alert, index) => (
                  <div key={`${alert}-${index}`} className="rounded-2xl border border-amber-400/20 bg-amber-400/8 px-3 py-2.5 text-[10px] leading-relaxed text-amber-200">
                    {alert}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 max-h-[280px] xl:max-h-[320px] space-y-2 overflow-y-auto styled-scrollbar pr-1">
              {activeEntries.length > 0 ? (
                activeEntries.map(([name, ticker]) => <TickerRow key={name} name={name} data={ticker} />)
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-3 py-6 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Building {activeSection} board...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
