'use client';

import type { ReactNode } from 'react';
import { type RouteRiskSummary, type RouteSnapshot, type RouteStep, formatRouteDistance, formatRouteDuration, formatRouteModeLabel, formatStepDistance } from '@/lib/routing-shell';

type LeftRailFocus = 'markets' | 'flow' | 'intel';
type RightRailFocus = 'alerts' | 'recon';

type DesktopOpsRailsProps = {
  showDesktopRails: boolean;
  showLayers: boolean;
  leftRailFocus: LeftRailFocus;
  rightRailFocus: RightRailFocus;
  onLeftRailFocusChange: (focus: LeftRailFocus) => void;
  onRightRailFocusChange: (focus: RightRailFocus) => void;
  focusedDeskLabel: string;
  focusedDeskHint: string;
  commandRailLabel: string;
  commandRailFocus: string;
  searchShareReconLabel: string;
  searchRailHint: string;
  deskStackLabel: string;
  deskStackHint: string;
  newswireLabel: string;
  reconLabel: string;
  showScmPanel: boolean;
  showMarkets: boolean;
  showIntel: boolean;
  leftLayersContent: ReactNode;
  flowContent: ReactNode;
  marketsContent: ReactNode;
  intelContent: ReactNode;
  incidentFusionStrip: ReactNode;
  nasaMissionStrip: ReactNode;
  sharePanel: ReactNode;
  alertsContent: ReactNode;
  reconContent: ReactNode;
  routeSnapshot: RouteSnapshot | null;
  routeLoading: boolean;
  navigationActive: boolean;
  routeEtaLabel: string;
  routeProgressLabel: string;
  remainingRouteDistance: number;
  routeRiskSummary: RouteRiskSummary | null;
  currentRouteStep: RouteStep | null;
  onToggleNavigationFollow: () => void;
  onClearNavigationState: () => void;
  onSelectRouteOption: (routeId: string) => void;
};

