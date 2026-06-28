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
    return 'border-[rgba(183,200,177,0.42)] bg-[rgba(183,200,177,0.12)] text-[var(--gold-primary)] shadow-[0_0_24px_rgba(183,200,177,0.10)]';
  }

  if (tone === 'solar') {
    return 'border-[rgba(118,228,234,0.42)] bg-[rgba(118,228,234,0.12)] text-[var(--cyan-primary)] shadow-[0_0_24px_rgba(118,228,234,0.10)]';
  }

  return 'border-[rgba(77,255,154,0.38)] bg-[rgba(77,255,154,0.10)] text-[var(--alert-green)] shadow-[0_0_24px_rgba(77,255,154,0.08)]';
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
      <div className="sovereign-panel px-2 py-2 backdrop-blur-xl">
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
