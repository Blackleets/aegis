'use client';

import { ChevronDown, ChevronUp, Languages, Layers, Radar } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import ModeDock from './ModeDock';
import { getDashboardCopy } from '@/lib/i18n';

type Props = ComponentProps<typeof ModeDock>;

export default function ModeDockRefined({
  mode,
  locale,
  onLocaleChange,
  onEarthOps,
  onFocus,
}: Props) {
  const [open, setOpen] = useState(false);
  const copy = getDashboardCopy(locale);
  const isFocus = mode === 'focus';
  const activeLabel = isFocus ? copy.modeDock.focusLabel : copy.modeDock.earthLabel;

  const activateEarth = () => {
    onEarthOps();
    setOpen(false);
  };

  const activateFocus = () => {
    onFocus();
    setOpen(false);
  };

  return (
    <div className="absolute left-1/2 top-2 z-[220] -translate-x-1/2 pointer-events-auto">
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-[rgba(7,13,19,0.88)] px-3 text-[11px] font-medium text-[var(--text-primary)] shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md transition-colors hover:border-white/20"
          aria-expanded={open}
          aria-controls="aegis-mode-dock-menu"
          aria-label={locale === 'es' ? 'Abrir selector de modo' : 'Open mode selector'}
        >
          {isFocus ? <Radar className="h-4 w-4 text-[var(--alert-green)]" /> : <Layers className="h-4 w-4 text-[var(--gold-primary)]" />}
          <span className="max-w-[10rem] truncate">{activeLabel}</span>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />}
        </button>

        {open && (
          <div
            id="aegis-mode-dock-menu"
            className="mt-2 w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-white/10 bg-[rgba(7,13,19,0.94)] p-2 shadow-[0_16px_42px_rgba(0,0,0,0.28)] backdrop-blur-xl"
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={activateEarth}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-[11px] font-medium transition-colors ${!isFocus ? 'border-[rgba(183,200,177,0.36)] bg-[rgba(183,200,177,0.10)] text-white' : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)] hover:border-white/20 hover:text-white'}`}
              >
                <Layers className="h-4 w-4" />
                {copy.modeDock.earthLabel}
              </button>
              <button
                type="button"
                onClick={activateFocus}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-[11px] font-medium transition-colors ${isFocus ? 'border-[rgba(77,255,154,0.34)] bg-[rgba(77,255,154,0.09)] text-white' : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)] hover:border-white/20 hover:text-white'}`}
              >
                <Radar className="h-4 w-4" />
                {copy.modeDock.focusLabel}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-white/8 pt-2">
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                <Languages className="h-3.5 w-3.5" />
                {copy.language.label}
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => onLocaleChange('es')} className={`min-h-8 rounded-md border px-2 text-[10px] ${locale === 'es' ? 'border-white/25 bg-white/[0.08] text-white' : 'border-white/8 text-[var(--text-muted)]'}`}>{copy.language.spanish}</button>
                <button type="button" onClick={() => onLocaleChange('en')} className={`min-h-8 rounded-md border px-2 text-[10px] ${locale === 'en' ? 'border-white/25 bg-white/[0.08] text-white' : 'border-white/8 text-[var(--text-muted)]'}`}>{copy.language.english}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
