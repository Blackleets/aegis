'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  ExternalLink,
  X,
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
  feedFreshness?: number;
}

type SectionKey = 'indices' | 'stocks' | 'oil' | 'commodities' | 'crypto';

interface AssetMeta {
  label: string;
  shortLabel: string;
  tvSymbol: string;
  market: string;
  accent: string;
  bg: string;
  section: SectionKey;
}

interface SelectedAsset {
  name: string;
  ticker: MarketTicker;
  meta: AssetMeta;
}

const CRYPTO_SPOTLIGHT = ['Bitcoin', 'Ethereum', 'Solana'] as const;

const SECTIONS = [
  { key: 'indices', label: 'Indices', icon: LineChart },
  { key: 'stocks', label: 'Defense', icon: Shield },
  { key: 'oil', label: 'Energy', icon: Droplets },
  { key: 'commodities', label: 'Materials', icon: Gem },
  { key: 'crypto', label: 'Digital', icon: Bitcoin },
] as const;

const ASSET_META: Record<string, AssetMeta> = {
  'S&P 500': { label: 'S&P 500', shortLabel: 'SPX', tvSymbol: 'SP:SPX', market: 'US Index', accent: '#60A5FA', bg: 'rgba(96,165,250,0.14)', section: 'indices' },
  'Nasdaq 100': { label: 'Nasdaq 100', shortLabel: 'NDX', tvSymbol: 'NASDAQ:NDX', market: 'US Index', accent: '#22D3EE', bg: 'rgba(34,211,238,0.14)', section: 'indices' },
  RTX: { label: 'RTX', shortLabel: 'RTX', tvSymbol: 'NYSE:RTX', market: 'Defense Equity', accent: '#A78BFA', bg: 'rgba(167,139,250,0.14)', section: 'stocks' },
  LMT: { label: 'Lockheed Martin', shortLabel: 'LMT', tvSymbol: 'NYSE:LMT', market: 'Defense Equity', accent: '#F59E0B', bg: 'rgba(245,158,11,0.14)', section: 'stocks' },
  NOC: { label: 'Northrop Grumman', shortLabel: 'NOC', tvSymbol: 'NYSE:NOC', market: 'Defense Equity', accent: '#F97316', bg: 'rgba(249,115,22,0.14)', section: 'stocks' },
  GD: { label: 'General Dynamics', shortLabel: 'GD', tvSymbol: 'NYSE:GD', market: 'Defense Equity', accent: '#38BDF8', bg: 'rgba(56,189,248,0.14)', section: 'stocks' },
  BA: { label: 'Boeing', shortLabel: 'BA', tvSymbol: 'NYSE:BA', market: 'Defense Equity', accent: '#10B981', bg: 'rgba(16,185,129,0.14)', section: 'stocks' },

  'WTI Crude': { label: 'WTI Crude', shortLabel: 'WTI', tvSymbol: 'NYMEX:CL1!', market: 'Energy Future', accent: '#FB7185', bg: 'rgba(251,113,133,0.14)', section: 'oil' },
  'Brent Crude': { label: 'Brent Crude', shortLabel: 'BRENT', tvSymbol: 'TVC:UKOIL', market: 'Energy Future', accent: '#F97316', bg: 'rgba(249,115,22,0.14)', section: 'oil' },
  Gold: { label: 'Gold', shortLabel: 'XAU', tvSymbol: 'TVC:GOLD', market: 'Commodity', accent: '#FACC15', bg: 'rgba(250,204,21,0.14)', section: 'commodities' },
  Silver: { label: 'Silver', shortLabel: 'XAG', tvSymbol: 'TVC:SILVER', market: 'Commodity', accent: '#D1D5DB', bg: 'rgba(209,213,219,0.14)', section: 'commodities' },
  Copper: { label: 'Copper', shortLabel: 'COPPER', tvSymbol: 'COMEX:HG1!', market: 'Commodity', accent: '#FB923C', bg: 'rgba(251,146,60,0.14)', section: 'commodities' },
  'Natural Gas': { label: 'Natural Gas', shortLabel: 'NATGAS', tvSymbol: 'NYMEX:NG1!', market: 'Commodity', accent: '#60A5FA', bg: 'rgba(96,165,250,0.14)', section: 'commodities' },
  Wheat: { label: 'Wheat', shortLabel: 'WHEAT', tvSymbol: 'CBOT:ZW1!', market: 'Commodity', accent: '#FBBF24', bg: 'rgba(251,191,36,0.14)', section: 'commodities' },
  Corn: { label: 'Corn', shortLabel: 'CORN', tvSymbol: 'CBOT:ZC1!', market: 'Commodity', accent: '#F59E0B', bg: 'rgba(245,158,11,0.14)', section: 'commodities' },
  Bitcoin: { label: 'Bitcoin', shortLabel: 'BTC', tvSymbol: 'BINANCE:BTCUSDT', market: 'Digital Asset', accent: '#F7931A', bg: 'rgba(247,147,26,0.14)', section: 'crypto' },
  Ethereum: { label: 'Ethereum', shortLabel: 'ETH', tvSymbol: 'BINANCE:ETHUSDT', market: 'Digital Asset', accent: '#8B93FF', bg: 'rgba(139,147,255,0.14)', section: 'crypto' },
  Solana: { label: 'Solana', shortLabel: 'SOL', tvSymbol: 'BINANCE:SOLUSDT', market: 'Digital Asset', accent: '#14F195', bg: 'rgba(20,241,149,0.14)', section: 'crypto' },
};

