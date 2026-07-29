'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock3, MapPin, ShieldAlert } from 'lucide-react';
import type { OperationalCase } from '@/lib/operational-cases';

export default function OperationalCaseCard({
  operationalCase,
  onLocate,
  compact = false,
}: {
  operationalCase: OperationalCase;
  onLocate: (latitude: number, longitude: number) => void;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const severityClass = operationalCase.severity === 'critical'
    ? 'border-rose-300/20 bg-rose-300/[0.055] text-rose-100'
    : 'border-amber-200/15 bg-amber-200/[0.045] text-amber-50';

  return (
    <article className={`rounded-xl border px-2.5 py-2 ${severityClass}`} aria-label={`Caso operacional ${operationalCase.title}`}>
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-[7px] font-mono uppercase tracking-[0.16em] opacity-65">
            <span>Operational case · {operationalCase.id}</span>
            <span>{operationalCase.confidence} confidence</span>
          </div>
          <p className="mt-1 truncate text-[10px] font-semibold">{operationalCase.title}</p>
          <p className="mt-1 text-[8px] opacity-55">
            {operationalCase.signals.length} linked signals · {operationalCase.sourceCount} independent sources
          </p>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onLocate(operationalCase.latitude, operationalCase.longitude)}
          className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-black/15 px-2 text-[8px] font-semibold uppercase tracking-[0.1em]"
        >
          <MapPin className="h-3.5 w-3.5" />
          Ver en mapa
        </button>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-black/15 px-2 text-[8px] font-semibold uppercase tracking-[0.1em]"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? 'Cerrar' : 'Evidencias'}
        </button>
      </div>

      {expanded && (
        <ol className={`mt-2 space-y-1.5 border-t border-white/8 pt-2 ${compact ? 'max-h-36 overflow-y-auto' : ''}`}>
          {operationalCase.signals.map((signal) => (
            <li key={signal.id} className="rounded-lg border border-white/7 bg-black/10 px-2 py-1.5">
              <div className="flex items-center justify-between gap-2 text-[7px] font-mono uppercase tracking-[0.1em] opacity-55">
                <span>{signal.source} · {signal.kind}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {new Date(signal.observedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="mt-1 text-[9px] leading-snug opacity-85">{signal.title}</p>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
