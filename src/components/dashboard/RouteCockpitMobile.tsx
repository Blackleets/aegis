'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bike,
  CarFront,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  Flag,
  Footprints,
  Navigation2,
  Pause,
  Play,
  Route,
  RotateCcw,
  Search,
  ShieldAlert,
  Signpost,
  FlaskConical,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Gauge,
} from 'lucide-react';
import { type RouteRiskSummary, type RouteSnapshot, type RouteStep, formatRouteDistance, formatRouteDuration, formatStepDistance, localizeRouteInstruction } from '@/lib/routing-shell';

type NearbyEarthquakeAlert = {
  id: string;
  magnitude: number;
  place: string;
  distanceMeters: number;
  depth?: number;
  time: number;
  source: 'USGS';
};

type NearbyContextAlert = {
  id: string;
  kind: 'traffic-camera' | 'wildfire' | 'volcano' | 'severe-weather';
  title: string;
  detail: string;
  distanceMeters: number;
  source: string;
  severity: 'info' | 'warning' | 'critical';
};

type TrafficInsight = {
  status: 'loading' | 'live' | 'unavailable';
  configured?: boolean;
  source: string;
  delaySeconds?: number;
  trafficLengthMeters?: number;
  level?: 'clear' | 'light' | 'moderate' | 'heavy';
};

type RouteCockpitMobileProps = {
  routeLoading: boolean;
  routeSnapshot: RouteSnapshot | null;
  navigationActive: boolean;
  mobileVectorStatusLabel: string;
  routeEtaLabel: string;
  routeProgressLabel: string;
  remainingRouteDistance: number;
  routeRiskSummary: RouteRiskSummary | null;
  currentRouteStep: RouteStep | null;
  nextRouteStep: RouteStep | null;
  currentStepDistanceMeters: number | null;
  gpsAccuracyMeters: number | null;
  navigationSpeedKmh: number | null;
  navigationRerouting: boolean;
  navigationSimulationActive: boolean;
  navigationArrived: boolean;
  navigationVoiceEnabled: boolean;
  onToggleNavigationFollow: () => void;
  onClearNavigationState: () => void;
  onOpenSearch: () => void;
  onToggleSimulation: () => void;
  onToggleVoice: () => void;
  onSelectRouteOption: (routeId: string) => void;
  nearbyEarthquakeAlert: NearbyEarthquakeAlert | null;
  onDismissNearbyEarthquake: () => void;
  nearbyContextAlert: NearbyContextAlert | null;
  onDismissNearbyContext: () => void;
  recommendedRouteId: string | null;
  routeRecommendationLabel: string | null;
  trafficInsight: TrafficInsight | null;
};

function getModeMeta(mode: RouteSnapshot['mode']) {
  if (mode === 'walking') return { label: 'A pie', Icon: Footprints };
  if (mode === 'cycling') return { label: 'Bici', Icon: Bike };
  return { label: 'Coche', Icon: CarFront };
}

function renderManeuverIcon(step: RouteStep | null) {
  const type = step?.maneuver.type.toLowerCase() ?? '';
  const modifier = step?.maneuver.modifier?.toLowerCase() ?? '';
  const iconClass = 'h-10 w-10';
  const strokeWidth = 2.7;

  if (type.includes('arrive')) return <Flag className={iconClass} strokeWidth={strokeWidth} />;
  if (type.includes('roundabout') || type.includes('rotary')) return <RotateCcw className={iconClass} strokeWidth={strokeWidth} />;
  if (modifier.includes('sharp left')) return <ArrowDownLeft className={iconClass} strokeWidth={strokeWidth} />;
  if (modifier.includes('sharp right')) return <ArrowDownRight className={iconClass} strokeWidth={strokeWidth} />;
  if (modifier.includes('slight left')) return <ChevronLeft className={iconClass} strokeWidth={strokeWidth} />;
  if (modifier.includes('slight right')) return <ChevronRight className={iconClass} strokeWidth={strokeWidth} />;
  if (modifier.includes('left')) return <ArrowLeft className={iconClass} strokeWidth={strokeWidth} />;
  if (modifier.includes('right')) return <ArrowRight className={iconClass} strokeWidth={strokeWidth} />;
  if (type.includes('merge') || type.includes('fork')) return <Signpost className={iconClass} strokeWidth={strokeWidth} />;
  return <ArrowUp className={iconClass} strokeWidth={strokeWidth} />;
}