function formatPrice(value?: number) {
  if (typeof value !== 'number') return '--';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(2);
}

function timeSince(timestamp?: string | number) {
  if (!timestamp) return 'awaiting';
  const value = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (!Number.isFinite(value)) return 'awaiting';
  const diffMs = Math.max(0, Date.now() - value);
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function assetMetaFor(name: string, section: SectionKey): AssetMeta {
  return ASSET_META[name] ?? {
    label: name,
    shortLabel: name.slice(0, 6).toUpperCase(),
    tvSymbol: 'TVC:DXY',
    market: 'Market Instrument',
    accent: '#94A3B8',
    bg: 'rgba(148,163,184,0.14)',
    section,
  };
}

function buildSparklinePoints(change = 0, price = 0) {
  const base = [26, 24, 29, 27, 32, 30, 35, 33, 37, 34, 40, 38];
  const momentum = Math.max(-6, Math.min(6, change)) * 1.2;
  const scale = Math.max(0.85, Math.min(1.25, (price || 1) / 1000 + 0.92));
  const adjusted = base.map((point, index) => {
    const drift = index * (momentum / 14);
    const wave = Math.sin(index * 0.85 + (price || 0) / 120) * 2.4;
    return Math.max(8, Math.min(42, 44 - ((point + drift + wave) / scale)));
  });

  return adjusted
    .map((point, index) => `${index * 10},${point.toFixed(2)}`)
    .join(' ');
}

function Sparkline({ ticker, meta }: { ticker: MarketTicker; meta: AssetMeta }) {
  const points = buildSparklinePoints(ticker.change_percent, ticker.price);
  const stroke = ticker.up ? '#34D399' : '#FB7185';
  const fill = ticker.up ? 'rgba(52,211,153,0.16)' : 'rgba(251,113,133,0.14)';

  return (
    <div className="relative h-12 w-full min-w-[96px] overflow-hidden rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.03)] px-2 py-1.5 sm:w-[108px] sm:min-w-[108px]">
      <div className="absolute inset-x-2 top-1 text-[7px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">
        Pulse
      </div>
      <svg viewBox="0 0 110 44" className="absolute inset-x-0 bottom-0 h-10 w-full" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`spark-fill-${meta.shortLabel}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id={`spark-stroke-${meta.shortLabel}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={meta.accent} />
            <stop offset="100%" stopColor={stroke} />
          </linearGradient>
        </defs>
        <polyline points={`0,44 ${points} 110,44`} fill={`url(#spark-fill-${meta.shortLabel})`} stroke="none" />
        <polyline
          points={points}
          fill="none"
          stroke={`url(#spark-stroke-${meta.shortLabel})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function TradingViewEmbed({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const host = document.createElement('div');
    host.className = 'tradingview-widget-container h-full w-full';

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget h-full w-full';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: 'D',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: false,
      withdateranges: true,
      hide_side_toolbar: false,
      details: true,
      studies: ['Volume@tv-basicstudies'],
      support_host: 'https://www.tradingview.com',
      backgroundColor: '#0a1118',
      gridColor: 'rgba(255,255,255,0.06)',
    });

    host.appendChild(widget);
    host.appendChild(script);
    container.appendChild(host);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function AssetLogo({ meta }: { meta: AssetMeta }) {
  const badgeShell = 'relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[20px] border shadow-[0_16px_40px_rgba(0,0,0,0.3)] ring-1';

  if (meta.shortLabel === 'BTC') {
    return (
      <div className={`${badgeShell} border-[#F7931A]/35 ring-[#F7931A]/15 text-[18px] font-black`} style={{ background: 'linear-gradient(135deg, rgba(247,147,26,0.32), rgba(247,147,26,0.08))', color: meta.accent }}>
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#F7931A]" />
        ₿
      </div>
    );
  }

  if (meta.shortLabel === 'ETH') {
    return (
      <div className={`${badgeShell} border-[#8B93FF]/35 ring-[#8B93FF]/15`} style={{ background: 'linear-gradient(135deg, rgba(139,147,255,0.26), rgba(139,147,255,0.06))' }}>
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#8B93FF]" />
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          <path d="M12 2.5L6.8 12L12 9.2L17.2 12L12 2.5Z" fill="#BFC7FF" />
          <path d="M12 21.5L6.8 13.2L12 16L17.2 13.2L12 21.5Z" fill="#8B93FF" />
          <path d="M12 15L6.8 12L12 9.2L17.2 12L12 15Z" fill="#DDE1FF" />
        </svg>
      </div>
    );
  }

  if (meta.shortLabel === 'SOL') {
    return (
      <div className={`${badgeShell} border-[#14F195]/30 ring-[#14F195]/15`} style={{ background: 'linear-gradient(135deg, rgba(20,241,149,0.2), rgba(153,69,255,0.14))' }}>
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#14F195]" />
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="solGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#14F195" />
              <stop offset="100%" stopColor="#9945FF" />
            </linearGradient>
          </defs>
          <path d="M6 7.2h9.8l2.2-2.2H8.2L6 7.2Z" fill="url(#solGradient)" />
          <path d="M6 12.9h9.8l2.2-2.2H8.2L6 12.9Z" fill="url(#solGradient)" />
          <path d="M8.2 19h9.8L15.8 16.8H6L8.2 19Z" fill="url(#solGradient)" />
        </svg>
      </div>
    );
  }

  if (meta.shortLabel === 'SPX' || meta.shortLabel === 'NDX') {
    return (
      <div className={`${badgeShell} border-white/15 ring-white/8`} style={{ background: `linear-gradient(135deg, ${meta.bg}, rgba(255,255,255,0.06))` }}>
        <LineChart className="absolute left-1.5 top-1.5 h-3.5 w-3.5" style={{ color: meta.accent }} />
        <span className="text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: meta.accent }}>{meta.shortLabel}</span>
        <span className="absolute bottom-1 right-1 text-[6px] font-bold uppercase tracking-[0.1em] text-white/70">IDX</span>
      </div>
    );
  }

  if (meta.shortLabel === 'LMT') {
    return (
      <div className={`${badgeShell} border-[#F59E0B]/35 ring-[#F59E0B]/15`} style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.30), rgba(120,53,15,0.14))' }}>
        <Shield className="absolute left-1.5 top-1.5 h-3.5 w-3.5 opacity-90 text-[#FCD34D]" />
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#FEF3C7]">LMT</span>
        <span className="absolute bottom-1 right-1 rounded-full bg-black/25 px-1 text-[5px] font-black uppercase tracking-[0.12em] text-[#FCD34D]">stealth</span>
      </div>
    );
  }

  if (meta.shortLabel === 'NOC') {
    return (
      <div className={`${badgeShell} border-[#F97316]/35 ring-[#F97316]/15`} style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.28), rgba(124,45,18,0.14))' }}>
        <Shield className="absolute left-1.5 top-1.5 h-3.5 w-3.5 opacity-90 text-[#FDBA74]" />
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#FFF7ED]">NOC</span>
        <span className="absolute bottom-1 right-1 rounded-full bg-black/25 px-1 text-[5px] font-black uppercase tracking-[0.12em] text-[#FDBA74]">orbital</span>
      </div>
    );
  }

  if (meta.shortLabel === 'RTX') {
    return (
      <div className={`${badgeShell} border-[#A78BFA]/35 ring-[#A78BFA]/15`} style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.28), rgba(76,29,149,0.14))' }}>
        <Shield className="absolute left-1.5 top-1.5 h-3.5 w-3.5 opacity-90 text-[#DDD6FE]" />
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#F5F3FF]">RTX</span>
        <span className="absolute bottom-1 right-1 rounded-full bg-black/25 px-1 text-[5px] font-black uppercase tracking-[0.12em] text-[#DDD6FE]">radar</span>
      </div>
    );
  }

  if (meta.shortLabel === 'GD') {
    return (
      <div className={`${badgeShell} border-[#38BDF8]/35 ring-[#38BDF8]/15`} style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.28), rgba(12,74,110,0.14))' }}>
        <Shield className="absolute left-1.5 top-1.5 h-3.5 w-3.5 opacity-90 text-[#BAE6FD]" />
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#F0F9FF]">GD</span>
        <span className="absolute bottom-1 right-1 rounded-full bg-black/25 px-1 text-[5px] font-black uppercase tracking-[0.12em] text-[#BAE6FD]">naval</span>
      </div>
    );
  }

  if (meta.shortLabel === 'BA') {
    return (
      <div className={`${badgeShell} border-[#10B981]/35 ring-[#10B981]/15`} style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.28), rgba(6,78,59,0.14))' }}>
        <Shield className="absolute left-1.5 top-1.5 h-3.5 w-3.5 opacity-90 text-[#A7F3D0]" />
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#ECFDF5]">BA</span>
        <span className="absolute bottom-1 right-1 rounded-full bg-black/25 px-1 text-[5px] font-black uppercase tracking-[0.12em] text-[#A7F3D0]">air</span>
      </div>
    );
  }

  if (['RTX', 'LMT', 'NOC', 'GD', 'BA'].includes(meta.shortLabel)) {
    return (
      <div className={`${badgeShell} border-white/15 ring-white/8`} style={{ background: `linear-gradient(135deg, ${meta.bg}, rgba(255,255,255,0.06))` }}>
        <Shield className="absolute left-1.5 top-1.5 h-3.5 w-3.5 opacity-85" style={{ color: meta.accent }} />
        <span className="text-[9px] font-black uppercase tracking-[0.08em]" style={{ color: meta.accent }}>{meta.shortLabel}</span>
        <span className="absolute bottom-1 right-1 text-[6px] font-bold uppercase tracking-[0.1em] text-white/70">EQ</span>
      </div>
    );
  }

  if (meta.shortLabel === 'WTI' || meta.shortLabel === 'BRENT') {
    return (
      <div className={`${badgeShell} border-white/15 ring-white/8`} style={{ background: `linear-gradient(135deg, ${meta.bg}, rgba(255,255,255,0.06))` }}>
        <Droplets className="absolute left-1.5 top-1.5 h-3.5 w-3.5" style={{ color: meta.accent }} />
        <span className="text-[8px] font-black uppercase tracking-[0.06em]" style={{ color: meta.accent }}>{meta.shortLabel === 'BRENT' ? 'BRN' : meta.shortLabel}</span>
        <span className="absolute bottom-1 right-1 text-[6px] font-bold uppercase tracking-[0.1em] text-white/70">OIL</span>
      </div>
    );
  }

  if (meta.shortLabel === 'XAU') {
    return (
      <div className={`${badgeShell} border-[#FACC15]/35 ring-[#FACC15]/15`} style={{ background: 'linear-gradient(135deg, rgba(250,204,21,0.28), rgba(133,77,14,0.14))' }}>
        <Gem className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-[#FDE68A]" />
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#FEF9C3]">AU</span>
        <span className="absolute bottom-1 right-1 rounded-full bg-black/25 px-1 text-[5px] font-black uppercase tracking-[0.12em] text-[#FDE68A]">gold</span>
      </div>
    );
  }

  if (meta.shortLabel === 'XAG') {
    return (
      <div className={`${badgeShell} border-slate-300/35 ring-slate-200/15`} style={{ background: 'linear-gradient(135deg, rgba(226,232,240,0.26), rgba(71,85,105,0.14))' }}>
        <Gem className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-slate-200" />
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-50">AG</span>
        <span className="absolute bottom-1 right-1 rounded-full bg-black/25 px-1 text-[5px] font-black uppercase tracking-[0.12em] text-slate-200">silver</span>
      </div>
    );
  }

  if (meta.shortLabel === 'COPPER') {
    return (
      <div className={`${badgeShell} border-orange-300/35 ring-orange-200/15`} style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.28), rgba(124,45,18,0.14))' }}>
        <Gem className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-orange-200" />
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-orange-50">CU</span>
        <span className="absolute bottom-1 right-1 rounded-full bg-black/25 px-1 text-[5px] font-black uppercase tracking-[0.12em] text-orange-200">copper</span>
      </div>
    );
  }

  if (meta.shortLabel === 'NATGAS') {
    return (
      <div className={`${badgeShell} border-sky-300/35 ring-sky-200/15`} style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.28), rgba(30,64,175,0.14))' }}>
        <Gem className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-sky-200" />
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-sky-50">NG</span>
        <span className="absolute bottom-1 right-1 rounded-full bg-black/25 px-1 text-[5px] font-black uppercase tracking-[0.12em] text-sky-200">gas</span>
      </div>
    );
  }

  if (meta.shortLabel === 'WHEAT') {
    return (
      <div className={`${badgeShell} border-amber-300/35 ring-amber-200/15`} style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.28), rgba(146,64,14,0.14))' }}>
        <Gem className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-amber-100" />
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-50">WH</span>
        <span className="absolute bottom-1 right-1 rounded-full bg-black/25 px-1 text-[5px] font-black uppercase tracking-[0.12em] text-amber-100">grain</span>
      </div>
    );
  }

  if (meta.shortLabel === 'CORN') {
    return (
      <div className={`${badgeShell} border-yellow-300/35 ring-yellow-200/15`} style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.28), rgba(120,53,15,0.14))' }}>
        <Gem className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-yellow-100" />
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-yellow-50">CRN</span>
        <span className="absolute bottom-1 right-1 rounded-full bg-black/25 px-1 text-[5px] font-black uppercase tracking-[0.12em] text-yellow-100">corn</span>
      </div>
    );
  }

  if (['XAU', 'XAG', 'COPPER', 'NATGAS', 'WHEAT', 'CORN'].includes(meta.shortLabel)) {
    const visible = meta.shortLabel === 'COPPER' ? 'CU' : meta.shortLabel === 'NATGAS' ? 'NG' : meta.shortLabel.slice(0, 3);
    return (
      <div className={`${badgeShell} border-white/15 ring-white/8`} style={{ background: `linear-gradient(135deg, ${meta.bg}, rgba(255,255,255,0.06))` }}>
        <Gem className="absolute left-1.5 top-1.5 h-3.5 w-3.5" style={{ color: meta.accent }} />
        <span className="text-[8px] font-black uppercase tracking-[0.08em]" style={{ color: meta.accent }}>{visible}</span>
        <span className="absolute bottom-1 right-1 text-[6px] font-bold uppercase tracking-[0.1em] text-white/70">MAT</span>
      </div>
    );
  }

  if (meta.section === 'stocks') {
    return (
      <div className={`${badgeShell} border-white/15 ring-white/8`} style={{ background: `linear-gradient(135deg, ${meta.bg}, rgba(255,255,255,0.06))` }}>
        <Shield className="absolute left-1.5 top-1.5 h-3.5 w-3.5 opacity-80" style={{ color: meta.accent }} />
        <span className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: meta.accent }}>
          {meta.shortLabel.slice(0, 2)}
        </span>
        <span className="absolute bottom-1 right-1 text-[6px] font-bold uppercase tracking-[0.1em] text-white/70">EQ</span>
      </div>
    );
  }

  if (meta.section === 'oil') {
    return (
      <div className={`${badgeShell} border-white/15 ring-white/8`} style={{ background: `linear-gradient(135deg, ${meta.bg}, rgba(255,255,255,0.06))` }}>
        <Droplets className="absolute left-1.5 top-1.5 h-3.5 w-3.5" style={{ color: meta.accent }} />
        <span className="text-[8px] font-black uppercase tracking-[0.12em]" style={{ color: meta.accent }}>{meta.shortLabel.slice(0, 3)}</span>
        <span className="absolute bottom-1 right-1 text-[6px] font-bold uppercase tracking-[0.1em] text-white/70">OIL</span>
      </div>
    );
  }

  if (meta.section === 'commodities') {
    return (
      <div className={`${badgeShell} border-white/15 ring-white/8`} style={{ background: `linear-gradient(135deg, ${meta.bg}, rgba(255,255,255,0.06))` }}>
        <Gem className="absolute left-1.5 top-1.5 h-3.5 w-3.5" style={{ color: meta.accent }} />
        <span className="text-[8px] font-black uppercase tracking-[0.1em]" style={{ color: meta.accent }}>{meta.shortLabel.slice(0, 3)}</span>
        <span className="absolute bottom-1 right-1 text-[6px] font-bold uppercase tracking-[0.1em] text-white/70">MAT</span>
      </div>
    );
  }

  if (meta.section === 'indices') {
    return (
      <div className={`${badgeShell} border-white/15 ring-white/8`} style={{ background: `linear-gradient(135deg, ${meta.bg}, rgba(255,255,255,0.06))` }}>
        <LineChart className="absolute left-1.5 top-1.5 h-3.5 w-3.5" style={{ color: meta.accent }} />
        <span className="text-[8px] font-black uppercase tracking-[0.12em]" style={{ color: meta.accent }}>{meta.shortLabel.slice(0, 3)}</span>
        <span className="absolute bottom-1 right-1 text-[6px] font-bold uppercase tracking-[0.1em] text-white/70">IDX</span>
      </div>
    );
  }

  return (
    <div className={`${badgeShell} border-white/15 ring-white/8 text-[11px] font-bold uppercase tracking-[0.1em]`} style={{ background: `linear-gradient(135deg, ${meta.bg}, rgba(255,255,255,0.06))`, color: meta.accent }}>
      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: meta.accent }} />
      {meta.shortLabel.slice(0, 4)}
    </div>
  );
}

