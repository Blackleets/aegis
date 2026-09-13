import { filterClaimsWithProvenance, requireProvenance } from './provenance';
import type { OntologyClaim, OntologyConfidence, Provenance } from './types';

/** Operator-facing label when a fusion/dossier item cannot meet the provenance bar. */
export const UNAVAILABLE_PROVENANCE_LABEL = 'sin procedencia';

export type FusionClaimKind = 'bluf' | 'hotspot' | 'action' | 'watchlist' | 'evidence' | 'dossier';

export interface LooseFusionItem {
  id?: string;
  kind?: FusionClaimKind;
  text?: string;
  source?: string;
  observedAt?: number | string;
  sourceId?: string;
  sourceRef?: string;
  confidence?: OntologyConfidence | 'HIGH' | 'MODERATE' | 'LOW' | string;
  aboutIds?: string[];
  provenance?: Partial<Provenance> | null;
}

export interface FusionDisplayItem {
  id: string;
  kind: FusionClaimKind;
  text: string;
  available: boolean;
  claim?: OntologyClaim;
  unavailableLabel?: typeof UNAVAILABLE_PROVENANCE_LABEL;
}

export interface FusionContextFeed {
  earthquakes?: Array<{
    id?: string;
    location?: string;
    timestamp?: string;
    source?: string;
  }>;
  news?: Array<{
    id?: string;
    title?: string;
    source?: string;
    published?: string;
    link?: string;
  }>;
  threats?: Array<{
    id?: string;
    title?: string;
    region?: string;
    timestamp?: string;
    source?: string;
  }>;
  cyberAlerts?: Array<{
    id?: string;
    name?: string;
    date?: string;
    source?: string;
  }>;
}

export interface RawFusionDossier {
  bluf?: string | LooseFusionItem;
  riskLevel?: string;
  confidence?: string;
  hotspots?: Array<string | LooseFusionItem>;
  priorityActions?: Array<string | LooseFusionItem>;
  watchlist?: Array<string | LooseFusionItem>;
}

export interface UnavailableFusionItem {
  kind: FusionClaimKind;
  text: string;
  reason: typeof UNAVAILABLE_PROVENANCE_LABEL;
}

export interface HardenedFusionDossier {
  bluf: string;
  blufAvailable: boolean;
  riskLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW';
  confidence: 'HIGH' | 'MODERATE' | 'LOW';
  hotspots: string[];
  priorityActions: string[];
  watchlist: string[];
  claims: OntologyClaim[];
  unavailable: UnavailableFusionItem[];
}

export type RegionDossierSection =
  | 'location'
  | 'country'
  | 'wikipedia'
  | 'head_of_state'
  | 'weather'
  | 'cameras';

export interface RegionDossierLike {
  timestamp?: string;
  claims?: Array<Partial<OntologyClaim> & Pick<OntologyClaim, 'id' | 'text'>>;
  location?: { display_name?: string };
  country?: { name?: string; capital?: string };
  wikipedia?: { extract?: string; title?: string };
  head_of_state?: { name?: string; position?: string };
  live_context?: {
    weather?: { summary?: string; temperature_c?: number };
    nearby_cameras?: {
      count?: number;
      closest?: { name?: string; source?: string; distance_km?: number };
    };
  };
  sources?: Partial<Record<RegionDossierSection, Partial<Provenance>>>;
}

const DEFAULT_REGION_SOURCES: Record<RegionDossierSection, string> = {
  location: 'Nominatim',
  country: 'REST Countries',
  wikipedia: 'Wikipedia',
  head_of_state: 'Wikidata',
  weather: 'Open-Meteo',
  cameras: '',
};

export function coerceObservedAt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function mapFusionConfidence(value: unknown): OntologyConfidence {
  if (value === 'high' || value === 'HIGH') return 'high';
  if (value === 'medium' || value === 'MODERATE' || value === 'moderate') return 'medium';
  return 'low';
}

function normalizeKind(value: unknown, fallback: FusionClaimKind): FusionClaimKind {
  if (
    value === 'bluf'
    || value === 'hotspot'
    || value === 'action'
    || value === 'watchlist'
    || value === 'evidence'
    || value === 'dossier'
  ) {
    return value;
  }
  return fallback;
}

