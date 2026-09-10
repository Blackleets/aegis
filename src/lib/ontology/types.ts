/** Shared Palantir-style object model for AEGIS (Wave 1 foundation). */

export type OntologyEntityKind =
  | 'Person'
  | 'Org'
  | 'Asset'
  | 'Location'
  | 'Event'
  | 'Indicator'
  | 'Evidence'
  | 'Case';

export type OntologyConfidence = 'low' | 'medium' | 'high';

export type OntologyRelationshipType =
  | 'located_at'
  | 'observed_in'
  | 'corroborates'
  | 'derived_from'
  | 'related_to'
  | 'contains';

export interface Provenance {
  /** Human-readable source name (never empty for operator-facing claims). */
  source: string;
  /** Unix epoch ms when the upstream observation was made. */
  observedAt: number;
  /** Optional stable upstream identifier. */
  sourceId?: string;
  /** Optional URL or document reference. */
  sourceRef?: string;
}

export interface OntologyEntity {
  id: string;
  kind: OntologyEntityKind;
  label: string;
  provenance: Provenance;
  confidence: OntologyConfidence;
  latitude?: number;
  longitude?: number;
  /** Free-form typed attributes; never invent values here. */
  attributes?: Record<string, string | number | boolean>;
}

export interface OntologyRelationship {
  id: string;
  type: OntologyRelationshipType;
  fromId: string;
  toId: string;
  provenance: Provenance;
  confidence: OntologyConfidence;
}

export interface OntologyClaim {
  id: string;
  text: string;
  provenance: Provenance;
  confidence: OntologyConfidence;
  /** Entity ids this claim asserts about. */
  aboutIds: string[];
}

export interface OntologyGraph {
  entities: OntologyEntity[];
  relationships: OntologyRelationship[];
  claims: OntologyClaim[];
}
