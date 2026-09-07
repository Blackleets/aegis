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

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readSavedDestinations(): Store {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
  if (!canUseStorage()) return null;
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return next;
  } catch {
    return null;
  }
}

export function clearSavedDestination(slot: SavedDestinationSlot) {
  if (!canUseStorage()) return;
  const store = readSavedDestinations();
  delete store[slot];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota / private mode
  }
}
