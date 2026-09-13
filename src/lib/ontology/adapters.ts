import type { OperationalCase, OperationalSignal } from '@/lib/operational-cases';
import { requireProvenance } from './provenance';
import type {
  OntologyClaim,
  OntologyConfidence,
  OntologyEntity,
  OntologyGraph,
  OntologyRelationship,
} from './types';

const KIND_BY_SIGNAL: Record<string, OntologyEntity['kind']> = {
  news: 'Event',
  earthquake: 'Event',
  fire: 'Event',
  maritime: 'Asset',
  flight: 'Asset',
  aviation: 'Asset',
  satellite: 'Asset',
  camera: 'Asset',
  cctv: 'Asset',
  infrastructure: 'Asset',
  gdelt: 'Event',
  intel: 'Indicator',
  alert: 'Indicator',
  weather: 'Event',
};

function signalKindToEntityKind(kind: string): OntologyEntity['kind'] {
  const normalized = kind.trim().toLowerCase();
  return KIND_BY_SIGNAL[normalized] ?? 'Evidence';
}

function mapCaseConfidence(confidence: OperationalCase['confidence']): OntologyConfidence {
  return confidence;
}

function mapSignalSeverityToConfidence(severity: OperationalSignal['severity']): OntologyConfidence {
  if (severity === 'critical') return 'high';
  if (severity === 'warning') return 'medium';
  return 'low';
}

function stableEdgeId(parts: string[]) {
  return `rel-${parts.join(':')}`;
}

/**
 * Promote a geo-clustered operational case into an ontology graph:
 * Case entity + Location + one Evidence/Event/Asset per signal + relationships + claims.
 */
export function operationalCaseToOntologyGraph(operationalCase: OperationalCase): OntologyGraph {
  if (!operationalCase.id.trim()) throw new Error('operational case id is required');
  if (!operationalCase.title.trim()) throw new Error('operational case title is required');
  if (!Array.isArray(operationalCase.signals) || operationalCase.signals.length === 0) {
    throw new Error('operational case must include signals');
  }

  const caseObservedAt = operationalCase.updatedAt;
  const caseProvenance = requireProvenance({
    source: `operational-case:${operationalCase.sourceCount}-sources`,
    observedAt: caseObservedAt,
    sourceId: operationalCase.id,
  });

  const caseEntity: OntologyEntity = {
    id: `entity:case:${operationalCase.id}`,
    kind: 'Case',
    label: operationalCase.title,
    provenance: caseProvenance,
    confidence: mapCaseConfidence(operationalCase.confidence),
    latitude: operationalCase.latitude,
    longitude: operationalCase.longitude,
    attributes: {
      severity: operationalCase.severity,
      sourceCount: operationalCase.sourceCount,
      signalCount: operationalCase.signals.length,
    },
  };

  const locationEntity: OntologyEntity = {
    id: `entity:location:${operationalCase.id}`,
    kind: 'Location',
    label: `${operationalCase.latitude.toFixed(4)}, ${operationalCase.longitude.toFixed(4)}`,
    provenance: caseProvenance,
    confidence: mapCaseConfidence(operationalCase.confidence),
    latitude: operationalCase.latitude,
    longitude: operationalCase.longitude,
  };

  const entities: OntologyEntity[] = [caseEntity, locationEntity];
  const relationships: OntologyRelationship[] = [
    {
      id: stableEdgeId([caseEntity.id, 'located_at', locationEntity.id]),
      type: 'located_at',
      fromId: caseEntity.id,
      toId: locationEntity.id,
      provenance: caseProvenance,
      confidence: mapCaseConfidence(operationalCase.confidence),
    },
  ];
  const claims: OntologyClaim[] = [
    {
      id: `claim:case:${operationalCase.id}:summary`,
      text: `${operationalCase.title} (${operationalCase.signals.length} signals, ${operationalCase.sourceCount} independent sources)`,
      provenance: caseProvenance,
      confidence: mapCaseConfidence(operationalCase.confidence),
      aboutIds: [caseEntity.id, locationEntity.id],
    },
  ];

  for (const signal of operationalCase.signals) {
    const signalGraph = operationalSignalToEntities(signal);
    entities.push(...signalGraph.entities);
    relationships.push(...signalGraph.relationships);
    claims.push(...signalGraph.claims);

    const evidence = signalGraph.entities[0];
    if (!evidence) continue;

    relationships.push({
      id: stableEdgeId([caseEntity.id, 'contains', evidence.id]),
      type: 'contains',
      fromId: caseEntity.id,
      toId: evidence.id,
      provenance: evidence.provenance,
      confidence: evidence.confidence,
    });
    relationships.push({
      id: stableEdgeId([evidence.id, 'observed_in', caseEntity.id]),
      type: 'observed_in',
      fromId: evidence.id,
      toId: caseEntity.id,
      provenance: evidence.provenance,
      confidence: evidence.confidence,
    });
    relationships.push({
      id: stableEdgeId([evidence.id, 'located_at', locationEntity.id]),
      type: 'located_at',
      fromId: evidence.id,
      toId: locationEntity.id,
      provenance: evidence.provenance,
      confidence: evidence.confidence,
    });
  }

  // Pairwise corroboration between distinct sources inside the case.
  for (let i = 0; i < operationalCase.signals.length; i += 1) {
    for (let j = i + 1; j < operationalCase.signals.length; j += 1) {
      const left = operationalCase.signals[i];
      const right = operationalCase.signals[j];
      if (left.source.trim().toLowerCase() === right.source.trim().toLowerCase()) continue;
      const leftId = `entity:signal:${left.id}`;
      const rightId = `entity:signal:${right.id}`;
      const observedAt = Math.max(left.observedAt, right.observedAt);
      const provenance = requireProvenance({
        source: `${left.source}+${right.source}`,
        observedAt,
      });
      relationships.push({
        id: stableEdgeId([leftId, 'corroborates', rightId]),
        type: 'corroborates',
        fromId: leftId,
        toId: rightId,
        provenance,
        confidence: operationalCase.confidence,
      });
    }
  }

  return { entities, relationships, claims };
}

/** Map a single operational signal into Evidence/Event/Asset + a claim. */
export function operationalSignalToEntities(signal: OperationalSignal): OntologyGraph {
  const provenance = requireProvenance({
    source: signal.source,
    observedAt: signal.observedAt,
    sourceId: signal.id,
  });
  const kind = signalKindToEntityKind(signal.kind);
  const entity: OntologyEntity = {
    id: `entity:signal:${signal.id}`,
    kind,
    label: signal.title,
    provenance,
    confidence: mapSignalSeverityToConfidence(signal.severity),
    latitude: signal.latitude,
    longitude: signal.longitude,
    attributes: {
      signalKind: signal.kind,
      severity: signal.severity,
    },
  };
  const claim: OntologyClaim = {
    id: `claim:signal:${signal.id}`,
    text: signal.title,
    provenance,
    confidence: entity.confidence,
    aboutIds: [entity.id],
  };
  return { entities: [entity], relationships: [], claims: [claim] };
}

export function listEntityKinds(graph: OntologyGraph): OntologyEntity['kind'][] {
  return [...new Set(graph.entities.map((entity) => entity.kind))].sort();
}
