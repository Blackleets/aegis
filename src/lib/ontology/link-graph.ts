import type {
  OntologyConfidence,
  OntologyEntityKind,
  OntologyGraph,
  OntologyRelationshipType,
} from './types';

/** Force-graph node derived from an ontology entity (never invented). */
export interface LinkGraphNode {
  id: string;
  label: string;
  kind: OntologyEntityKind;
  confidence: OntologyConfidence;
}

/** Force-graph link derived from an ontology relationship. */
export interface LinkGraphLink {
  id: string;
  source: string;
  target: string;
  type: OntologyRelationshipType;
  confidence: OntologyConfidence;
}

export interface LinkGraphData {
  nodes: LinkGraphNode[];
  links: LinkGraphLink[];
}

const KIND_LABEL_ES: Record<OntologyEntityKind, string> = {
  Person: 'Persona',
  Org: 'Org',
  Asset: 'Activo',
  Location: 'Lugar',
  Event: 'Evento',
  Indicator: 'Indicador',
  Evidence: 'Evidencia',
  Case: 'Caso',
};

const REL_LABEL_ES: Record<OntologyRelationshipType, string> = {
  located_at: 'ubicado en',
  observed_in: 'observado en',
  corroborates: 'corrobora',
  derived_from: 'derivado de',
  related_to: 'relacionado',
  contains: 'contiene',
};

/** AEGIS-ish palette — stable for legend + canvas. */
const KIND_COLOR: Record<OntologyEntityKind, string> = {
  Case: '#22d3ee',
  Location: '#a78bfa',
  Event: '#fb7185',
  Asset: '#34d399',
  Indicator: '#fbbf24',
  Evidence: '#94a3b8',
  Person: '#60a5fa',
  Org: '#c084fc',
};

const REL_COLOR: Record<OntologyRelationshipType, string> = {
  located_at: 'rgba(167,139,250,0.75)',
  observed_in: 'rgba(96,165,250,0.7)',
  corroborates: 'rgba(52,211,153,0.8)',
  derived_from: 'rgba(251,191,36,0.75)',
  related_to: 'rgba(148,163,184,0.65)',
  contains: 'rgba(34,211,238,0.75)',
};

export function ontologyEntityKindLabel(kind: OntologyEntityKind): string {
  return KIND_LABEL_ES[kind] ?? kind;
}

export function ontologyRelationshipTypeLabel(type: OntologyRelationshipType): string {
  return REL_LABEL_ES[type] ?? type;
}

export function ontologyEntityKindColor(kind: OntologyEntityKind): string {
  return KIND_COLOR[kind] ?? '#94a3b8';
}

export function ontologyRelationshipTypeColor(type: OntologyRelationshipType): string {
  return REL_COLOR[type] ?? 'rgba(167,139,250,0.45)';
}

/** Kinds present in a link graph — for legend chips (order stable). */
export function linkGraphLegendKinds(nodes: LinkGraphNode[]): OntologyEntityKind[] {
  const seen = new Set<OntologyEntityKind>();
  const order: OntologyEntityKind[] = [
    'Case',
    'Event',
    'Location',
    'Evidence',
    'Indicator',
    'Asset',
    'Person',
    'Org',
  ];
  for (const node of nodes) seen.add(node.kind);
  return order.filter((kind) => seen.has(kind));
}

/** Relationship types present — for edge legend. */
export function linkGraphLegendRels(links: LinkGraphLink[]): OntologyRelationshipType[] {
  const seen = new Set<OntologyRelationshipType>();
  const order: OntologyRelationshipType[] = [
    'contains',
    'located_at',
    'observed_in',
    'corroborates',
    'derived_from',
    'related_to',
  ];
  for (const link of links) seen.add(link.type);
  return order.filter((type) => seen.has(type));
}

/**
 * Pure transform OntologyGraph → force-graph { nodes, links }.
 * Fail-closed: drops edges whose endpoints are missing; never invents nodes.
 */
export function ontologyGraphToLinkGraph(graph: OntologyGraph): LinkGraphData {
  const entityIds = new Set<string>();
  const nodes: LinkGraphNode[] = [];

  for (const entity of graph.entities) {
    if (!entity.id.trim()) continue;
    if (entityIds.has(entity.id)) continue;
    entityIds.add(entity.id);
    nodes.push({
      id: entity.id,
      label: entity.label,
      kind: entity.kind,
      confidence: entity.confidence,
    });
  }

  const links: LinkGraphLink[] = [];
  for (const rel of graph.relationships) {
    if (!entityIds.has(rel.fromId) || !entityIds.has(rel.toId)) continue;
    links.push({
      id: rel.id,
      source: rel.fromId,
      target: rel.toId,
      type: rel.type,
      confidence: rel.confidence,
    });
  }

  return { nodes, links };
}
