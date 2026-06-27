import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { FlyToLocation, MapView, OsintGeolocatePayload, ScanTarget } from '../lib/dashboard-shell';

type MobilePanel = 'layers' | 'markets' | 'intel' | 'search' | 'recon' | null;

interface UseDashboardPanelActionsParams {
  setFlyToLocation: Dispatch<SetStateAction<FlyToLocation | null>>;
  setMapView: Dispatch<SetStateAction<MapView>>;
  setMobilePanel: Dispatch<SetStateAction<MobilePanel>>;
  setLiveFeedUrl: Dispatch<SetStateAction<string | null>>;
  setLiveFeedName: Dispatch<SetStateAction<string>>;
  setScanTargets: Dispatch<SetStateAction<ScanTarget[]>>;
}

export function useDashboardPanelActions({
  setFlyToLocation,
  setMapView,
  setMobilePanel,
  setLiveFeedUrl,
  setLiveFeedName,
  setScanTargets,
}: UseDashboardPanelActionsParams) {
  const locate = useCallback((lat: number, lng: number) => {
    setFlyToLocation({ lat, lng, ts: Date.now() });
  }, [setFlyToLocation]);

  const locateAndCloseMobile = useCallback((lat: number, lng: number) => {
    setFlyToLocation({ lat, lng, ts: Date.now() });
    setMobilePanel(null);
  }, [setFlyToLocation, setMobilePanel]);

  const navigatePreset = useCallback((lat: number, lng: number, zoom: number) => {
    setFlyToLocation({ lat, lng, ts: Date.now() });
    setMapView((view) => ({ ...view, zoom }));
  }, [setFlyToLocation, setMapView]);

  const navigatePresetAndCloseMobile = useCallback((lat: number, lng: number, zoom: number) => {
    setFlyToLocation({ lat, lng, ts: Date.now() });
    setMapView((view) => ({ ...view, zoom }));
    setMobilePanel(null);
  }, [setFlyToLocation, setMapView, setMobilePanel]);

  const watchFeed = useCallback((url: string, name: string) => {
    setLiveFeedUrl(url);
    setLiveFeedName(name);
  }, [setLiveFeedUrl, setLiveFeedName]);

  const closeLiveFeed = useCallback(() => {
    setLiveFeedUrl(null);
  }, [setLiveFeedUrl]);

  const closeMobilePanel = useCallback(() => {
    setMobilePanel(null);
  }, [setMobilePanel]);

  const toggleMobilePanel = useCallback((panel: Exclude<MobilePanel, null>) => {
    setMobilePanel((current) => current === panel ? null : panel);
  }, [setMobilePanel]);

  const handleOsintGeolocate = useCallback((target: string, payload: OsintGeolocatePayload) => {
    setScanTargets((prev) => {
      const existing = prev.filter((item) => item.id !== target);
      return [{ id: target, timestamp: Date.now(), ...payload }, ...existing].slice(0, 10);
    });
    setFlyToLocation({ lat: payload.lat, lng: payload.lng, ts: Date.now() });
  }, [setScanTargets, setFlyToLocation]);

  return {
    closeLiveFeed,
    closeMobilePanel,
    handleOsintGeolocate,
    locate,
    locateAndCloseMobile,
    navigatePreset,
    navigatePresetAndCloseMobile,
    toggleMobilePanel,
    watchFeed,
  };
}
