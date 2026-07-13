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
  X,
} from 'lucide-react';
import { type RouteRiskSummary, type RouteSnapshot, type RouteStep, formatRouteDistance, formatRouteDuration, formatStepDistance } from '@/lib/routing-shell';

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
  onToggleNavigationFollow: () => void;
  onClearNavigationState: () => void;
  onOpenSearch: () => void;
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

function localizeInstruction(instruction: string) {
  if (!instruction) return 'Sigue la ruta';

  return instruction
    .replace(/^Head straight on /i, 'Sigue recto por ')
    .replace(/^Head right on /i, 'Sigue por la derecha en ')
    .replace(/^Head left on /i, 'Sigue por la izquierda en ')
    .replace(/^Continue straight on /i, 'Continúa recto por ')
    .replace(/^Continue /i, 'Continúa ')
    .replace(/^Keep /i, 'Mantente ')
    .replace(/^Turn left on /i, 'Gira a la izquierda por ')
    .replace(/^Turn right on /i, 'Gira a la derecha por ')
    .replace(/^Turn left /i, 'Gira a la izquierda ')
    .replace(/^Turn right /i, 'Gira a la derecha ')
    .replace(/^Slight left /i, 'Desvíate a la izquierda ')
    .replace(/^Slight right /i, 'Desvíate a la derecha ')
    .replace(/^Sharp left /i, 'Giro pronunciado a la izquierda ')
    .replace(/^Sharp right /i, 'Giro pronunciado a la derecha ')
    .replace(/^Take the ramp /i, 'Toma la rampa ')
    .replace(/^Merge /i, 'Incorpórate ')
    .replace(/^Arrive at your destination/i, 'Has llegado a tu destino')
    .replace(/^Destination is on the left/i, 'Tu destino está a la izquierda')
    .replace(/^Destination is on the right/i, 'Tu destino está a la derecha')
    .replace(/ on the left/i, ' a la izquierda')
    .replace(/ on the right/i, ' a la derecha')
    .replace(/ onto /i, ' hacia ');
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
  onToggleNavigationFollow,
  onClearNavigationState,
  onOpenSearch,
}: RouteCockpitMobileProps) {
  const destinationLabel = routeSnapshot?.destination.label ?? 'Preparando ruta';
  const distanceLabel = routeSnapshot ? formatRouteDistance(remainingRouteDistance || routeSnapshot.distanceMeters) : '--';
  const durationLabel = routeSnapshot ? formatRouteDuration(routeSnapshot.durationSeconds) : 'Calculando…';
  const modeMeta = routeSnapshot ? getModeMeta(routeSnapshot.mode) : null;
  const ModeIcon = modeMeta?.Icon ?? Navigation2;
  const stepInstruction = currentRouteStep ? localizeInstruction(currentRouteStep.instruction) : 'Sigue la ruta';
  const stepDistance = currentRouteStep ? formatStepDistance(currentRouteStep.distanceMeters) : null;
  const statusLabel = routeLoading ? 'Calculando ruta…' : navigationActive ? 'GPS en vivo' : 'Ruta lista';
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
                </div>

                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/76 transition-colors active:bg-white/15"
                  aria-label="Editar destino"
                >
                  <Search className="h-[18px] w-[18px]" />
                </button>
              </div>
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
                </div>
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
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-200/58">{statusLabel}</p>
                  <h2 className="mt-1 truncate text-[17px] font-bold text-white">{routeLoading ? 'Buscando la mejor ruta' : destinationLabel}</h2>
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
