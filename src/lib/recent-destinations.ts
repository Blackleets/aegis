/** Local-only recent destination history — Places Autocomplete pattern, never leaves the device. */

export type RecentDestination = {
  label: string;
  lat: number;
  lng: number;
  placeId?: string;
  updatedAt: number;
};

const STORAGE_KEY = 'aegis.recent-destinations.v1';
const MAX_RECENT = 8;

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

function isValidDestination(item: unknown): item is RecentDestination {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Partial<RecentDestination>;
  if (typeof candidate.label !== 'string' || !candidate.label.trim()) return false;
  if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng)) return false;
  if (candidate.placeId !== undefined && typeof candidate.placeId !== 'string') return false;
  return true;
}

function samePlace(a: RecentDestination, b: { label: string; lat: number; lng: number; placeId?: string }) {
  if (a.placeId && b.placeId && a.placeId === b.placeId) return true;
  return (
    a.label === b.label &&
    Math.abs(a.lat - b.lat) < 0.000001 &&
    Math.abs(a.lng - b.lng) < 0.000001
  );
}

function persist(list: RecentDestination[]): boolean {
  const ls = getLocalStorage();
  if (!ls) return false;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function readRecentDestinations(): RecentDestination[] {
  const ls = getLocalStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: RecentDestination[] = [];
    for (const item of parsed) {
      if (!isValidDestination(item)) continue;
      out.push({
        label: item.label.trim(),
        lat: item.lat,
        lng: item.lng,
        ...(typeof item.placeId === 'string' && item.placeId.trim()
          ? { placeId: item.placeId.trim() }
          : {}),
        updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : Date.now(),
      });
      if (out.length >= MAX_RECENT) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function pushRecentDestination(place: {
  label: string;
  lat: number;
  lng: number;
  placeId?: string;
}): RecentDestination | null {
  const ls = getLocalStorage();
  if (!ls) return null;
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
  const label = place.label.trim();
  if (!label) return null;
  const placeId = place.placeId?.trim() || undefined;
  const next: RecentDestination = {
    label,
    lat: place.lat,
    lng: place.lng,
    ...(placeId ? { placeId } : {}),
    updatedAt: Date.now(),
  };
  const existing = readRecentDestinations().filter((item) => !samePlace(item, next));
  const list = [next, ...existing].slice(0, MAX_RECENT);
  if (!persist(list)) return null;
  return next;
}

export function clearRecentDestinations() {
  const ls = getLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function removeRecentDestination(target: {
  label: string;
  lat: number;
  lng: number;
  placeId?: string;
}) {
  const ls = getLocalStorage();
  if (!ls) return;
  const list = readRecentDestinations().filter((item) => !samePlace(item, target));
  persist(list);
}
