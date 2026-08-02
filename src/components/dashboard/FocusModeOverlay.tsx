'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Database, Wifi } from 'lucide-react';
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
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.12, duration: 0.24 }}
      className="absolute bottom-[5.4rem] left-3 z-[190] hidden w-[min(19rem,calc(100vw-1.5rem))] pointer-events-none md:block"
    >
      <div className="rounded-xl border border-white/10 bg-[rgba(7,13,19,0.86)] px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-[var(--text-primary)]">{copy.title}</div>
            <div className="mt-0.5 truncate text-[9px] text-[var(--text-muted)]">{postureLabel}</div>
          </div>
          <div className="shrink-0 text-[9px] font-medium" style={{ color: currentStatusColor }}>
            {focusTone} · {currentStatusLabel}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[9px] text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/8 bg-white/[0.03] px-2 py-1">
            <Wifi className="h-3 w-3" />
            {currentStatusLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/8 bg-white/[0.03] px-2 py-1">
            <Database className="h-3 w-3" />
            {trackedEntityCount.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/8 bg-white/[0.03] px-2 py-1" style={{ color: activeIntelAlerts > 0 ? '#F59E0B' : 'var(--alert-green)' }}>
            <AlertTriangle className="h-3 w-3" />
            {activeIntelAlerts}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
