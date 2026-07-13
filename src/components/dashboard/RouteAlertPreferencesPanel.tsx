'use client';

import { BellRing, Camera, CloudLightning, Flame, Mountain, Smartphone, Vibrate } from 'lucide-react';
import { type RouteAlertPreferences, updateRouteAlertPreference } from '@/lib/route-alert-preferences';

type PreferenceKey = keyof RouteAlertPreferences;

type RouteAlertPreferencesPanelProps = {
  value: RouteAlertPreferences;
  onChange: (next: RouteAlertPreferences) => void;
};

const OPTIONS: Array<{
  key: PreferenceKey;
  label: string;
  detail: string;
  icon: typeof BellRing;
}> = [
  { key: 'earthquakes', label: 'Terremotos', detail: 'Eventos USGS cercanos', icon: BellRing },
  { key: 'wildfires', label: 'Incendios', detail: 'Focos térmicos NASA FIRMS', icon: Flame },
  { key: 'volcanoes', label: 'Volcanes', detail: 'Actividad NASA EONET', icon: Mountain },
  { key: 'severeWeather', label: 'Clima severo', detail: 'Avisos meteorológicos activos', icon: CloudLightning },
  { key: 'trafficCameras', label: 'Cámaras', detail: 'Puntos viales a menos de 500 m', icon: Camera },
  { key: 'notifications', label: 'Notificaciones', detail: 'Avisos del navegador', icon: Smartphone },
  { key: 'haptics', label: 'Vibración', detail: 'Patrones según peligro', icon: Vibrate },
];

export default function RouteAlertPreferencesPanel({ value, onChange }: RouteAlertPreferencesPanelProps) {
  return (
    <section className="mb-3 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]">
      <div className="border-b border-white/8 px-4 py-3">
        <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-cyan-200">Preferencias del conductor</div>
        <p className="mt-1 text-[10px] leading-relaxed text-white/45">Elige qué avisos pueden interrumpir la navegación. Se guarda solo en este dispositivo.</p>
      </div>
      <div className="grid grid-cols-1 gap-px bg-white/6 sm:grid-cols-2">
        {OPTIONS.map(({ key, label, detail, icon: Icon }) => {
          const enabled = value[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(updateRouteAlertPreference(value, key, !enabled))}
              className="flex min-h-[62px] items-center gap-3 bg-[rgba(4,13,22,0.96)] px-4 text-left transition-colors active:bg-white/[0.08]"
              aria-pressed={enabled}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${enabled ? 'border-cyan-200/24 bg-cyan-300/10 text-cyan-200' : 'border-white/8 bg-white/[0.03] text-white/28'}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-white/90">{label}</span>
                <span className="mt-0.5 block truncate text-[8px] text-white/38">{detail}</span>
              </span>
              <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${enabled ? 'bg-cyan-300' : 'bg-white/12'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
