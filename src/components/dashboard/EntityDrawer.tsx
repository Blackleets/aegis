'use client';

import { X } from 'lucide-react';
import type { OntologyEntity, OntologyGraph, OntologyRelationship } from '@/lib/ontology';

export default function EntityDrawer({
  graph,
  onClose,
}: {
  graph: OntologyGraph;
  onClose: () => void;
}) {
  const caseEntity = graph.entities.find((entity) => entity.kind === 'Case');
  const others = graph.entities.filter((entity) => entity.kind !== 'Case');
  const byId = new Map(graph.entities.map((entity) => [entity.id, entity]));

  return (
    <aside
      className="mt-2 rounded-2xl border border-cyan-200/20 bg-black/30 p-2.5"
      aria-label="Ontología del caso"
    >
      <div className="flex items-start justify-between gap-2 px-1">
        <div>
          <p className="text-[8px] font-mono uppercase tracking-[0.2em] text-cyan-200">Ontology · Wave 1</p>
          <p className="mt-1 text-[11px] font-semibold text-white">
            {caseEntity?.label ?? 'Grafo de entidades'}
          </p>
          <p className="mt-1 text-[8px] text-white/45">
            {graph.entities.length} entities · {graph.relationships.length} links · {graph.claims.length} claims
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-white/70"
          aria-label="Cerrar ontología"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
        {others.map((entity) => (
          <EntityRow key={entity.id} entity={entity} />
        ))}
      </div>

      <div className="mt-2 border-t border-white/8 pt-2">
        <p className="px-1 text-[7px] font-mono uppercase tracking-[0.16em] text-white/40">Relationships</p>
        <ul className="mt-1.5 space-y-1">
          {graph.relationships.slice(0, 12).map((rel) => (
            <RelationshipRow key={rel.id} rel={rel} byId={byId} />
          ))}
        </ul>
      </div>
    </aside>
  );
}

function EntityRow({ entity }: { entity: OntologyEntity }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2">
      <div className="flex items-center justify-between gap-2 text-[7px] font-mono uppercase tracking-[0.12em] text-white/45">
        <span>{entity.kind}</span>
        <span>{entity.confidence}</span>
      </div>
      <p className="mt-1 text-[10px] font-semibold text-white/90">{entity.label}</p>
      <p className="mt-1 text-[8px] text-white/45">
        {entity.provenance.source}
        {' · '}
        {new Date(entity.provenance.observedAt).toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  );
}

function RelationshipRow({
  rel,
  byId,
}: {
  rel: OntologyRelationship;
  byId: Map<string, OntologyEntity>;
}) {
  const from = byId.get(rel.fromId)?.label ?? rel.fromId;
  const to = byId.get(rel.toId)?.label ?? rel.toId;
  return (
    <li className="rounded-lg border border-white/7 bg-black/15 px-2 py-1.5 text-[8px] text-white/65">
      <span className="font-semibold text-white/85">{from}</span>
      <span className="mx-1 font-mono uppercase tracking-[0.12em] text-cyan-200/70">{rel.type}</span>
      <span className="font-semibold text-white/85">{to}</span>
    </li>
  );
}
