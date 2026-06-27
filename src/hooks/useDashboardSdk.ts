import { useMemo } from 'react';

import type { ActiveLayers, DashboardData } from '../lib/dashboard-shell';

type SdkEntity = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { domain: string; name: string; source: string };
};

interface DashboardSdkState {
  sdkEntities: SdkEntity[];
  dataWithSdk: DashboardData;
  totalFlights: number;
  trackedEntityCount: number;
}

export function useDashboardShellMetrics(activeLayers: ActiveLayers, data: DashboardData): DashboardSdkState {
  const sdkEntities = useMemo<SdkEntity[]>(() => {
    if (!activeLayers.sdk_stream) {
      return [];
    }

    const computedSdkEntities: SdkEntity[] = [];
    const allFlights = [
      ...(data.commercial_flights || []),
      ...(data.private_flights || []),
      ...(data.private_jets || []),
      ...(data.military_flights || []),
    ];

    const flightStep = Math.max(1, Math.floor(allFlights.length / 60));
    for (let i = 0; i < allFlights.length; i += flightStep) {
      const flight = allFlights[i];
      if (!flight?.lat || !flight?.lng) continue;
      computedSdkEntities.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [flight.lng, flight.lat] },
        properties: {
          domain: 'AIR',
          name: typeof flight.callsign === 'string' ? flight.callsign.trim() || 'TRACK' : 'TRACK',
          source: 'ADS-B / OpenSky',
        },
      });
    }

    const ships = data.maritime_ships || [];
    const shipStep = Math.max(1, Math.floor(ships.length / 60));
    for (let i = 0; i < ships.length; i += shipStep) {
      const ship = ships[i];
      if (!ship?.lat || !ship?.lng) continue;
      computedSdkEntities.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ship.lng, ship.lat] },
        properties: {
          domain: 'SEA',
          name: typeof ship.name === 'string' ? ship.name : `MMSI-${String(ship.mmsi ?? 'UNKNOWN')}`,
          source: 'AIS Stream',
        },
      });
    }

    for (const earthquake of data.earthquakes || []) {
      if (!earthquake?.lat || !earthquake?.lng) continue;
      computedSdkEntities.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [earthquake.lng, earthquake.lat] },
        properties: {
          domain: 'LAND',
          name: `M${String(earthquake.magnitude ?? '?')} ${typeof earthquake.place === 'string' ? earthquake.place : ''}`.trim(),
          source: 'USGS',
        },
      });
    }

    for (const incident of data.gdelt || []) {
      if (!incident?.lat || !incident?.lng) continue;
      computedSdkEntities.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [incident.lng, incident.lat] },
        properties: {
          domain: 'INTEL',
          name: typeof incident.name === 'string' ? incident.name : 'GDELT Event',
          source: 'GDELT Project',
        },
      });
    }

    for (const newsItem of data.news || []) {
      if (!newsItem?.coords || newsItem.coords.length < 2) continue;
      computedSdkEntities.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [newsItem.coords[1], newsItem.coords[0]] },
        properties: {
          domain: 'INTEL',
          name: typeof newsItem.title === 'string' ? newsItem.title : 'SIGINT',
          source: typeof newsItem.source === 'string' ? newsItem.source : 'RSS Feed',
        },
      });
    }

    return computedSdkEntities;
  }, [
    activeLayers.sdk_stream,
    data.commercial_flights,
    data.private_flights,
    data.private_jets,
    data.military_flights,
    data.maritime_ships,
    data.earthquakes,
    data.gdelt,
    data.news,
  ]);

  const dataWithSdk = useMemo<DashboardData>(() => ({
    ...data,
    sdk_entities: sdkEntities,
  }), [data, sdkEntities]);

  const totalFlights = useMemo(() => (
    (data.commercial_flights?.length || 0)
    + (data.private_flights?.length || 0)
    + (data.private_jets?.length || 0)
    + (data.military_flights?.length || 0)
  ), [data.commercial_flights, data.private_flights, data.private_jets, data.military_flights]);

  const trackedEntityCount = useMemo(() => {
    return [
      data.commercial_flights,
      data.private_flights,
      data.private_jets,
      data.military_flights,
      data.maritime_ships,
      data.satellites,
      data.cameras,
      data.weather_events,
      data.infrastructure,
      data.balloons,
      data.radiation,
      data.fires,
      data.gps_jamming,
      data.gdelt,
      data.news,
      data.earthquakes,
    ].reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0);
  }, [
    data.commercial_flights,
    data.private_flights,
    data.private_jets,
    data.military_flights,
    data.maritime_ships,
    data.satellites,
    data.cameras,
    data.weather_events,
    data.infrastructure,
    data.balloons,
    data.radiation,
    data.fires,
    data.gps_jamming,
    data.gdelt,
    data.news,
    data.earthquakes,
  ]);

  return {
    sdkEntities,
    dataWithSdk,
    totalFlights,
    trackedEntityCount,
  };
}
