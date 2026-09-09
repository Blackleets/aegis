import type maplibregl from 'maplibre-gl';

const TERRAIN_SOURCE = 'aegis-nav-terrain';
const HILLSHADE_LAYER = 'aegis-nav-hillshade';

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
        'hillshade-exaggeration': 0.55,
        'hillshade-shadow-color': '#041018',
        'hillshade-highlight-color': '#9fd7de',
        'hillshade-illumination-direction': 315,
      },
    }, firstSymbol);
  }

  try {
    map.setTerrain({ source: TERRAIN_SOURCE, exaggeration: 1.45 });
  } catch {
    // Older MapLibre builds without terrain stay on extrusion-only 3D.
  }
}

export function clearNavigationTerrain(map: maplibregl.Map) {
  try {
    map.setTerrain(null);
  } catch {
    // ignore
  }
}
