'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import {
  type AppearanceMode,
  type AppearancePreferences,
  updateAppearanceCountry,
  updateAppearanceMode,
} from '@/lib/appearance-preferences';
import { OPERATOR_COUNTRIES } from '@/lib/operator-country';

type AppearanceSettingsPanelProps = {
  value: AppearancePreferences;
  onChange: (next: AppearancePreferences) => void;
  detectedCountryCode?: string | null;
};

const THEME_OPTIONS: Array<{
  mode: AppearanceMode;
  label: string;
  detail: string;
  Icon: typeof Moon;
}> = [
  { mode: 'dark', label: 'Oscuro', detail: 'Command glass', Icon: Moon },
  { mode: 'light', label: 'Claro', detail: 'Fondo blanco', Icon: Sun },
  { mode: 'system', label: 'Sistema', detail: 'Sigue el OS', Icon: Monitor },
];

export default function AppearanceSettingsPanel({
  value,
  onChange,
  detectedCountryCode = null,
}: AppearanceSettingsPanelProps) {
  return (
    <section
      className="mb-3 overflow-hidden rounded-[22px] border border-[var(--border-secondary)] bg-[var(--bg-panel)]"
      aria-label="Ajustes de apariencia"
    >
      <div className="border-b border-[var(--border-secondary)] px-4 py-3">
        <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-cyan)]">Ajustes</div>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-muted)]">
          Tema y alcance por país. Se guarda solo en este dispositivo.
        </p>
      </div>

      <div className="px-3 py-3">
        <p className="px-1 text-[7px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">Fondo</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Tema de interfaz">
          {THEME_OPTIONS.map(({ mode, label, detail, Icon }) => {
            const active = value.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(updateAppearanceMode(value, mode))}
                className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-[14px] border px-2 transition-colors ${
                  active
                    ? 'border-[rgba(118,228,234,0.42)] bg-[rgba(118,228,234,0.12)] text-[var(--cyan-primary)]'
                    : 'border-[var(--border-secondary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-primary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-semibold tracking-[-0.01em]">{label}</span>
                <span className="text-[7px] font-mono uppercase tracking-[0.12em] opacity-60">{detail}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[var(--border-secondary)] px-3 py-3">
        <div className="flex items-end justify-between gap-2 px-1">
          <div>
            <p className="text-[7px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">Datos por país</p>
            <p className="mt-1 text-[9px] text-[var(--text-secondary)]">
              Filtra alertas globales al territorio operativo.
            </p>
          </div>
          {detectedCountryCode && value.countryCode === 'auto' && (
            <span className="rounded-full border border-[var(--border-cyan)] bg-[rgba(118,228,234,0.08)] px-2 py-1 text-[7px] font-mono uppercase tracking-[0.12em] text-[var(--cyan-primary)]">
              GPS {detectedCountryCode}
            </span>
          )}
        </div>
        <label className="mt-2 block">
          <span className="sr-only">País operativo</span>
          <select
            value={value.countryCode}
            onChange={(event) => onChange(updateAppearanceCountry(value, event.target.value))}
            className="min-h-11 w-full rounded-[14px] border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 text-[11px] font-medium text-[var(--text-primary)] outline-none transition-colors focus:border-[rgba(118,228,234,0.42)]"
          >
            <option value="auto">Automático (GPS)</option>
            {OPERATOR_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
