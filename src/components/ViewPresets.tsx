'use client';

import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import type { Locale } from '@/lib/i18n';

interface ViewPresetsProps {
  onNavigate: (lat: number, lng: number, zoom: number) => void;
  locale: Locale;
}

interface ViewPreset {
  key: string;
  label: { en: string; es: string };
  lat: number;
  lng: number;
  zoom: number;
  icon: string;
  hot?: boolean;
}

const PRESETS: ViewPreset[] = [
  { key: 'global', label: { en: 'GLOBAL', es: 'GLOBAL' }, lat: 20, lng: 0, zoom: 2.05, icon: '🌍' },
  { key: 'europe', label: { en: 'EUROPE', es: 'EUROPA' }, lat: 48, lng: 10, zoom: 4, icon: '🇪🇺' },
  { key: 'middle-east', label: { en: 'MIDDLE EAST', es: 'MEDIO ORIENTE' }, lat: 30, lng: 45, zoom: 4.5, icon: '🔥', hot: true },
  { key: 'east-asia', label: { en: 'EAST ASIA', es: 'ASIA ORIENTAL' }, lat: 35, lng: 120, zoom: 4, icon: '🌏' },
  { key: 'americas', label: { en: 'AMERICAS', es: 'AMÉRICAS' }, lat: 25, lng: -90, zoom: 3, icon: '🌎' },
  { key: 'ukraine', label: { en: 'UKRAINE', es: 'UCRANIA' }, lat: 49, lng: 32, zoom: 6, icon: '⚔️', hot: true },
  { key: 'africa', label: { en: 'AFRICA', es: 'ÁFRICA' }, lat: 5, lng: 20, zoom: 3.5, icon: '🌍' },
  { key: 'sea', label: { en: 'S.E. ASIA', es: 'S.E. ASIA' }, lat: 10, lng: 110, zoom: 4.5, icon: '🌏' },
  { key: 'arctic', label: { en: 'ARCTIC', es: 'ÁRTICO' }, lat: 75, lng: 0, zoom: 3.5, icon: '❄️' },
  { key: 'india', label: { en: 'INDIA', es: 'INDIA' }, lat: 22, lng: 78, zoom: 4.5, icon: '🇮🇳' },
  { key: 'australia', label: { en: 'AUSTRALIA', es: 'AUSTRALIA' }, lat: -25, lng: 134, zoom: 4, icon: '🇦🇺' },
  { key: 'sudan', label: { en: 'SUDAN', es: 'SUDÁN' }, lat: 15, lng: 30, zoom: 5.5, icon: '⚠️', hot: true },
];

const copy = {
  en: { title: 'REGION PRESETS', hot: 'HOT' },
  es: { title: 'PRESETS REGIONALES', hot: 'CALIENTE' },
} as const;

export default function ViewPresets({ onNavigate, locale }: ViewPresetsProps) {
  const t = copy[locale] ?? copy.en;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7, duration: 0.6 }}
      className="glass-panel p-2.5 pointer-events-auto"
    >
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
        <span className="hud-text text-[12px] text-[var(--text-primary)] tracking-widest">{t.title}</span>
        <span className="gotham-tag gotham-tag--critical" style={{ fontSize: '7px', padding: '1px 4px', marginLeft: 'auto' }}>
          {PRESETS.filter(p => p.hot).length} {t.hot}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => onNavigate(p.lat, p.lng, p.zoom)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-mono tracking-wider border border-transparent hover:border-[var(--border-primary)] hover:text-[var(--gold-primary)] transition-all hover:scale-[1.02] active:scale-[0.98] ${p.hot ? 'text-[var(--alert-red)] hover:border-[var(--alert-red)]/30 hover:bg-[var(--alert-red)]/5' : 'text-[var(--text-muted)] hover:bg-[var(--hover-accent)]'}`}
          >
            <span className="text-[11px] flex-shrink-0">{p.icon}</span>
            <span>{p.label[locale] ?? p.label.en}</span>
            {p.hot && <span className="w-1.5 h-1.5 rounded-full bg-[var(--alert-red)] animate-aegis-pulse ml-auto flex-shrink-0" />}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
