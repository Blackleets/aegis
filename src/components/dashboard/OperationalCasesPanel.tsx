'use client';

import { useMemo, useState } from 'react';
import OperationalCaseCard from '@/components/dashboard/OperationalCaseCard';
import type { OperationalCase } from '@/lib/operational-cases';

type CaseFilter = 'all' | 'critical' | 'high-confidence' | 'nearby';

const FILTERS: Array<{ id: CaseFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'critical', label: 'Críticos' },
  { id: 'high-confidence', label: 'Confianza alta' },
  { id: 'nearby', label: 'Cerca de mí' },
];

export default function OperationalCasesPanel({
  cases,
  currentLocation,
  onLocate,
}: {
  cases: OperationalCase[];
  currentLocation: { lat: number; lng: number } | null;
  onLocate: (latitude: number, longitude: number) => void;
}) {
  const [filter, setFilter] = useState<CaseFilter>('all');
  const visibleCases = useMemo(() => cases.filter((operationalCase) => {
    if (filter === 'critical') return operationalCase.severity === 'critical';
    if (filter === 'high-confidence') return operationalCase.confidence === 'high';
    if (filter === 'nearby') {
      if (!currentLocation) return false;
      return approximateDistanceKm(
        currentLocation.lat,
        currentLocation.lng,
        operationalCase.latitude,
        operationalCase.longitude,
      ) <= 100;
    }
    return true;
  }), [cases, currentLocation, filter]);

  return (
    <section className="mb-3 rounded-2xl border border-white/9 bg-white/[0.025] p-2.5" aria-label="Centro de casos operacionales">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[8px] font-mono uppercase tracking-[0.2em] text-cyan-200">Centro de casos</p>
          <p className="mt-1 text-[11px] font-semibold text-white">{cases.length} situaciones corroboradas</p>
        </div>
        <span className="text-[8px] text-white/40">Solo exploración</span>
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`min-h-9 shrink-0 rounded-full border px-3 text-[8px] font-semibold uppercase tracking-[0.08em] ${
              filter === item.id
                ? 'border-cyan-200/35 bg-cyan-300/15 text-cyan-100'
                : 'border-white/9 bg-black/10 text-white/55'
            }`}
            aria-pressed={filter === item.id}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-2 space-y-2">
        {visibleCases.slice(0, 8).map((operationalCase) => (
          <OperationalCaseCard key={operationalCase.id} operationalCase={operationalCase} onLocate={onLocate} compact />
        ))}
        {visibleCases.length === 0 && (
          <p className="rounded-xl border border-white/7 bg-black/10 px-3 py-4 text-center text-[9px] text-white/45">
            No hay casos que coincidan con este filtro.
          </p>
        )}
      </div>
    </section>
  );
}

function approximateDistanceKm(latA: number, lngA: number, latB: number, lngB: number) {
  const latitudeKm = (latB - latA) * 111.32;
  const longitudeKm = (lngB - lngA) * 111.32 * Math.cos(latA * Math.PI / 180);
  return Math.hypot(latitudeKm, longitudeKm);
}