export default function RouteCockpitMobile({
  routeLoading,
  routeSnapshot,
  navigationActive,
  mobileVectorStatusLabel,
  routeEtaLabel,
  routeProgressLabel,
  remainingRouteDistance,
  routeRiskSummary,
  currentRouteStep,
  nextRouteStep,
  currentStepDistanceMeters,
  gpsAccuracyMeters,
  navigationSpeedKmh,
  navigationRerouting,
  navigationSimulationActive,
  navigationArrived,
  navigationVoiceEnabled,
  onToggleNavigationFollow,
  onClearNavigationState,
  onOpenSearch,
  onToggleSimulation,
  onToggleVoice,
  onSelectRouteOption,
  nearbyEarthquakeAlert,
  onDismissNearbyEarthquake,
  nearbyContextAlert,
  onDismissNearbyContext,
  recommendedRouteId,
  routeRecommendationLabel,
  trafficInsight,
}: RouteCockpitMobileProps) {
  const destinationLabel = routeSnapshot?.destination.label ?? 'Preparando ruta';
  const distanceLabel = routeSnapshot ? formatRouteDistance(remainingRouteDistance || routeSnapshot.distanceMeters) : '--';
  const durationLabel = routeSnapshot ? formatRouteDuration(routeSnapshot.durationSeconds) : 'Calculando…';
  const modeMeta = routeSnapshot ? getModeMeta(routeSnapshot.mode) : null;
  const ModeIcon = modeMeta?.Icon ?? Navigation2;
  const stepInstruction = currentRouteStep ? localizeRouteInstruction(currentRouteStep.instruction) : 'Sigue la ruta';
  const stepDistance = currentStepDistanceMeters !== null ? formatStepDistance(currentStepDistanceMeters) : null;
  const statusLabel = routeLoading ? 'Calculando ruta…' : navigationArrived ? 'Has llegado' : navigationRerouting ? 'Recalculando…' : navigationSimulationActive ? 'Simulación GPS' : navigationActive ? 'Copiloto activo' : 'Ruta lista';
  const nextInstruction = nextRouteStep ? localizeRouteInstruction(nextRouteStep.instruction) : null;
  const gpsQualityLabel = gpsAccuracyMeters === null
    ? 'GPS'
    : gpsAccuracyMeters <= 15
      ? 'GPS preciso'
      : gpsAccuracyMeters <= 40
        ? `GPS ±${Math.round(gpsAccuracyMeters)} m`
        : 'GPS débil';
  const routeOptions = routeSnapshot?.alternatives ?? [];
  const activeRouteIndex = routeSnapshot ? Math.max(0, routeOptions.findIndex((option) => option.id === routeSnapshot.activeRouteId)) : 0;
  const activeRouteOption = routeOptions[activeRouteIndex] ?? null;
  const routeChoiceLabel = activeRouteOption?.label || `Ruta ${activeRouteIndex + 1}`;
  const activeRouteRecommended = activeRouteOption?.id === recommendedRouteId;
  const riskLabel = routeRiskSummary?.level === 'high' ? 'riesgo alto' : routeRiskSummary?.level === 'medium' ? 'riesgo moderado' : 'riesgo bajo';
  const cycleRouteOption = () => {
    if (routeOptions.length < 2) return;
    onSelectRouteOption(routeOptions[(activeRouteIndex + 1) % routeOptions.length].id);
  };
  const trafficDelayMinutes = trafficInsight?.status === 'live' ? Math.max(0, Math.round((trafficInsight.delaySeconds ?? 0) / 60)) : null;
  const trafficLabel = trafficInsight?.status === 'loading'
    ? 'Analizando tráfico…'
    : trafficInsight?.status === 'live'
      ? trafficInsight.level === 'heavy'
        ? `Tráfico intenso · +${trafficDelayMinutes} min`
        : trafficInsight.level === 'moderate'
          ? `Tráfico moderado · +${trafficDelayMinutes} min`
          : trafficInsight.level === 'light'
            ? `Tráfico ligero · +${trafficDelayMinutes} min`
            : 'Tráfico fluido'
      : trafficInsight?.configured === false
        ? 'Tráfico live pendiente de configurar'
        : 'Tráfico live no disponible';
  const progressPercent = routeSnapshot
    ? Math.round(Math.max(0, Math.min(1, (routeSnapshot.distanceMeters - remainingRouteDistance) / routeSnapshot.distanceMeters)) * 100)
    : 0;

  return (
    <>
      <AnimatePresence mode="wait">
        {navigationActive && currentRouteStep && !routeLoading && (
          <motion.section
            key={currentRouteStep.index}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="pointer-events-auto fixed left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[362]"
            aria-live="polite"
          >
            <div className="mx-auto max-w-[34rem] overflow-hidden rounded-[1.65rem] border border-white/12 bg-[rgba(5,14,24,0.92)] shadow-[0_18px_50px_rgba(0,0,0,0.38),0_0_32px_rgba(34,211,238,0.08)] backdrop-blur-2xl">
              <div className="flex items-center gap-3 p-3 pr-2.5">
                <div className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-[1.35rem] bg-cyan-300 text-slate-950 shadow-[0_8px_26px_rgba(34,211,238,0.25)]">
                  {renderManeuverIcon(currentRouteStep)}
                  <span className="absolute -bottom-1.5 rounded-full border-2 border-[#07111d] bg-white px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-950">
                    {stepDistance}
                  </span>
                </div>

                <div className="min-w-0 flex-1 py-0.5">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-cyan-100/70">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-300/10 px-2 py-1 text-cyan-100">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      {statusLabel}
                    </span>
                    {routeRiskSummary?.level === 'high' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/12 px-2 py-1 text-amber-200">
                        <ShieldAlert className="h-3 w-3" /> Precaución
                      </span>
                    )}
                  </div>
                  <h2 className="line-clamp-2 text-[17px] font-bold leading-[1.18] tracking-[-0.02em] text-white">{stepInstruction}</h2>
                  <p className="mt-1 truncate text-[11px] text-white/48">Hacia {destinationLabel}</p>
                  {nextInstruction && (
                    <p className="mt-1.5 truncate border-t border-white/8 pt-1.5 text-[10px] text-cyan-100/58">Después · {nextInstruction}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onToggleVoice}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/76 transition-colors active:bg-white/15"
                  aria-label={navigationVoiceEnabled ? 'Silenciar instrucciones' : 'Activar instrucciones por voz'}
                >
                  {navigationVoiceEnabled ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
                </button>
              </div>
              <AnimatePresence>
                {nearbyEarthquakeAlert && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-amber-300/14 bg-[linear-gradient(90deg,rgba(245,158,11,0.14),rgba(251,113,133,0.08))]"
                  >
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-300/16 text-amber-200">
                        <ShieldAlert className="h-5 w-5" />
                        <span className="absolute inset-0 animate-ping rounded-xl border border-amber-300/25" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.16em] text-amber-200">
                          Evento sísmico cercano · USGS
                        </div>
                        <div className="mt-0.5 truncate text-[12px] font-bold text-white">
                          M{nearbyEarthquakeAlert.magnitude} · {formatStepDistance(nearbyEarthquakeAlert.distanceMeters)} de distancia
                        </div>
                        <div className="mt-0.5 truncate text-[9px] text-white/48">
                          {nearbyEarthquakeAlert.place}{typeof nearbyEarthquakeAlert.depth === 'number' ? ` · ${nearbyEarthquakeAlert.depth.toFixed(1)} km profundidad` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onDismissNearbyEarthquake}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/15 text-white/60"
                        aria-label="Cerrar alerta sísmica"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {nearbyContextAlert && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`border-t ${nearbyContextAlert.severity === 'info' ? 'border-cyan-300/14 bg-cyan-300/[0.08]' : 'border-orange-300/16 bg-orange-300/[0.09]'}`}
                  >
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${nearbyContextAlert.severity === 'info' ? 'bg-cyan-300/14 text-cyan-200' : 'bg-orange-300/14 text-orange-200'}`}>
                        <ShieldAlert className="h-5 w-5" />
                        <span className="absolute inset-0 animate-pulse rounded-xl border border-current opacity-20" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-cyan-100/68">
                          Aviso en ruta · {nearbyContextAlert.source}
                        </div>
                        <div className="mt-0.5 truncate text-[12px] font-bold text-white">
                          {nearbyContextAlert.title} · {formatStepDistance(nearbyContextAlert.distanceMeters)}
                        </div>
                        <div className="mt-0.5 truncate text-[9px] text-white/48">{nearbyContextAlert.detail}</div>
                      </div>
                      <button
                        type="button"
                        onClick={onDismissNearbyContext}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/15 text-white/60"
                        aria-label="Cerrar aviso en ruta"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        className={`pointer-events-auto fixed left-3 right-3 z-[360] ${navigationActive ? 'bottom-[max(0.75rem,env(safe-area-inset-bottom))]' : 'bottom-[calc(4.4rem+env(safe-area-inset-bottom))]'}`}
      >
        <div className="mx-auto max-w-[34rem] overflow-hidden rounded-[1.65rem] border border-white/12 bg-[rgba(5,14,24,0.92)] shadow-[0_18px_50px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
          {navigationActive ? (
            <>
              <div className="h-1 bg-white/8">
                <motion.div
                  className="h-full rounded-r-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.65)]"
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                />
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[27px] font-bold leading-none tracking-[-0.04em] text-white tabular-nums">{routeEtaLabel}</span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-200/60">llegada</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[12px] font-medium text-white/65">
                    <span>{distanceLabel}</span>
                    <span className="h-1 w-1 rounded-full bg-white/25" />
                    <span>{durationLabel}</span>
                    <span className="h-1 w-1 rounded-full bg-white/25" />
                    <span className="inline-flex items-center gap-1"><ModeIcon className="h-3.5 w-3.5" />{modeMeta?.label}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium text-cyan-100/52">
                    <span>{gpsQualityLabel}</span>
                    {navigationSpeedKmh !== null && <><span>·</span><span>{Math.round(navigationSpeedKmh)} km/h</span></>}
                    {navigationRerouting && <><span>·</span><span className="text-amber-200">Buscando mejor ruta</span></>}
                    {navigationSimulationActive && <><span>·</span><span className="text-violet-200">Modo prueba</span></>}
                    {trafficInsight && (
                      <span className={`inline-flex items-center gap-1 ${trafficInsight.level === 'heavy' ? 'text-rose-200' : trafficInsight.level === 'moderate' ? 'text-amber-200' : 'text-cyan-100/58'}`}>
                        <Gauge className="h-3 w-3" /> {trafficLabel}
                      </span>
                    )}
                    {activeRouteOption && (
                      <button
                        type="button"
                        onClick={cycleRouteOption}
                        disabled={routeOptions.length < 2 || navigationRerouting}
                        className="inline-flex items-center gap-1 rounded-full border border-cyan-200/14 bg-cyan-300/[0.07] px-2 py-1 text-cyan-100/78 transition-colors active:bg-cyan-300/15 disabled:cursor-default"
                        aria-label={routeOptions.length > 1 ? `Cambiar ruta. Seleccionada ${routeChoiceLabel}` : `Ruta seleccionada: ${routeChoiceLabel}`}
                      >
                        {activeRouteRecommended ? <Sparkles className="h-3 w-3 text-amber-200" /> : <Route className="h-3 w-3" />}
                        <span>{routeChoiceLabel}</span>
                        <span className="text-white/34">·</span>
                        <span>{riskLabel}</span>
                        {routeOptions.length > 1 && <span className="text-cyan-200">({activeRouteIndex + 1}/{routeOptions.length})</span>}
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleSimulation}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-transform active:scale-95 ${navigationSimulationActive ? 'border-violet-300/40 bg-violet-300/18 text-violet-100' : 'border-white/12 bg-white/[0.06] text-white/72'}`}
                  aria-label={navigationSimulationActive ? 'Detener simulación GPS' : 'Probar ruta con simulación GPS'}
                >
                  <FlaskConical className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onToggleNavigationFollow}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-slate-950 shadow-[0_8px_24px_rgba(34,211,238,0.22)] transition-transform active:scale-95"
                  aria-label="Pausar navegación"
                >
                  <Pause className="h-5 w-5 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={onClearNavigationState}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white/78 transition-transform active:scale-95"
                  aria-label="Finalizar navegación"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 px-4 pt-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-200">
                  {routeLoading ? <Route className="h-5 w-5 animate-pulse" /> : <Flag className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-200/58">{statusLabel}</p>
                    {!routeLoading && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/16 bg-emerald-300/[0.08] px-2 py-1 text-[8px] font-medium text-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {gpsAccuracyMeters !== null ? `GPS ±${Math.round(gpsAccuracyMeters)} m` : 'Origen GPS'}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 truncate text-[17px] font-bold text-white">{routeLoading ? 'Buscando la mejor ruta' : destinationLabel}</h2>
                  {!routeLoading && <p className="mt-1 text-[10px] text-white/44">Desde tu ubicación actual · revisa la ruta antes de iniciar</p>}
                  {!routeLoading && trafficInsight && (
                    <div className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-medium ${trafficInsight.level === 'heavy' ? 'border-rose-300/18 bg-rose-300/[0.08] text-rose-100' : 'border-cyan-200/14 bg-cyan-200/[0.06] text-cyan-100/76'}`}>
                      <Gauge className="h-3 w-3 shrink-0" />
                      <span className="truncate">{trafficLabel}{trafficInsight.status === 'live' ? ' · TomTom live' : ''}</span>
                    </div>
                  )}
                  {!routeLoading && routeRecommendationLabel && (
                    <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-200/16 bg-amber-200/[0.07] px-2.5 py-1.5 text-[9px] font-medium text-amber-100/84">
                      <Sparkles className="h-3 w-3 shrink-0" />
                      <span className="truncate">AEGIS recomienda · {routeRecommendationLabel}</span>
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-[12px] text-white/62">
                    <span className="font-semibold text-white">{routeEtaLabel}</span>
                    <span>·</span><span>{distanceLabel}</span><span>·</span><span>{durationLabel}</span>
                  </div>
                </div>
                <button type="button" onClick={onOpenSearch} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/72" aria-label="Cambiar destino">
                  <Search className="h-[18px] w-[18px]" />
                </button>
              </div>
              <div className="flex items-center gap-2 p-3 pt-4">
                <button
                  type="button"
                  onClick={onToggleNavigationFollow}
                  disabled={routeLoading}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-950 shadow-[0_8px_26px_rgba(34,211,238,0.2)] disabled:cursor-wait disabled:opacity-60"
                >
                  {routeLoading ? <Route className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4 fill-current" />}
                  {routeLoading ? mobileVectorStatusLabel : 'Iniciar navegación'}
                </button>
                <button type="button" onClick={onClearNavigationState} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 text-[11px] font-semibold text-white/72">
                  <CircleStop className="h-4 w-4" /> Salir
                </button>
              </div>
              <span className="sr-only">Progreso {routeProgressLabel}</span>
            </>
          )}
        </div>
      </motion.section>
    </>
  );
}
