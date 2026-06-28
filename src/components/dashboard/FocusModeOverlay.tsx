'use client';

import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Database, Wifi } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { getDashboardCopy } from '@/lib/i18n';

type BackendStatus = 'connecting' | 'connected' | 'error';

type FocusModeOverlayProps = {
  backendStatus: BackendStatus;
  trackedEntityCount: number;
  activeIntelAlerts: number;
  postureLabel: string;
  locale: Locale;
};

function statusLabel(status: BackendStatus, locale: Locale) {
  const copy = getDashboardCopy(locale).focus;
  if (status === 'connected') return copy.live;
  if (status === 'error') return copy.degraded;
  return copy.syncing;
}

function statusColor(status: BackendStatus) {
  if (status === 'connected') return 'var(--alert-green)';
  if (status === 'error') return 'var(--alert-red)';
  return 'var(--gold-primary)';
}

export default function FocusModeOverlay({ backendStatus, trackedEntityCount, activeIntelAlerts, postureLabel, locale }: FocusModeOverlayProps) {
  const copy = getDashboardCopy(locale).focus;
  const currentStatusLabel = statusLabel(backendStatus, locale);
  const currentStatusColor = statusColor(backendStatus);
  const focusTone = activeIntelAlerts > 0 ? copy.watch : backendStatus === 'error' ? copy.recover : copy.clear;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.38 }}
      className="absolute left-1/2 top-[5.9rem] z-[190] hidden w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 pointer-events-none md:block"
    >
      <div className="sovereign-panel px-4 py-3 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(77,255,154,0.30)] to-transparent" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[7px] font-mono tracking-[0.34em] text-[var(--alert-green)]">{copy.title}</div>
            <div className="mt-1 text-[11px] font-semibold tracking-[0.2em] text-[var(--text-primary)]">{copy.subtitle}</div>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[7px] font-mono tracking-[0.22em]" style={{ color: currentStatusColor }}>
            {focusTone} · {currentStatusLabel}
          </div>
        </div>

        <div className="mt-3 h-px bg-gradient-to-r from-transparent via-[rgba(77,255,154,0.24)] to-transparent" />

        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[7px] font-mono tracking-[0.2em] text-[var(--text-muted)]"><Wifi className="h-3 w-3" /> SYS</div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.14em]" style={{ color: currentStatusColor }}>{currentStatusLabel}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[7px] font-mono tracking-[0.2em] text-[var(--text-muted)]"><Database className="h-3 w-3" /> {copy.tracked}</div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-[var(--gold-primary)]">{trackedEntityCount.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[7px] font-mono tracking-[0.2em] text-[var(--text-muted)]"><AlertTriangle className="h-3 w-3" /> {copy.alerts}</div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.14em]" style={{ color: activeIntelAlerts > 0 ? '#F59E0B' : 'var(--alert-green)' }}>{activeIntelAlerts}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[7px] font-mono tracking-[0.2em] text-[var(--text-muted)]"><Activity className="h-3 w-3" /> {copy.posture}</div>
            <div className="mt-1 truncate text-[10px] font-semibold tracking-[0.12em] text-[var(--text-primary)]">{postureLabel}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
