'use client';

import { motion } from 'framer-motion';
import { Globe, Layers, Radar } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { getDashboardCopy } from '@/lib/i18n';

type DashboardMode = 'earth' | 'solar' | 'focus';

type ModeDockProps = {
  mode: DashboardMode;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onEarthOps: () => void;
  onSolarView: () => void;
  onFocus: () => void;
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

function localeButtonClass(active: boolean) {
  return active
    ? 'border-[rgba(34,211,238,0.42)] bg-[rgba(34,211,238,0.12)] text-[var(--cyan-primary)]'
    : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)]';
}

export default function ModeDock({ mode, locale, onLocaleChange, onEarthOps, onSolarView, onFocus }: ModeDockProps) {
  const copy = getDashboardCopy(locale);
  const modeMeta: Record<DashboardMode, { label: string; signal: string; accent: string }> = {
    earth: {
      label: copy.modeDock.earthLabel,
      signal: copy.modeDock.earthSignal,
      accent: 'text-[var(--gold-primary)]',
    },
    solar: {
      label: copy.modeDock.solarLabel,
      signal: copy.modeDock.solarSignal,
      accent: 'text-[var(--cyan-primary)]',
    },
    focus: {
      label: copy.modeDock.focusLabel,
      signal: copy.modeDock.focusSignal,
      accent: 'text-[var(--alert-green)]',
    },
  };

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
          <div className="text-[7px] font-mono tracking-[0.32em] text-[var(--text-secondary)]">{copy.modeDock.core}</div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-1 py-1 sm:flex">
              <span className="px-1 text-[6px] font-mono tracking-[0.2em] text-[var(--text-muted)]">{copy.language.label}</span>
              <button onClick={() => onLocaleChange('en')} className={`rounded-full border px-2 py-1 text-[6px] font-mono tracking-[0.18em] transition-colors ${localeButtonClass(locale === 'en')}`}>{copy.language.english}</button>
              <button onClick={() => onLocaleChange('es')} className={`rounded-full border px-2 py-1 text-[6px] font-mono tracking-[0.18em] transition-colors ${localeButtonClass(locale === 'es')}`}>{copy.language.spanish}</button>
            </div>
            <div className={`hidden text-[7px] font-mono tracking-[0.24em] sm:block ${activeMeta.accent}`}>{activeMeta.signal}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={onEarthOps}
            aria-label={`Switch to ${modeMeta.earth.label}`}
            className={`group flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-[8px] font-mono tracking-[0.16em] transition-colors ${modeButtonClass(mode === 'earth', 'earth')}`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110" />
            <span className="truncate">{modeMeta.earth.label}</span>
          </button>
          <button
            onClick={onSolarView}
            aria-label={`Switch to ${modeMeta.solar.label}`}
            className={`group flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-[8px] font-mono tracking-[0.16em] transition-colors ${modeButtonClass(mode === 'solar', 'solar')}`}
          >
            <Globe className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110" />
            <span className="truncate">{modeMeta.solar.label}</span>
          </button>
          <button
            onClick={onFocus}
            aria-label={`Switch to ${modeMeta.focus.label}`}
            className={`group flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-[8px] font-mono tracking-[0.16em] transition-colors ${modeButtonClass(mode === 'focus', 'focus')}`}
          >
            <Radar className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110" />
            <span className="truncate">{modeMeta.focus.label}</span>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 px-2 sm:hidden">
          <div className="flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-1 py-1">
            <button onClick={() => onLocaleChange('en')} className={`rounded-full border px-2 py-1 text-[6px] font-mono tracking-[0.18em] transition-colors ${localeButtonClass(locale === 'en')}`}>{copy.language.english}</button>
            <button onClick={() => onLocaleChange('es')} className={`rounded-full border px-2 py-1 text-[6px] font-mono tracking-[0.18em] transition-colors ${localeButtonClass(locale === 'es')}`}>{copy.language.spanish}</button>
          </div>
          <div className={`text-center text-[6px] font-mono tracking-[0.22em] ${activeMeta.accent}`}>{activeMeta.signal}</div>
        </div>
      </div>
    </motion.div>
  );
}
