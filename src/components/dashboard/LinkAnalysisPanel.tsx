'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { OntologyEntity, OntologyGraph } from '@/lib/ontology';
import {
  linkGraphLegendKinds,
  linkGraphLegendRels,
  ontologyEntityKindColor,
  ontologyEntityKindLabel,
  ontologyGraphToLinkGraph,
  ontologyRelationshipTypeColor,
  ontologyRelationshipTypeLabel,
  type LinkGraphLink,
  type LinkGraphNode,
} from '@/lib/ontology/link-graph';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center text-[9px] text-white/45">
      Cargando grafo…
    </div>
  ),
});

type GraphNode = LinkGraphNode & {
  x?: number;
  y?: number;
  color?: string;
  __indexColor?: string;
};

type GraphLink = LinkGraphLink & {
  source?: GraphNode | string;
  target?: GraphNode | string;
  color?: string;
};

function confidenceAlpha(confidence: LinkGraphNode['confidence']): number {
  if (confidence === 'high') return 1;
  if (confidence === 'medium') return 0.78;
  return 0.55;
}

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

  const legendKinds = useMemo(() => linkGraphLegendKinds(linkData.nodes), [linkData.nodes]);
  const legendRels = useMemo(() => linkGraphLegendRels(linkData.links), [linkData.links]);

  const graphData = useMemo(
    () => ({
      nodes: linkData.nodes.map((node) => ({
        ...node,
        color: ontologyEntityKindColor(node.kind),
      })),
      links: linkData.links.map((link) => ({
        ...link,
        color: ontologyRelationshipTypeColor(link.type),
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
            {linkData.nodes.length} nodos · {linkData.links.length} aristas
            {' · '}
            sin edges huérfanos
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

      {legendKinds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 px-1" aria-label="Leyenda de tipos">
          {legendKinds.map((kind) => (
            <span
              key={kind}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-[0.08em] text-white/70"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: ontologyEntityKindColor(kind) }}
                aria-hidden
              />
              {ontologyEntityKindLabel(kind)}
            </span>
          ))}
        </div>
      )}

      {legendRels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 px-1" aria-label="Leyenda de relaciones">
          {legendRels.map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 rounded-md border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[7px] text-white/55"
            >
              <span
                className="h-px w-3 rounded-full"
                style={{ backgroundColor: ontologyRelationshipTypeColor(type), height: 2 }}
                aria-hidden
              />
              {ontologyRelationshipTypeLabel(type)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 overflow-hidden rounded-xl border border-white/8 bg-black/40">
        {linkData.nodes.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-[9px] text-white/45">
            Sin entidades para graficar
          </div>
        ) : (
          <ForceGraph2D
            graphData={graphData}
            width={560}
            height={340}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={5}
            nodeLabel={(node: GraphNode) =>
              `${ontologyEntityKindLabel(node.kind)} · ${node.label} (${node.confidence})`
            }
            linkLabel={(link: GraphLink) =>
              link.type ? ontologyRelationshipTypeLabel(link.type) : ''
            }
            nodeColor={(node: GraphNode) => node.color ?? '#94a3b8'}
            linkColor={(link: GraphLink) => link.color ?? 'rgba(167,139,250,0.45)'}
            linkWidth={(link: GraphLink) => (link.confidence === 'high' ? 1.6 : link.confidence === 'medium' ? 1.2 : 0.9)}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={(link, ctx, globalScale) => {
              const typed = link as GraphLink;
              if (!typed.type) return;
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
              const label = ontologyRelationshipTypeLabel(typed.type);
              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;
              const fontSize = Math.max(9 / globalScale, 2.8);
              ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
              const padX = 3 / globalScale;
              const padY = 1.5 / globalScale;
              const metrics = ctx.measureText(label);
              const w = metrics.width + padX * 2;
              const h = fontSize + padY * 2;
              ctx.fillStyle = 'rgba(8,8,12,0.72)';
              ctx.strokeStyle = typed.color ?? 'rgba(167,139,250,0.35)';
              ctx.lineWidth = 0.6 / globalScale;
              ctx.beginPath();
              const r = 2 / globalScale;
              const x = midX - w / 2;
              const y = midY - h / 2;
              ctx.moveTo(x + r, y);
              ctx.arcTo(x + w, y, x + w, y + h, r);
              ctx.arcTo(x + w, y + h, x, y + h, r);
              ctx.arcTo(x, y + h, x, y, r);
              ctx.arcTo(x, y, x + w, y, r);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = 'rgba(237,233,254,0.95)';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, midX, midY);
            }}
            nodeCanvasObjectMode={() => 'replace'}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const n = node as GraphNode;
              if (n.x == null || n.y == null) return;
              const selected = n.id === selectedId;
              const baseR = selected ? 6.5 : 5;
              const alpha = confidenceAlpha(n.confidence);
              const color = n.color ?? '#94a3b8';

              if (selected) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, baseR + 3.2, 0, 2 * Math.PI);
                ctx.strokeStyle = 'rgba(255,255,255,0.55)';
                ctx.lineWidth = 1.4;
                ctx.stroke();
              }

              ctx.beginPath();
              ctx.arc(n.x, n.y, baseR, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.globalAlpha = alpha;
              ctx.fill();
              ctx.globalAlpha = 1;
              ctx.strokeStyle = 'rgba(0,0,0,0.45)';
              ctx.lineWidth = 1;
              ctx.stroke();

              const kindTag = ontologyEntityKindLabel(n.kind);
              const name = (n.label?.trim() || n.id).slice(0, 26);
              const fontSize = Math.max(10 / globalScale, 3.2);
              const tagSize = Math.max(8 / globalScale, 2.6);
              ctx.font = `600 ${tagSize}px ui-sans-serif, system-ui, sans-serif`;
              const tagW = ctx.measureText(kindTag).width;
              ctx.font = `500 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
              const nameW = ctx.measureText(name).width;
              const padX = 4 / globalScale;
              const gap = 3 / globalScale;
              const pillW = Math.max(tagW, nameW) + padX * 2;
              const pillH = tagSize + fontSize + gap + 4 / globalScale;
              const pillX = n.x - pillW / 2;
              const pillY = n.y + baseR + 3 / globalScale;

              ctx.fillStyle = selected ? 'rgba(24,24,32,0.92)' : 'rgba(10,10,14,0.78)';
              ctx.strokeStyle = selected ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)';
              ctx.lineWidth = 0.7 / globalScale;
              const rr = 3 / globalScale;
              ctx.beginPath();
              ctx.moveTo(pillX + rr, pillY);
              ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, rr);
              ctx.arcTo(pillX + pillW, pillY + pillH, pillX, pillY + pillH, rr);
              ctx.arcTo(pillX, pillY + pillH, pillX, pillY, rr);
              ctx.arcTo(pillX, pillY, pillX + pillW, pillY, rr);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();

              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillStyle = color;
              ctx.font = `600 ${tagSize}px ui-sans-serif, system-ui, sans-serif`;
              ctx.fillText(kindTag, n.x, pillY + 2 / globalScale);
              ctx.fillStyle = selected ? '#ffffff' : 'rgba(255,255,255,0.88)';
              ctx.font = `500 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
              ctx.fillText(name, n.x, pillY + tagSize + gap);
            }}
            onNodeClick={handleNodeClick}
            cooldownTicks={90}
            enableNodeDrag
          />
        )}
      </div>

      {selectedEntity && (
        <div className="mt-2 rounded-xl border border-violet-200/15 bg-violet-300/[0.06] px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 text-[7px] font-mono uppercase tracking-[0.12em] text-violet-200/80">
            <span className="inline-flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: ontologyEntityKindColor(selectedEntity.kind) }}
                aria-hidden
              />
              {ontologyEntityKindLabel(selectedEntity.kind)}
            </span>
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
