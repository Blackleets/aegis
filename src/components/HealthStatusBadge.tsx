'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

import type { HealthPayload, HealthStatus, SubsystemStatus } from '@/lib/health';

type Variant = 'desktop' | 'mobile';

interface HealthStatusBadgeProps {
  variant?: Variant;
}

function statusColor(status: HealthStatus): string {
  if (status === 'ok') return 'var(--alert-green)';
  if (status === 'degraded') return '#FF9500';
  return 'var(--alert-red)';
}

function statusLabel(status: HealthStatus): string {
  if (status === 'ok') return 'OK';
  if (status === 'degraded') return 'DEGRADED';
  return 'DOWN';
}

function pickCriticalSummary(subsystems: SubsystemStatus[]): string {
  const critical = subsystems.filter((subsystem) => subsystem.critical);
  if (critical.length === 0) return 'NO CRITICAL PROBES';

  const degraded = critical.filter((subsystem) => subsystem.status !== 'healthy');
  if (degraded.length === 0) return 'ALL CRITICAL FEEDS HEALTHY';

  return degraded
    .slice(0, 2)
    .map((subsystem) => `${subsystem.label.toUpperCase()} ${subsystem.status.toUpperCase()}`)
    .join(' • ');
}

function highestLatency(subsystems: SubsystemStatus[]): number | null {
  const values = subsystems
    .map((subsystem) => subsystem.latencyMs)
    .filter((latency): latency is number => typeof latency === 'number');

  if (values.length === 0) return null;
  return Math.max(...values);
}

export default function HealthStatusBadge({ variant = 'desktop' }: HealthStatusBadgeProps) {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchHealth = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Health HTTP ${response.status}`);
        const nextPayload = (await response.json()) as HealthPayload;
        if (!cancelled) {
          setPayload(nextPayload);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setPayload(null);
          setLoading(false);
        }
      }
    };

    void fetchHealth();
    const warmRetryId = setTimeout(() => void fetchHealth(), 3000);
    const intervalId = setInterval(() => void fetchHealth(), 15000);

    return () => {
      cancelled = true;
      clearTimeout(warmRetryId);
      clearInterval(intervalId);
    };
  }, []);

  const derivedStatus: HealthStatus = payload?.status ?? (loading ? 'degraded' : 'down');
  const color = statusColor(derivedStatus);

  const Icon = useMemo(() => {
    if (derivedStatus === 'ok') return ShieldCheck;
    if (derivedStatus === 'degraded') return ShieldAlert;
    return ShieldX;
  }, [derivedStatus]);

  const criticalSummary = payload ? pickCriticalSummary(payload.subsystems) : loading ? 'CHECKING HEALTH PROBES' : 'HEALTH PROBE UNAVAILABLE';
  const peakLatency = payload ? highestLatency(payload.subsystems) : null;

  if (variant === 'mobile') {
    return (
      <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--border-primary)]/70 bg-[rgba(15,23,32,0.92)] px-2.5 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full animate-aegis-pulse" style={{ backgroundColor: color }} />
        <span className="text-[7px] font-mono font-bold tracking-[0.18em] text-[var(--text-primary)]">HEALTH {statusLabel(derivedStatus)}</span>
        {payload && (
          <>
            <span className="text-[var(--border-primary)]/70">•</span>
            <span className="text-[7px] font-mono tracking-[0.18em] text-[var(--text-muted)]">CRIT</span>
            <span className="text-[9px] font-bold tabular-nums" style={{ color }}>
              {payload.summary.criticalAvailable}/{payload.summary.criticalTotal}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--border-primary)]/70 bg-[rgba(15,23,32,0.82)] px-2.5 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      <span className="font-semibold text-[var(--text-secondary)]">HEALTH</span>
      <span className="font-bold" style={{ color }}>{statusLabel(derivedStatus)}</span>
      {payload && (
        <>
          <span className="text-[var(--border-primary)]">•</span>
          <span className="text-[var(--text-secondary)]">CRIT</span>
          <span className="font-bold text-[var(--text-primary)]">{payload.summary.criticalAvailable}/{payload.summary.criticalTotal}</span>
          {peakLatency !== null && (
            <>
              <span className="text-[var(--border-primary)]">•</span>
              <Activity className="h-3 w-3 text-[var(--cyan-primary)]" />
              <span className="font-bold text-[var(--cyan-primary)]">{peakLatency}ms</span>
            </>
          )}
          <span className="hidden 2xl:inline text-[var(--border-primary)]">•</span>
          <span className="hidden 2xl:inline max-w-[260px] truncate text-[var(--text-muted)]">{criticalSummary}</span>
        </>
      )}
      {!payload && !loading && <span className="text-[var(--text-muted)]">PROBE OFFLINE</span>}
    </div>
  );
}
