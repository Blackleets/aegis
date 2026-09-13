/** Durable operator investigation workspaces — localStorage only (Wave 3). */

import type { OperationalCase } from '@/lib/operational-cases';
import type { OntologyGraph } from './types';

export const INVESTIGATIONS_STORAGE_KEY = 'aegis.investigations.v1';

export type SavedInvestigationMapPin = {
  latitude: number;
  longitude: number;
};

/**
 * Operator-owned investigation promoted from an ephemeral live cluster.
 * Labels in UI: "investigación guardada" vs live "cluster en vivo".
 */
export type SavedInvestigation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  sourceCaseId: string;
  /** Ontology entity ids the operator pinned (Wave 1 ids). */
  pinnedEntityIds: string[];
  /** Ontology entity ids on the watchlist. */
  watchlistEntityIds: string[];
  notes: string;
  /** Only set when the source case already had real lat/lng — never invented. */
  mapPin?: SavedInvestigationMapPin;
  /** Fail-closed graph snapshot so the workspace survives after the live cluster expires. */
  graph: OntologyGraph;
};

export type InvestigationUpsertPatch = {
  notes?: string;
  pinnedEntityIds?: string[];
  watchlistEntityIds?: string[];
  title?: string;
};

/** Prefer global localStorage (works in browser + vitest stubGlobal). */
function getLocalStorage(): Storage | null {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls) return null;
    return ls;
  } catch {
    return null;
  }
}

function isFiniteCoord(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validLatLng(latitude: number, longitude: number): boolean {
  return (
    isFiniteCoord(latitude)
    && isFiniteCoord(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
  );
}

function isOntologyGraph(value: unknown): value is OntologyGraph {
  if (!value || typeof value !== 'object') return false;
  const graph = value as OntologyGraph;
  return (
    Array.isArray(graph.entities)
    && Array.isArray(graph.relationships)
    && Array.isArray(graph.claims)
  );
}

function sanitizeEntityIdList(ids: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (!id || seen.has(id) || !allowed.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function normalizeInvestigation(raw: unknown): SavedInvestigation | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<SavedInvestigation>;
  if (typeof item.id !== 'string' || !item.id.trim()) return null;
  if (typeof item.title !== 'string' || !item.title.trim()) return null;
  if (typeof item.sourceCaseId !== 'string' || !item.sourceCaseId.trim()) return null;
  if (!Number.isFinite(item.createdAt) || !Number.isFinite(item.updatedAt)) return null;
  if (!isOntologyGraph(item.graph) || item.graph.entities.length === 0) return null;

  const allowed = new Set(item.graph.entities.map((entity) => entity.id).filter(Boolean));
  if (allowed.size === 0) return null;

  const notes = typeof item.notes === 'string' ? item.notes : '';
  const pinnedEntityIds = sanitizeEntityIdList(item.pinnedEntityIds, allowed);
  const watchlistEntityIds = sanitizeEntityIdList(item.watchlistEntityIds, allowed);

  let mapPin: SavedInvestigationMapPin | undefined;
  if (item.mapPin && validLatLng(item.mapPin.latitude, item.mapPin.longitude)) {
    mapPin = { latitude: item.mapPin.latitude, longitude: item.mapPin.longitude };
  }

  return {
    id: item.id.trim(),
    title: item.title.trim(),
    createdAt: item.createdAt as number,
    updatedAt: item.updatedAt as number,
    sourceCaseId: item.sourceCaseId.trim(),
    pinnedEntityIds,
    watchlistEntityIds,
    notes,
    ...(mapPin ? { mapPin } : {}),
    graph: item.graph,
  };
}

function writeStore(items: SavedInvestigation[]): boolean {
  const ls = getLocalStorage();
  if (!ls) return false;
  try {
    ls.setItem(INVESTIGATIONS_STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

/** Read all durable investigations (corrupt entries dropped). */
export function readInvestigations(): SavedInvestigation[] {
  const ls = getLocalStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(INVESTIGATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeInvestigation)
      .filter((item): item is SavedInvestigation => item !== null)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  } catch {
    return [];
  }
}

/**
 * Insert or replace by id. Returns the stored investigation, or null if storage unavailable / invalid.
 */
export function upsertInvestigation(
  investigation: SavedInvestigation,
  patch?: InvestigationUpsertPatch,
): SavedInvestigation | null {
  const base = normalizeInvestigation(investigation);
  if (!base) return null;

  const allowed = new Set(base.graph.entities.map((entity) => entity.id));
  const next: SavedInvestigation = {
    ...base,
    title: typeof patch?.title === 'string' && patch.title.trim() ? patch.title.trim() : base.title,
    notes: typeof patch?.notes === 'string' ? patch.notes : base.notes,
    pinnedEntityIds: patch?.pinnedEntityIds !== undefined
      ? sanitizeEntityIdList(patch.pinnedEntityIds, allowed)
      : base.pinnedEntityIds,
    watchlistEntityIds: patch?.watchlistEntityIds !== undefined
      ? sanitizeEntityIdList(patch.watchlistEntityIds, allowed)
      : base.watchlistEntityIds,
    updatedAt: Date.now(),
  };

  const store = readInvestigations().filter((item) => item.id !== next.id);
  store.unshift(next);
  if (!writeStore(store)) return null;
  return next;
}

/** Delete by id. No-op if missing / storage unavailable. */
export function deleteInvestigation(id: string): void {
  const trimmed = id.trim();
  if (!trimmed) return;
  const store = readInvestigations().filter((item) => item.id !== trimmed);
  writeStore(store);
}

/**
 * Promote an ephemeral operational case into a durable investigation workspace.
 * Fail-closed: requires case identity, non-empty ontology graph, and never invents map pins.
 */
export function promoteOperationalCaseToInvestigation(
  operationalCase: OperationalCase,
  ontologyGraph: OntologyGraph,
): SavedInvestigation | null {
  if (!operationalCase?.id?.trim()) return null;
  if (!operationalCase.title?.trim()) return null;
  if (!isOntologyGraph(ontologyGraph) || ontologyGraph.entities.length === 0) return null;

  const entityIds = ontologyGraph.entities
    .map((entity) => entity.id)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  if (entityIds.length === 0) return null;

  const allowed = new Set(entityIds);
  const caseEntityId = ontologyGraph.entities.find((entity) => entity.kind === 'Case')?.id;
  const defaultPinned = caseEntityId && allowed.has(caseEntityId)
    ? [caseEntityId]
    : [entityIds[0]];

  const now = Date.now();
  const investigation: SavedInvestigation = {
    id: `investigation:${operationalCase.id.trim()}`,
    title: operationalCase.title.trim(),
    createdAt: now,
    updatedAt: now,
    sourceCaseId: operationalCase.id.trim(),
    pinnedEntityIds: defaultPinned,
    watchlistEntityIds: [],
    notes: '',
    graph: ontologyGraph,
  };

  if (validLatLng(operationalCase.latitude, operationalCase.longitude)) {
    investigation.mapPin = {
      latitude: operationalCase.latitude,
      longitude: operationalCase.longitude,
    };
  }

  return upsertInvestigation(investigation);
}
