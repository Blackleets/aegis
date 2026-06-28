'use client';

import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Database, RadioTower } from 'lucide-react';

type BackendStatus = 'connecting' | 'connected' | 'error';

type IncidentFusionStripProps = {
  backendStatus: BackendStatus;
  trackedEntityCount: number;
  activeIntelAlerts: number;
  maritimePressure: number;
  newsCount: number;
  earthquakeCount: number;
  gdeltCount: number;
  operationalModeLabel: string;
};

function pressureLabel(score: number, backendStatus: BackendStatus) {
  if (backendStatus === 'error') return 'DEGRADED';
  if (backendStatus === 'connecting') return 'SYNCING';
  if (score >= 8) return 'CRITICAL';
  if (score >= 4) return 'ELEVATED';
  if (score >= 1) return 'WATCH';
  return 'STEADY';
}

function pressureColor(label: string) {
  if (label === 'CRITICAL') return 'var(--alert-red)';
  if (label === 'ELEVATED') return 'var(--alert-orange)';
  if (label === 'WATCH') return 'var(--gold-primary)';
  if (label === 'DEGRADED') return 'var(--alert-red)';
  if (label === 'SYNCING') return 'var(--cyan-primary)';
  return 'var(--alert-green)';
}

function primarySignal({ activeIntelAlerts, maritimePressure, gdeltCount, earthquakeCount, newsCount }: Pick<IncidentFusionStripProps, 'activeIntelAlerts' | 'maritimePressure' | 'gdeltCount' | 'earthquakeCount' | 'newsCount'>) {
  if (activeIntelAlerts > 0 && maritimePressure > 0) return 'INTEL + MARITIME';
  if (maritimePressure > 0) return 'MARITIME PRESSURE';
  if (activeIntelAlerts > 0) return earthquakeCount > 0 ? 'QUAKE + NEWS' : 'HIGH-RISK NEWS';
  if (gdeltCount > newsCount) return 'GLOBAL INCIDENTS';
  if (newsCount > 0) return 'NEWS WATCH';
  return 'BASELINE MESH';
}

export default function IncidentFusionStrip({
  backendStatus,
  trackedEntityCount,
  activeIntelAlerts,
  maritimePressure,
  newsCount,
  earthquakeCount,
  gdeltCount,
  operationalModeLabel,
}: IncidentFusionStripProps) {
  const pressureScore = activeIntelAlerts + maritimePressure + Math.min(Math.floor(gdeltCount / 10), 3);
  const label = pressureLabel(pressureScore, backendStatus);
  const color = pressureColor(label);
  const signal = primarySignal({ activeIntelAlerts, maritimePressure, gdeltCount, earthquakeCount, newsCount });
  const sourceMix = [
    newsCount > 0 ? 'NEWS' : null,
    earthquakeCount > 0 ? 'SEISMIC' : null,
    gdeltCount > 0 ? 'GDELT' : null,
    maritimePressure > 0 ? 'MARITIME' : null,
  ].filter(Boolean).join(' · ') || 'STANDBY';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3.22, duration: 0.45 }}
      className="absolute left-1/2 top-[5.75rem] z-[198] hidden w-[min(44rem,calc(100vw-38rem))] min-w-[30rem] -translate-x-1/2 pointer-events-none xl:block"
    >
      <div className="sovereign-panel px-3.5 py-3 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(183,200,177,0.28)] to-transparent" />
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <RadioTower className="h-3.5 w-3.5 text-[var(--cyan-primary)]" />
              <div className="text-[7px] font-mono tracking-[0.34em] text-[var(--text-secondary)]">AEGIS INCIDENT FUSION</div>
            </div>
            <div className="mt-1 truncate text-[11px] font-semibold tracking-[0.18em] text-[var(--text-primary)]">
              {signal} · {operationalModeLabel}
            </div>
          </div>

          <div className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[7px] font-mono tracking-[0.22em]" style={{ color }}>
            PRESSURE · {label}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[7px] font-mono tracking-[0.18em] text-[var(--text-muted)]"><AlertTriangle className="h-3 w-3" /> ALERTS</div>
            <div className="mt-1 text-[11px] font-bold tabular-nums" style={{ color }}>{activeIntelAlerts + maritimePressure}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[7px] font-mono tracking-[0.18em] text-[var(--text-muted)]"><Database className="h-3 w-3" /> TRACKED</div>
            <div className="mt-1 text-[11px] font-bold tabular-nums text-[var(--gold-primary)]">{trackedEntityCount.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[7px] font-mono tracking-[0.18em] text-[var(--text-muted)]"><Activity className="h-3 w-3" /> SOURCES</div>
            <div className="mt-1 truncate text-[9px] font-semibold tracking-[0.12em] text-[var(--cyan-primary)]">{sourceMix}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2">
            <div className="text-[7px] font-mono tracking-[0.18em] text-[var(--text-muted)]">EVENT MESH</div>
            <div className="mt-1 text-[11px] font-bold tabular-nums text-[var(--text-primary)]">{(newsCount + earthquakeCount + gdeltCount).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
