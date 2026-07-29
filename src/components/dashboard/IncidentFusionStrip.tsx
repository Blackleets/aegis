'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Database, RadioTower } from 'lucide-react';
import { assessOperationalFusion, type OperationalPressure } from '@/lib/operational-fusion';
import type { OperationalCase } from '@/lib/operational-cases';

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
  topOperationalCase?: OperationalCase | null;
  variant?: 'overlay' | 'rail';
};

function pressureLabel(pressure: OperationalPressure) {
  return pressure.toUpperCase();
}

function pressureColor(label: string) {
  if (label === 'CRITICAL') return 'var(--alert-red)';
  if (label === 'ELEVATED') return 'var(--alert-orange)';
  if (label === 'WATCH') return 'var(--gold-primary)';
  if (label === 'DEGRADED') return 'var(--alert-red)';
  if (label === 'SYNCING') return 'var(--cyan-primary)';
  return 'var(--alert-green)';
}

function IncidentFusionStrip({
  backendStatus,
  trackedEntityCount,
  activeIntelAlerts,
  maritimePressure,
  newsCount,
  earthquakeCount,
  gdeltCount,
  operationalModeLabel,
  topOperationalCase = null,
  variant = 'overlay',
}: IncidentFusionStripProps) {
  const assessment = assessOperationalFusion({
    backendStatus,
    activeIntelAlerts,
    maritimePressure,
    newsCount,
    earthquakeCount,
    gdeltCount,
  });
  const label = pressureLabel(assessment.pressure);
  const color = pressureColor(label);
  const sourceMix = [
    newsCount > 0 ? 'NEWS' : null,
    earthquakeCount > 0 ? 'SEISMIC' : null,
    gdeltCount > 0 ? 'GDELT' : null,
    maritimePressure > 0 ? 'MARITIME' : null,
  ].filter(Boolean).join(' · ') || 'STANDBY';
  const metricCardClass = variant === 'rail'
    ? 'rounded-xl border border-white/8 bg-white/[0.035] px-2.5 py-1.5'
    : 'rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3.22, duration: 0.45 }}
      className={variant === 'rail'
        ? 'shrink-0 pointer-events-auto'
        : 'absolute left-1/2 top-[5.25rem] z-[198] hidden w-[min(40rem,calc(100vw-44rem))] min-w-[28rem] -translate-x-1/2 pointer-events-none xl:block'}
    >
      <div className={variant === 'rail' ? 'sovereign-panel px-3 py-2.5 backdrop-blur-xl' : 'sovereign-panel px-3.5 py-3 backdrop-blur-xl'}>
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(183,200,177,0.28)] to-transparent" />
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <RadioTower className="h-3.5 w-3.5 text-[var(--cyan-primary)]" />
              <div className="text-[7px] font-mono tracking-[0.34em] text-[var(--text-secondary)]">AEGIS INCIDENT FUSION</div>
            </div>
            <div className="mt-1 truncate text-[11px] font-semibold tracking-[0.18em] text-[var(--text-primary)]">
              {assessment.primarySignal} · {operationalModeLabel}
            </div>
          </div>

          <div className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[7px] font-mono tracking-[0.22em]" style={{ color }}>
            PRESSURE {assessment.score.toFixed(1)} · {label}
          </div>
        </div>

        <div className={`mt-3 grid gap-2 ${variant === 'rail' ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <div className={metricCardClass}>
            <div className="flex items-center gap-1.5 text-[7px] font-mono tracking-[0.18em] text-[var(--text-muted)]"><AlertTriangle className="h-3 w-3" /> ALERTS</div>
            <div className="mt-1 text-[11px] font-bold tabular-nums" style={{ color }}>{activeIntelAlerts + maritimePressure}</div>
          </div>
          <div className={metricCardClass}>
            <div className="flex items-center gap-1.5 text-[7px] font-mono tracking-[0.18em] text-[var(--text-muted)]"><Database className="h-3 w-3" /> TRACKED</div>
            <div className="mt-1 text-[11px] font-bold tabular-nums text-[var(--gold-primary)]">{trackedEntityCount.toLocaleString()}</div>
          </div>
          <div className={metricCardClass}>
            <div className="flex items-center gap-1.5 text-[7px] font-mono tracking-[0.18em] text-[var(--text-muted)]"><Activity className="h-3 w-3" /> SOURCES</div>
            <div className="mt-1 truncate text-[9px] font-semibold tracking-[0.12em] text-[var(--cyan-primary)]">{sourceMix}</div>
          </div>
          <div className={metricCardClass}>
            <div className="text-[7px] font-mono tracking-[0.18em] text-[var(--text-muted)]">EVENT MESH</div>
            <div className="mt-1 text-[11px] font-bold tabular-nums text-[var(--text-primary)]">{(newsCount + earthquakeCount + gdeltCount).toLocaleString()}</div>
          </div>
        </div>
        <div className="mt-2.5 rounded-xl border border-white/8 bg-black/15 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 text-[7px] font-mono uppercase tracking-[0.16em] text-[var(--text-muted)]">
            <span>Recommended action</span>
            <span style={{ color }}>Confidence {assessment.confidence} · {assessment.corroboratingSources} sources</span>
          </div>
          <p className="mt-1 text-[9px] leading-relaxed text-[var(--text-secondary)]">{assessment.action}</p>
          <p className="mt-1 truncate text-[7px] font-mono tracking-[0.08em] text-[var(--cyan-primary)]">
            EVIDENCE · {assessment.evidence.join(' · ') || 'No active evidence'}
          </p>
        </div>
        {topOperationalCase && (
          <div className="mt-2 rounded-xl border border-amber-200/15 bg-amber-200/[0.045] px-2.5 py-2">
            <div className="flex items-center justify-between gap-2 text-[7px] font-mono uppercase tracking-[0.16em] text-amber-100/65">
              <span>Operational case · {topOperationalCase.id}</span>
              <span>{topOperationalCase.confidence} confidence</span>
            </div>
            <p className="mt-1 truncate text-[10px] font-semibold text-amber-50">{topOperationalCase.title}</p>
            <p className="mt-1 truncate text-[8px] text-white/48">
              {topOperationalCase.signals.length} linked signals · {topOperationalCase.sourceCount} independent sources
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(IncidentFusionStrip);
