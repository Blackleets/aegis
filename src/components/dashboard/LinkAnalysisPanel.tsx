'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { OntologyEntity, OntologyGraph } from '@/lib/ontology';
import { ontologyGraphToLinkGraph, type LinkGraphNode } from '@/lib/ontology/link-graph';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center text-[9px] text-white/45">
      Cargando grafo…
    </div>
  ),
});

const KIND_COLOR: Record<string, string> = {
  Case: '#22d3ee',
  Location: '#a78bfa',
  Event: '#fb7185',
  Asset: '#34d399',
  Indicator: '#fbbf24',
  Evidence: '#94a3b8',
  Person: '#60a5fa',
  Org: '#c084fc',
};

type GraphNode = LinkGraphNode & {
  x?: number;
  y?: number;
  color?: string;
};

export default function LinkAnalysisPanel({
  graph,
  onClose,
  onEntitySelect,
}: {
  graph: OntologyGraph;
  onClose: () => void;
  onEntitySelect?: (entityId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const linkData = useMemo(() => ontologyGraphToLinkGraph(graph), [graph]);
  const byId = useMemo(
    () => new Map(graph.entities.map((entity) => [entity.id, entity])),
    [graph.entities],
  );
  const selectedEntity: OntologyEntity | undefined = selectedId
    ? byId.get(selectedId)
    : undefined;

  const graphData = useMemo(
    () => ({
      nodes: linkData.nodes.map((node) => ({
        ...node,
        color: KIND_COLOR[node.kind] ?? '#94a3b8',
      })),
      links: linkData.links.map((link) => ({
        ...link,
        // force-graph mutates source/target to node objects; keep string ids in payload
      })),
    }),
    [linkData],
  );

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (!node?.id) return;
      setSelectedId(node.id);
      onEntitySelect?.(node.id);
    },
    [onEntitySelect],
  );

  return (
    <aside
      className="mt-2 hidden rounded-2xl border border-violet-200/20 bg-black/30 p-2.5 md:block"
      aria-label="Link analysis del caso"
    >
      <div className="flex items-start justify-between gap-2 px-1">
        <div>
          <p className="text-[8px] font-mono uppercase tracking-[0.2em] text-violet-200">
            Link analysis · Wave 2
          </p>
          <p className="mt-1 text-[11px] font-semibold text-white">Grafo de relaciones</p>
          <p className="mt-1 text-[8px] text-white/45">
            {linkData.nodes.length} nodes · {linkData.links.length} edges
            {' · '}
            dangling edges dropped
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-white/70"
          aria-label="Cerrar grafo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 overflow-hidden rounded-xl border border-white/8 bg-black/40">
        {linkData.nodes.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-[9px] text-white/45">
            Sin entidades para graficar
          </div>
        ) : (
          <ForceGraph2D
            graphData={graphData}
            width={560}
            height={320}
            backgroundColor="rgba(0,0,0,0)"
            nodeLabel={(node: GraphNode) => `${node.kind}: ${node.label}`}
            linkLabel={(link: { type?: string }) => link.type ?? ''}
            nodeColor={(node: GraphNode) => node.color ?? '#94a3b8'}
            linkColor={() => 'rgba(167,139,250,0.45)'}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={(link, ctx, globalScale) => {
              const typed = link as {
                type?: string;
                source?: { x?: number; y?: number } | string;
                target?: { x?: number; y?: number } | string;
              };
              const label = typed.type;
              if (!label) return;
              const source = typed.source;
              const target = typed.target;
              if (
                !source ||
                !target ||
                typeof source === 'string' ||
                typeof target === 'string' ||
                source.x == null ||
                source.y == null ||
                target.x == null ||
                target.y == null
              ) {
                return;
              }
              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;
              const fontSize = Math.max(8 / globalScale, 2.5);
              ctx.font = `${fontSize}px sans-serif`;
              ctx.fillStyle = 'rgba(196,181,253,0.85)';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, midX, midY);
            }}
            nodeCanvasObjectMode={() => 'after'}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const n = node as GraphNode;
              if (n.x == null || n.y == null) return;
              const label = n.label?.slice(0, 28) ?? n.id;
              const fontSize = Math.max(10 / globalScale, 3);
              ctx.font = `${fontSize}px sans-serif`;
              ctx.fillStyle = n.id === selectedId ? '#ffffff' : 'rgba(255,255,255,0.75)';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillText(label, n.x, n.y + 6);
            }}
            onNodeClick={handleNodeClick}
            cooldownTicks={80}
            enableNodeDrag
          />
        )}
      </div>

      {selectedEntity && (
        <div className="mt-2 rounded-xl border border-violet-200/15 bg-violet-300/[0.06] px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 text-[7px] font-mono uppercase tracking-[0.12em] text-violet-200/80">
            <span>{selectedEntity.kind}</span>
            <span>{selectedEntity.confidence}</span>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-white/90">{selectedEntity.label}</p>
          <p className="mt-1 text-[8px] text-white/45">
            {selectedEntity.provenance.source}
            {' · '}
            {new Date(selectedEntity.provenance.observedAt).toLocaleString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      )}
    </aside>
  );
}
