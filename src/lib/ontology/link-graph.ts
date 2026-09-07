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
