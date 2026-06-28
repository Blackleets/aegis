'use client';

import { motion } from 'framer-motion';
import { Globe, Layers, Radar } from 'lucide-react';

type DashboardMode = 'earth' | 'solar' | 'focus';

type ModeDockProps = {
  mode: DashboardMode;
  onEarthOps: () => void;
  onSolarView: () => void;
  onFocus: () => void;
};

const modeMeta: Record<DashboardMode, { label: string; signal: string; accent: string }> = {
  earth: {
    label: 'EARTH OPS',
    signal: 'LIVE COMMAND SURFACE',
    accent: 'text-[var(--gold-primary)]',
  },
  solar: {
    label: 'SOLAR VIEW',
    signal: 'PLANETARY VISUAL VISTA',
    accent: 'text-[var(--cyan-primary)]',
  },
  focus: {
    label: 'FOCUS',
    signal: 'CLEAN EARTH PRESENTATION',
    accent: 'text-[var(--alert-green)]',
  },
};

function modeButtonClass(active: boolean, tone: DashboardMode) {
  if (!active) {
    return 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)]';
  }

  if (tone === 'earth') {
    return 'border-[rgba(212,175,55,0.42)] bg-[rgba(212,175,55,0.12)] text-[var(--gold-primary)] shadow-[0_0_24px_rgba(212,175,55,0.08)]';
  }

  if (tone === 'solar') {
    return 'border-[rgba(34,211,238,0.42)] bg-[rgba(34,211,238,0.12)] text-[var(--cyan-primary)] shadow-[0_0_24px_rgba(34,211,238,0.08)]';
  }

  return 'border-[rgba(16,185,129,0.42)] bg-[rgba(16,185,129,0.12)] text-[var(--alert-green)] shadow-[0_0_24px_rgba(16,185,129,0.08)]';
}

export default function ModeDock({ mode, onEarthOps, onSolarView, onFocus }: ModeDockProps) {
  const activeMeta = modeMeta[mode];

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3.05, duration: 0.45 }}
      className="absolute top-4 left-1/2 z-[220] w-[min(41rem,calc(100vw-1rem))] -translate-x-1/2 pointer-events-auto"
    >
      <div className="relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-[linear-gradient(135deg,rgba(7,12,18,0.82),rgba(10,18,28,0.68))] px-2 py-2 shadow-[0_18px_54px_rgba(0,0,0,0.30)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
        <div className="mb-2 flex items-center justify-between gap-3 px-2">
          <div className="text-[7px] font-mono tracking-[0.32em] text-[var(--text-secondary)]">AEGIS MODE CORE</div>
          <div className={`hidden text-[7px] font-mono tracking-[0.24em] sm:block ${activeMeta.accent}`}>{activeMeta.signal}</div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={onEarthOps}
            aria-label={`Switch to ${modeMeta.earth.label}`}
            className={`group flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-[8px] font-mono tracking-[0.16em] transition-colors ${modeButtonClass(mode === 'earth', 'earth')}`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110" />
            <span className="truncate">EARTH OPS</span>
          </button>
          <button
            onClick={onSolarView}
            aria-label={`Switch to ${modeMeta.solar.label}`}
            className={`group flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-[8px] font-mono tracking-[0.16em] transition-colors ${modeButtonClass(mode === 'solar', 'solar')}`}
          >
            <Globe className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110" />
            <span className="truncate">SOLAR VIEW</span>
          </button>
          <button
            onClick={onFocus}
            aria-label={`Switch to ${modeMeta.focus.label}`}
            className={`group flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-[8px] font-mono tracking-[0.16em] transition-colors ${modeButtonClass(mode === 'focus', 'focus')}`}
          >
            <Radar className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110" />
            <span className="truncate">FOCUS</span>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-center gap-2 px-2 sm:hidden">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/12 to-white/5" />
          <div className={`text-center text-[6px] font-mono tracking-[0.22em] ${activeMeta.accent}`}>{activeMeta.signal}</div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/12 to-white/5" />
        </div>
      </div>
    </motion.div>
  );
}
