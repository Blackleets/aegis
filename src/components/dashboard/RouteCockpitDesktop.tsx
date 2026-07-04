'use client';

import { motion } from 'framer-motion';
import { type RouteRiskSummary, type RouteSnapshot, type RouteStep, formatCoordinateLabel, formatRouteDistance, formatRouteDuration, formatRouteModeLabel } from '@/lib/routing-shell';

type RouteCockpitDesktopProps = {
  routeSnapshot: RouteSnapshot;
  navigationActive: boolean;
  remainingRouteDistance: number;
  routeEtaLabel: string;
  routeProgressLabel: string;
  routeRiskSummary: RouteRiskSummary | null;
  currentRouteStep: RouteStep | null;
  onToggleNavigationFollow: () => void;
  onClearNavigationState: () => void;
  onSelectRouteOption: (routeId: string) => void;
};

export default function RouteCockpitDesktop({
  routeSnapshot,
  navigationActive,
  remainingRouteDistance,
  routeEtaLabel,
  routeProgressLabel,
  routeRiskSummary,
  currentRouteStep,
  onToggleNavigationFollow,
  onClearNavigationState,
  onSelectRouteOption,
}: RouteCockpitDesktopProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.35 }}
      className="absolute right-4 top-[6.25rem] z-[210] w-[min(24rem,calc(100vw-3rem))] pointer-events-auto md:right-5"
    >
      <div className="rounded-[1.35rem] border border-cyan-400/18 bg-[rgba(8,18,28,0.88)] px-3.5 py-3 shadow-[0_18px_52px_rgba(0,0,0,0.24)] backdrop-blur-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8 shrink-0 rounded-xl border border-cyan-400/20 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),rgba(8,18,28,0.08)_55%,rgba(8,18,28,0.02)_78%)]">
                <div className="absolute inset-[5px] rounded-full border border-cyan-400/18" />
                <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300" />
              </div>
              <div className="text-[8px] font-mono uppercase tracking-[0.26em] text-cyan-300">VECTOR MODE</div>
            </div>
            <div className="mt-1 text-sm font-semibold tracking-[0.06em] text-white">{routeSnapshot.destination.label}</div>
            <div className="mt-2 grid gap-2 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)] sm:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                <div className="text-[7px] tracking-[0.2em] text-cyan-300">From</div>
                <div className="mt-1 text-[10px] font-semibold tracking-[0.05em] text-white">Live position</div>
                <div className="mt-0.5 text-[8px] text-[var(--text-secondary)]">{formatCoordinateLabel(routeSnapshot.origin)}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                <div className="text-[7px] tracking-[0.2em] text-cyan-300">To</div>
                <div className="mt-1 truncate text-[10px] font-semibold tracking-[0.05em] text-white">{routeSnapshot.destination.label}</div>
                <div className="mt-0.5 text-[8px] text-[var(--text-secondary)]">{formatCoordinateLabel(routeSnapshot.destination)}</div>
              </div>
            </div>
            {routeSnapshot.waypoints.length > 0 && (
              <div className="mt-2 rounded-xl border border-[rgba(212,175,55,0.14)] bg-[rgba(212,175,55,0.06)] px-2.5 py-2">
                <div className="text-[7px] font-mono uppercase tracking-[0.18em] text-[var(--gold-primary)]">Stops</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[7px] font-mono uppercase tracking-[0.14em] text-white/85">
                  {routeSnapshot.waypoints.map((waypoint, index) => (
                    <span key={`${waypoint.label}-${index}-${waypoint.lat}-${waypoint.lng}`} className="rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-2 py-1">
                      S{index + 1} · {waypoint.label ?? formatCoordinateLabel(waypoint)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <div className="rounded-xl border border-cyan-400/14 bg-cyan-400/[0.06] px-2.5 py-2">
                <div className="text-[7px] font-mono uppercase tracking-[0.18em] text-cyan-300">Mode</div>
                <div className="mt-1 text-[11px] font-semibold tracking-[0.05em] text-white">{formatRouteModeLabel(routeSnapshot.mode)}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                <div className="text-[7px] font-mono uppercase tracking-[0.18em] text-cyan-300">Remaining</div>
                <div className="mt-1 text-[11px] font-semibold tracking-[0.05em] text-white">{formatRouteDistance(remainingRouteDistance || routeSnapshot.distanceMeters)}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                <div className="text-[7px] font-mono uppercase tracking-[0.18em] text-cyan-300">ETA</div>
                <div className="mt-1 text-[11px] font-semibold tracking-[0.05em] text-white">{routeEtaLabel}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                <div className="text-[7px] font-mono uppercase tracking-[0.18em] text-cyan-300">Progress</div>
                <div className="mt-1 text-[11px] font-semibold tracking-[0.05em] text-white">{routeProgressLabel}</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              <span>{formatRouteDuration(routeSnapshot.durationSeconds)}</span>
              <span>•</span>
              <span>{navigationActive ? 'FOLLOW LIVE' : 'READY TO FOLLOW'}</span>
              {routeRiskSummary && (
                <>
                  <span>•</span>
                  <span className={routeRiskSummary.level === 'high' ? 'text-rose-300' : routeRiskSummary.level === 'elevated' ? 'text-amber-300' : 'text-emerald-300'}>
                    RISK {routeRiskSummary.score}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onToggleNavigationFollow}
              className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-400/18"
            >
              {navigationActive ? 'Pause Vector' : 'Start Vector'}
            </button>
            <button
              type="button"
              onClick={onClearNavigationState}
              className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)] hover:text-white"
            >
              Clear Route
            </button>
          </div>
        </div>
        {routeSnapshot.alternatives.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {routeSnapshot.alternatives.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectRouteOption(option.id)}
                className={`rounded-full border px-2.5 py-1 text-[8px] font-mono uppercase tracking-[0.18em] transition-colors ${routeSnapshot.activeRouteId === option.id ? 'border-cyan-400/35 bg-cyan-400/14 text-cyan-200' : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)] hover:text-white'}`}
              >
                {option.label} · {formatRouteDuration(option.durationSeconds)}{option.id !== routeSnapshot.activeRouteId ? ` · ${option.durationSeconds >= routeSnapshot.durationSeconds ? '+' : '-'}${formatRouteDuration(Math.abs(option.durationSeconds - routeSnapshot.durationSeconds))}` : ''}
              </button>
            ))}
          </div>
        )}
        {routeRiskSummary && (
          <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[8px] font-mono uppercase tracking-[0.18em]">
              <span className="text-cyan-300">Route Threat Scan</span>
              <span className="text-[var(--text-secondary)]">{routeRiskSummary.nearbySignals} signals</span>
              <span className={routeRiskSummary.level === 'high' ? 'text-rose-300' : routeRiskSummary.level === 'elevated' ? 'text-amber-300' : 'text-emerald-300'}>{routeRiskSummary.level}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              <span>Intel {routeRiskSummary.counts.incidents}</span>
              <span>Quakes {routeRiskSummary.counts.earthquakes}</span>
              <span>Weather {routeRiskSummary.counts.weather}</span>
              <span>Fires {routeRiskSummary.counts.fires}</span>
              <span>GPS {routeRiskSummary.counts.jamming}</span>
            </div>
          </div>
        )}
        {currentRouteStep && (
          <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
            <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-cyan-300">Next Turn</div>
            <div className="mt-1.5 text-[13px] font-semibold leading-snug text-white">{currentRouteStep.instruction}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