function TickerRow({
  name,
  data: ticker,
  section,
  onSelect,
}: {
  name: string;
  data: MarketTicker;
  section: SectionKey;
  onSelect: (asset: SelectedAsset) => void;
}) {
  if (!ticker) return null;

  const meta = assetMetaFor(name, section);

  return (
    <button
      type="button"
      onClick={() => onSelect({ name, ticker, meta })}
      className="group w-full rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.03))] px-4 py-4 text-left transition-all hover:border-white/22 hover:bg-white/[0.09] shadow-[0_16px_34px_rgba(0,0,0,0.2)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <AssetLogo meta={meta} />
          <div className="min-w-0">
            <div className="text-[8px] font-mono uppercase tracking-[0.26em] text-[var(--cyan-primary)]">Asset</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="truncate text-[12px] font-semibold tracking-[0.05em] text-[var(--text-primary)]">{meta.label}</div>
              <span className="rounded-full border border-[var(--cyan-primary)]/18 bg-[var(--cyan-primary)]/10 px-2 py-0.5 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--cyan-primary)]">
                {meta.shortLabel}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">{meta.market}</span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-[0.16em]"
                style={{ background: meta.bg, color: meta.accent }}
              >
                {section}
              </span>
              <span className="rounded-full border border-[var(--gold-primary)]/20 bg-[var(--gold-primary)]/10 px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--gold-primary)]">
                logo live
              </span>
            </div>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">Price</div>
          <div className="mt-1 text-[12px] font-semibold tabular-nums text-[var(--text-primary)]">{formatPrice(ticker.price)}</div>
          <div className="mt-1 inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--cyan-primary)]">
            Chart
            <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${ticker.up ? 'bg-emerald-500/12 text-emerald-300' : 'bg-rose-500/12 text-rose-300'}`}>
            {ticker.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {ticker.up ? 'Bid Strength' : 'Risk-Off'}
          </span>
          <div className={`text-[10px] font-semibold tabular-nums ${ticker.up ? 'text-emerald-300' : 'text-rose-300'}`}>
            {ticker.change_percent && ticker.change_percent > 0 ? '+' : ''}
            {ticker.change_percent?.toFixed(2) ?? '--'}%
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <Sparkline ticker={ticker} meta={meta} />
        </div>
      </div>
    </button>
  );
}

export default function MarketsPanel({ data, spaceWeather, feedFreshness }: MarketsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>('crypto');
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);
  const [spotlightName, setSpotlightName] = useState<(typeof CRYPTO_SPOTLIGHT)[number]>('Bitcoin');
  const markets = useMemo(() => data.markets || {}, [data.markets]);
  const activeSectionMeta = useMemo(
    () => SECTIONS.find((section) => section.key === activeSection) ?? SECTIONS[0],
    [activeSection],
  );

  const activeEntries = useMemo(() => {
    const section = markets[activeSection];
    if (!section || Array.isArray(section)) return [];
    return Object.entries(section) as Array<[string, MarketTicker]>;
  }, [activeSection, markets]);

  const risingCount = activeEntries.filter(([, ticker]) => ticker?.up).length;
  const fallingCount = activeEntries.filter(([, ticker]) => ticker && ticker.up === false).length;
  const alertCount = markets.scm_alerts?.length ?? 0;
  const breadthPercent = activeEntries.length > 0 ? Math.round((risingCount / activeEntries.length) * 100) : 0;

  const sectionLead = useMemo(() => {
    return [...activeEntries]
      .filter(([, ticker]) => typeof ticker?.change_percent === 'number')
      .sort((a, b) => Math.abs((b[1].change_percent as number)) - Math.abs((a[1].change_percent as number)))[0] ?? null;
  }, [activeEntries]);

  const sectionTone = useMemo(() => {
    if (activeEntries.length === 0) {
      return {
        label: 'SYNCING',
        accent: 'text-[var(--text-secondary)]',
        summary: 'Waiting for section telemetry to settle.',
      };
    }

    if (risingCount >= fallingCount + 2) {
      return {
        label: 'BID DOMINANCE',
        accent: 'text-emerald-300',
        summary: `Buy-side breadth is leading ${activeSectionMeta.label.toLowerCase()} flows.`,
      };
    }

    if (fallingCount >= risingCount + 2) {
      return {
        label: 'PRESSURE BUILD',
        accent: 'text-rose-300',
        summary: `Risk is leaning against ${activeSectionMeta.label.toLowerCase()} allocations.`,
      };
    }

    return {
      label: 'CROSSCURRENTS',
      accent: 'text-amber-300',
      summary: `${activeSectionMeta.label} is rotating with mixed participation.`,
    };
  }, [activeEntries.length, activeSectionMeta.label, fallingCount, risingCount]);

  const leadSummary = sectionLead
    ? `${sectionLead[0]} ${sectionLead[1].change_percent && sectionLead[1].change_percent >= 0 ? 'pushing' : 'dragging'} ${sectionLead[1].change_percent && sectionLead[1].change_percent >= 0 ? '+' : ''}${sectionLead[1].change_percent?.toFixed(2) ?? '--'}%`
    : 'No standout mover yet in this section.';

  const featuredSymbols = useMemo(
    () => ['Bitcoin', 'Ethereum', 'Solana', 'RTX', 'LMT', 'NOC', 'WTI Crude', 'Brent Crude', 'Gold', 'Silver'].map((name) => ({ name, meta: assetMetaFor(name, ASSET_META[name]?.section ?? 'stocks') })),
    [],
  );

  const spotlightAsset = useMemo(() => {
    const crypto = markets.crypto;
    if (!crypto || Array.isArray(crypto)) return null;

    const activeName = crypto[spotlightName] ? spotlightName : CRYPTO_SPOTLIGHT.find((name) => crypto[name]);
    if (!activeName) return null;

    return {
      name: activeName,
      ticker: crypto[activeName],
      meta: assetMetaFor(activeName, 'crypto'),
    } satisfies SelectedAsset;
  }, [markets.crypto, spotlightName]);

  const marketTimestamp = typeof (markets as { timestamp?: string }).timestamp === 'string' ? (markets as { timestamp?: string }).timestamp : undefined;
  const feedStatusLabel = timeSince(feedFreshness ?? marketTimestamp);

  return (
    <>
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
              <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-[var(--text-muted)]">AEGIS exchange</div>
              <div className="mt-1 text-[13px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">Signal Exchange</div>
            </div>
            <span className="rounded-full border border-[var(--gold-primary)]/25 bg-[var(--gold-primary)]/12 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-[var(--gold-primary)]">
              Star panel
            </span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <span className="rounded-full border border-emerald-400/18 bg-emerald-400/10 px-2 py-1 text-[8px] font-mono uppercase tracking-[0.16em] text-emerald-300">
              live {feedStatusLabel}
            </span>
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
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
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

              <div className="mt-3 rounded-[24px] border border-[var(--cyan-primary)]/24 bg-[linear-gradient(135deg,rgba(0,229,255,0.12),rgba(255,255,255,0.05),rgba(212,175,55,0.08))] px-3.5 py-3.5 shadow-[0_18px_44px_rgba(0,0,0,0.2)] ring-1 ring-[var(--cyan-primary)]/12">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-mono uppercase tracking-[0.24em] text-[var(--cyan-primary)]">AEGIS asset identity live</div>
                    <div className="mt-1 text-[12px] font-semibold tracking-[0.1em] text-[var(--text-primary)]">BTC • ETH • SOL • RTX • LMT • NOC • WTI • Brent • XAU • XAG</div>
                    <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--gold-primary)]">logos premium visibles por activo • star surface</div>
                  </div>
                  <div className="rounded-full border border-[var(--gold-primary)]/25 bg-[var(--gold-primary)]/12 px-2.5 py-1 text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--gold-primary)]">
                    standout pass v4
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2">
                  {featuredSymbols.map((asset) => (
                    <div key={asset.name} className="flex items-center gap-2.5 rounded-[20px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] px-3 py-3 shadow-[0_10px_26px_rgba(0,0,0,0.14)]">
                      <AssetLogo meta={asset.meta} />
                      <div>
                        <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">{asset.meta.market}</div>
                        <div className="mt-0.5 text-[11px] font-semibold tracking-[0.06em] text-[var(--text-primary)]">{asset.meta.shortLabel}</div>
                        <div className="mt-0.5 text-[8px] font-mono uppercase tracking-[0.14em]" style={{ color: asset.meta.accent }}>{asset.meta.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 overflow-hidden rounded-[24px] border border-[var(--border-primary)]/50 bg-[linear-gradient(135deg,rgba(8,14,21,0.94),rgba(12,20,32,0.96))] shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
                <div className="flex flex-col gap-3 border-b border-white/8 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[8px] font-mono uppercase tracking-[0.26em] text-[var(--text-muted)]">Section posture</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">{activeSectionMeta.label}</span>
                      <span className={`rounded-full border border-white/10 px-2 py-1 text-[8px] font-mono uppercase tracking-[0.18em] ${sectionTone.accent} bg-white/[0.04]`}>
                        {sectionTone.label}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                      {sectionTone.summary}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                      <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">Breadth</div>
                      <div className="mt-1 text-[15px] font-semibold text-[var(--text-primary)]">{breadthPercent}% bid</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                      <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">Universe</div>
                      <div className="mt-1 text-[15px] font-semibold text-[var(--text-primary)]">{activeEntries.length} assets</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[8px] font-mono uppercase tracking-[0.24em] text-[var(--text-muted)]">Spotlight mover</div>
                    <div className="mt-1 text-[11px] font-semibold text-[var(--text-primary)]">{leadSummary}</div>
                  </div>
                  <div className="rounded-full border border-[var(--cyan-primary)]/20 bg-[var(--cyan-primary)]/8 px-2.5 py-1 text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--cyan-primary)]">
                    Premium asset drilldown online
                  </div>
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

              <div className="mt-3 grid grid-cols-2 gap-1.5 pb-1 sm:flex sm:flex-wrap sm:overflow-visible">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const active = activeSection === section.key;
                  return (
                    <button
                      key={section.key}
                      onClick={() => setActiveSection(section.key)}
                      className={`flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[8px] font-semibold tracking-[0.12em] transition-all sm:px-3 sm:text-[9px] sm:tracking-[0.14em] ${active ? 'border-[var(--border-active)] bg-white/[0.06] text-[var(--text-primary)]' : 'border-white/0 text-[var(--text-muted)] hover:border-white/8 hover:bg-white/[0.03] hover:text-[var(--text-secondary)]'}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="truncate">{section.label}</span>
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

              <div className="mt-3 rounded-2xl border border-[var(--cyan-primary)]/15 bg-[linear-gradient(135deg,rgba(0,229,255,0.08),rgba(247,147,26,0.06),rgba(20,241,149,0.06))] px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {CRYPTO_SPOTLIGHT.map((name) => {
                    const meta = assetMetaFor(name, 'crypto');
                    const active = spotlightName === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setActiveSection('crypto');
                          setSpotlightName(name);
                        }}
                        className={`rounded-full border px-2 py-1 text-[8px] font-mono uppercase tracking-[0.16em] transition-colors ${active ? 'shadow-[0_0_18px_rgba(0,0,0,0.14)]' : 'opacity-85 hover:opacity-100'}`}
                        style={{
                          borderColor: active ? `${meta.accent}66` : `${meta.accent}33`,
                          background: active ? `${meta.accent}26` : `${meta.accent}14`,
                          color: meta.accent,
                        }}
                      >
                        {meta.shortLabel}
                      </button>
                    );
                  })}
                  <span className="text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-secondary)]">Live crypto deck + chart visible now</span>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">BTC / ETH / SOL chart visible by default • click rows for full drilldown</div>
                <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--cyan-primary)]">TradingView linked</div>
              </div>

              {spotlightAsset && (
                <div className="mt-3 overflow-hidden rounded-[24px] border border-[var(--cyan-primary)]/18 bg-[linear-gradient(180deg,rgba(8,14,21,0.96),rgba(12,20,31,0.98))] shadow-[0_18px_44px_rgba(0,0,0,0.24)]">
                  <div className="flex flex-col gap-3 border-b border-white/8 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <AssetLogo meta={spotlightAsset.meta} />
                      <div>
                        <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--cyan-primary)]">Crypto spotlight live</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">{spotlightAsset.meta.label}</span>
                          <span className="rounded-full px-2 py-1 text-[8px] font-mono uppercase tracking-[0.16em]" style={{ color: spotlightAsset.meta.accent, background: spotlightAsset.meta.bg }}>
                            {spotlightAsset.meta.shortLabel}
                          </span>
                          <span className={`rounded-full px-2 py-1 text-[8px] font-mono uppercase tracking-[0.16em] ${spotlightAsset.ticker.up ? 'bg-emerald-400/12 text-emerald-300' : 'bg-rose-400/12 text-rose-300'}`}>
                            {spotlightAsset.ticker.change_percent && spotlightAsset.ticker.change_percent > 0 ? '+' : ''}{spotlightAsset.ticker.change_percent?.toFixed(2) ?? '--'}%
                          </span>
                        </div>
                        <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--gold-primary)]">Inline chart visible by default</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAsset(spotlightAsset)}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--border-primary)]/70 bg-white/[0.04] px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)] transition-colors hover:bg-white/[0.08]"
                    >
                      Open full chart
                    </button>
                  </div>
                  <div className="h-[220px] overflow-hidden bg-[#0A1118] sm:h-[260px]">
                    <TradingViewEmbed symbol={spotlightAsset.meta.tvSymbol} />
                  </div>
                </div>
              )}

              <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto styled-scrollbar pr-1 sm:max-h-[280px] xl:max-h-[320px]">
                {activeEntries.length > 0 ? (
                  activeEntries.map(([name, ticker]) => (
                    <TickerRow
                      key={name}
                      name={name}
                      data={ticker}
                      section={activeSection}
                      onSelect={setSelectedAsset}
                    />
                  ))
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

      <AnimatePresence>
        {selectedAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1200] flex items-end justify-center bg-[rgba(2,6,12,0.72)] p-3 md:items-center md:p-6"
            onClick={() => setSelectedAsset(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,14,21,0.98),rgba(11,18,28,0.98))] shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
            >
              <div className="border-b border-white/8 px-4 py-4 md:px-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <AssetLogo meta={selectedAsset.meta} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-semibold tracking-[0.06em] text-[var(--text-primary)]">{selectedAsset.meta.label}</h3>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                          {selectedAsset.meta.shortLabel}
                        </span>
                        <span className="rounded-full px-2 py-1 text-[8px] font-mono uppercase tracking-[0.16em]" style={{ color: selectedAsset.meta.accent, background: selectedAsset.meta.bg }}>
                          {selectedAsset.meta.market}
                        </span>
                      </div>
                      <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        Chart intelligence • TradingView • structured asset drilldown
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-start">
                    <a
                      href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(selectedAsset.meta.tvSymbol)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-primary)]/70 bg-white/[0.04] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:bg-white/[0.08]"
                    >
                      Open TradingView
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setSelectedAsset(null)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[var(--text-secondary)] transition-colors hover:bg-white/[0.08] hover:text-[var(--text-primary)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-3">
                    <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">Last price</div>
                    <div className="mt-1 text-[16px] font-semibold tabular-nums text-[var(--text-primary)]">{formatPrice(selectedAsset.ticker.price)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-3">
                    <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">24h change</div>
                    <div className={`mt-1 text-[16px] font-semibold tabular-nums ${selectedAsset.ticker.up ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {selectedAsset.ticker.change_percent && selectedAsset.ticker.change_percent > 0 ? '+' : ''}
                      {selectedAsset.ticker.change_percent?.toFixed(2) ?? '--'}%
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-3">
                    <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">Market posture</div>
                    <div className={`mt-1 inline-flex items-center gap-1 text-[12px] font-semibold ${selectedAsset.ticker.up ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {selectedAsset.ticker.up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {selectedAsset.ticker.up ? 'Accumulation' : 'Distribution'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 md:p-4">
                <div className="h-[420px] overflow-hidden rounded-[24px] border border-white/8 bg-[#0A1118] md:h-[520px]">
                  <TradingViewEmbed symbol={selectedAsset.meta.tvSymbol} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
