/** Local-only Casa / Trabajo shortcuts — never leave the device. */

export type SavedDestinationSlot = 'home' | 'work';

export type SavedDestination = {
  label: string;
  lat: number;
  lng: number;
  placeLabel: string;
  updatedAt: number;
};

const STORAGE_KEY = 'aegis.saved-destinations.v1';

type Store = Partial<Record<SavedDestinationSlot, SavedDestination>>;

const SLOT_LABEL: Record<SavedDestinationSlot, string> = {
  home: 'Casa',
  work: 'Trabajo',
};

export function savedDestinationSlotLabel(slot: SavedDestinationSlot) {
  return SLOT_LABEL[slot];
}

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

export function readSavedDestinations(): Store {
  const ls = getLocalStorage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    const out: Store = {};
    for (const slot of ['home', 'work'] as const) {
      const item = parsed?.[slot];
      if (!item) continue;
      if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) continue;
      if (typeof item.placeLabel !== 'string' || !item.placeLabel.trim()) continue;
      out[slot] = {
        label: SLOT_LABEL[slot],
        lat: item.lat,
        lng: item.lng,
        placeLabel: item.placeLabel.trim(),
        updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : Date.now(),
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function writeSavedDestination(
  slot: SavedDestinationSlot,
  place: { lat: number; lng: number; placeLabel: string },
): SavedDestination | null {
  const ls = getLocalStorage();
  if (!ls) return null;
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
  const placeLabel = place.placeLabel.trim();
  if (!placeLabel) return null;
  const next: SavedDestination = {
    label: SLOT_LABEL[slot],
    lat: place.lat,
    lng: place.lng,
    placeLabel,
    updatedAt: Date.now(),
  };
  const store = readSavedDestinations();
  store[slot] = next;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(store));
    return next;
  } catch {
    return null;
  }
}

export function clearSavedDestination(slot: SavedDestinationSlot) {
  const ls = getLocalStorage();
  if (!ls) return;
  const store = readSavedDestinations();
  delete store[slot];
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota / private mode
  }
}