function itemText(item: LooseFusionItem): string {
  return typeof item.text === 'string' ? item.text.trim() : '';
}

function provenanceFromItem(item: LooseFusionItem): Partial<Provenance> | undefined {
  if (item.provenance) return item.provenance;
  const source = typeof item.source === 'string' ? item.source.trim() : '';
  const observedAt = coerceObservedAt(item.observedAt);
  if (!source && observedAt === undefined && !item.sourceId && !item.sourceRef) return undefined;
  const provenance: Partial<Provenance> = {};
  if (source) provenance.source = source;
  if (observedAt !== undefined) provenance.observedAt = observedAt;
  if (typeof item.sourceId === 'string' && item.sourceId.trim()) provenance.sourceId = item.sourceId.trim();
  if (typeof item.sourceRef === 'string' && item.sourceRef.trim()) provenance.sourceRef = item.sourceRef.trim();
  return provenance;
}

function hasValidProvenance(item: LooseFusionItem): boolean {
  try {
    requireProvenance(provenanceFromItem(item));
    return true;
  } catch {
    return false;
  }
}

export function normalizeFusionItems(
  value: unknown,
  kind: FusionClaimKind,
): LooseFusionItem[] {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  const items: LooseFusionItem[] = [];
  for (const entry of list) {
    if (typeof entry === 'string') {
      const text = entry.trim();
      if (text) items.push({ kind, text });
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as LooseFusionItem;
    const text = itemText(rec);
    if (!text) continue;
    items.push({
      id: typeof rec.id === 'string' ? rec.id : undefined,
      kind: normalizeKind(rec.kind, kind),
      text,
      source: rec.source,
      observedAt: rec.observedAt,
      sourceId: rec.sourceId,
      sourceRef: rec.sourceRef,
      confidence: rec.confidence,
      aboutIds: rec.aboutIds,
      provenance: rec.provenance,
    });
  }
  return items;
}

function includesInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

/**
 * Attach a unique context source when the generated text cites that observation.
 * Never invent a source; ambiguous matches stay unproven.
 */
export function resolveItemProvenance(
  item: LooseFusionItem,
  contextSources: LooseFusionItem[] = [],
): LooseFusionItem {
  if (hasValidProvenance(item)) return item;
  const text = itemText(item);
  if (!text || contextSources.length === 0) return item;

  const matches = contextSources.filter((sourceItem) => {
    if (!hasValidProvenance(sourceItem)) return false;
    const sourceText = itemText(sourceItem);
    const sourceName = typeof sourceItem.source === 'string' ? sourceItem.source.trim() : '';
    const textHit = sourceText.length >= 3 && includesInsensitive(text, sourceText);
    const sourceHit = sourceName.length >= 2 && includesInsensitive(text, sourceName);
    return textHit || sourceHit;
  });

  const uniqueKeys = new Set(
    matches.map((match) => {
      const provenance = provenanceFromItem(match);
      return `${provenance?.source ?? ''}|${provenance?.observedAt ?? ''}`;
    }),
  );
  if (uniqueKeys.size !== 1) return item;
  const match = matches[0];
  const provenance = provenanceFromItem(match);
  return {
    ...item,
    source: provenance?.source,
    observedAt: provenance?.observedAt,
    sourceId: provenance?.sourceId ?? match.sourceId,
    sourceRef: provenance?.sourceRef ?? match.sourceRef,
    provenance,
  };
}

export function collectContextSources(context: FusionContextFeed | null | undefined): LooseFusionItem[] {
  if (!context) return [];
  const items: LooseFusionItem[] = [];

  for (const event of context.earthquakes ?? []) {
    items.push({
      kind: 'evidence',
      id: event.id,
      text: typeof event.location === 'string' ? event.location : '',
      source: event.source,
      observedAt: event.timestamp,
      sourceId: event.id,
    });
  }
  for (const item of context.news ?? []) {
    items.push({
      kind: 'evidence',
      id: item.id,
      text: typeof item.title === 'string' ? item.title : '',
      source: item.source,
      observedAt: item.published,
      sourceId: item.id,
      sourceRef: item.link,
    });
  }
  for (const threat of context.threats ?? []) {
    items.push({
      kind: 'evidence',
      id: threat.id,
      text: typeof threat.region === 'string' && threat.region.trim()
        ? threat.region
        : typeof threat.title === 'string' ? threat.title : '',
      source: threat.source,
      observedAt: threat.timestamp,
      sourceId: threat.id,
    });
  }
  for (const alert of context.cyberAlerts ?? []) {
    items.push({
      kind: 'evidence',
      id: alert.id,
      text: typeof alert.name === 'string' ? alert.name : '',
      source: alert.source,
      observedAt: alert.date,
      sourceId: alert.id,
    });
  }

  return items.filter((item) => itemText(item) && hasValidProvenance(item));
}

function toPartialClaim(
  item: LooseFusionItem,
  index: number,
  kind: FusionClaimKind,
): Partial<OntologyClaim> & Pick<OntologyClaim, 'id' | 'text' | 'aboutIds' | 'confidence'> {
  const text = itemText(item);
  const id = typeof item.id === 'string' && item.id.trim()
    ? item.id.trim()
    : `claim:fusion:${kind}:${index}`;
  return {
    id,
    text,
    aboutIds: Array.isArray(item.aboutIds) ? [...item.aboutIds] : [],
    confidence: mapFusionConfidence(item.confidence),
    provenance: provenanceFromItem(item),
  };
}

/** Map fusion/dossier loose items → OntologyClaim[] with Wave 1 fail-closed filter. */
export function fusionItemsToClaims(
  items: Array<string | LooseFusionItem>,
  options: { kind?: FusionClaimKind; contextSources?: LooseFusionItem[] } = {},
): OntologyClaim[] {
  const kind = options.kind ?? 'dossier';
  const normalized = normalizeFusionItems(items, kind).map((item) => (
    resolveItemProvenance(item, options.contextSources)
  ));
  return filterClaimsWithProvenance(
    normalized.map((item, index) => toPartialClaim(item, index, item.kind ?? kind)),
  );
}

/** Strip operator actions that cannot cite source + observedAt. Never invent sources. */
export function filterActionsWithProvenance(
  actions: Array<string | LooseFusionItem>,
  contextSources: LooseFusionItem[] = [],
): OntologyClaim[] {
  return fusionItemsToClaims(actions, { kind: 'action', contextSources });
}

export function hideUnprovenFusionItems(
  items: Array<string | LooseFusionItem>,
  options: { kind?: FusionClaimKind; contextSources?: LooseFusionItem[] } = {},
): FusionDisplayItem[] {
  return toFusionDisplayItems(items, { ...options, hideUnavailable: true });
}

export function toFusionDisplayItems(
  items: Array<string | LooseFusionItem>,
  options: {
    kind?: FusionClaimKind;
    contextSources?: LooseFusionItem[];
    hideUnavailable?: boolean;
  } = {},
): FusionDisplayItem[] {
  const kind = options.kind ?? 'dossier';
  const display: FusionDisplayItem[] = [];
  const normalized = normalizeFusionItems(items, kind);

  for (const [index, raw] of normalized.entries()) {
    const item = resolveItemProvenance(raw, options.contextSources);
    const text = itemText(item);
    if (!text) continue;
    const resolvedKind = item.kind ?? kind;
    const id = typeof item.id === 'string' && item.id.trim()
      ? item.id.trim()
      : `fusion:${resolvedKind}:${index}`;
    const [claim] = fusionItemsToClaims([item], { kind: resolvedKind });
    if (claim) {
      display.push({
        id,
        kind: resolvedKind,
        text: claim.text,
        available: true,
        claim,
      });
      continue;
    }
    if (options.hideUnavailable) continue;
    display.push({
      id,
      kind: resolvedKind,
      text,
      available: false,
      unavailableLabel: UNAVAILABLE_PROVENANCE_LABEL,
    });
  }

  return display;
}

function keepRiskLevel(value: unknown): HardenedFusionDossier['riskLevel'] {
  if (value === 'CRITICAL' || value === 'HIGH' || value === 'ELEVATED' || value === 'LOW') return value;
  return 'ELEVATED';
}

function keepFusionConfidence(value: unknown): HardenedFusionDossier['confidence'] {
  if (value === 'HIGH' || value === 'MODERATE' || value === 'LOW') return value;
  return 'MODERATE';
}

/**
 * Fail-closed shaping for /api/ai/fusion:
 * list items without source+observedAt are omitted; BLUF is marked unavailable.
 */
export function hardenFusionDossier(
  raw: RawFusionDossier | null | undefined,
  options: { contextSources?: LooseFusionItem[] } = {},
): HardenedFusionDossier {
  const contextSources = options.contextSources ?? [];
  const unavailable: UnavailableFusionItem[] = [];

  const blufItems = toFusionDisplayItems(raw?.bluf == null ? [] : [raw.bluf], {
    kind: 'bluf',
    contextSources,
    hideUnavailable: false,
  });
  const blufItem = blufItems[0];
  const blufAvailable = Boolean(blufItem?.available && blufItem.claim);
  if (blufItem && !blufAvailable) {
    unavailable.push({ kind: 'bluf', text: blufItem.text, reason: UNAVAILABLE_PROVENANCE_LABEL });
  }

  const listKinds: Array<{ field: 'hotspots' | 'priorityActions' | 'watchlist'; kind: FusionClaimKind }> = [
    { field: 'hotspots', kind: 'hotspot' },
    { field: 'priorityActions', kind: 'action' },
    { field: 'watchlist', kind: 'watchlist' },
  ];

  const lists: Record<'hotspots' | 'priorityActions' | 'watchlist', string[]> = {
    hotspots: [],
    priorityActions: [],
    watchlist: [],
  };
  const claims: OntologyClaim[] = [];
  if (blufItem?.claim) claims.push(blufItem.claim);

  for (const { field, kind } of listKinds) {
    const shown = toFusionDisplayItems(raw?.[field] ?? [], {
      kind,
      contextSources,
      hideUnavailable: false,
    });
    for (const item of shown) {
      if (item.available && item.claim) {
        lists[field].push(item.claim.text);
        claims.push(item.claim);
      } else {
        unavailable.push({ kind, text: item.text, reason: UNAVAILABLE_PROVENANCE_LABEL });
      }
    }
  }

  return {
    bluf: blufAvailable && blufItem ? blufItem.text : `BLUF no disponible (${UNAVAILABLE_PROVENANCE_LABEL}).`,
    blufAvailable,
    riskLevel: keepRiskLevel(raw?.riskLevel),
    confidence: keepFusionConfidence(raw?.confidence),
    hotspots: lists.hotspots,
    priorityActions: lists.priorityActions,
    watchlist: lists.watchlist,
    claims,
    unavailable,
  };
}

function regionObservedAt(dossier: RegionDossierLike): number | undefined {
  const fromSources = Object.values(dossier.sources ?? {})
    .map((entry) => coerceObservedAt(entry?.observedAt))
    .find((value) => value !== undefined);
  return fromSources ?? coerceObservedAt(dossier.timestamp);
}

function regionSource(
  dossier: RegionDossierLike,
  section: RegionDossierSection,
  fallback = '',
): string {
  const explicit = dossier.sources?.[section]?.source;
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
  return fallback || DEFAULT_REGION_SOURCES[section];
}

/** Map a region dossier into Wave 1 claims. Missing source+observedAt sections are dropped. */
export function regionDossierToClaims(dossier: RegionDossierLike | null | undefined): OntologyClaim[] {
  if (!dossier) return [];
  if (Array.isArray(dossier.claims) && dossier.claims.length > 0) {
    return filterClaimsWithProvenance(
      dossier.claims.map((claim) => ({
        id: claim.id,
        text: claim.text,
        aboutIds: Array.isArray(claim.aboutIds) ? [...claim.aboutIds] : [],
        confidence: mapFusionConfidence(claim.confidence),
        provenance: claim.provenance,
      })),
    );
  }

  const observedAt = regionObservedAt(dossier);
  const drafts: LooseFusionItem[] = [];

  if (dossier.location?.display_name?.trim()) {
    drafts.push({
      id: 'claim:region:location',
      kind: 'dossier',
      text: dossier.location.display_name.trim(),
      source: regionSource(dossier, 'location'),
      observedAt,
      aboutIds: ['entity:region:location'],
    });
  }
  if (dossier.country?.name?.trim()) {
    const capital = dossier.country.capital?.trim();
    drafts.push({
      id: 'claim:region:country',
      kind: 'dossier',
      text: capital ? `${dossier.country.name.trim()} · ${capital}` : dossier.country.name.trim(),
      source: regionSource(dossier, 'country'),
      observedAt,
      aboutIds: ['entity:region:country'],
    });
  }
  if (dossier.head_of_state?.name?.trim()) {
    const position = dossier.head_of_state.position?.trim();
    drafts.push({
      id: 'claim:region:head_of_state',
      kind: 'dossier',
      text: position
        ? `${dossier.head_of_state.name.trim()} (${position})`
        : dossier.head_of_state.name.trim(),
      source: regionSource(dossier, 'head_of_state'),
      observedAt,
      aboutIds: ['entity:region:head_of_state'],
    });
  }
  if (dossier.wikipedia?.extract?.trim()) {
    drafts.push({
      id: 'claim:region:wikipedia',
      kind: 'dossier',
      text: dossier.wikipedia.extract.trim(),
      source: regionSource(dossier, 'wikipedia'),
      observedAt,
      aboutIds: ['entity:region:wikipedia'],
    });
  }
  if (
    dossier.live_context?.weather
    && (dossier.live_context.weather.summary?.trim()
      || typeof dossier.live_context.weather.temperature_c === 'number')
  ) {
    const summary = dossier.live_context.weather.summary?.trim();
    const temp = typeof dossier.live_context.weather.temperature_c === 'number'
      ? `${Math.round(dossier.live_context.weather.temperature_c)}°C`
      : '';
    drafts.push({
      id: 'claim:region:weather',
      kind: 'dossier',
      text: [summary, temp].filter(Boolean).join(' · '),
      source: regionSource(dossier, 'weather'),
      observedAt,
      aboutIds: ['entity:region:weather'],
    });
  }
  const closest = dossier.live_context?.nearby_cameras?.closest;
  const cameraSource = closest?.source?.trim() || regionSource(dossier, 'cameras');
  if (closest?.name?.trim() && cameraSource) {
    const distance = typeof closest.distance_km === 'number' && Number.isFinite(closest.distance_km)
      ? ` · ${closest.distance_km} km`
      : '';
    drafts.push({
      id: 'claim:region:cameras',
      kind: 'dossier',
      text: `${closest.name.trim()}${distance}`,
      source: cameraSource,
      observedAt,
      aboutIds: ['entity:region:cameras'],
    });
  }

  return fusionItemsToClaims(drafts, { kind: 'dossier' });
}

export function regionDossierHasProvenance(
  dossier: RegionDossierLike | null | undefined,
  section: RegionDossierSection,
): boolean {
  return regionDossierToClaims(dossier).some((claim) => claim.id === `claim:region:${section}`);
}

export function provenanceChipLabel(
  provenance: Provenance | null | undefined,
  available = Boolean(provenance),
): string {
  if (!available || !provenance) return UNAVAILABLE_PROVENANCE_LABEL;
  try {
    const checked = requireProvenance(provenance);
    const when = new Date(checked.observedAt).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${checked.source} · ${when}`;
  } catch {
    return UNAVAILABLE_PROVENANCE_LABEL;
  }
}

/** Map operational-fusion evidence + optional case signals into display chips. */
export function operationalFusionToDisplayItems(
  evidenceTexts: string[],
  signals: Array<{ id?: string; title: string; source: string; observedAt: number }> = [],
): FusionDisplayItem[] {
  const fromSignals = toFusionDisplayItems(
    signals.map((signal) => ({
      id: signal.id ? `claim:signal:${signal.id}` : undefined,
      kind: 'evidence' as const,
      text: signal.title,
      source: signal.source,
      observedAt: signal.observedAt,
    })),
    { kind: 'evidence', hideUnavailable: true },
  );
  const fromCounts = toFusionDisplayItems(
    evidenceTexts.map((text, index) => ({
      id: `claim:fusion-evidence:${index}`,
      kind: 'evidence' as const,
      text,
    })),
    { kind: 'evidence', hideUnavailable: false },
  );
  const signalTexts = new Set(fromSignals.map((item) => item.text));
  return [
    ...fromSignals,
    ...fromCounts.filter((item) => !signalTexts.has(item.text)),
  ];
}
