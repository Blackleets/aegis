'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart3, Globe, Wifi } from 'lucide-react';

type UsageMetrics = {
  onlineUsers: number;
  totalUsers: number;
};

type SpaceWeather = {
  storm_color?: string;
  kp_index?: number | string;
};

type TopHudOverlaysProps = {
  showAuxiliaryHud: boolean;
  isMobile: boolean;
  headerBadge: string;
  headerSubtitle: string;
  systemLabel: string;
  feedsLabel: string;
  liveLabel: string;
  visitsLabel: string;
  alertsLabel: string;
  supportProjectCompactLabel: string;
  backendStatus: 'connected' | 'error' | 'connecting';
  backendStatusLabel: string;
  backendStatusAccentClass: string;
  activeLayerCount: number;
  activeIntelAlerts: number;
  usageMetrics: UsageMetrics | null;
  spaceWeather: SpaceWeather | null;
  zuluClock: ReactNode;
  uptimeClock: ReactNode;
};

export default function TopHudOverlays({
  showAuxiliaryHud,
  isMobile,
  headerBadge,
  headerSubtitle,
  systemLabel,
  feedsLabel,
  liveLabel,
  visitsLabel,
  alertsLabel,
  supportProjectCompactLabel,
  backendStatus,
  backendStatusLabel,
  backendStatusAccentClass,
  activeLayerCount,
  activeIntelAlerts,
  usageMetrics,
  spaceWeather,
  zuluClock,
  uptimeClock,
}: TopHudOverlaysProps) {
  return (
    <>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 2.5 }} className="absolute top-2 left-2 md:top-5 md:left-5 z-[200] pointer-events-none flex items-center gap-1.5 md:gap-3">
        <div className="w-6 h-6 md:w-9 md:h-9 flex items-center justify-center relative">
          <div className="absolute inset-[-4px] md:inset-[-5px] rounded-full border border-[var(--gold-primary)]/20" style={{ animation: 'aegis-rotate 12s linear infinite' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[var(--gold-primary)] shadow-[0_0_6px_var(--gold-primary)]" />
          </div>
          <div className="absolute inset-[-8px] md:inset-[-10px] rounded-full border border-[var(--gold-primary)]/10" style={{ animation: 'aegis-rotate 20s linear infinite reverse' }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-0.5 h-0.5 rounded-full bg-[var(--gold-primary)]/60" />
          </div>
          <div className="w-4.5 h-4.5 md:w-7 md:h-7 rounded-full border-2 border-[var(--gold-primary)] flex items-center justify-center animate-glow-pulse">
            <div className="w-2 h-2 md:w-3.5 md:h-3.5 rounded-full bg-[var(--gold-primary)]/30 border border-[var(--gold-primary)]/60" />
          </div>
          <div className="absolute w-[1px] h-full bg-[var(--gold-primary)]/30" />
          <div className="absolute w-full h-[1px] bg-[var(--gold-primary)]/30" />
        </div>
        <div className="hidden md:block absolute top-1/2 left-[52px] w-[200px] h-[1px] bg-gradient-to-r from-[var(--gold-primary)]/40 via-[var(--gold-primary)]/15 to-transparent" />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-xl font-bold tracking-[0.28em] md:tracking-[0.5em] text-[var(--text-heading)] font-mono">AEGIS</h1>
            <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-[1px] rounded-sm border border-[var(--cyan-primary)]/40 bg-[var(--cyan-primary)]/10 text-[7px] font-mono font-bold tracking-[0.15em] text-[var(--cyan-primary)] uppercase" style={{ lineHeight: '1.4' }}>
              <Globe className="w-2.5 h-2.5" />
              {headerBadge}
            </span>
          </div>
          <span className="hidden md:block text-[8px] md:text-[9px] text-[var(--gold-primary)] font-mono tracking-[0.2em] md:tracking-[0.3em] opacity-80">{headerSubtitle}</span>
        </div>
      </motion.div>

      {showAuxiliaryHud && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }} className="status-bar-desktop absolute top-3 right-3 md:top-4 md:right-5 z-[200] pointer-events-none flex items-center gap-1.5 xl:gap-2.5 2xl:gap-3 text-[8px] xl:text-[9px] 2xl:text-[10px] font-mono tracking-[0.16em] xl:tracking-[0.2em] text-[var(--text-muted)]">
          <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-[var(--border-primary)]/70 bg-[rgba(15,23,32,0.82)] px-2.5 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">{zuluClock}</span>
          <span className="hidden lg:inline text-[var(--border-primary)]">│</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-primary)]/70 bg-[rgba(15,23,32,0.82)] px-2 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">{systemLabel} <span className={backendStatusAccentClass}>{backendStatusLabel}</span></span>
          {spaceWeather && <span className="hidden xl:inline">SOLAR: <span style={{ color: spaceWeather.storm_color, fontWeight: 700 }}>Kp{spaceWeather.kp_index}</span></span>}
          <span className="hidden 2xl:inline-flex items-center gap-1">
            <Wifi className="w-3 h-3 text-[var(--cyan-primary)]" />
            <span className="text-[var(--cyan-primary)] font-bold">{activeLayerCount}</span>
            <span className="text-[var(--text-muted)]/60">{feedsLabel}</span>
          </span>
          {usageMetrics && (
            <span className="hidden 2xl:inline-flex items-center gap-2 rounded-full border border-[var(--border-primary)]/70 bg-[rgba(15,23,32,0.82)] px-2.5 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">
              <Activity className="h-3 w-3 text-[var(--alert-green)]" />
              <span className="text-[var(--text-secondary)]">{liveLabel}</span>
              <span className="font-bold text-[var(--text-primary)]">{usageMetrics.onlineUsers}</span>
              <span className="text-[var(--border-primary)]">/</span>
              <BarChart3 className="h-3 w-3 text-[var(--gold-primary)]" />
              <span className="text-[var(--text-secondary)]">{visitsLabel}</span>
              <span className="font-bold text-[var(--text-primary)]">{usageMetrics.totalUsers.toLocaleString()}</span>
            </span>
          )}
          <span className="hidden xl:inline-flex">{uptimeClock}</span>
        </motion.div>
      )}

      {isMobile && showAuxiliaryHud && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="absolute top-2 right-2 z-[200] pointer-events-auto flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 rounded-xl border border-[var(--border-primary)]/70 bg-[rgba(15,23,32,0.92)] px-2 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
            <span className={`h-1.5 w-1.5 rounded-full ${backendStatus === 'connected' ? 'bg-[var(--alert-green)]' : backendStatus === 'error' ? 'bg-[var(--alert-red)]' : 'bg-[var(--gold-primary)]'} animate-aegis-pulse`} />
            <span className="text-[6px] font-mono font-bold tracking-[0.14em] text-[var(--text-primary)]">{backendStatusLabel}</span>
            <span className="text-[var(--border-primary)]/70">•</span>
            <span className="text-[6px] font-mono tracking-[0.14em] text-[var(--text-muted)]">{alertsLabel}</span>
            <span className="text-[8px] font-bold tabular-nums" style={{ color: activeIntelAlerts > 0 ? '#FF9500' : 'var(--alert-green)' }}>{activeIntelAlerts}</span>
          </div>
          <a href="https://ko-fi.com/M8D41ZYW4Z" target="_blank" rel="noreferrer" className="glass-panel px-2 py-1 flex items-center gap-1 text-[6px] font-mono tracking-[0.14em] hover:opacity-80 transition-opacity border-[var(--border-primary)]/80 bg-[rgba(15,23,32,0.92)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold-primary)] animate-aegis-pulse" />
            <span className="text-[var(--text-primary)] font-bold">{supportProjectCompactLabel}</span>
          </a>
        </motion.div>
      )}
    </>
  );
}
