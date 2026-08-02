'use client';

import { Activity, AlertTriangle, Gauge, LocateFixed, LogOut, Navigation, Route, Volume2, VolumeX } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import type { RouteRiskSummary, RouteStep } from '@/lib/routing-shell';

type BackendStatus = 'connecting' | 'connected' | 'error';

type FocusModeDrivingOverlayProps = {
  backendStatus: BackendStatus;
  locale: Locale;
  navigationActive: boolean;
  routeReady: boolean;
  routeEtaLabel: string;
  routeProgressLabel: string;
  remainingRouteDistance: number;
  currentRouteStep: RouteStep | null;
  currentStepDistanceMeters: number | null;
  navigationSpeedKmh: number | null;
  gpsAccuracyMeters: number | null;
  routeRiskSummary: RouteRiskSummary | null;
  navigationVoiceEnabled: boolean;
  onToggleVoice: () => void;
  onExitFocus: () => void;
};

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km`;
  return `${Math.max(0, Math.round(meters))} m`;
}

function riskLabel(risk: RouteRiskSummary | null, locale: Locale) {
  if (!risk) return locale === 'es' ? 'SIN DATOS' : 'NO DATA';
  if (risk.level === 'high') return locale === 'es' ? 'ALTO' : 'HIGH';
  if (risk.level === 'elevated') return locale === 'es' ? 'ELEVADO' : 'ELEVATED';
  return locale === 'es' ? 'BAJO' : 'LOW';
}

export default function FocusModeDrivingOverlay({
  backendStatus,
  locale,
  navigationActive,
  routeReady,
  routeEtaLabel,
  routeProgressLabel,
  remainingRouteDistance,
  currentRouteStep,
  currentStepDistanceMeters,
  navigationSpeedKmh,
  gpsAccuracyMeters,
  routeRiskSummary,
  navigationVoiceEnabled,
  onToggleVoice,
  onExitFocus,
}: FocusModeDrivingOverlayProps) {
  const es = locale === 'es';
  const instruction = currentRouteStep?.instruction
    ?? (routeReady ? (es ? 'Ruta preparada. Inicia el seguimiento.' : 'Route ready. Start navigation.') : (es ? 'Busca un destino para comenzar.' : 'Search for a destination to begin.'));
  const stepDistance = currentStepDistanceMeters ?? currentRouteStep?.distanceMeters ?? 0;
  const gpsLabel = gpsAccuracyMeters === null ? '—' : `±${Math.round(gpsAccuracyMeters)} m`;
  const speedLabel = navigationSpeedKmh === null ? '—' : `${Math.round(navigationSpeedKmh)}`;
  const statusLabel = navigationActive
    ? (es ? 'NAVEGANDO' : 'NAVIGATING')
    : routeReady
      ? (es ? 'RUTA LISTA' : 'ROUTE READY')
      : backendStatus === 'error'
        ? (es ? 'DATOS DEGRADADOS' : 'DEGRADED DATA')
        : (es ? 'ESPERANDO RUTA' : 'WAITING FOR ROUTE');

  return (
    <section className="pointer-events-none absolute inset-x-0 top-[5.65rem] z-[215] hidden px-4 md:block" aria-label={es ? 'Modo conducción' : 'Driving mode'}>
      <div className="pointer-events-auto mx-auto w-[min(58rem,calc(100vw-3rem))] rounded-2xl border border-white/10 bg-[rgba(7,13,19,0.92)] p-3 shadow-[0_16px_46px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-white">
              <Navigation className="h-4 w-4 text-[var(--alert-green)]" />
              <span>{es ? 'MODO CONDUCCIÓN' : 'DRIVING MODE'}</span>
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-medium text-[var(--text-secondary)]">{statusLabel}</span>
            </div>
            <div className="mt-2 truncate text-[18px] font-semibold leading-tight text-[var(--text-primary)]">{instruction}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onToggleVoice} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[11px] font-medium text-[var(--text-primary)]" aria-pressed={navigationVoiceEnabled}>
              {navigationVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {navigationVoiceEnabled ? (es ? 'VOZ' : 'VOICE') : (es ? 'SILENCIO' : 'MUTED')}
            </button>
            <button type="button" onClick={onExitFocus} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[11px] font-medium text-[var(--text-secondary)]">
              <LogOut className="h-4 w-4" />
              {es ? 'SALIR' : 'EXIT'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2 pt-3">
          <div className="col-span-2 rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]"><Route className="h-4 w-4" />{es ? 'PRÓXIMO GIRO' : 'NEXT MANEUVER'}</div>
            <div className="mt-2 text-[24px] font-bold tabular-nums text-white">{routeReady ? formatDistance(stepDistance) : '—'}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <div className="text-[10px] text-[var(--text-secondary)]">ETA</div>
            <div className="mt-2 text-[21px] font-bold tabular-nums text-white">{routeReady ? routeEtaLabel : '—'}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <div className="text-[10px] text-[var(--text-secondary)]">{es ? 'RESTANTE' : 'REMAINING'}</div>
            <div className="mt-2 text-[21px] font-bold tabular-nums text-white">{routeReady ? formatDistance(remainingRouteDistance) : '—'}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><Gauge className="h-3.5 w-3.5" />{es ? 'VELOCIDAD' : 'SPEED'}</div>
            <div className="mt-2 text-[21px] font-bold tabular-nums text-white">{speedLabel}<span className="ml-1 text-[10px] font-medium text-[var(--text-muted)]">km/h</span></div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><LocateFixed className="h-3.5 w-3.5" />GPS</div>
            <div className="mt-2 text-[21px] font-bold tabular-nums text-white">{gpsLabel}</div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2">
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
            <Activity className="h-4 w-4 text-[var(--alert-green)]" />
            {es ? 'PROGRESO' : 'PROGRESS'} <strong className="text-white">{routeReady ? routeProgressLabel : '0%'}</strong>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            {es ? 'RIESGO DE RUTA' : 'ROUTE RISK'} <strong className="text-white">{riskLabel(routeRiskSummary, locale)}</strong>
            {routeRiskSummary && <span>{routeRiskSummary.nearbySignals} {es ? 'señales' : 'signals'}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
