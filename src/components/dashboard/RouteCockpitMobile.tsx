'use client';

import { motion } from 'framer-motion';
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

function getModeLabel(mode: RouteSnapshot['mode']) {
  if (mode === 'walking') return 'Caminar';
  if (mode === 'cycling') return 'Bici';
  return 'Coche';
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
  const modeLabel = routeSnapshot ? getModeLabel(routeSnapshot.mode) : '';
  const stepInstruction = currentRouteStep ? localizeInstruction(currentRouteStep.instruction) : 'Sigue la ruta';
  const stepDistance = currentRouteStep ? formatStepDistance(currentRouteStep.distanceMeters) : null;
  const statusLabel = routeLoading ? 'Calculando ruta…' : navigationActive ? 'Navegación activa' : 'Ruta lista';

  return (
    <>
      {currentRouteStep && !routeLoading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
          className="fixed left-3 right-3 top-3 z-[362] pointer-events-auto"
        >
          <div className="mx-auto max-w-[34rem] overflow-hidden rounded-[1.25rem] border border-cyan-300/18 bg-[rgba(5,13,22,0.90)] shadow-[0_12px_30px_rgba(0,0,0,0.26)] backdrop-blur-xl">
            <div className="flex items-start gap-3 px-3.5 py-3">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-300/10 text-[11px] font-mono uppercase tracking-[0.16em] text-cyan-100">
                GPS
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-cyan-100/72">
                  <span className="rounded-full border border-cyan-300/16 bg-cyan-300/8 px-2 py-1">{stepDistance ?? statusLabel}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">{modeLabel}</span>
                  {routeRiskSummary?.level === 'high' && <span className="rounded-full border border-amber-300/18 bg-amber-300/10 px-2 py-1 text-amber-200">Precaución</span>}
                </div>
                <div className="mt-2 text-[15px] font-semibold leading-snug text-white">{stepInstruction}</div>
                <div className="mt-1 truncate text-[11px] text-cyan-100/62">Destino · {destinationLabel}</div>
              </div>
              <button
                type="button"
                onClick={onOpenSearch}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/80"
              >
                Editar
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-3 left-3 right-3 z-[360] pointer-events-auto"
      >
        {navigationActive ? (
          <div className="mx-auto max-w-[34rem] overflow-hidden rounded-[1.35rem] border border-cyan-300/18 bg-[rgba(5,13,22,0.88)] shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-2 px-3.5 pt-3">
              <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-cyan-200/68">Llegada</div>
                <div className="mt-1 text-[14px] font-semibold text-white">{routeEtaLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-cyan-200/68">Falta</div>
                <div className="mt-1 text-[14px] font-semibold text-white">{distanceLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-cyan-200/68">Tiempo</div>
                <div className="mt-1 text-[14px] font-semibold text-white">{durationLabel}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-3">
              <div className="min-w-0 flex-1 text-[11px] text-cyan-100/64">{routeProgressLabel} · {modeLabel}</div>
              <button
                type="button"
                onClick={onToggleNavigationFollow}
                className="rounded-full bg-cyan-300 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-950"
              >
                {navigationActive ? 'Pausar' : 'Seguir'}
              </button>
              <button
                type="button"
                onClick={onClearNavigationState}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[11px] font-mono uppercase tracking-[0.16em] text-white/78"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[34rem] overflow-hidden rounded-[1.5rem] border border-cyan-300/18 bg-[rgba(5,13,22,0.88)] shadow-[0_18px_42px_rgba(0,0,0,0.30)] backdrop-blur-xl">
            <div className="px-4 pt-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-white">{routeLoading ? 'Buscando la mejor ruta' : destinationLabel}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-cyan-100/72">
                    <span className="rounded-full border border-cyan-300/16 bg-cyan-300/8 px-2 py-1">{statusLabel}</span>
                    {routeSnapshot && <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">{modeLabel}</span>}
                    {routeRiskSummary?.level === 'high' && <span className="rounded-full border border-amber-300/18 bg-amber-300/10 px-2 py-1 text-amber-200">Precaución</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="shrink-0 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-100"
                >
                  Destino
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 px-4 py-3">
              <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-cyan-200/68">Llegada</div>
                <div className="mt-1 text-[15px] font-semibold text-white">{routeEtaLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-cyan-200/68">Falta</div>
                <div className="mt-1 text-[15px] font-semibold text-white">{distanceLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-cyan-200/68">Tiempo</div>
                <div className="mt-1 text-[15px] font-semibold text-white">{durationLabel}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-cyan-300/10 px-4 py-3">
              <div className="min-w-0 flex-1 text-[11px] text-cyan-100/64">Progreso {routeProgressLabel} · {modeLabel}</div>
              <button
                type="button"
                onClick={onToggleNavigationFollow}
                className="rounded-full bg-cyan-300 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-950"
              >
                {routeLoading ? mobileVectorStatusLabel : 'Seguir'}
              </button>
              <button
                type="button"
                onClick={onClearNavigationState}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[11px] font-mono uppercase tracking-[0.16em] text-white/78"
              >
                Salir
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
