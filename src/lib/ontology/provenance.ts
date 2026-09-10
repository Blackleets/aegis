import type { OntologyConfidence, OntologyClaim, Provenance } from './types';

export class ProvenanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProvenanceError';
  }
}

/** Fail-closed: operator-facing provenance must name a source and a finite observedAt. */
export function requireProvenance(input: Partial<Provenance> | null | undefined): Provenance {
  if (!input) throw new ProvenanceError('provenance is required');
  const source = typeof input.source === 'string' ? input.source.trim() : '';
  if (!source) throw new ProvenanceError('provenance.source is required');
  if (typeof input.observedAt !== 'number' || !Number.isFinite(input.observedAt)) {
    throw new ProvenanceError('provenance.observedAt must be a finite timestamp');
  }
  const provenance: Provenance = { source, observedAt: input.observedAt };
  if (typeof input.sourceId === 'string' && input.sourceId.trim()) {
    provenance.sourceId = input.sourceId.trim();
  }
  if (typeof input.sourceRef === 'string' && input.sourceRef.trim()) {
    provenance.sourceRef = input.sourceRef.trim();
  }
  return provenance;
}

/** Hide claims that cannot meet the data-truth bar instead of fabricating sources. */
export function filterClaimsWithProvenance(claims: Array<Partial<OntologyClaim> & Pick<OntologyClaim, 'id' | 'text' | 'aboutIds' | 'confidence'>>): OntologyClaim[] {
  const accepted: OntologyClaim[] = [];
  for (const claim of claims) {
    try {
      const provenance = requireProvenance(claim.provenance);
      const text = typeof claim.text === 'string' ? claim.text.trim() : '';
      if (!text) continue;
      accepted.push({
        id: claim.id,
        text,
        provenance,
        confidence: claim.confidence,
        aboutIds: [...claim.aboutIds],
      });
    } catch {
      // fail-closed: drop claim
    }
  }
  return accepted;
}

export function rankConfidence(left: OntologyConfidence, right: OntologyConfidence): number {
  const rank: Record<OntologyConfidence, number> = { low: 1, medium: 2, high: 3 };
  return rank[left] - rank[right];
}
