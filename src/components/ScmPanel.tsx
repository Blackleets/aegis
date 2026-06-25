'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Route, ChevronDown, ChevronUp, AlertTriangle, Anchor, BriefcaseBusiness } from 'lucide-react';

interface SupplierItem {
  name: string;
  city: string;
  risk_level: string;
  active_threats?: string;
}

interface MaritimePortItem {
  name: string;
  congestion: string;
  dwell_time?: string;
  volume?: string;
}

interface ChokepointItem {
  name: string;
  risk: string;
  traffic?: string;
}

interface ScmPanelData {
  scm_suppliers?: SupplierItem[];
  maritime_ports?: MaritimePortItem[];
  maritime_chokepoints?: ChokepointItem[];
  markets?: { scm_alerts?: string[] };
}

interface ScmPanelProps {
  data: ScmPanelData;
}

function parseThreats(activeThreats?: string) {
  if (!activeThreats) return [] as string[];
  try {
    const parsed = JSON.parse(activeThreats);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ScmPanel({ data }: ScmPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const suppliers = data.scm_suppliers || [];
  const ports = data.maritime_ports || [];
  const chokepoints = data.maritime_chokepoints || [];
  const marketAlerts = data.markets?.scm_alerts || [];

  const criticalSuppliers = suppliers.filter((item) => item.risk_level === 'CRITICAL' || item.risk_level === 'HIGH');
  const congestedPorts = ports.filter((item) => item.congestion === 'SEVERE' || item.congestion === 'CONGESTED');
  const riskyChokes = chokepoints.filter((item) => item.risk === 'CRITICAL' || item.risk === 'HIGH');

  const totalRisks = criticalSuppliers.length + congestedPorts.length + riskyChokes.length + marketAlerts.length;

  const topThreats = useMemo(() => {
    return criticalSuppliers.slice(0, 3).map((supplier) => ({
      supplier,
      threats: parseThreats(supplier.active_threats),
    }));
  }, [criticalSuppliers]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7, duration: 0.6 }}
      className="glass-panel pointer-events-auto mt-3 overflow-hidden border border-[var(--border-primary)]/70 bg-[linear-gradient(180deg,rgba(14,24,34,0.96),rgba(18,29,42,0.9))] p-3.5"
    >
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[var(--border-primary)]/60 bg-white/[0.04]">
            <Route className="h-4 w-4 text-[var(--cyan-primary)]" />
          </div>
          <div className="text-left">
            <div className="text-[8px] font-mono uppercase tracking-[0.3em] text-[var(--text-muted)]">Flow oversight</div>
            <div className="mt-1 text-[13px] font-semibold tracking-[0.08em] text-[var(--text-primary)]">Flow Sentinel</div>
          </div>
          {totalRisks > 0 && (
            <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-rose-300">
              {totalRisks} flags
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mt-3 grid grid-cols-4 gap-2">
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Suppliers</div>
                <div className="mt-1 text-[16px] font-semibold text-rose-300">{criticalSuppliers.length}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Ports</div>
                <div className="mt-1 text-[16px] font-semibold text-amber-300">{congestedPorts.length}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Chokepoints</div>
                <div className="mt-1 text-[16px] font-semibold text-sky-300">{riskyChokes.length}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                <div className="text-[8px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">Market impact</div>
                <div className="mt-1 text-[16px] font-semibold text-[var(--text-primary)]">{marketAlerts.length}</div>
              </div>
            </div>

            <div className="mt-3 max-h-[320px] xl:max-h-[360px] space-y-3 overflow-y-auto styled-scrollbar pr-1 pb-4">
              {marketAlerts.length > 0 && (
                <section className="rounded-2xl border border-amber-400/18 bg-amber-400/8 p-3">
                  <div className="mb-2 flex items-center gap-2 text-amber-200">
                    <BriefcaseBusiness className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-mono uppercase tracking-[0.24em]">Market carry-through</span>
                  </div>
                  <div className="space-y-2">
                    {marketAlerts.slice(0, 3).map((alert, index) => (
                      <div key={`${alert}-${index}`} className="rounded-2xl border border-amber-400/18 bg-black/10 px-3 py-2 text-[10px] leading-relaxed text-amber-100">
                        {alert}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-white/6 bg-white/[0.025] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-300" />
                  <span className="text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--text-secondary)]">Supplier watchlist</span>
                </div>
                {topThreats.length === 0 ? (
                  <div className="text-[10px] text-emerald-300">All monitored supplier nodes are currently stable.</div>
                ) : (
                  <div className="space-y-2">
                    {topThreats.map(({ supplier, threats }, index) => (
                      <div key={`${supplier.name}-${index}`} className="rounded-2xl border border-rose-500/16 bg-rose-500/8 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-semibold text-[var(--text-primary)]">{supplier.name}</div>
                            <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">{supplier.city}</div>
                          </div>
                          <span className="rounded-full border border-rose-500/20 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-rose-300">
                            {supplier.risk_level}
                          </span>
                        </div>
                        <div className="mt-2 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                          {threats.length > 0 ? threats.join(' • ') : 'Escalated risk with no structured threat tags returned.'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-white/6 bg-white/[0.025] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Anchor className="h-3.5 w-3.5 text-amber-300" />
                  <span className="text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--text-secondary)]">Transit pressure</span>
                </div>

                {congestedPorts.length === 0 && riskyChokes.length === 0 ? (
                  <div className="text-[10px] text-emerald-300">No severe bottlenecks detected across monitored lanes.</div>
                ) : (
                  <div className="space-y-2">
                    {riskyChokes.map((chokepoint, index) => (
                      <div key={`choke-${index}`} className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[var(--text-primary)]">{chokepoint.name}</span>
                          <span className={`rounded-full px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] ${chokepoint.risk === 'CRITICAL' ? 'bg-rose-500/12 text-rose-300' : 'bg-amber-500/12 text-amber-300'}`}>
                            {chokepoint.risk}
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] text-[var(--text-secondary)]">{chokepoint.traffic || 'Traffic pressure building.'}</div>
                      </div>
                    ))}

                    {congestedPorts.map((port, index) => (
                      <div key={`port-${index}`} className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[var(--text-primary)]">{port.name}</span>
                          <span className={`rounded-full px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] ${port.congestion === 'SEVERE' ? 'bg-rose-500/12 text-rose-300' : 'bg-amber-500/12 text-amber-300'}`}>
                            {port.congestion}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-[9px] text-[var(--text-secondary)]">
                          <span>Dwell {port.dwell_time || '--'}</span>
                          <span>{port.volume?.split(' | ')[1] || port.volume || 'Volume n/a'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
