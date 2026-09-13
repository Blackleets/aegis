'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bookmark, MapPin, Network, Trash2 } from 'lucide-react';
import EntityDrawer from '@/components/dashboard/EntityDrawer';
import LinkAnalysisPanel from '@/components/dashboard/LinkAnalysisPanel';
import OperationalCaseCard from '@/components/dashboard/OperationalCaseCard';
import type { OperationalCase } from '@/lib/operational-cases';
import {
  deleteInvestigation,
  operationalCaseToOntologyGraph,
  promoteOperationalCaseToInvestigation,
  readInvestigations,
  upsertInvestigation,
  type OntologyGraph,
  type SavedInvestigation,
} from '@/lib/ontology';

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
  const [ontologyGraph, setOntologyGraph] = useState<OntologyGraph | null>(null);
  const [linkAnalysisGraph, setLinkAnalysisGraph] = useState<OntologyGraph | null>(null);
  const [investigations, setInvestigations] = useState<SavedInvestigation[]>([]);
  const [saveHint, setSaveHint] = useState<string | null>(null);

  // Defer hydrate so eslint react-hooks/set-state-in-effect stays happy (saved-destinations pattern).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setInvestigations(readInvestigations());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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

  const refreshInvestigations = () => {
    setInvestigations(readInvestigations());
  };

  const handleSaveInvestigation = (operationalCase: OperationalCase) => {
    const graph = operationalCaseToOntologyGraph(operationalCase);
    const saved = promoteOperationalCaseToInvestigation(operationalCase, graph);
    refreshInvestigations();
    setSaveHint(saved ? 'Investigación guardada en este dispositivo' : 'No se pudo guardar (almacenamiento no disponible)');
    window.setTimeout(() => setSaveHint(null), 2400);
  };

  const handleNotesChange = (investigation: SavedInvestigation, notes: string) => {
    upsertInvestigation(investigation, { notes });
    refreshInvestigations();
  };

  const handleDeleteInvestigation = (id: string) => {
    deleteInvestigation(id);
    refreshInvestigations();
  };

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

      <div className="mt-3 px-1">
        <p className="text-[7px] font-mono uppercase tracking-[0.18em] text-cyan-200/85">cluster en vivo</p>
        <p className="mt-0.5 text-[8px] text-white/40">Clusters efímeros geo+tiempo — no persistentes</p>
      </div>

      <div className="mt-2 space-y-2">
        {visibleCases.slice(0, 8).map((operationalCase) => (
          <OperationalCaseCard
            key={operationalCase.id}
            operationalCase={operationalCase}
            onLocate={onLocate}
            onInspectOntology={(selected) => {
              setLinkAnalysisGraph(null);
              setOntologyGraph(operationalCaseToOntologyGraph(selected));
            }}
            onInspectLinkAnalysis={(selected) => {
              setOntologyGraph(null);
              setLinkAnalysisGraph(operationalCaseToOntologyGraph(selected));
            }}
            onSaveInvestigation={handleSaveInvestigation}
            compact
          />
        ))}
        {visibleCases.length === 0 && (
          <p className="rounded-xl border border-white/7 bg-black/10 px-3 py-4 text-center text-[9px] text-white/45">
            No hay casos que coincidan con este filtro.
          </p>
        )}
      </div>

      {saveHint && (
        <p className="mt-2 rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-2.5 py-1.5 text-center text-[8px] text-emerald-100">
          {saveHint}
        </p>
      )}

      <div className="mt-4 border-t border-white/8 pt-3">
        <div className="flex items-end justify-between gap-2 px-1">
          <div>
            <p className="text-[7px] font-mono uppercase tracking-[0.18em] text-emerald-200/85">
              Investigaciones guardadas
            </p>
            <p className="mt-0.5 text-[8px] text-white/40">
              {investigations.length} investigación{investigations.length === 1 ? '' : 'es'} · solo este dispositivo
            </p>
          </div>
          <Bookmark className="h-3.5 w-3.5 text-emerald-200/70" aria-hidden />
        </div>

        <div className="mt-2 space-y-2">
          {investigations.map((investigation) => (
            <article
              key={investigation.id}
              className="rounded-xl border border-emerald-200/15 bg-emerald-300/[0.04] px-2.5 py-2"
              aria-label={`Investigación guardada ${investigation.title}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[7px] font-mono uppercase tracking-[0.14em] text-emerald-200/80">
                    investigación guardada
                  </p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-white">{investigation.title}</p>
                  <p className="mt-1 text-[8px] text-white/45">
                    {investigation.pinnedEntityIds.length} pinned · {investigation.watchlistEntityIds.length} watchlist
                    {investigation.mapPin
                      ? ` · ${investigation.mapPin.latitude.toFixed(2)}, ${investigation.mapPin.longitude.toFixed(2)}`
                      : ''}
                  </p>
                </div>
              </div>

              <label className="mt-2 block">
                <span className="sr-only">Notas del operador</span>
                <textarea
                  value={investigation.notes}
                  onChange={(event) => handleNotesChange(investigation, event.target.value)}
                  placeholder="Notas del operador…"
                  rows={2}
                  className="w-full resize-y rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[9px] text-white/85 placeholder:text-white/30"
                />
              </label>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLinkAnalysisGraph(null);
                    setOntologyGraph(investigation.graph);
                  }}
                  className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-cyan-200/20 bg-cyan-300/10 px-2 text-[8px] font-semibold uppercase tracking-[0.1em] text-cyan-100"
                >
                  <Network className="h-3.5 w-3.5" />
                  Ontología
                </button>
                {investigation.mapPin && (
                  <button
                    type="button"
                    onClick={() => onLocate(investigation.mapPin!.latitude, investigation.mapPin!.longitude)}
                    className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-black/15 px-2 text-[8px] font-semibold uppercase tracking-[0.1em] text-white/80"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Mapa
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteInvestigation(investigation.id)}
                  className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200/20 bg-rose-300/10 px-2.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-rose-100"
                  aria-label={`Eliminar investigación ${investigation.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
          {investigations.length === 0 && (
            <p className="rounded-xl border border-white/7 bg-black/10 px-3 py-3 text-center text-[9px] text-white/45">
              Aún no hay investigaciones guardadas. Usa <span className="font-semibold text-white/70">Guardar</span> en un cluster en vivo.
            </p>
          )}
        </div>
      </div>

      {ontologyGraph && (
        <EntityDrawer graph={ontologyGraph} onClose={() => setOntologyGraph(null)} />
      )}
      {linkAnalysisGraph && (
        <LinkAnalysisPanel
          graph={linkAnalysisGraph}
          onClose={() => setLinkAnalysisGraph(null)}
          onEntitySelect={() => {
            setOntologyGraph(linkAnalysisGraph);
          }}
        />
      )}
    </section>
  );
}

function approximateDistanceKm(latA: number, lngA: number, latB: number, lngB: number) {
  const latitudeKm = (latB - latA) * 111.32;
  const longitudeKm = (lngB - lngA) * 111.32 * Math.cos(latA * Math.PI / 180);
  return Math.hypot(latitudeKm, longitudeKm);
}
