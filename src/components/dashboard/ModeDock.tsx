'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Globe, Layers, Radar } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { getDashboardCopy } from '@/lib/i18n';

type DashboardMode = 'earth' | 'solar' | 'focus';

type ModeDockProps = {
  mode: DashboardMode;
  locale: Locale;
  isMobile?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
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

export default function ModeDock({ mode, locale, isMobile = false, collapsed = false, onToggleCollapsed, onLocaleChange, onEarthOps, onSolarView, onFocus }: ModeDockProps) {
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
      className="absolute top-2 md:top-3 left-1/2 z-[220] w-[min(34rem,calc(100vw-1.1rem))] md:w-[min(36rem,calc(100vw-1rem))] -translate-x-1/2 pointer-events-auto"
    >
      <div className="sovereign-panel px-1.5 py-1.5 md:px-2 md:py-2 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
        <div className="mb-1 md:mb-2 flex items-center justify-between gap-2 px-1.5 md:px-2">
          <div className="text-[6px] md:text-[7px] font-mono tracking-[0.24em] md:tracking-[0.32em] text-[var(--text-secondary)]">{copy.modeDock.core}</div>
          <div className="flex items-center gap-2">
            {isMobile && onToggleCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[6px] font-mono tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:border-white/20 hover:text-[var(--text-primary)] sm:hidden"
                aria-label={collapsed ? 'Abrir panel de modos' : 'Cerrar panel de modos'}
              >
                {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                <span>{collapsed ? 'ABRIR' : 'CERRAR'}</span>
              </button>
            )}
            <div className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-1 py-1 sm:flex">
              <span className="px-1 text-[6px] font-mono tracking-[0.2em] text-[var(--text-muted)]">{copy.language.label}</span>
              <button onClick={() => onLocaleChange('en')} className={`rounded-full border px-2 py-1 text-[6px] font-mono tracking-[0.18em] transition-colors ${localeButtonClass(locale === 'en')}`}>{copy.language.english}</button>
              <button onClick={() => onLocaleChange('es')} className={`rounded-full border px-2 py-1 text-[6px] font-mono tracking-[0.18em] transition-colors ${localeButtonClass(locale === 'es')}`}>{copy.language.spanish}</button>
            </div>
            <div className={`hidden text-[7px] font-mono tracking-[0.24em] sm:block ${activeMeta.accent}`}>{activeMeta.signal}</div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="mode-dock-expanded"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-1 md:gap-1.5">
                <button
                  onClick={onEarthOps}
                  aria-label={`Switch to ${modeMeta.earth.label}`}
                  className={`group flex min-w-0 items-center justify-center gap-1 md:gap-1.5 rounded-xl md:rounded-2xl border px-2 py-1.25 md:px-2.5 md:py-1.5 text-[7px] md:text-[8px] font-mono tracking-[0.13em] md:tracking-[0.16em] transition-colors ${modeButtonClass(mode === 'earth', 'earth')}`}
                >
                  <Layers className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0 transition-transform group-hover:scale-110" />
                  <span className="truncate">{modeMeta.earth.label}</span>
                </button>
                <button
                  onClick={onSolarView}
                  aria-label={`Switch to ${modeMeta.solar.label}`}
                  className={`group relative flex min-w-0 items-center justify-center gap-1.5 md:gap-2 overflow-hidden rounded-xl md:rounded-2xl border px-2 py-1.25 md:px-2.5 md:py-2 text-[7px] md:text-[8px] font-mono tracking-[0.13em] md:tracking-[0.16em] transition-colors ${mode === 'solar' ? 'border-cyan-300/55 bg-cyan-400/[0.16] text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.22)]' : 'border-cyan-300/28 bg-cyan-400/[0.075] text-cyan-200 hover:border-cyan-300/55 hover:bg-cyan-400/[0.13] hover:text-white'}`}
                >
                  <span className="pointer-events-none absolute inset-y-0 left-0 w-7 md:w-10 bg-gradient-to-r from-cyan-300/16 to-transparent" />
                  <span className="relative flex h-4.5 w-4.5 md:h-5 md:w-5 shrink-0 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_14px_rgba(34,211,238,0.2)]">
                    <Globe className="h-3 w-3 md:h-3.5 md:w-3.5 transition-transform group-hover:scale-110" />
                  </span>
                  <span className="relative min-w-0 text-left leading-tight">
                    <span className="block truncate text-[8px] md:text-[9px] font-semibold tracking-[0.14em] md:tracking-[0.18em]">SISTEMA SOLAR</span>
                    <span className="hidden truncate text-[6px] tracking-[0.22em] text-cyan-200/75 sm:block">3D PLANET MODE</span>
                  </span>
                </button>
                <button
                  onClick={onFocus}
                  aria-label={`Switch to ${modeMeta.focus.label}`}
                  className={`group flex min-w-0 items-center justify-center gap-1 md:gap-1.5 rounded-xl md:rounded-2xl border px-2 py-1.25 md:px-2.5 md:py-1.5 text-[7px] md:text-[8px] font-mono tracking-[0.13em] md:tracking-[0.16em] transition-colors ${modeButtonClass(mode === 'focus', 'focus')}`}
                >
                  <Radar className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0 transition-transform group-hover:scale-110" />
                  <span className="truncate">{modeMeta.focus.label}</span>
                </button>
              </div>

              <div className="mt-1 flex items-center justify-between gap-2 px-1.5 sm:hidden">
                <div className="flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-1 py-0.5">
                  <button onClick={() => onLocaleChange('en')} className={`rounded-full border px-2 py-0.5 text-[6px] font-mono tracking-[0.16em] transition-colors ${localeButtonClass(locale === 'en')}`}>{copy.language.english}</button>
                  <button onClick={() => onLocaleChange('es')} className={`rounded-full border px-2 py-0.5 text-[6px] font-mono tracking-[0.16em] transition-colors ${localeButtonClass(locale === 'es')}`}>{copy.language.spanish}</button>
                </div>
                <div className={`text-center text-[5px] font-mono tracking-[0.18em] ${activeMeta.accent}`}>{activeMeta.signal}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isMobile && collapsed && (
          <div className="mt-0.5 flex items-center justify-between gap-2 px-1.5 sm:hidden">
            <div className="truncate text-[6px] font-mono tracking-[0.16em] text-[var(--text-secondary)]">{activeMeta.label}</div>
            <div className={`max-w-[8.5rem] truncate text-right text-[5px] font-mono tracking-[0.18em] ${activeMeta.accent}`}>{activeMeta.signal}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
