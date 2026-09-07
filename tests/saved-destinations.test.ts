import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSavedDestination,
  readSavedDestinations,
  writeSavedDestination,
} from '../src/lib/saved-destinations';

describe('saved destinations', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  it('writes and reads Casa/Trabajo locally', () => {
    expect(writeSavedDestination('home', { lat: 40.4, lng: -3.7, placeLabel: 'Madrid Centro' })).not.toBeNull();
    expect(writeSavedDestination('work', { lat: 40.45, lng: -3.69, placeLabel: 'Oficina' })).not.toBeNull();
    const store = readSavedDestinations();
    expect(store.home?.placeLabel).toBe('Madrid Centro');
    expect(store.work?.label).toBe('Trabajo');
  });

  it('rejects invalid coords', () => {
    expect(writeSavedDestination('home', { lat: Number.NaN, lng: 1, placeLabel: 'x' })).toBeNull();
  });

  it('clears a slot', () => {
    expect(writeSavedDestination('home', { lat: 1, lng: 2, placeLabel: 'A' })).not.toBeNull();
    clearSavedDestination('home');
    expect(readSavedDestinations().home).toBeUndefined();
  });
});
