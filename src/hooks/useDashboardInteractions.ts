import { useEffect, type Dispatch, type SetStateAction } from 'react';

import type { FlyToLocation, MapView } from '@/lib/dashboard-shell';

type MobilePanel = 'layers' | 'markets' | 'intel' | 'search' | 'recon' | null;
type MapProjection = 'globe' | 'mercator';

interface DashboardInteractionOptions {
  isMobile: boolean;
  setShowLayers: Dispatch<SetStateAction<boolean>>;
  setShowMarkets: Dispatch<SetStateAction<boolean>>;
  setShowScmPanel: Dispatch<SetStateAction<boolean>>;
  setShowIntel: Dispatch<SetStateAction<boolean>>;
  setFlyToLocation: Dispatch<SetStateAction<FlyToLocation | null>>;
  setMapProjection: Dispatch<SetStateAction<MapProjection>>;
  setMobilePanel: Dispatch<SetStateAction<MobilePanel>>;
  setMapView: Dispatch<SetStateAction<MapView>>;
  setLiveFeedUrl: Dispatch<SetStateAction<string | null>>;
  setLiveFeedName: Dispatch<SetStateAction<string>>;
}

export function useDashboardInteractions({
  isMobile,
  setShowLayers,
  setShowMarkets,
  setShowScmPanel,
  setShowIntel,
  setFlyToLocation,
  setMapProjection,
  setMobilePanel,
  setMapView,
  setLiveFeedUrl,
  setLiveFeedName,
}: DashboardInteractionOptions) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((event.target as Element)?.tagName)) return;

      if (event.key === 'f' && !event.ctrlKey) {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
      if (event.key === 'l') setShowLayers((value) => !value);
      if (event.key === 'm') setShowMarkets((value) => !value);
      if (event.key === 'c') setShowScmPanel((value) => !value);
      if (event.key === 'i') setShowIntel((value) => !value);
      if (event.key === 'r') setFlyToLocation({ lat: 20, lng: 0, ts: Date.now() });
      if (event.key === 'g') setMapProjection((value) => (value === 'globe' ? 'mercator' : 'globe'));
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [setFlyToLocation, setMapProjection, setShowIntel, setShowLayers, setShowMarkets, setShowScmPanel]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ command?: string }>;
      const command = customEvent.detail?.command;
      if (!command) return;

      if (command === 'markets') {
        setShowMarkets(true);
        if (isMobile) setMobilePanel('markets');
        return;
      }

      if (command === 'intel') {
        setShowIntel(true);
        if (isMobile) setMobilePanel('intel');
        return;
      }

      if (command === 'scm') {
        setShowScmPanel(true);
        if (isMobile) setMobilePanel(null);
        return;
      }

      if (command === 'recon') {
        setShowLayers(true);
        if (isMobile) setMobilePanel('recon');
        return;
      }

      if (command === 'recenter') {
        setFlyToLocation({ lat: 20, lng: 0, ts: Date.now() });
        setMapView((value) => ({ ...value, zoom: 2.05, latitude: 20 }));
        return;
      }

      if (command === 'close-live-feed') {
        setLiveFeedUrl(null);
        setLiveFeedName('');
      }
    };

    window.addEventListener('aegis:sentinel-command', handler as EventListener);
    return () => {
      window.removeEventListener('aegis:sentinel-command', handler as EventListener);
    };
  }, [
    isMobile,
    setFlyToLocation,
    setLiveFeedName,
    setLiveFeedUrl,
    setMapView,
    setMobilePanel,
    setShowIntel,
    setShowLayers,
    setShowMarkets,
    setShowScmPanel,
  ]);
}
