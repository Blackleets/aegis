import { useCallback, useEffect, useRef, useState } from 'react';

import type { Coordinate, RegionDossier } from '../lib/dashboard-shell';

interface DashboardGeocodeState {
  coordsDisplayRef: React.RefObject<HTMLDivElement | null>;
  locationLabel: string;
  regionDossier: RegionDossier | null;
  dossierLoading: boolean;
  handleMouseCoords: (coords: Coordinate) => void;
  handleRightClick: (coords: Coordinate) => Promise<void>;
}

export function useDashboardGeocode(): DashboardGeocodeState {
  const mouseCoordsRef = useRef<Coordinate | null>(null);
  const coordsDisplayRef = useRef<HTMLDivElement>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [regionDossier, setRegionDossier] = useState<RegionDossier | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const geocodeCache = useRef<Map<string, string>>(new Map());
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const lastGeocodedPos = useRef<Coordinate | null>(null);
  const lastGeocodeKeyRef = useRef('');
  const lastLocationLabelRef = useRef('');

  const handleMouseCoords = useCallback((coords: Coordinate) => {
    mouseCoordsRef.current = coords;

    if (coordsDisplayRef.current) {
      coordsDisplayRef.current.innerText = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    }

    if (geocodeTimer.current) {
      clearTimeout(geocodeTimer.current);
    }

    geocodeTimer.current = setTimeout(async () => {
      if (lastGeocodedPos.current) {
        const distance = Math.abs(coords.lat - lastGeocodedPos.current.lat) + Math.abs(coords.lng - lastGeocodedPos.current.lng);
        if (distance < 0.5) return;
      }

      const geocodeKey = `${coords.lat.toFixed(1)},${coords.lng.toFixed(1)}`;
      if (geocodeKey === lastGeocodeKeyRef.current) return;

      if (geocodeCache.current.has(geocodeKey)) {
        const cachedLabel = geocodeCache.current.get(geocodeKey) ?? 'Unknown';
        if (cachedLabel !== lastLocationLabelRef.current) {
          lastLocationLabelRef.current = cachedLabel;
          setLocationLabel(cachedLabel);
        }
        lastGeocodeKeyRef.current = geocodeKey;
        lastGeocodedPos.current = coords;
        return;
      }

      geocodeAbortRef.current?.abort();
      const controller = new AbortController();
      geocodeAbortRef.current = controller;

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&zoom=10&addressdetails=1`, {
          headers: { 'Accept-Language': 'en' },
          signal: controller.signal,
        });

        if (!response.ok) return;

        const payload = (await response.json()) as {
          address?: {
            city?: string;
            town?: string;
            village?: string;
            county?: string;
            state?: string;
            region?: string;
            country?: string;
          };
        };
        const address = payload.address ?? {};
        const label = [address.city || address.town || address.village || address.county, address.state || address.region, address.country]
          .filter(Boolean)
          .join(', ') || 'Unknown';

        if (geocodeCache.current.size > 500) {
          const iterator = geocodeCache.current.keys();
          for (let i = 0; i < 100; i += 1) {
            const key = iterator.next().value;
            if (key) geocodeCache.current.delete(key);
          }
        }

        geocodeCache.current.set(geocodeKey, label);
        lastGeocodeKeyRef.current = geocodeKey;
        if (label !== lastLocationLabelRef.current) {
          lastLocationLabelRef.current = label;
          setLocationLabel(label);
        }
        lastGeocodedPos.current = coords;
      } catch (error) {
        if ((error as Error)?.name !== 'AbortError') {
          console.warn('[AEGIS] Suppressed error:', error instanceof Error ? error.message : error);
        }
      }
    }, 3000);
  }, []);

  const handleRightClick = useCallback(async (coords: Coordinate) => {
    setDossierLoading(true);
    setRegionDossier(null);

    try {
      const response = await fetch(`/api/region-dossier?lat=${coords.lat}&lng=${coords.lng}`);
      if (response.ok) {
        setRegionDossier((await response.json()) as RegionDossier);
      }
    } catch (error) {
      console.warn('[AEGIS] Suppressed error:', error instanceof Error ? error.message : error);
    } finally {
      setDossierLoading(false);
    }
  }, []);

  useEffect(() => () => {
    if (geocodeTimer.current) {
      clearTimeout(geocodeTimer.current);
    }
    geocodeAbortRef.current?.abort();
  }, []);

  return {
    coordsDisplayRef,
    locationLabel,
    regionDossier,
    dossierLoading,
    handleMouseCoords,
    handleRightClick,
  };
}
