'use client';

import { motion } from 'framer-motion';
import { type RouteRiskSummary, type RouteSnapshot, type RouteStep, formatCoordinateLabel, formatRouteDistance, formatRouteDuration, formatRouteModeLabel } from '@/lib/routing-shell';

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
};

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
}: RouteCockpitMobileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.24 }}
      className="fixed bottom-[4.35rem] left-2 right-2 z-[360] pointer-events-auto"
    >
      <div className="overflow-hidden rounded-[1.15rem] border border-cyan-300/24 bg-[rgba(5,13,22,0.88)] shadow-[0_14px_40px_rgba(0,0,0,0.30),0_0_18px_rgba(34,211,238,0.10)] backdrop-blur-lg">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <div className="relative h-8 w-8 shrink-0 rounded-full border border-cyan-300/28 bg-cyan-400/10">
            <div className="absolute inset-[6px] rounded-full border border-cyan-200/30" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[6px] font-mono uppercase tracking-[0.22em] text-cyan-300">
              <span>AEGIS VECTOR MODE</span>
              <span className={`rounded-full border px-1.5 py-0.5 text-[5px] ${navigationActive ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : routeSnapshot ? 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100/80' : 'border-amber-300/25 bg-amber-300/10 text-amber-200'}`}>{mobileVectorStatusLabel}</span>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-1.5 py-0.5 text-[5px] text-emerald-100/75">FROM GPS</span>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 text-[5px] text-cyan-100/75">Map clear</span>
            </div>
            <div className="mt-0.5 truncate text-[10px] font-semibold tracking-[0.04em] text-white">
              {routeLoading ? 'Calculando ruta desde tu GPS…' : routeSnapshot?.destination.label}
            </div>
            {routeSnapshot && (
              <>
                <div className="mt-1 rounded-xl border border-[rgba(212,175,55,0.14)] bg-[rgba(212,175,55,0.06)] px-2 py-1.5">
                  <div className="text-[6px] font-mono uppercase tracking-[0.18em] text-[var(--gold-primary)]">Stops</div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[6px] font-mono uppercase tracking-[0.12em] text-white/85">
                    {routeSnapshot.waypoints.length > 0 ? routeSnapshot.waypoints.map((waypoint, index) => (
                      <span key={`${waypoint.label}-${index}-${waypoint.lat}-${waypoint.lng}`} className="rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-1.5 py-0.5">
                        S{index + 1}
                      </span>
                    )) : <span className="text-[var(--text-secondary)]">Direct route</span>}
                  </div>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1.5 text-[6px] font-mono uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
                    <div className="text-cyan-300">From</div>
                    <div className="mt-0.5 truncate text-[8px] font-semibold text-white">Live GPS</div>
                    <div className="mt-0.5 text-[6px] text-[var(--text-secondary)]">{formatCoordinateLabel(routeSnapshot.origin)}</div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
                    <div className="text-cyan-300">To</div>
                    <div className="mt-0.5 truncate text-[8px] font-semibold text-white">{routeSnapshot.destination.label}</div>
                    <div className="mt-0.5 text-[6px] text-[var(--text-secondary)]">{formatCoordinateLabel(routeSnapshot.destination)}</div>
                  </div>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1.5 text-[6px] font-mono uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
                    <div className="text-cyan-300">Mode</div>
                    <div className="mt-0.5 text-[8px] font-semibold text-white">{formatRouteModeLabel(routeSnapshot.mode)}</div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
                    <div className="text-cyan-300">ETA</div>
                    <div className="mt-0.5 text-[8px] font-semibold text-white">{routeEtaLabel}</div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
                    <div className="text-cyan-300">Remain</div>
                    <div className="mt-0.5 text-[8px] font-semibold text-white">{formatRouteDistance(remainingRouteDistance || routeSnapshot.distanceMeters)}</div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1.5">
                    <div className="text-cyan-300">Progress</div>
                    <div className="mt-0.5 text-[8px] font-semibold text-white">{routeProgressLabel}</div>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[7px] font-mono uppercase tracking-[0.13em] text-[var(--text-secondary)]">
                  <span>{formatRouteDuration(routeSnapshot.durationSeconds)}</span>
                  <span>•</span>
                  <span className={navigationActive ? 'text-emerald-300' : 'text-cyan-200'}>{navigationActive ? 'FOLLOW LIVE' : 'READY'}</span>
                  {routeRiskSummary && <span className={routeRiskSummary.level === 'high' ? 'text-rose-300' : routeRiskSummary.level === 'elevated' ? 'text-amber-300' : 'text-emerald-300'}>RISK {routeRiskSummary.score}</span>}
                </div>
              </>
            )}
          </div>
          {routeSnapshot && (
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={onToggleNavigationFollow}
                className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[6px] font-mono uppercase tracking-[0.16em] text-cyan-100"
              >
                {navigationActive ? 'Pause' : 'Go'}
              </button>
              <button
                type="button"
                onClick={onClearNavigationState}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[6px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        {routeSnapshot && currentRouteStep && (
          <div className="border-t border-cyan-300/12 bg-cyan-400/[0.045] px-3 py-2">
            <div className="text-[6px] font-mono uppercase tracking-[0.22em] text-cyan-300">Next maneuver</div>
            <div className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-snug text-white/90">{currentRouteStep.instruction}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
