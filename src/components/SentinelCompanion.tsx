'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar,
  ShieldAlert,
  Activity,
  Eye,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Zap,
  Waves,
  Brain,
  Bookmark,
  TrendingUp,
  PanelsTopLeft,
  Map,
  Newspaper,
  Package,
  Crosshair,
  ScanSearch,
  X,
} from 'lucide-react';

type BackendStatus = 'connecting' | 'connected' | 'error';
type SentinelAction = 'open' | 'briefing' | 'fusion';
type SentinelCommand = 'markets' | 'intel' | 'scm' | 'recon' | 'recenter' | 'close-live-feed';

interface SentinelCompanionProps {
  isMobile: boolean;
  backendStatus: BackendStatus;
  activeIntelAlerts: number;
  operationalModeLabel: string;
  trackedEntityCount: number;
  onlineUsers: number;
  maritimePressure: number;
  commandRailFocus: string;
  solarSummary?: string | null;
  marketPosture: string;
  marketSpotlight: string;
  recommendation: string;
}

interface SentinelProfile {
  label: string;
  accent: string;
  glow: string;
  ring: string;
  bg: string;
  message: string;
  mood: string;
}

interface TimelineEntry {
  label: string;
  at: string;
}

const TIMELINE_KEY = 'aegis-sentinel-timeline';

function dispatchAnalystAction(action: SentinelAction) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('aegis:ai-analyst', { detail: { action } }));
}

function dispatchHudCommand(command: SentinelCommand) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('aegis:sentinel-command', { detail: { command } }));
}

function statusPalette(
  backendStatus: BackendStatus,
  activeIntelAlerts: number,
  maritimePressure: number,
  solarSummary?: string | null,
): SentinelProfile {
  const hasSolarStress = Boolean(solarSummary && !solarSummary.toLowerCase().includes('quiet'));

  if (backendStatus === 'error') {
    return {
      label: 'ALERT',
      accent: '#FF5D73',
      glow: '0 0 20px rgba(255,93,115,0.45)',
      ring: 'rgba(255,93,115,0.28)',
      bg: 'linear-gradient(135deg, rgba(255,93,115,0.18), rgba(255,93,115,0.04))',
      message: 'Sentinel detects degraded command links and recommends immediate recovery posture.',
      mood: 'Recovery mode',
    };
  }

  if (activeIntelAlerts > 0 && maritimePressure > 0) {
    return {
      label: 'WATCH+',
      accent: '#FFB547',
      glow: '0 0 22px rgba(255,181,71,0.45)',
      ring: 'rgba(255,181,71,0.28)',
      bg: 'linear-gradient(135deg, rgba(255,181,71,0.2), rgba(255,181,71,0.05))',
      message: 'Sentinel is correlating high-signal alerts with elevated maritime pressure across the board.',
      mood: 'Correlating multi-domain stress',
    };
  }

  if (activeIntelAlerts > 0) {
    return {
      label: 'WATCH',
      accent: '#FFB547',
      glow: '0 0 20px rgba(255,181,71,0.42)',
      ring: 'rgba(255,181,71,0.26)',
      bg: 'linear-gradient(135deg, rgba(255,181,71,0.18), rgba(255,181,71,0.04))',
      message: 'Sentinel is tracking elevated signal activity and reprioritizing brief cycles.',
      mood: 'Alert clustering active',
    };
  }

  if (backendStatus === 'connecting') {
    return {
      label: 'SYNC',
      accent: '#00E5FF',
      glow: '0 0 20px rgba(0,229,255,0.42)',
      ring: 'rgba(0,229,255,0.22)',
      bg: 'linear-gradient(135deg, rgba(0,229,255,0.16), rgba(0,229,255,0.04))',
      message: 'Sentinel is synchronizing data layers and waiting for clean telemetry handshake.',
      mood: 'Handshake in progress',
    };
  }

  if (maritimePressure > 0 || hasSolarStress) {
    return {
      label: 'SCAN',
      accent: '#00E5FF',
      glow: '0 0 20px rgba(0,229,255,0.42)',
      ring: 'rgba(0,229,255,0.22)',
      bg: 'linear-gradient(135deg, rgba(0,229,255,0.16), rgba(0,229,255,0.04))',
      message: 'Sentinel is maintaining active scan posture for supply-chain and orbital anomalies.',
      mood: 'Wide-area scan posture',
    };
  }

  return {
    label: 'LIVE',
    accent: '#39FF88',
    glow: '0 0 20px rgba(57,255,136,0.42)',
    ring: 'rgba(57,255,136,0.22)',
    bg: 'linear-gradient(135deg, rgba(57,255,136,0.16), rgba(57,255,136,0.04))',
    message: 'Sentinel reports stable command posture with recon channels holding clean.',
    mood: 'Stable tactical rhythm',
  };
}