export default function DesktopOpsRails({
  showDesktopRails,
  showLayers,
  leftRailFocus,
  rightRailFocus,
  onLeftRailFocusChange,
  onRightRailFocusChange,
  focusedDeskLabel,
  focusedDeskHint,
  commandRailLabel,
  commandRailFocus,
  searchShareReconLabel,
  searchRailHint,
  deskStackLabel,
  deskStackHint,
  newswireLabel,
  reconLabel,
  showScmPanel,
  showMarkets,
  showIntel,
  leftLayersContent,
  flowContent,
  marketsContent,
  intelContent,
  incidentFusionStrip,
  nasaMissionStrip,
  sharePanel,
  alertsContent,
  reconContent,
  routeSnapshot,
  routeLoading,
  navigationActive,
  routeEtaLabel,
  routeProgressLabel,
  remainingRouteDistance,
  routeRiskSummary,
  currentRouteStep,
  onToggleNavigationFollow,
  onClearNavigationState,
  onSelectRouteOption,
}: DesktopOpsRailsProps) {
  if (!showDesktopRails) return null;

  return (
    <>
      <div className="desktop-panel absolute left-3.5 xl:left-4 top-20 bottom-24 xl:bottom-24 w-[14.25rem] xl:w-[15rem] 2xl:w-[15.75rem] flex flex-col gap-2 z-[200] min-h-0 pointer-events-none overflow-y-auto styled-scrollbar pr-1">
        {showLayers && leftLayersContent}

        <div className="glass-panel pointer-events-auto overflow-hidden border border-[var(--border-primary)]/70 bg-[linear-gradient(180deg,rgba(12,21,30,0.94),rgba(15,25,36,0.9))]">
          <div className="flex items-center justify-between border-b border-[var(--border-primary)]/40 px-2.5 py-2">
            <div>
              <div className="text-[8px] font-mono tracking-[0.22em] text-[var(--text-secondary)]">{focusedDeskLabel}</div>
              <div className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-[var(--text-primary)]">{focusedDeskHint}</div>
            </div>
          </div>
          <div className="flex gap-1.5 p-1.5">
            <button onClick={() => onLeftRailFocusChange('markets')} className={`flex-1 rounded-xl border px-2 py-1.5 text-[7px] font-mono tracking-[0.16em] transition-colors ${leftRailFocus === 'markets' ? 'border-[rgba(34,211,238,0.45)] bg-[rgba(34,211,238,0.12)] text-[var(--cyan-primary)]' : 'border-white/8 bg-white/[0.03] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>MARKETS</button>
            <button onClick={() => onLeftRailFocusChange('flow')} className={`flex-1 rounded-xl border px-2 py-1.5 text-[7px] font-mono tracking-[0.16em] transition-colors ${leftRailFocus === 'flow' ? 'border-[rgba(212,175,55,0.45)] bg-[rgba(212,175,55,0.12)] text-[var(--gold-primary)]' : 'border-white/8 bg-white/[0.03] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>FLOW</button>
            <button onClick={() => onLeftRailFocusChange('intel')} className={`flex-1 rounded-xl border px-2 py-1.5 text-[7px] font-mono tracking-[0.16em] transition-colors ${leftRailFocus === 'intel' ? 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.12)] text-[var(--alert-green)]' : 'border-white/8 bg-white/[0.03] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>INTEL</button>
          </div>
        </div>
        {leftRailFocus === 'flow' && showScmPanel && flowContent}
        {leftRailFocus === 'markets' && showMarkets && marketsContent}
        {leftRailFocus === 'intel' && showIntel && intelContent}
      </div>

      <div className="desktop-panel absolute right-3.5 xl:right-4 top-20 bottom-24 xl:bottom-24 w-[14.75rem] xl:w-[15.5rem] 2xl:w-[16.25rem] flex flex-col gap-2 z-[200] min-h-0 pointer-events-auto overflow-y-auto styled-scrollbar pr-1">
        {incidentFusionStrip}
        {nasaMissionStrip}

        <div className="glass-panel overflow-hidden border border-[var(--border-primary)]/80 bg-[linear-gradient(180deg,rgba(14,24,34,0.94),rgba(16,27,39,0.88))] shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
          <div className="flex items-center justify-between border-b border-[var(--border-primary)]/45 px-3 py-2">
            <div>
              <div className="text-[8px] font-mono tracking-[0.26em] text-[var(--text-secondary)]">{commandRailLabel}</div>
              <div className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-[var(--text-primary)]">{commandRailFocus}</div>
            </div>
            <div className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-1 text-[7px] font-mono tracking-[0.16em] text-[var(--cyan-primary)]">
              {searchShareReconLabel}
            </div>
          </div>
          <div className="space-y-2 p-2.5">
            <div className="rounded-2xl border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(7,15,24,0.38))] px-3 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.14)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[8px] font-mono tracking-[0.24em] text-cyan-300">AEGIS VECTOR PINNED</div>
                  <div className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">
                    {routeSnapshot ? 'Active route stays in the compact nav cockpit' : routeLoading ? 'Routing in progress from live GPS' : 'GPS route dock is reinforced at the Earth edge'}
                  </div>
                </div>
                <div className={`rounded-full border px-2 py-1 text-[7px] font-mono tracking-[0.16em] ${routeSnapshot || routeLoading ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200' : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)]'}`}>
                  {routeSnapshot ? 'ACTIVE' : routeLoading ? 'ROUTING' : 'PINNED'}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Visible above the globe so it no longer gets buried in this rail.
                </div>
                <div className="relative shrink-0">{sharePanel}</div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[7px] font-mono tracking-[0.16em] text-[var(--text-muted)]">
              {searchRailHint}
            </div>
            {(routeSnapshot || routeLoading) && (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-mono tracking-[0.22em] text-cyan-300">NAV COCKPIT</div>
                    <div className="mt-1 text-[11px] font-semibold text-[var(--text-primary)]">
                      {routeLoading ? 'Calculando ruta…' : routeSnapshot?.destination.label}
                    </div>
                    {routeSnapshot && (
                      <>
                        <div className="mt-2 rounded-xl border border-[rgba(212,175,55,0.14)] bg-[rgba(212,175,55,0.06)] px-2.5 py-2">
                          <div className="text-[7px] font-mono uppercase tracking-[0.18em] text-[var(--gold-primary)]">Stops</div>
                          <div className="mt-1 flex flex-wrap gap-1.5 text-[7px] font-mono uppercase tracking-[0.14em] text-white/85">
                            {routeSnapshot.waypoints.length > 0 ? routeSnapshot.waypoints.map((waypoint, index) => (
                              <span key={`${waypoint.label}-${index}-${waypoint.lat}-${waypoint.lng}`} className="rounded-full border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)] px-2 py-1">
                                S{index + 1}
                              </span>
                            )) : <span className="text-[var(--text-secondary)]">Direct route</span>}
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                          <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                            <div className="text-cyan-300">Mode</div>
                            <div className="mt-1 text-[10px] font-semibold text-white">{formatRouteModeLabel(routeSnapshot.mode)}</div>
                          </div>
                          <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                            <div className="text-cyan-300">ETA</div>
                            <div className="mt-1 text-[10px] font-semibold text-white">{routeEtaLabel}</div>
                          </div>
                          <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                            <div className="text-cyan-300">Remaining</div>
                            <div className="mt-1 text-[10px] font-semibold text-white">{formatRouteDistance(remainingRouteDistance || routeSnapshot.distanceMeters)}</div>
                          </div>
                          <div className="rounded-xl border border-white/8 bg-black/20 px-2.5 py-2">
                            <div className="text-cyan-300">Progress</div>
                            <div className="mt-1 text-[10px] font-semibold text-white">{routeProgressLabel}</div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                          <span>{formatRouteDuration(routeSnapshot.durationSeconds)}</span>
                          <span>•</span>
                          <span>{navigationActive ? '3D FOLLOW' : 'ROUTE LOCKED'}</span>
                          {routeRiskSummary && (
                            <>
                              <span>•</span>
                              <span className={routeRiskSummary.level === 'high' ? 'text-rose-300' : routeRiskSummary.level === 'elevated' ? 'text-amber-300' : 'text-emerald-300'}>RISK {routeRiskSummary.score}</span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {routeSnapshot && (
                    <div className="flex gap-2">
                      <button type="button" onClick={onToggleNavigationFollow} className="rounded-full border border-cyan-400/25 px-2 py-1 text-[7px] font-mono uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-400/10">
                        {navigationActive ? 'Pause Follow' : 'Start 3D Nav'}
                      </button>
                      <button type="button" onClick={onClearNavigationState} className="rounded-full border border-white/10 px-2 py-1 text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)] hover:text-white">
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                {routeSnapshot?.alternatives.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {routeSnapshot.alternatives.map((option) => (
                      <button key={option.id} type="button" onClick={() => onSelectRouteOption(option.id)} className={`rounded-full border px-2 py-1 text-[7px] font-mono uppercase tracking-[0.16em] ${routeSnapshot.activeRouteId === option.id ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200' : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)] hover:text-white'}`}>
                        {option.label} · {formatRouteDuration(option.durationSeconds)}{option.id !== routeSnapshot.activeRouteId ? ` · ${option.durationSeconds >= routeSnapshot.durationSeconds ? '+' : '-'}${formatRouteDuration(Math.abs(option.durationSeconds - routeSnapshot.durationSeconds))}` : ''}
                      </button>
                    ))}
                  </div>
                ) : null}
                {routeRiskSummary && (
                  <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    Threat scan · intel {routeRiskSummary.counts.incidents} · quakes {routeRiskSummary.counts.earthquakes} · weather {routeRiskSummary.counts.weather} · fires {routeRiskSummary.counts.fires} · gps {routeRiskSummary.counts.jamming}
                  </div>
                )}
                {routeSnapshot && currentRouteStep && (
                  <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                    <div className="text-[7px] font-mono tracking-[0.18em] text-cyan-300">NEXT MANEUVER</div>
                    <div className="mt-2 text-[12px] font-semibold leading-snug text-white">{currentRouteStep.instruction}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      <span>{formatStepDistance(currentRouteStep.distanceMeters)}</span>
                      <span>•</span>
                      <span>{formatRouteDistance(remainingRouteDistance || routeSnapshot.distanceMeters)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel overflow-hidden border border-[var(--border-primary)]/70 bg-[linear-gradient(180deg,rgba(12,21,30,0.94),rgba(15,25,36,0.9))] shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
          <div className="flex items-center justify-between border-b border-[var(--border-primary)]/40 px-3 py-2">
            <div>
              <div className="text-[8px] font-mono tracking-[0.22em] text-[var(--text-secondary)]">{deskStackLabel}</div>
              <div className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-[var(--text-primary)]">{deskStackHint}</div>
            </div>
          </div>
          <div className="flex gap-1.5 p-2">
            <button onClick={() => onRightRailFocusChange('alerts')} className={`flex-1 rounded-xl border px-2 py-1.5 text-[7px] font-mono tracking-[0.16em] transition-colors ${rightRailFocus === 'alerts' ? 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.12)] text-[var(--alert-green)]' : 'border-white/8 bg-white/[0.03] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{newswireLabel}</button>
            <button onClick={() => onRightRailFocusChange('recon')} className={`flex-1 rounded-xl border px-2 py-1.5 text-[7px] font-mono tracking-[0.16em] transition-colors ${rightRailFocus === 'recon' ? 'border-[rgba(34,211,238,0.45)] bg-[rgba(34,211,238,0.12)] text-[var(--cyan-primary)]' : 'border-white/8 bg-white/[0.03] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{reconLabel}</button>
          </div>
        </div>
        {rightRailFocus === 'recon' && reconContent}
        {rightRailFocus === 'alerts' && alertsContent}
      </div>
    </>
  );
}
