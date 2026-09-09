import type maplibregl from 'maplibre-gl';

const TERRAIN_SOURCE = 'aegis-nav-terrain';
const HILLSHADE_LAYER = 'aegis-nav-hillshade';
const ROAD_BOOST_LAYER = 'aegis-nav-road-boost';

export const NAVIGATION_TERRAIN_EXAGGERATION = 2.8;

const ROAD_BOOST_BEFORE = 'user-route-glow';

export function applyNavigationAtmosphere(map: maplibregl.Map) {
  try {
    const skyApi = map as maplibregl.Map & { setSky?: (config: Record<string, unknown>) => void };
    skyApi.setSky?.({
      'sky-color': '#071422',
      'sky-horizon-blend': 0.72,
      'horizon-color': '#1c5b78',
      'horizon-fog-blend': 0.82,
      'fog-color': '#0c1c28',
      'fog-ground-blend': 0.46,
      'atmosphere-blend': 0.68,
    });
  } catch {
    // Older MapLibre builds without sky stay on the base style.
  }

  try {
    const fogApi = map as maplibregl.Map & { setFog?: (config: Record<string, unknown>) => void };
    fogApi.setFog?.({
      color: 'rgba(8, 22, 32, 0.42)',
      'high-color': 'rgba(28, 84, 110, 0.28)',
      'space-color': 'rgba(4, 10, 18, 0.9)',
      'horizon-blend': 0.18,
      'star-intensity': 0,
    });
  } catch {
    // ignore
  }

  try {
    const lightApi = map as maplibregl.Map & { setLight?: (config: Record<string, unknown>) => void };
    lightApi.setLight?.({
      anchor: 'viewport',
      color: '#d7eef2',
      intensity: 0.52,
      position: [1.18, 210, 42],
    });
  } catch {
    // ignore
  }
}

export function ensureNavigationRoadBoost(map: maplibregl.Map) {
  if (!map.getSource('carto') || map.getLayer(ROAD_BOOST_LAYER)) return;

  const beforeId = map.getLayer(ROAD_BOOST_BEFORE) ? ROAD_BOOST_BEFORE : undefined;
  map.addLayer({
    id: ROAD_BOOST_LAYER,
    type: 'line',
    source: 'carto',
    'source-layer': 'transportation',
    minzoom: 12,
    layout: {
      visibility: 'none',
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#4b6b7a',
      'line-opacity': 0.42,
      'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.1, 15, 3.2, 17, 6.4, 19, 12],
    },
  }, beforeId);
}

export function ensureNavigationTerrain(map: maplibregl.Map) {
  if (!map.getSource(TERRAIN_SOURCE)) {
    map.addSource(TERRAIN_SOURCE, {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      encoding: 'terrarium',
      tileSize: 256,
      maxzoom: 15,
    });
  }

  if (!map.getLayer(HILLSHADE_LAYER)) {
    const firstSymbol = map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id;
    map.addLayer({
      id: HILLSHADE_LAYER,
      type: 'hillshade',
      source: TERRAIN_SOURCE,
      maxzoom: 18,
      paint: {
        'hillshade-exaggeration': 0.82,
        'hillshade-shadow-color': '#041018',
        'hillshade-highlight-color': '#b7e4ea',
        'hillshade-illumination-direction': 315,
      },
    }, firstSymbol);
  }

  ensureNavigationRoadBoost(map);
  if (map.getLayer(ROAD_BOOST_LAYER)) {
    map.setLayoutProperty(ROAD_BOOST_LAYER, 'visibility', 'visible');
  }

  try {
    map.setTerrain({ source: TERRAIN_SOURCE, exaggeration: NAVIGATION_TERRAIN_EXAGGERATION });
  } catch {
    // Older MapLibre builds without terrain stay on extrusion-only 3D.
  }

  applyNavigationAtmosphere(map);
}

export function clearNavigationTerrain(map: maplibregl.Map) {
  try {
    map.setTerrain(null);
  } catch {
    // ignore
  }

  if (map.getLayer(ROAD_BOOST_LAYER)) {
    try {
      map.setLayoutProperty(ROAD_BOOST_LAYER, 'visibility', 'none');
    } catch {
      // ignore
    }
  }
}