function actionLabel(action: SentinelAction) {
  if (action === 'briefing') return 'Briefing dispatched';
  if (action === 'fusion') return 'Fusion dossier launched';
  return 'Analyst panel opened';
}

function commandLabel(command: SentinelCommand) {
  switch (command) {
    case 'markets': return 'Markets board focused';
    case 'intel': return 'Intel feed opened';
    case 'scm': return 'SCM watch surfaced';
    case 'recon': return 'Recon controls highlighted';
    case 'recenter': return 'Global view recentered';
    case 'close-live-feed': return 'Live feed overlay closed';
    default: return 'Command executed';
  }
}

function loadTimeline(): TimelineEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(TIMELINE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TimelineEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pushTimeline(entries: TimelineEntry[], label: string) {
  return [{ label, at: new Date().toISOString() }, ...entries].slice(0, 5);
}

export default function SentinelCompanion({
  isMobile,
  backendStatus,
  activeIntelAlerts,
  operationalModeLabel,
  trackedEntityCount,
  onlineUsers,
  maritimePressure,
  commandRailFocus,
  solarSummary,
  marketPosture,
  marketSpotlight,
  recommendation,
}: SentinelCompanionProps) {
  const [open, setOpen] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(() => loadTimeline());

  const profile = useMemo(
    () => statusPalette(backendStatus, activeIntelAlerts, maritimePressure, solarSummary),
    [backendStatus, activeIntelAlerts, maritimePressure, solarSummary],
  );

  const quickLine = useMemo(() => {
    if (backendStatus === 'error') return 'Recovery protocols advised';
    if (activeIntelAlerts > 0 && maritimePressure > 0) return 'Signals + chokepoints under review';
    if (activeIntelAlerts > 0) return `${activeIntelAlerts} priority signal${activeIntelAlerts > 1 ? 's' : ''} under watch`;
    if (backendStatus === 'connecting') return 'Telemetry handshake in progress';
    if (maritimePressure > 0) return 'Supply-chain watchline elevated';
    if (solarSummary && !solarSummary.toLowerCase().includes('quiet')) return `Solar watch: ${solarSummary}`;
    return 'Recon channels stable';
  }, [backendStatus, activeIntelAlerts, maritimePressure, solarSummary]);

  const missionSnapshot = useMemo(() => {
    if (backendStatus === 'error') {
      return {
        label: 'RECOVERY WINDOW',
        detail: 'Command links degraded — stabilize feeds before expanding tasking.',
      };
    }

    if (activeIntelAlerts > 0 && maritimePressure > 0) {
      return {
        label: 'DUAL-THEATER WATCH',
        detail: `Tracking ${activeIntelAlerts} signal${activeIntelAlerts > 1 ? 's' : ''} with ${maritimePressure} logistics pressure point${maritimePressure > 1 ? 's' : ''}.`,
      };
    }

    if (activeIntelAlerts > 0) {
      return {
        label: 'SIGNAL PRIORITY',
        detail: `${activeIntelAlerts} active alert${activeIntelAlerts > 1 ? 's' : ''} shaping the current brief cadence.`,
      };
    }

    if (maritimePressure > 0) {
      return {
        label: 'SCM MONITOR',
        detail: `${maritimePressure} supply-chain pressure point${maritimePressure > 1 ? 's are' : ' is'} influencing market posture.`,
      };
    }

    return {
      label: 'STEADY COVERAGE',
      detail: 'Recon, market, and operator channels are aligned for continuous monitoring.',
    };
  }, [activeIntelAlerts, backendStatus, maritimePressure]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TIMELINE_KEY, JSON.stringify(timeline));
  }, [timeline]);

  const logAction = (label: string) => {
    setTimeline((entries) => pushTimeline(entries, label));
  };

  const handleAction = (action: SentinelAction) => {
    logAction(actionLabel(action));
    dispatchAnalystAction(action);
    if (action !== 'open') setOpen(false);
  };

  const handleCommand = (command: SentinelCommand) => {
    logAction(commandLabel(command));
    dispatchHudCommand(command);
    if (isMobile) setOpen(false);
  };

  const shortcutCards = [
    { label: 'Markets', sub: 'Asset deck', icon: PanelsTopLeft, accent: '#FACC15', action: () => handleCommand('markets') },
    { label: 'Intel', sub: 'Live feed', icon: Newspaper, accent: '#00E5FF', action: () => handleCommand('intel') },
    { label: 'SCM', sub: 'Supply chain', icon: Package, accent: '#FFB547', action: () => handleCommand('scm') },
    { label: 'Recenter', sub: 'Global view', icon: Crosshair, accent: '#39FF88', action: () => handleCommand('recenter') },
    { label: 'Recon', sub: 'Layer controls', icon: ScanSearch, accent: '#8B93FF', action: () => handleCommand('recon') },
    { label: 'Close feed', sub: 'Overlay reset', icon: X, accent: '#FB7185', action: () => handleCommand('close-live-feed') },
  ] as const;

  return (
    <div
      className={isMobile
        ? 'absolute right-3 top-24 z-[230] pointer-events-auto'
        : 'absolute right-4 xl:right-5 bottom-[84px] z-[230] pointer-events-auto flex justify-end'}
    >
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className={isMobile
              ? 'mb-2 w-[286px] rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,28,0.98),rgba(14,24,34,0.96))] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl'
              : 'mb-3 w-[360px] max-h-[68vh] overflow-y-auto rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,16,24,0.99),rgba(12,22,32,0.975))] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl styled-scrollbar'}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[8px] font-mono uppercase tracking-[0.24em] text-[var(--text-secondary)]">AI companion</div>
                <div className="mt-1 text-[14px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">Sentinel Coordination Layer</div>
              </div>
              <span className="rounded-full px-2 py-1 text-[8px] font-mono uppercase tracking-[0.16em]" style={{ color: profile.accent, background: profile.ring }}>
                {profile.label}
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                <div className="overflow-hidden rounded-[22px] border border-[rgba(0,229,255,0.16)] bg-[linear-gradient(135deg,rgba(0,229,255,0.08),rgba(57,255,136,0.05),rgba(212,175,55,0.06))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-secondary)]">Mission snapshot</div>
                      <div className="mt-1 text-[12px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">{missionSnapshot.label}</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[8px] font-mono uppercase tracking-[0.16em]" style={{ color: profile.accent }}>
                      {profile.label}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">{missionSnapshot.detail}</div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">Operational outlook</div>
                    <div className="text-[8px] font-mono uppercase tracking-[0.16em]" style={{ color: profile.accent }}>{profile.mood}</div>
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-[var(--text-primary)]">{operationalModeLabel}</div>
                  <div className="mt-1 text-[10px] leading-relaxed text-[var(--text-secondary)]">{profile.message}</div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Waves className="h-3.5 w-3.5 text-[var(--cyan-primary)]" />
                      <span className="text-[8px] font-mono uppercase tracking-[0.16em]">Operator rail</span>
                    </div>
                    <span className="text-[8px] font-mono uppercase tracking-[0.14em] text-[var(--gold-primary)]">{marketPosture}</span>
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-[var(--text-primary)]">{commandRailFocus}</div>
                  <div className="mt-1 text-[9px] font-mono tracking-[0.12em] text-[var(--text-muted)]">{marketSpotlight}</div>
                  {solarSummary && <div className="mt-1 text-[9px] font-mono tracking-[0.12em] text-[var(--text-muted)]">Solar: {solarSummary}</div>}
                </div>

                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-3 py-3">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <TrendingUp className="h-3.5 w-3.5 text-[var(--gold-primary)]" />
                    <span className="text-[8px] font-mono uppercase tracking-[0.16em]">Recommended next move</span>
                  </div>
                  <div className="mt-1 text-[10px] leading-relaxed text-[var(--text-primary)]">{recommendation}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Alerts', value: activeIntelAlerts.toString(), icon: ShieldAlert, accent: activeIntelAlerts > 0 ? '#FFB547' : profile.accent },
                    { label: 'Live now', value: onlineUsers.toString(), icon: Activity, accent: onlineUsers > 0 ? '#39FF88' : '#94A3B8' },
                    { label: 'Tracked', value: trackedEntityCount.toLocaleString(), icon: Radar, accent: '#00E5FF' },
                    { label: 'Status', value: profile.label, icon: Eye, accent: profile.accent },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]">{item.label}</span>
                          <Icon className="h-3.5 w-3.5" style={{ color: item.accent }} />
                        </div>
                        <div className="mt-1 text-[11px] font-bold tabular-nums" style={{ color: item.accent }}>{item.value}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-3 py-3">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Bookmark className="h-3.5 w-3.5 text-[var(--cyan-primary)]" />
                    <span className="text-[8px] font-mono uppercase tracking-[0.16em]">Timeline memory</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {timeline.length > 0 ? timeline.map((entry, index) => (
                      <div key={`${entry.at}-${index}`} className="flex items-start gap-2 rounded-xl border border-white/6 bg-white/[0.025] px-2.5 py-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ background: index === 0 ? profile.accent : 'rgba(148,163,184,0.8)', boxShadow: index === 0 ? profile.glow : 'none' }} />
                        <div className="min-w-0">
                          <div className="text-[9px] font-semibold text-[var(--text-primary)]">{entry.label}</div>
                          <div className="text-[8px] font-mono tracking-[0.12em] text-[var(--text-muted)]">{new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    )) : <div className="text-[9px] font-mono text-[var(--text-muted)]">No operator actions logged yet</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-3 py-3">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Map className="h-3.5 w-3.5 text-[var(--gold-primary)]" />
                <span className="text-[8px] font-mono uppercase tracking-[0.16em]">Quick routing</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {shortcutCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.label}
                      type="button"
                      onClick={card.action}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-semibold text-[var(--text-primary)]">{card.label}</span>
                        <Icon className="h-3.5 w-3.5" style={{ color: card.accent }} />
                      </div>
                      <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.12em] text-[var(--text-muted)]">{card.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleAction('open')}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.05] px-2 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--text-primary)] transition-colors hover:bg-white/[0.08]"
              >
                <Brain className="h-3.5 w-3.5" />
                Analyst
              </button>
              <button
                type="button"
                onClick={() => handleAction('briefing')}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-[rgba(212,175,55,0.22)] bg-[rgba(212,175,55,0.08)] px-2 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--gold-primary)] transition-colors hover:bg-[rgba(212,175,55,0.12)]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Briefing
              </button>
              <button
                type="button"
                onClick={() => handleAction('fusion')}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-[rgba(0,229,255,0.22)] bg-[rgba(0,229,255,0.08)] px-2 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--cyan-primary)] transition-colors hover:bg-[rgba(0,229,255,0.12)]"
              >
                <Zap className="h-3.5 w-3.5" />
                Fusion
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        whileTap={{ scale: 0.98 }}
        className={isMobile
          ? 'flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(11,18,28,0.92)] px-2.5 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl'
          : 'flex w-[252px] items-center gap-2 rounded-[24px] border border-white/10 bg-[rgba(11,18,28,0.9)] px-2.5 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl'}
      >
        <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10" style={{ background: profile.bg }}>
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.95, 0.55] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-[3px] rounded-full"
            style={{ boxShadow: profile.glow, border: `1px solid ${profile.ring}` }}
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-[7px] rounded-full border border-dashed"
            style={{ borderColor: profile.ring }}
          />
          <div className="absolute inset-[12px] rounded-full" style={{ background: profile.accent, boxShadow: profile.glow, opacity: 0.18 }} />
          <Radar className="relative z-[2] h-5 w-5" style={{ color: profile.accent }} />
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-secondary)]">Sentinel dock</span>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: profile.accent, boxShadow: profile.glow }} />
          </div>
          <div className="mt-0.5 truncate text-[10px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">{quickLine}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              {operationalModeLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              Alerts {activeIntelAlerts}
            </span>
          </div>
        </div>

        <div className="text-[var(--text-muted)]">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </motion.button>
    </div>
  );
}
