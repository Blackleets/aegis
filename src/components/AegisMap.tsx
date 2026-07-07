'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

type Coordinates = [number, number];
type EntityProperties = Record<string, unknown>;
type MapEntity = EntityProperties & { lat?: number; lng?: number; coords?: Coordinates };
type PointFeature = { geometry: { coordinates: Coordinates }; properties?: EntityProperties };
type FeatureEvent = maplibregl.MapMouseEvent & { features?: PointFeature[] };
type GeoJsonFeature = {
  type: 'Feature';
  geometry: { type: 'Point' | 'LineString' | 'Polygon'; coordinates: Coordinates | Coordinates[] | Coordinates[][] };
  properties: EntityProperties;
};
type GeoJsonSourceHandle = { setData: (data: { type: 'FeatureCollection'; features: GeoJsonFeature[] }) => void };

interface SweepCenter { lat: number; lng: number }
interface SweepDevice extends EntityProperties { ip?: string; device_type?: string; device_icon?: string; device_color?: string; risk_level?: string; ports?: unknown[]; hostnames?: unknown[]; vulns?: unknown[]; cpes?: unknown[]; tags?: unknown[] }
interface SweepData { center: SweepCenter; devices: SweepDevice[]; target_ip?: string }
interface ScanTarget extends EntityProperties { id?: string; lat: number; lng: number }
interface AegisMapData extends Record<string, unknown> {
  commercial_flights?: MapEntity[];
  private_flights?: MapEntity[];
  private_jets?: MapEntity[];
  military_flights?: MapEntity[];
  earthquakes?: MapEntity[];
  satellites?: MapEntity[];
  gdelt?: MapEntity[];
  gps_jamming?: MapEntity[];
  cameras?: MapEntity[];
  fires?: MapEntity[];
  weather_events?: MapEntity[];
  infrastructure?: MapEntity[];
  maritime_ports?: MapEntity[];
  maritime_chokepoints?: MapEntity[];
  maritime_ships?: MapEntity[];
  balloons?: MapEntity[];
  radiation?: MapEntity[];
  live_feeds?: MapEntity[];
  news?: MapEntity[];
}

interface AegisMapProps {
  data: AegisMapData;
  activeLayers: Record<string, boolean>;
  onEntityClick?: (entity: EntityProperties) => void;
  onMouseCoords?: (coords: { lat: number; lng: number }) => void;
  onRightClick?: (coords: { lat: number; lng: number }) => void;
  onViewStateChange?: (vs: { zoom: number; latitude: number }) => void;
  flyToLocation?: { lat: number; lng: number; ts: number; zoom?: number; bbox?: [west: number, south: number, east: number, north: number] | null; label?: string } | null;
  projection?: 'mercator' | 'globe';
  mapStyle?: 'dark' | 'satellite';
  sweepData?: SweepData | null;
  scanTargets?: ScanTarget[];
  currentLocation?: { lat: number; lng: number } | null;
  routeDestination?: { lat: number; lng: number } | null;
  routePath?: Coordinates[];
  navigationActive?: boolean;
  navigationBearing?: number | null;
}

function computeSolarTerminator(): [number, number][] {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const decRad = declination * Math.PI / 180;
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const subsolarLng = (12 - utcHours) * 15;
  const points: [number, number][] = [];
  for (let lng = -180; lng <= 180; lng += 2) {
    const lngRad = (lng - subsolarLng) * Math.PI / 180;
    const lat = Math.atan(-Math.cos(lngRad) / Math.tan(decRad)) * 180 / Math.PI;
    points.push([lng, lat]);
  }
  const darkSide = declination >= 0 ? -90 : 90;
  points.push([180, darkSide]);
  points.push([-180, darkSide]);
  points.push(points[0]);
  return points;
}

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

const GLOBE_OVERVIEW_ZOOM = 2.6;
const GLOBE_DETAIL_ZOOM = 4.2;

const OVERVIEW_ENTITY_LIMITS = {
  cctv: 180,
  weather: 90,
  infrastructure: 120,
  maritimePorts: 90,
  maritimeChokepoints: 24,
  maritimeShips: 180,
  balloons: 80,
  radiation: 80,
  liveNews: 70,
  sigintNews: 90,
  sdkLinks: 12,
} as const;

const OVERVIEW_LABEL_LAYERS = [
  'eq-label',
  'gdelt-hotspot-label',
  'jam-label',
  'weather-label',
  'infra-label',
  'maritime-label',
  'choke-label',
  'news-label',
  'sigint-news-label',
  'balloon-label',
  'rad-label',
  'ship-label',
  'scan-targets-label',
  'cctv-label',
] as const;

const OVERVIEW_GLOW_LAYERS = [
  'cctv-glow',
  'gdelt-hotspot-halo',
  'weather-glow',
  'infra-glow',
  'maritime-glow',
  'news-glow',
  'sigint-news-glow',
  'sdk-sea-glow',
  'sdk-air-glow',
  'sdk-intel-glow',
  'rad-glow',
] as const;

const OVERVIEW_SECONDARY_DOT_LAYERS = [
  'sat-dots',
  'sat-glow',
  'ship-dots',
  'cctv-dots',
  'cctv-glow',
  'news-dots',
  'news-glow',
  'sigint-news-dots',
  'sigint-news-glow',
  'scan-targets-dots',
  'scan-targets-glow',
  'balloon-dots',
  'rad-dots',
  'sdk-air',
  'sdk-intel',
  'sdk-air-glow',
  'sdk-intel-glow',
] as const;

const OVERVIEW_SECONDARY_SYMBOL_LAYERS = [
  'trail-commercial',
  'trail-private',
  'trail-jets',
  'trail-military',
  'fl-commercial',
  'fl-private',
  'fl-jets',
  'fl-military',
] as const;

function getSeverityWeight(severity: unknown): number {
  const normalized = String(severity || '').toLowerCase();
  if (normalized === 'critical') return 52;
  if (normalized === 'high') return 38;
  if (normalized === 'elevated') return 24;
  if (normalized === 'low') return 12;
  return 16;
}

function getRecencyWeight(dateValue: unknown): number {
  if (!dateValue) return 0;
  const parsed = Date.parse(String(dateValue));
  if (Number.isNaN(parsed)) return 0;
  const ageHours = Math.max(0, (Date.now() - parsed) / 36e5);
  if (ageHours <= 6) return 18;
  if (ageHours <= 24) return 12;
  if (ageHours <= 72) return 7;
  if (ageHours <= 168) return 3;
  return 0;
}

function getFusionScore(entity: MapEntity): number {
  const mentions = typeof entity.mentions === 'number' ? entity.mentions : Number(entity.mentions || 0);
  const mentionsWeight = Number.isFinite(mentions) && mentions > 0 ? Math.min(22, Math.round(Math.log2(mentions + 1) * 4.5)) : 0;
  return getSeverityWeight(entity.severity) + getRecencyWeight(entity.date) + mentionsWeight;
}

function getHotspotLabel(entity: MapEntity): string {
  const base = String(entity.title || entity.name || entity.theme || 'Unclassified hotspot').trim();
  const words = base.split(/\s+/).slice(0, 4).join(' ');
  return words.length > 34 ? `${words.slice(0, 31)}…` : words;
}

function normalizeLongitude(lng: number): number {
  if (lng > 180) return lng - 360;
  if (lng < -180) return lng + 360;
  return lng;
}

function getFlightTrailCoordinates(f: MapEntity): Coordinates[] | null {
  if (typeof f.lat !== 'number' || typeof f.lng !== 'number') return null;

  const heading = typeof f.heading === 'number' ? f.heading : Number(f.heading || 0);
  const speed = typeof f.speed_knots === 'number' ? f.speed_knots : Number(f.speed_knots || 0);
  const altitude = typeof f.alt === 'number' ? f.alt : Number(f.alt || 0);

  if (!Number.isFinite(heading)) return null;

  const latRad = Math.max(0.2, Math.cos((f.lat * Math.PI) / 180));
  const headingRad = (heading * Math.PI) / 180;
  const trailDegrees = Math.min(1.45, Math.max(0.22, (Number.isFinite(speed) ? speed : 0) / 520 + (Number.isFinite(altitude) ? altitude : 0) / 52000));
  const dLat = Math.cos(headingRad) * trailDegrees;
  const dLng = (Math.sin(headingRad) * trailDegrees) / latRad;

  return [
    [normalizeLongitude(f.lng - dLng), Math.max(-85, Math.min(85, f.lat - dLat))],
    [f.lng, f.lat],
  ];
}

function takeTopEntities<T>(items: T[] | undefined, limit: number, score: (item: T) => number): T[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (items.length <= limit) return items;
  return [...items].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

function AegisMap({ data, activeLayers, onEntityClick, onMouseCoords, onRightClick, onViewStateChange, flyToLocation, projection = 'globe', mapStyle = 'dark', sweepData, scanTargets = [], currentLocation = null, routeDestination = null, routePath = [], navigationActive = false, navigationBearing = null }: AegisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [adaptiveZoom, setAdaptiveZoom] = useState(projection === 'globe' ? 2.05 : 3.2);
  const prevStyleRef = useRef(mapStyle);
  const initialProjectionRef = useRef(projection);
  const initialMapStyleRef = useRef(mapStyle);
  const lastAdaptiveZoomRef = useRef(projection === 'globe' ? 2.05 : 3.2);
  const lastNavCameraUpdateRef = useRef(0);
  const lastViewStateEmitRef = useRef(0);
  const lastViewStateRef = useRef<{ zoom: number; latitude: number } | null>(null);
  const lastNavCameraCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastNavCameraBearingRef = useRef<number | null>(null);
  const globeSpinPauseUntilRef = useRef(0);
  const isOverviewMode = projection === 'globe' && adaptiveZoom <= GLOBE_OVERVIEW_ZOOM;


  const createIcon = useCallback((map: maplibregl.Map, id: string, color: string, size: number) => {
    if (map.hasImage(id)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2, cy = size / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.4);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.1);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.2);
    ctx.lineTo(cx - size * 0.4, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.15);
    ctx.lineTo(cx, cy + size * 0.35);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.15);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.3);
    ctx.lineTo(cx + size * 0.4, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.1);
    ctx.closePath();
    ctx.fill();
    map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  }, []);

  const createDot = useCallback((map: maplibregl.Map, id: string, color: string, size: number) => {
    if (map.hasImage(id)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
    ctx.fill();
    map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  }, []);

  const applyAegisGlobeStyling = useCallback((map: maplibregl.Map, nextProjection: 'mercator' | 'globe', nextMapStyle: string) => {
    const isDark = nextMapStyle === 'dark';
    const isGlobe = nextProjection === 'globe';

    try {
      const fogApi = map as maplibregl.Map & { setFog?: (config: Record<string, unknown>) => void };
      fogApi.setFog?.(
        isGlobe
          ? {
              color: isDark ? 'rgba(18, 28, 42, 0.12)' : 'rgba(16, 24, 34, 0.14)',
              'high-color': isDark ? 'rgba(54, 112, 168, 0.12)' : 'rgba(28, 42, 56, 0.09)',
              'space-color': isDark ? 'rgba(2, 6, 14, 0.62)' : 'rgba(8, 12, 18, 0.58)',
              'horizon-blend': 0.08,
              'star-intensity': 0,
            }
          : {
              color: 'rgba(16, 24, 34, 0.18)',
              'high-color': 'rgba(18, 28, 40, 0.1)',
              'space-color': 'rgba(0, 0, 0, 0)',
              'horizon-blend': 0.02,
              'star-intensity': 0,
            },
      );
    } catch {}

    try {
      const skyApi = map as maplibregl.Map & { setSky?: (config: Record<string, unknown>) => void };
      skyApi.setSky?.(
        isGlobe
          ? {
              'sky-color': isDark ? '#06101a' : '#101923',
              'sky-horizon-blend': isDark ? 0.18 : 0.05,
              'horizon-color': isDark ? '#2a6f9f' : '#223244',
              'horizon-fog-blend': isDark ? 0.14 : 0.05,
              'fog-color': isDark ? '#091523' : '#182433',
              'fog-ground-blend': isDark ? 0.18 : 0.18,
            }
          : {
              'sky-color': isDark ? '#07101a' : '#121d28',
              'sky-horizon-blend': 0.03,
              'horizon-color': isDark ? '#0d1622' : '#1b2a3a',
              'horizon-fog-blend': 0.03,
            },
      );
    } catch {}

    if (map.getLayer('satellite-layer')) {
      try {
        map.setPaintProperty('satellite-layer', 'raster-opacity', isGlobe ? 1 : 0.88);
        map.setPaintProperty('satellite-layer', 'raster-saturation', isGlobe ? 0.72 : 0.18);
        map.setPaintProperty('satellite-layer', 'raster-contrast', isGlobe ? 0.2 : 0.08);
        map.setPaintProperty('satellite-layer', 'raster-brightness-min', isGlobe ? 0.28 : 0.12);
        map.setPaintProperty('satellite-layer', 'raster-brightness-max', isGlobe ? 1 : 1);
      } catch {}
    }

    if (map.getLayer('day-night-fill')) {
      try {
        map.setPaintProperty('day-night-fill', 'fill-color', '#05101f');
        map.setPaintProperty('day-night-fill', 'fill-opacity', isGlobe ? 0 : 0.12);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [0, 20],
      zoom: initialProjectionRef.current === 'globe' ? 2.05 : 3.2,
      minZoom: 1.5,
      maxZoom: 18,
      pitch: initialProjectionRef.current === 'globe' ? 14 : 0,
      attributionControl: false,
    });

    map.on('load', () => {
      mapRef.current = map;
      try {
        (map as maplibregl.Map & { setProjection?: (projection: { type: 'mercator' | 'globe' }) => void }).setProjection({ type: initialProjectionRef.current });
      } catch {}

      applyAegisGlobeStyling(map, initialProjectionRef.current, initialMapStyleRef.current);

      createIcon(map, 'plane-cyan', '#00E5FF', 24);
      createIcon(map, 'plane-green', '#00E676', 24);
      createIcon(map, 'plane-pink', '#FF69B4', 24);
      createIcon(map, 'plane-red', '#FF3D3D', 24);
      createIcon(map, 'plane-grey', '#555555', 24);
      createDot(map, 'dot-gold', '#D4AF37', 8);
      createDot(map, 'dot-red', '#FF3D3D', 10);
      createDot(map, 'dot-orange', '#FF9500', 10);
      createDot(map, 'dot-green', '#00E676', 10);
      createDot(map, 'dot-fire', '#FF6B00', 10);
      createDot(map, 'dot-cctv', '#39FF14', 10);

      // Sources
      const sources = ['flights','military','jets','private-fl','flight-trails','military-trails','jet-trails','private-trails','satellites','earthquakes','gdelt','gdelt-hotspots','gps-jamming','day-night','cctv','fires','weather','infrastructure','maritime','maritime-choke','maritime-ships','live-news','sigint-news','conflict-zones', 'war-alerts-targets', 'war-alerts-lines', 'balloons', 'radiation', 'ip-sweep-devices', 'ip-sweep-pulse', 'ip-sweep-connections', 'scan-targets', 'sdk-entities', 'sdk-links', 'user-route', 'route-markers'];
      sources.forEach(s => map.addSource(s, { type: 'geojson', data: EMPTY_FC }));


      // Warning icon generator (parameterized — eliminates 3x copy-paste)
      const createWarningIcon = (id: string, color: string) => {
        const s = 20;
        const c = document.createElement('canvas');
        c.width = s; c.height = s;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(s/2, 1);
        ctx.lineTo(s - 1, s - 1);
        ctx.lineTo(1, s - 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', s/2, s - 4);
        map.addImage(id, { width: s, height: s, data: new Uint8Array(ctx.getImageData(0, 0, s, s).data) });
      };
      createWarningIcon('warn-icon', '#FF1744');
      createWarningIcon('warn-orange', '#FF9500');
      createWarningIcon('warn-yellow', '#FFD500');

      map.addLayer({ id: 'conflict-icons', type: 'symbol', source: 'conflict-zones', minzoom: 2, layout: {
        'icon-image': ['match', ['get','severity'], 'war','warn-icon', 'high','warn-orange', 'warn-yellow'],
        'icon-size': ['interpolate',['linear'],['zoom'], 1,0.6, 4,0.8, 8,1],
        'icon-allow-overlap': true,
        'text-field': ['get','label'],
        'text-size': ['interpolate',['linear'],['zoom'], 1,7, 4,9, 8,11],
        'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.4],
        'text-allow-overlap': false,
      }, paint: {
        'text-color': ['match', ['get','severity'], 'war','#FF1744', 'high','#FF9500', '#FFD500'],
        'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9,
      }});


      // Day/Night
      map.addLayer({ id: 'day-night-fill', type: 'fill', source: 'day-night', paint: { 'fill-color': '#000022', 'fill-opacity': 0.35 }});


      // User route overlay (additive only — high contrast, does not affect Earth logic)
      map.addLayer({ id: 'user-route-glow', type: 'line', source: 'user-route', paint: {
        'line-color': ['match', ['get', 'mode'], 'follow', '#67E8F9', '#22D3EE'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 2, 8, 5, 12, 10, 18, 15, 22],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.24, 8, 0.18],
        'line-blur': 1.1,
      }});
      map.addLayer({ id: 'user-route-casing', type: 'line', source: 'user-route', paint: {
        'line-color': 'rgba(2, 7, 18, 0.94)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 2, 5.2, 5, 7.2, 10, 10.4, 15, 13],
        'line-opacity': 0.78,
        'line-blur': 0.05,
      }});
      map.addLayer({ id: 'user-route-line', type: 'line', source: 'user-route', paint: {
        'line-color': ['match', ['get', 'mode'], 'follow', '#F8FAFC', '#22D3EE'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 2, 2.9, 5, 4.5, 10, 6.8, 15, 8.5],
        'line-opacity': 0.96,
        'line-blur': 0,
      }});
      map.addLayer({
        id: 'user-route-arrows',
        type: 'symbol',
        source: 'user-route',
        minzoom: 3.2,
        layout: {
          'symbol-placement': 'line',
          'text-field': '▶',
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 12, 10, 16, 15, 20],
          'symbol-spacing': ['interpolate', ['linear'], ['zoom'], 4, 58, 10, 72, 15, 92],
          'text-keep-upright': false,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ECFEFF',
          'text-halo-color': 'rgba(2, 7, 18, 0.98)',
          'text-halo-width': 1.4,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 3.2, 0.45, 6, 0.92],
        },
      });
      map.addLayer({ id: 'route-markers-glow', type: 'circle', source: 'route-markers', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 13, 6, 18, 10, 25, 15, 32],
        'circle-color': ['match', ['get', 'role'], 'origin', '#34D399', '#F97316'],
        'circle-opacity': 0.24,
        'circle-blur': 0.95,
      }});
      map.addLayer({ id: 'route-markers-rings', type: 'circle', source: 'route-markers', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 7, 6, 10, 10, 14, 15, 18],
        'circle-color': 'rgba(2, 7, 18, 0.18)',
        'circle-opacity': 0.72,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 2, 1.5, 8, 2.5],
        'circle-stroke-color': ['match', ['get', 'role'], 'origin', '#86EFAC', '#FDBA74'],
        'circle-stroke-opacity': 0.92,
      }});
      map.addLayer({ id: 'route-markers-dots', type: 'circle', source: 'route-markers', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 4.5, 6, 6.5, 10, 9.5, 15, 12],
        'circle-color': ['match', ['get', 'role'], 'origin', '#34D399', '#F97316'],
        'circle-opacity': 1,
        'circle-stroke-width': 2.4,
        'circle-stroke-color': '#F8FAFC',
        'circle-stroke-opacity': 0.84,
      }});
      map.addLayer({ id: 'route-markers-label', type: 'symbol', source: 'route-markers', minzoom: 3.4, layout: {
        'text-field': ['get', 'label'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 3.4, 9, 8, 11, 14, 13],
        'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.9],
        'text-allow-overlap': true,
      }, paint: {
        'text-color': ['match', ['get', 'role'], 'origin', '#BBF7D0', '#FED7AA'],
        'text-halo-color': '#020712',
        'text-halo-width': 1.7,
      }});

      // Earthquakes
      map.addLayer({ id: 'eq-circles', type: 'circle', source: 'earthquakes', paint: {
        'circle-radius': ['interpolate',['linear'],['get','magnitude'], 2.5,4, 5,12, 7,24],
        'circle-color': ['interpolate',['linear'],['get','magnitude'], 2.5,'#FFD700', 4,'#FF9500', 6,'#FF1744'],
        'circle-opacity': 0.6, 'circle-blur': 0.3, 'circle-stroke-width': 1, 'circle-stroke-color': '#FFD700', 'circle-stroke-opacity': 0.3,
      }});
      map.addLayer({ id: 'eq-label', type: 'symbol', source: 'earthquakes', minzoom: 5, filter: ['>=',['get','magnitude'],4.5], layout: {
        'text-field': ['concat','M',['to-string',['get','magnitude']]], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0,1.5],
      }, paint: { 'text-color': '#FFD700', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Fires
      map.addLayer({ id: 'fires-heat', type: 'circle', source: 'fires', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,2, 5,4, 10,8],
        'circle-color': '#FF6B00', 'circle-opacity': 0.5, 'circle-blur': 0.5,
      }});

      // CCTV — outer glow ring
      map.addLayer({ id: 'cctv-glow', type: 'circle', source: 'cctv', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,14, 14,20],
        'circle-color': '#39FF14', 'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      // CCTV — main dot
      map.addLayer({ id: 'cctv-dots', type: 'circle', source: 'cctv', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8, 14,12],
        'circle-color': '#39FF14', 'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': '#39FF14', 'circle-stroke-opacity': 0.5,
      }});
      // CCTV — labels at zoom 10+
      map.addLayer({ id: 'cctv-label', type: 'symbol', source: 'cctv', minzoom: 10, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#39FF14', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // GDELT
      map.addLayer({ id: 'gdelt-dots', type: 'circle', source: 'gdelt', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': ['match', ['get','severity'], 'critical','#FF1744', 'high','#FF6B00', 'elevated','#FFD500', '#64B5F6'],
        'circle-opacity': 0.72,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': ['match', ['get','severity'], 'critical','#FF1744', 'high','#FF6B00', 'elevated','#FFD500', '#64B5F6'],
        'circle-stroke-opacity': 0.38,
      }});
      map.addLayer({ id: 'gdelt-hotspot-halo', type: 'circle', source: 'gdelt-hotspots', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,10, 5,['+',10,['*',['get','fusionScore'],0.18]], 10,['+',16,['*',['get','fusionScore'],0.28]]],
        'circle-color': ['match', ['get','severity'], 'critical','#FF1744', 'high','#FF6B00', 'elevated','#FFD500', '#64B5F6'],
        'circle-opacity': ['interpolate',['linear'],['zoom'], 1,0.10, 5,0.16, 10,0.22],
        'circle-blur': 0.85,
      }});
      map.addLayer({ id: 'gdelt-hotspot-core', type: 'circle', source: 'gdelt-hotspots', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,['+',5,['*',['get','priorityRank'],0.55]], 10,['+',8,['*',['get','priorityRank'],0.8]]],
        'circle-color': ['match', ['get','severity'], 'critical','#FF1744', 'high','#FF6B00', 'elevated','#FFD500', '#90CAF9'],
        'circle-opacity': 0.96,
        'circle-stroke-width': ['interpolate',['linear'],['zoom'], 1,1.4, 10,2.2],
        'circle-stroke-color': '#F8FAFC',
        'circle-stroke-opacity': 0.78,
      }});
      map.addLayer({ id: 'gdelt-hotspot-label', type: 'symbol', source: 'gdelt-hotspots', minzoom: 5.5, layout: {
        'text-field': ['concat', 'HOT ', ['to-string',['get','priorityRank']], ' • ', ['get','hotspotLabel']],
        'text-size': ['interpolate',['linear'],['zoom'], 2,9, 5,10, 8,12],
        'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.8],
        'text-max-width': 16,
        'text-allow-overlap': false,
      }, paint: {
        'text-color': ['match', ['get','severity'], 'critical','#FFB4B4', 'high','#FFD0A8', 'elevated','#FFF0A6', '#C7E3FF'],
        'text-halo-color': 'rgba(2, 7, 18, 0.92)',
        'text-halo-width': 1.4,
        'text-opacity': 0.92,
      }});

      // GPS Jamming
      map.addLayer({ id: 'jam-fill', type: 'circle', source: 'gps-jamming', paint: { 'circle-radius': 30, 'circle-color': '#FF0000', 'circle-opacity': 0.15, 'circle-blur': 1 }});
      map.addLayer({ id: 'jam-label', type: 'symbol', source: 'gps-jamming', minzoom: 5.5, layout: {
        'text-field': ['concat','GPS JAM ',['to-string',['get','severity']],'%'], 'text-size': 10, 'text-font': ['Open Sans Bold'], 'text-allow-overlap': true,
      }, paint: { 'text-color': '#FF4444', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Weather Events (NASA EONET — storms, volcanoes)
      map.addLayer({ id: 'weather-glow', type: 'circle', source: 'weather', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,12, 5,20, 10,30],
        'circle-color': '#E040FB', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'weather-dots', type: 'circle', source: 'weather', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,14],
        'circle-color': ['match', ['get','icon'], 'cyclone','#E040FB', 'volcano','#FF1744', '#E040FB'],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': '#E040FB', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'weather-label', type: 'symbol', source: 'weather', minzoom: 6, layout: {
        'text-field': ['get','title'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#E040FB', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // Nuclear Infrastructure
      map.addLayer({ id: 'infra-glow', type: 'circle', source: 'infrastructure', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': ['case', ['in', 'SEISMIC RISK', ['get', 'status']], '#FF9500', '#76FF03'],
        'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'infra-dots', type: 'circle', source: 'infrastructure', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'circle-color': ['case', 
          ['in', 'SEISMIC RISK', ['get', 'status']], '#FF9500',
          ['==', ['get','status'], 'Active Conflict Zone'], '#FF1744', 
          ['==', ['get','status'], 'Destroyed / Decommissioning'], '#757575', 
          '#76FF03'
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2, 'circle-stroke-color': ['case', ['in', 'SEISMIC RISK', ['get', 'status']], '#FF9500', '#76FF03'], 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'infra-label', type: 'symbol', source: 'infrastructure', minzoom: 6.5, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': ['case', ['in', 'SEISMIC RISK', ['get', 'status']], '#FF9500', '#76FF03'], 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // Satellites
      map.addLayer({ id: 'sat-glow', type: 'circle', source: 'satellites', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,6], 'circle-color': ['get','color'], 'circle-opacity': 0.3, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'sat-dots', type: 'circle', source: 'satellites', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,1.5, 5,3], 'circle-color': ['get','color'], 'circle-opacity': 1.0,
      }});

      // Maritime — ports & naval bases
      map.addLayer({ id: 'maritime-glow', type: 'circle', source: 'maritime', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,12, 10,20],
        'circle-color': ['match', ['get','type'], 'naval','#FF3D3D', 'energy','#FF9500', '#00BCD4'],
        'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'maritime-dots', type: 'circle', source: 'maritime', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,9],
        'circle-color': ['match', ['get','type'], 'naval','#FF3D3D', 'energy','#FF9500', '#00BCD4'],
        'circle-opacity': 0.85,
        'circle-stroke-width': 2, 'circle-stroke-color': ['match', ['get','type'], 'naval','#FF3D3D', 'energy','#FF9500', '#00BCD4'], 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'maritime-label', type: 'symbol', source: 'maritime', minzoom: 6, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#00BCD4', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // Maritime chokepoints — pulsing warning diamonds
      map.addLayer({ id: 'choke-glow', type: 'circle', source: 'maritime-choke', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,10, 5,18, 10,28],
        'circle-color': '#FF9500', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'choke-dots', type: 'circle', source: 'maritime-choke', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,7, 10,12],
        'circle-color': ['match', ['get','risk'], 'CRITICAL','#FF1744', 'HIGH','#FF9500', 'ELEVATED','#FFD700', '#00E676'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF9500', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'choke-label', type: 'symbol', source: 'maritime-choke', minzoom: 5.5, layout: {
        'text-field': ['get','name'], 'text-size': 10, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF9500', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.9 }});

      // Live News — broadcast dots
      map.addLayer({ id: 'news-glow', type: 'circle', source: 'live-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#FF4081', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'news-dots', type: 'circle', source: 'live-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'circle-color': '#FF4081', 'circle-opacity': 0.85,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF4081', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'news-label', type: 'symbol', source: 'live-news', minzoom: 6, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF4081', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // SIGINT RSS news - gold markers
      map.addLayer({ id: 'sigint-news-glow', type: 'circle', source: 'sigint-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,10, 10,18],
        'circle-color': '#D4AF37', 'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'sigint-news-dots', type: 'circle', source: 'sigint-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,8],
        'circle-color': '#D4AF37', 'circle-opacity': 0.9,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#FFF8DC', 'circle-stroke-opacity': 0.6,
      }});
      map.addLayer({ id: 'sigint-news-label', type: 'symbol', source: 'sigint-news', minzoom: 5, layout: {
        'text-field': ['get','source'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.6], 'text-max-width': 10, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#D4AF37', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.85 }});

      // ══ IP SWEEP — Neighborhood device visualization ══
      map.addLayer({ id: 'sweep-connections', type: 'line', source: 'ip-sweep-connections', paint: {
        'line-color': ['get', 'color'], 'line-width': 1, 'line-opacity': 0.3, 'line-dasharray': [2, 4],
      }});
      map.addLayer({ id: 'sweep-pulse-ring', type: 'circle', source: 'ip-sweep-pulse', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 8,40, 12,80, 16,160],
        'circle-color': 'transparent', 'circle-opacity': 0.6,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF3D3D', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'sweep-device-glow', type: 'circle', source: 'ip-sweep-devices', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 8,8, 12,16, 16,30],
        'circle-color': ['get', 'color'], 'circle-opacity': 0.15, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'sweep-device-dots', type: 'circle', source: 'ip-sweep-devices', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 8,3, 12,6, 16,10],
        'circle-color': ['get', 'color'], 'circle-opacity': 0.95,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-opacity': 0.6,
      }});
      map.addLayer({ id: 'sweep-device-labels', type: 'symbol', source: 'ip-sweep-devices', minzoom: 13, layout: {
        'text-field': ['concat', ['get', 'device_type'], '\n', ['get', 'ip']],
        'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2.2], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: {
        'text-color': ['get', 'color'], 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9,
      }});

      // ══ SCAN TARGETS — Geolocated individual scans ══
      map.addLayer({ id: 'scan-targets-glow', type: 'circle', source: 'scan-targets', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,12, 5,25, 10,40],
        'circle-color': '#FF3D3D', 'circle-opacity': 0.2, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'scan-targets-dots', type: 'circle', source: 'scan-targets', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,12],
        'circle-color': '#FF3D3D', 'circle-opacity': 0.95,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-opacity': 0.8,
      }});
      map.addLayer({ id: 'scan-targets-label', type: 'symbol', source: 'scan-targets', minzoom: 6, layout: {
        'text-field': ['get', 'id'], 'text-size': 11, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF3D3D', 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9 }});

      // Flight trails — short, heading-derived wake lines (not historical routes)
      const flightTrailLayers = [
        { id: 'trail-commercial', src: 'flight-trails', color: '#00E5FF' },
        { id: 'trail-private', src: 'private-trails', color: '#00E676' },
        { id: 'trail-jets', src: 'jet-trails', color: '#FF69B4' },
        { id: 'trail-military', src: 'military-trails', color: '#FF3D3D' },
      ];
      flightTrailLayers.forEach(l => {
        map.addLayer({ id: l.id, type: 'line', source: l.src, paint: {
          'line-color': l.color,
          'line-width': ['interpolate',['linear'],['zoom'], 2.6,0.35, 5,0.75, 9,1.3],
          'line-opacity': ['interpolate',['linear'],['zoom'], 2.6,0.08, 5,0.18, 9,0.28],
          'line-blur': ['interpolate',['linear'],['zoom'], 2.6,0.08, 9,0.35],
        }});
      });

      // Flight layers (WebGL symbol — GPU rendered, handles 50K+ smooth)
      const flightLayers = [
        { id: 'fl-commercial', src: 'flights', icon: 'plane-cyan' },
        { id: 'fl-private', src: 'private-fl', icon: 'plane-green' },
        { id: 'fl-jets', src: 'jets', icon: 'plane-pink' },
        { id: 'fl-military', src: 'military', icon: 'plane-red' },
      ];
      flightLayers.forEach(l => {
        map.addLayer({ id: l.id, type: 'symbol', source: l.src, layout: {
          'icon-image': l.icon, 'icon-size': ['interpolate',['linear'],['zoom'], 1,0.4, 5,0.7, 10,1],
          'icon-rotate': ['get','heading'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
        }, paint: { 'icon-opacity': 0.85 }});
      });

      // Balloons (moving entities)
      map.addLayer({ id: 'balloon-dots', type: 'circle', source: 'balloons', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,7],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.8,
        'circle-stroke-width': 1, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'balloon-label', type: 'symbol', source: 'balloons', minzoom: 6, layout: {
        'text-field': ['get','callsign'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.2], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': ['get', 'color'], 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Radiation (glow based on reading level)
      map.addLayer({ id: 'rad-glow', type: 'circle', source: 'radiation', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,10, 5,20, 10,40],
        'circle-color': ['match', ['get','status'], 'DANGER','#FF1744', 'WARNING','#FF9500', '#AB47BC'],
        'circle-opacity': 0.15, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'rad-dots', type: 'circle', source: 'radiation', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,8],
        'circle-color': ['match', ['get','status'], 'DANGER','#FF1744', 'WARNING','#FF9500', '#AB47BC'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2, 'circle-stroke-color': ['match', ['get','status'], 'DANGER','#FF1744', 'WARNING','#FF9500', '#AB47BC'], 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'rad-label', type: 'symbol', source: 'radiation', minzoom: 6.5, layout: {
        'text-field': ['concat', ['to-string', ['get','reading']], ' nSv/h'], 'text-size': 9, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.5], 'text-allow-overlap': false,
      }, paint: { 'text-color': ['match', ['get','status'], 'DANGER','#FF1744', 'WARNING','#FF9500', '#AB47BC'], 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // ══ AEGIS SDK — Lattice Intelligence Mesh ══
      
      // -- GLOW LAYERS --
      map.addLayer({ id: 'sdk-sea-glow', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'SEA'], paint: {
        'line-color': '#4FC3F7',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 1.2, 5, 2.4, 10, 4.4],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.04, 5, 0.09, 10, 0.14],
        'line-blur': 1.1,
      }});
      map.addLayer({ id: 'sdk-air-glow', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'AIR'], paint: {
        'line-color': '#B3E5FC',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.9, 5, 1.8, 10, 3.2],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.03, 5, 0.07, 10, 0.1],
        'line-blur': 0.9,
      }});
      map.addLayer({ id: 'sdk-intel-glow', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'INTEL'], paint: {
        'line-color': '#81D4FA',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.75, 5, 1.6, 10, 2.8],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.03, 5, 0.06, 10, 0.09],
        'line-blur': 0.7,
      }});

      // -- CORE LINES --
      // Maritime routes — solid, brightest
      map.addLayer({ id: 'sdk-sea', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'SEA'], paint: {
        'line-color': '#4FC3F7',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.6, 5, 1.2, 10, 2],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.4, 5, 0.6, 10, 0.9],
      }});
      // Air corridors — dashed, medium
      map.addLayer({ id: 'sdk-air', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'AIR'], paint: {
        'line-color': '#B3E5FC',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.4, 5, 0.9, 10, 1.6],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.25, 5, 0.4, 10, 0.6],
        'line-dasharray': [6, 3],
      }});
      // Naval/Intel — dotted, subtle
      map.addLayer({ id: 'sdk-intel', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'INTEL'], paint: {
        'line-color': '#81D4FA',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.3, 5, 0.7, 10, 1.2],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.2, 5, 0.35, 10, 0.5],
        'line-dasharray': [2, 4],
      }});

      // Maritime Ships (moving entities)
      map.addLayer({ id: 'ship-dots', type: 'circle', source: 'maritime-ships', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,2, 5,4, 10,6],
        'circle-color': ['match', ['get','type'], 'military','#FF1744', 'tanker','#FF9500', 'cargo','#00BCD4', '#fff'],
        'circle-opacity': 0.8,
      }});
      map.addLayer({ id: 'ship-label', type: 'symbol', source: 'maritime-ships', minzoom: 6.5, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.2], 'text-allow-overlap': false,
      }, paint: { 'text-color': ['match', ['get','type'], 'military','#FF1744', 'tanker','#FF9500', 'cargo','#00BCD4', '#fff'], 'text-halo-color': '#000', 'text-halo-width': 1 }});

      setMapReady(true);
    });

    // Events
    let mouseFrame = 0;
    let pendingMouseCoords: { lat: number; lng: number } | null = null;
    map.on('mousemove', e => {
      if (map.isMoving()) return;
      pendingMouseCoords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      if (mouseFrame) return;
      mouseFrame = window.requestAnimationFrame(() => {
        mouseFrame = 0;
        if (pendingMouseCoords) onMouseCoords?.(pendingMouseCoords);
      });
    });
    map.on('contextmenu', e => { e.preventDefault(); onRightClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }); });
    const syncAdaptiveZoom = () => {
      const nextZoom = map.getZoom();
      if (Math.abs(lastAdaptiveZoomRef.current - nextZoom) >= 0.08) {
        lastAdaptiveZoomRef.current = nextZoom;
        setAdaptiveZoom(nextZoom);
      }
      return nextZoom;
    };

    map.on('moveend', () => {
      const c = map.getCenter();
      const nextZoom = syncAdaptiveZoom();
      const nextViewState = { zoom: nextZoom, latitude: c.lat };
      const lastViewState = lastViewStateRef.current;
      const now = Date.now();

      if (
        lastViewState
        && Math.abs(lastViewState.zoom - nextViewState.zoom) < 0.04
        && Math.abs(lastViewState.latitude - nextViewState.latitude) < 0.12
        && now - lastViewStateEmitRef.current < 220
      ) {
        return;
      }

      lastViewStateEmitRef.current = now;
      lastViewStateRef.current = nextViewState;
      onViewStateChange?.(nextViewState);
    });

    map.on('zoomend', () => {
      syncAdaptiveZoom();
    });
    const pauseGlobeSpin = () => {
      globeSpinPauseUntilRef.current = Date.now() + 5000;
    };
    map.on('mousedown', pauseGlobeSpin);
    map.on('touchstart', pauseGlobeSpin);
    map.on('dragstart', pauseGlobeSpin);
    map.on('rotatestart', pauseGlobeSpin);
    map.on('pitchstart', pauseGlobeSpin);
    map.on('zoomstart', pauseGlobeSpin);

    // ── POPUP HELPER ──
    const popup = (coords: Coordinates, html: string) => {
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '420px', offset: 14 }).setLngLat(coords).setHTML(html).addTo(map);
    };
    const pStyle = `background:rgba(12,14,26,0.95);backdrop-filter:blur(16px);border-radius:10px;padding:16px;font-family:'JetBrains Mono',monospace;`;
    const linkStyle = `display:inline-block;margin-top:8px;padding:5px 12px;font-size:10px;letter-spacing:0.12em;text-decoration:none;border-radius:5px;font-family:'JetBrains Mono',monospace;`;

    // ── Flights (with FlightAware + ADS-B Exchange links) ──
    ['fl-commercial','fl-private','fl-jets','fl-military'].forEach(layer => {
      map.on('click', layer, e => {
        if (!e.features?.length) return;
        const p = e.features[0].properties as EntityProperties;
        const coords = (e.features[0].geometry).coordinates;
        const cs = (p.callsign||'').trim();
        popup(coords, `<div style="${pStyle}border:1px solid rgba(212,175,55,0.3);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="color:#D4AF37;font-size:16px;font-weight:700;letter-spacing:0.1em;">${cs}</span>
            <span style="color:#5C5A54;font-size:10px;">${p.icao24||''}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:11px;">
            <div><span style="color:#5C5A54;font-size:9px;">MODEL</span><br/><span style="color:#E8E6E0;">${p.model||'—'}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">ALT</span><br/><span style="color:#00E5FF;">${p.alt?Math.round(p.alt)+'m':'—'}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">SPEED</span><br/><span style="color:#E8E6E0;">${p.speed_knots||'—'}kt</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">HDG</span><br/><span style="color:#E8E6E0;">${Math.round(p.heading||0)}°</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">REG</span><br/><span style="color:#E8E6E0;">${p.registration||'—'}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">POS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(2)},${coords[0].toFixed(2)}</span></div>
          </div>
          <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">
            <a href="https://www.flightaware.com/live/flight/${cs}" target="_blank" style="${linkStyle}color:#D4AF37;border:1px solid rgba(212,175,55,0.4);background:rgba(212,175,55,0.1);">⚡ FLIGHTAWARE</a>
            <a href="https://globe.adsbexchange.com/?icao=${p.icao24||''}" target="_blank" style="${linkStyle}color:#00E5FF;border:1px solid rgba(0,229,255,0.4);background:rgba(0,229,255,0.1);">📡 ADS-B</a>
            <a href="https://www.radarbox.com/data/flights/${cs}" target="_blank" style="${linkStyle}color:#FF69B4;border:1px solid rgba(255,105,180,0.4);background:rgba(255,105,180,0.1);">📍 RADARBOX</a>
          </div>
        </div>`);
        onEntityClick?.(p);
      });
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    // ── CCTV (opens CameraViewer panel) ──
    map.on('click', 'cctv-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as EntityProperties;
      const coords = (e.features[0].geometry).coordinates;
      // Emit the camera data so the CameraViewer opens
      onEntityClick?.({
        type: 'cctv',
        id: p.id,
        name: p.name,
        city: p.city,
        country: p.country,
        source: p.source,
        feed_url: p.feed_url,
        stream_url: p.stream_url,
        stream_type: p.stream_type,
        external_url: p.external_url,
        lat: coords[1],
        lng: coords[0],
      });
      // Also fly to the camera
      map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 13), duration: 1000 });
    });

    // ── Earthquakes (with USGS link) ──
    map.on('click', 'eq-circles', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as EntityProperties;
      const coords = (e.features[0].geometry).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,149,0,0.3);">
        <div style="color:#FF9500;font-size:14px;font-weight:700;margin-bottom:4px;">M${p.magnitude} EARTHQUAKE</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${p.place||'Unknown location'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">DEPTH</span><br/><span style="color:#E8E6E0;">${p.depth||'—'}km</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}, ${coords[0].toFixed(3)}</span></div>
        </div>
        <a href="${p.source === 'NIGGG-BAS' ? 'https://ndc.niggg.bas.bg/' : `https://earthquake.usgs.gov/earthquakes/eventpage/${p.id||''}`}" target="_blank" style="${linkStyle}color:#FF9500;border:1px solid rgba(255,149,0,0.4);background:rgba(255,149,0,0.1);">📊 ${p.source === 'NIGGG-BAS' ? 'NIGGG-BAS' : 'USGS DETAILS'}</a>
      </div>`);
      onEntityClick?.({ type: 'earthquake', lat: coords[1], lng: coords[0], magnitude: p.magnitude, place: p.place, source: p.source, id: p.id });
    });

    // ── Satellites (SatNOGS powered) ──
    map.on('click', 'sat-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as EntityProperties;
      const coords = (e.features[0].geometry).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(212,175,55,0.3);">
        <div style="color:#D4AF37;font-size:12px;font-weight:700;letter-spacing:0.1em;margin-bottom:4px;">🛰️ ${p.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">MISSION</span><br/><span style="color:${p.color||'#aaa'};">${p.mission||'Unknown'}</span></div>
          <div><span style="color:#5C5A54;">ALT</span><br/><span style="color:#00E5FF;">${p.alt ? p.alt+' km' : '—'}</span></div>
          <div><span style="color:#5C5A54;">POS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(2)}°, ${coords[0].toFixed(2)}°</span></div>
        </div>
        ${p.noradId ? `<a href="https://db.satnogs.org/satellite/${p.noradId}/" target="_blank" style="display:block;text-align:center;padding:4px;margin-top:6px;font-size:8px;font-family:monospace;letter-spacing:0.1em;text-decoration:none;color:#00E5FF;border:1px solid rgba(0,229,255,0.4);background:rgba(0,229,255,0.1);border-radius:2px;cursor:pointer;">OPEN SOURCE ↗</a>` : ''}
      </div>`);
    });

    // ── Fires (with NASA FIRMS link) ──
    map.on('click', 'fires-heat', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as EntityProperties;
      const coords = (e.features[0].geometry).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,107,0,0.3);">
        <div style="color:#FF6B00;font-size:12px;font-weight:700;margin-bottom:6px;">🔥 ACTIVE FIRE DETECTED</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">BRIGHTNESS</span><br/><span style="color:#FF6B00;">${p.brightness||'—'}K</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <a href="https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;l:noaa20-viirs,viirs,modis_a,modis_t;@${coords[0]},${coords[1]},10z" target="_blank" style="${linkStyle}color:#FF6B00;border:1px solid rgba(255,107,0,0.4);background:rgba(255,107,0,0.1);">🛰️ NASA FIRMS MAP</a>
      </div>`);
      onEntityClick?.({ type: 'fire', lat: coords[1], lng: coords[0], brightness: p.brightness });
    });

    const openGdeltPopup = (coords: Coordinates, props: EntityProperties) => {
      const severityColor = props.severity === 'critical' ? '#FF1744' : props.severity === 'high' ? '#FF6B00' : props.severity === 'elevated' ? '#FFD500' : '#64B5F6';
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,61,61,0.3);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
          <div style="color:${severityColor};font-size:12px;font-weight:700;">⚠️ ${String(props.severity || 'incident').toUpperCase()} INCIDENT</div>
          ${props.fusionScore ? `<span style="padding:3px 7px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#C7E3FF;font-size:9px;letter-spacing:0.08em;">FUSION ${props.fusionScore}</span>` : ''}
        </div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:6px;line-height:1.4;">${props.title || props.name || 'Unclassified incident'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">SOURCE</span><br/><span style="color:#E8E6E0;">${props.source || 'GDELT'}</span></div>
          <div><span style="color:#5C5A54;">THEME</span><br/><span style="color:#E8E6E0;">${props.theme || 'Geopolitical Incident'}</span></div>
          <div><span style="color:#5C5A54;">MENTIONS</span><br/><span style="color:#E8E6E0;">${props.mentions || 1}</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(2)}°, ${coords[0].toFixed(2)}°</span></div>
          ${props.priorityRank ? `<div><span style="color:#5C5A54;">HOTSPOT</span><br/><span style="color:${severityColor};">TOP ${props.priorityRank}</span></div>` : ''}
          ${props.date ? `<div><span style="color:#5C5A54;">DATE</span><br/><span style="color:#E8E6E0;">${props.date}</span></div>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${props.url ? `<a href="${props.url}" target="_blank" style="${linkStyle}color:#FF3D3D;border:1px solid rgba(255,61,61,0.4);background:rgba(255,61,61,0.1);">SOURCE</a>` : ''}
          <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},12z" target="_blank" style="${linkStyle}color:#448AFF;border:1px solid rgba(68,138,255,0.4);background:rgba(68,138,255,0.1);">MAP</a>
        </div>
      </div>`);
    };

    // ── GDELT Conflicts (with source article) ──
    ['gdelt-dots', 'gdelt-hotspot-core', 'gdelt-hotspot-halo'].forEach(layer => {
      map.on('click', layer, e => {
        if (!e.features?.length) return;
        const p = e.features[0].properties as EntityProperties;
        const coords = (e.features[0].geometry).coordinates;
        openGdeltPopup(coords, p);
        onEntityClick?.({ type: 'incident', lat: coords[1], lng: coords[0], title: p.title, severity: p.severity, source: p.source, url: p.url });
      });
    });

    // ── Global Event / Conflict Markers ──
    map.on('click', 'conflict-icons', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as EntityProperties;
      const coords = (e.features[0].geometry).coordinates;
      const color = p.severity === 'war' ? '#FF1744' : p.severity === 'high' ? '#FF9500' : '#FFD500';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="color:${color};font-size:12px;font-weight:700;margin-bottom:6px;">⚠️ ${p.label || 'WARNING EVENT'}</div>
        <div style="font-size:10px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.description || 'Global event detected at this location.'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">SEVERITY</span><br/><span style="color:${color};">${(p.severity||'unknown').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
      </div>`);
    });


    // ── AEGIS SDK link click ──
    const SDK_SOURCE_URLS: Record<string, string> = {
      'AIS Maritime': 'https://www.marinetraffic.com',
      'AIS Stream': 'https://aisstream.io',
      'AIS → Lattice': 'https://aisstream.io',
      'ADS-B / OpenSky': 'https://opensky-network.org',
      'ADS-B → Lattice': 'https://opensky-network.org',
      'Naval Intelligence': 'https://www.odni.gov',
    };
    ['sdk-sea','sdk-sea-glow','sdk-air','sdk-air-glow','sdk-intel','sdk-intel-glow'].forEach(layer => {
      map.on('click', layer, e => {
        if (!e.features?.length) return;
        const p = e.features[0].properties as EntityProperties;
        const coords = e.lngLat;
        const srcUrl = p.url || SDK_SOURCE_URLS[p.source] || 'https://github.com/Blackleets/aegis';
        const domainLabel = p.domain === 'SEA' ? '⚓ MARITIME' : p.domain === 'AIR' ? '✈ AIR CORRIDOR' : '🛡 NAVAL INTEL';
        const domainColor = p.domain === 'SEA' ? '#4FC3F7' : p.domain === 'AIR' ? '#B3E5FC' : '#81D4FA';
        const linkStyle = 'text-decoration:none;padding:3px 8px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:0.05em;';
        popup([coords.lng, coords.lat], `<div style="${pStyle}border:1px solid ${domainColor}40;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${domainColor};box-shadow:0 0 8px ${domainColor};"></div>
            <span style="color:${domainColor};font-size:11px;font-weight:700;letter-spacing:0.1em;">${domainLabel}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px;margin-bottom:8px;">
            <div><span style="color:#5C5A54;">FROM</span><br/><span style="color:#E8E6E0;">${p.fromName || 'Origin'}</span></div>
            <div><span style="color:#5C5A54;">TO</span><br/><span style="color:#E8E6E0;">${p.toName || 'Destination'}</span></div>
            <div><span style="color:#5C5A54;">DOMAIN</span><br/><span style="color:${domainColor};">${p.domain}</span></div>
            <div><span style="color:#5C5A54;">SOURCE</span><br/><a href="${srcUrl}" target="_blank" style="color:${domainColor};text-decoration:underline;cursor:pointer;">${p.source || 'AEGIS'}</a></div>
          </div>
          <a href="${srcUrl}" target="_blank" style="${linkStyle}color:${domainColor};border:1px solid ${domainColor}40;background:${domainColor}18;display:inline-block;margin-top:4px;">OPEN SOURCE ↗</a>
        </div>`);
      });
    });

    // ── Generic hover for clickables ──
    ['conflict-icons','cctv-dots','eq-circles','sat-dots','fires-heat','gdelt-dots','gdelt-hotspot-core','gdelt-hotspot-halo','weather-dots','infra-dots','maritime-dots','choke-dots','news-dots','sigint-news-dots','balloon-dots','rad-dots','ship-dots','sweep-device-dots','scan-targets-dots','sdk-sea','sdk-sea-glow','sdk-air','sdk-air-glow','sdk-intel','sdk-intel-glow'].forEach(layer => {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    // ── Scan Targets click ──
    map.on('click', 'scan-targets-dots', (e: FeatureEvent) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = e.features[0].geometry.coordinates.slice();
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,61,61,0.5);">
        <div style="color:#FF3D3D;font-size:12px;font-weight:700;margin-bottom:6px;">🎯 TARGET: ${p.id}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${p.city || 'Unknown'}, ${p.country || 'Unknown'} — ${p.isp || 'Unknown ISP'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">TYPE</span><br/><span style="color:#00E5FF;">${(p.type || 'UNKNOWN').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
      </div>`);
    });

    // ── SCM Suppliers ──
    map.on('click', 'scm-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as EntityProperties;
      const coords = (e.features[0].geometry).coordinates;
      const color = p.risk_level === 'CRITICAL' ? '#FF1744' : p.risk_level === 'HIGH' ? '#FF9500' : '#00BCD4';
      const activeThreats = p.active_threats ? JSON.parse(p.active_threats) : [];
      
      let threatsHtml = '';
      if (activeThreats.length > 0) {
        threatsHtml = `<div style="margin-top:8px;padding-top:6px;border-top:1px solid ${color}40;color:${color};font-size:9px;font-weight:bold;">
          ACTIVE THREATS:<br/>${activeThreats.map((t: string) => `⚠ ${t}`).join('<br/>')}
        </div>`;
      }

      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="color:${color};font-size:12px;font-weight:700;margin-bottom:4px;">🏢 ${p.name}</div>
        <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${p.category} | ${p.city}, ${p.country}</div>
        <div style="display:grid;grid-template-columns:1fr;gap:4px;font-size:11px;">
          <div><span style="color:#5C5A54;font-size:9px;">SCM RISK LEVEL</span><br/><span style="color:${color};font-weight:bold;">${p.risk_level}</span></div>
        </div>
        ${threatsHtml}
      </div>`);
    });

    // ── IP Sweep device click ──
    map.on('click', 'sweep-device-dots', (e: FeatureEvent) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = e.features[0].geometry.coordinates.slice();
      const ports = JSON.parse(p.ports || '[]');
      const vulns = JSON.parse(p.vulns || '[]');
      const hostnames = JSON.parse(p.hostnames || '[]');
      const riskColors: Record<string, string> = { CRITICAL: '#FF3D3D', HIGH: '#FF6B00', MEDIUM: '#FFD700', LOW: '#76FF03', INFO: '#5C5A54' };
      popup(coords, `<div style="font-family:monospace;font-size:11px;color:#E8E6E0;">
        <div style="font-size:13px;font-weight:bold;margin-bottom:6px;color:${p.color};">${p.device_type}</div>
        <div style="font-size:12px;margin-bottom:8px;color:#fff;">${p.ip}</div>
        ${hostnames.length > 0 ? `<div style="font-size:9px;color:#8A8880;margin-bottom:6px;">${hostnames.join(', ')}</div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">PORTS</span><br/><span style="color:#E8E6E0;">${ports.length}</span></div>
          <div><span style="color:#5C5A54;">RISK</span><br/><span style="color:${riskColors[p.risk_level] || '#666'};">${p.risk_level}</span></div>
        </div>
        <div style="font-size:9px;color:#8A8880;margin-bottom:6px;">Open: ${ports.slice(0, 12).join(', ')}${ports.length > 12 ? ' ...' : ''}</div>
        ${vulns.length > 0 ? `<div style="font-size:9px;color:#FF3D3D;margin-bottom:6px;">⚠ CVEs: ${vulns.slice(0, 5).join(', ')}${vulns.length > 5 ? ` +${vulns.length - 5} more` : ''}</div>` : ''}
      </div>`);
    });

    // ── Balloons / Sondes ──
    map.on('click', 'balloon-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as EntityProperties;
      const coords = (e.features[0].geometry).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid ${p.color}40;">
        <div style="color:${p.color};font-size:12px;font-weight:700;letter-spacing:0.1em;margin-bottom:4px;">🎈 ${p.callsign}</div>
        <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${p.type.toUpperCase()} / STATUS: ${p.status.toUpperCase()}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">ALTITUDE</span><br/><span style="color:#E8E6E0;">${p.altitude} m</span></div>
          <div><span style="color:#5C5A54;">SPEED</span><br/><span style="color:#E8E6E0;">${Math.round(p.speed)} km/h</span></div>
          <div><span style="color:#5C5A54;">VERT RATE</span><br/><span style="color:${p.verticalRate > 0 ? '#00E676' : '#FF3D3D'};">${p.verticalRate.toFixed(1)} m/s</span></div>
          <div><span style="color:#5C5A54;">TEMP</span><br/><span style="color:#E8E6E0;">${p.temperature}°C</span></div>
        </div>
      </div>`);
    });

    // ── Radiation ──
    map.on('click', 'rad-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as EntityProperties;
      const coords = (e.features[0].geometry).coordinates;
      const color = p.status === 'DANGER' ? '#FF1744' : p.status === 'WARNING' ? '#FF9500' : '#AB47BC';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="color:${color};font-size:12px;font-weight:700;margin-bottom:4px;">☢️ ${p.name}</div>
        <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${p.city}, ${p.country}</div>
        <div style="display:grid;grid-template-columns:1fr;gap:4px;font-size:11px;">
          <div><span style="color:#5C5A54;font-size:9px;">READING</span><br/><span style="color:${color};font-weight:bold;">${p.reading} nSv/h</span></div>
          <div><span style="color:#5C5A54;font-size:9px;">STATUS</span><br/><span style="color:${color};">${p.status}</span></div>
          <div><span style="color:#5C5A54;font-size:9px;">NETWORK</span><br/><span style="color:#E8E6E0;">${p.network}</span></div>
        </div>
      </div>`);
    });

    // ── Maritime Ships ──
    map.on('click', 'ship-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as EntityProperties;
      const coords = (e.features[0].geometry).coordinates;
      const color = p.type === 'military' ? '#FF1744' : p.type === 'tanker' ? '#FF9500' : '#00BCD4';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:${color};font-size:12px;font-weight:700;letter-spacing:0.1em;">🚢 ${p.name}</span>
          <span style="color:#aaa;font-size:9px;">${p.flag}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">TYPE</span><br/><span style="color:${color};">${p.type.toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">SPEED</span><br/><span style="color:#E8E6E0;">${p.speed} knots</span></div>
          <div><span style="color:#5C5A54;">HEADING</span><br/><span style="color:#E8E6E0;">${p.heading}°</span></div>
          <div><span style="color:#5C5A54;">DEST</span><br/><span style="color:#E8E6E0;">${p.destination || 'UNKNOWN'}</span></div>
        </div>
      </div>`);
    });

    // ── Weather Events (NASA EONET) ──
    map.on('click', 'weather-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as EntityProperties;
      const coords = (e.features[0].geometry).coordinates;
      const iconEmoji = p.icon === 'cyclone' ? '🌀' : p.icon === 'volcano' ? '🌋' : '⚡';
      popup(coords, `<div style="${pStyle}border:1px solid rgba(224,64,251,0.3);">
        <div style="color:#E040FB;font-size:14px;font-weight:700;margin-bottom:6px;">${iconEmoji} ${p.type || 'Weather Event'}</div>
        <div style="font-size:10px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.title || 'Unknown event'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">SEVERITY</span><br/><span style="color:${p.severity === 'high' ? '#FF1744' : '#FFD700'};">${(p.severity||'low').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <div style="display:flex;gap:6px;">
          ${p.source ? `<a href="${p.source}" target="_blank" style="${linkStyle}color:#E040FB;border:1px solid rgba(224,64,251,0.4);background:rgba(224,64,251,0.1);">📡 SOURCE</a>` : ''}
          <a href="https://eonet.gsfc.nasa.gov/api/v3/events/${p.id || ''}" target="_blank" style="${linkStyle}color:#D4AF37;border:1px solid rgba(212,175,55,0.4);background:rgba(212,175,55,0.1);">🛰️ NASA EONET</a>
        </div>
      </div>`);
      onEntityClick?.({ type: 'weather_event', lat: coords[1], lng: coords[0], title: p.title, severity: p.severity, source: p.source, id: p.id });
    });

    // ── Nuclear Infrastructure ──
    map.on('click', 'infra-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as EntityProperties;
      const coords = (e.features[0].geometry).coordinates;
      const statusColor = p.status.includes('SEISMIC RISK') ? '#FF9500' : p.status === 'Active Conflict Zone' ? '#FF1744' : p.status === 'Operational' ? '#76FF03' : '#757575';
      popup(coords, `<div style="${pStyle}border:1px solid rgba(118,255,3,0.3);">
        <div style="color:#76FF03;font-size:14px;font-weight:700;margin-bottom:4px;">☢️ ${p.name || 'Nuclear Facility'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">STATUS</span><br/><span style="color:${statusColor};">${p.status || '—'}</span></div>
          <div><span style="color:#5C5A54;">CITY</span><br/><span style="color:#E8E6E0;">${p.city || '—'}, ${p.country || ''}</span></div>
          <div><span style="color:#5C5A54;">REACTORS</span><br/><span style="color:#76FF03;">${p.reactors || '—'}</span></div>
          <div><span style="color:#5C5A54;">CAPACITY</span><br/><span style="color:#E8E6E0;">${p.capacityMW ? p.capacityMW.toLocaleString() + ' MW' : '—'}</span></div>
          <div><span style="color:#5C5A54;">OWNER</span><br/><span style="color:#E8E6E0;">${p.owner || '—'}</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},14z/data=!3m1!1e3" target="_blank" style="${linkStyle}color:#76FF03;border:1px solid rgba(118,255,3,0.4);background:rgba(118,255,3,0.1);">SATELLITE VIEW</a>
      </div>`);
      onEntityClick?.({ type: 'infrastructure', lat: coords[1], lng: coords[0], name: p.name, status: p.status, country: p.country });
    });

    // ── Maritime Ports & Naval Bases ──
    map.on('click', 'maritime-dots', e => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = (e.features![0].geometry).coordinates;
      const typeColor = p.type === 'naval' ? '#FF3D3D' : p.type === 'energy' ? '#FF9500' : '#00BCD4';
      const typeLabel = p.type === 'naval' ? 'NAVAL BASE' : p.type === 'energy' ? 'ENERGY PORT' : 'CONTAINER PORT';
      
      const congestionHtml = p.congestion ? `
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.1);">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <div><span style="color:#5C5A54;font-size:9px;">CONGESTION</span><br/><span style="color:${p.congestion === 'SEVERE' ? '#FF1744' : p.congestion === 'CONGESTED' ? '#FF9500' : '#00E676'};font-weight:bold;font-size:10px;">${p.congestion}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">EST. DWELL TIME</span><br/><span style="color:#E8E6E0;font-weight:bold;font-size:10px;">${p.dwell_time || 'Unknown'}</span></div>
          </div>
        </div>` : '';

      popup(coords, `<div style="${pStyle}border:1px solid ${typeColor}40;">
        <div style="color:${typeColor};font-weight:bold;font-size:11px;margin-bottom:4px;">${p.name}</div>
        <div style="color:#999;font-size:9px;margin-bottom:6px;">${typeLabel} — ${p.country}</div>
        ${p.volume ? `<div style="font-size:9px;color:#aaa;">Volume: <span style="color:${typeColor};font-weight:bold;">${p.volume}</span></div>` : ''}
        ${p.fleet ? `<div style="font-size:9px;color:#aaa;">Fleet: <span style="color:${typeColor};font-weight:bold;">${p.fleet}</span></div>` : ''}
        ${p.rank ? `<div style="font-size:9px;color:#aaa;">Global Rank: <span style="color:${typeColor};font-weight:bold;">#${p.rank}</span></div>` : ''}
        ${congestionHtml}
      </div>`);
    });

    // ── Maritime Chokepoints ──
    map.on('click', 'choke-dots', e => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = (e.features![0].geometry).coordinates;
      const riskCol = p.risk === 'CRITICAL' ? '#FF1744' : p.risk === 'HIGH' ? '#FF9500' : p.risk === 'ELEVATED' ? '#FFD700' : '#00E676';
      popup(coords, `<div style="${pStyle}border:1px solid ${riskCol}40;">
        <div style="color:#FF9500;font-weight:bold;font-size:11px;margin-bottom:4px;">${p.name}</div>
        <div style="font-size:9px;color:#aaa;">Traffic: <span style="color:#fff;">${p.traffic}</span></div>
        <div style="font-size:9px;color:#aaa;">Risk: <span style="color:${riskCol};font-weight:bold;">${p.risk}</span></div>
      </div>`);
    });

    // ── Live News (opens feed viewer) ──
    map.on('click', 'news-dots', e => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      onEntityClick?.({
        type: 'live_news',
        name: p.name,
        city: p.city,
        country: p.country,
        url: p.url,
        category: p.category,
        embed_allowed: p.embed_allowed !== false && p.embed_allowed !== 'false',
      });
    });

    return () => {
      if (mouseFrame) window.cancelAnimationFrame(mouseFrame);
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [applyAegisGlobeStyling, createDot, createIcon, onEntityClick, onMouseCoords, onRightClick, onViewStateChange]);

  // Day/Night
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const update = () => {
      const src = map.getSource('day-night') as GeoJsonSourceHandle | undefined;
      if (!src) return;
      if (!activeLayers.day_night) { src.setData(EMPTY_FC); return; }
      src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [computeSolarTerminator()] }, properties: {} }] });
    };

    const iv = setInterval(update, 300000); // 5 min (was 1 min — shadow barely moves)
    return () => clearInterval(iv);
  }, [mapReady, activeLayers.day_night]);

  // Helper to set GeoJSON
  const setGeo = useCallback((source: string, features: GeoJsonFeature[]) => {
    const src = mapRef.current?.getSource(source) as GeoJsonSourceHandle | undefined;
    if (src) src.setData({ type: 'FeatureCollection', features });
  }, []);

  const setVis = useCallback((ids: string[], visible: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    ids.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); });
  }, []);

  const applyAdaptiveDeclutter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const isGlobe = projection === 'globe';
    const isOverview = isGlobe && adaptiveZoom <= GLOBE_OVERVIEW_ZOOM;
    const isDetail = adaptiveZoom >= GLOBE_DETAIL_ZOOM;

    setVis([...OVERVIEW_LABEL_LAYERS], !isOverview);
    setVis([...OVERVIEW_GLOW_LAYERS], !isOverview || isDetail);
    setVis([...OVERVIEW_SECONDARY_DOT_LAYERS], !isOverview);
    setVis([...OVERVIEW_SECONDARY_SYMBOL_LAYERS], !isOverview);

    if (map.getLayer('conflict-icons')) {
      map.setLayoutProperty('conflict-icons', 'visibility', activeLayers.conflict_zones !== false ? 'visible' : 'none');
      map.setPaintProperty('conflict-icons', 'text-opacity', isOverview ? 0.62 : 0.9);
    }

    if (map.getLayer('gdelt-hotspot-core')) {
      map.setPaintProperty('gdelt-hotspot-core', 'circle-opacity', isOverview ? 0.78 : 0.96);
      map.setPaintProperty('gdelt-hotspot-core', 'circle-stroke-opacity', isOverview ? 0.52 : 0.78);
    }

    if (map.getLayer('gdelt-hotspot-halo')) {
      map.setPaintProperty('gdelt-hotspot-halo', 'circle-opacity', isOverview ? 0.06 : ['interpolate',['linear'],['zoom'], 1,0.10, 5,0.16, 10,0.22]);
    }

    if (map.getLayer('gdelt-dots')) {
      map.setPaintProperty('gdelt-dots', 'circle-opacity', isOverview ? 0.4 : 0.72);
      map.setPaintProperty('gdelt-dots', 'circle-stroke-opacity', isOverview ? 0.22 : 0.38);
    }

    if (map.getLayer('day-night-fill')) {
      map.setPaintProperty('day-night-fill', 'fill-opacity', isOverview ? 0.08 : projection === 'globe' ? 0.05 : 0.16);
    }
  }, [activeLayers.conflict_zones, adaptiveZoom, projection, setVis]);

  // Flight data → GeoJSON (GPU rendered)
  useEffect(() => {
    if (!mapReady) return;

    const validFlights = (arr: MapEntity[] = []) => arr.filter((f) => typeof f.lat === 'number' && typeof f.lng === 'number');
    const toFeatures = (arr: MapEntity[] = []) => validFlights(arr).map((f) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [f.lng as number, f.lat as number] },
      properties: { callsign: f.callsign, heading: f.heading || 0, alt: f.alt, model: f.model, speed_knots: f.speed_knots, registration: f.registration, icao24: f.icao24 },
    }));
    const toTrailFeatures = (arr: MapEntity[] = []) => validFlights(arr).map((f) => {
      const coordinates = getFlightTrailCoordinates(f);
      if (!coordinates) return null;
      return {
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates },
        properties: { callsign: f.callsign, heading: f.heading || 0, speed_knots: f.speed_knots, alt: f.alt },
      };
    }).filter((feature): feature is GeoJsonFeature => feature !== null);

    setGeo('flights', activeLayers.flights ? toFeatures(data.commercial_flights) : []);
    setGeo('flight-trails', activeLayers.flights ? toTrailFeatures(data.commercial_flights) : []);
    setGeo('private-fl', activeLayers.private ? toFeatures(data.private_flights) : []);
    setGeo('private-trails', activeLayers.private ? toTrailFeatures(data.private_flights) : []);
    setGeo('jets', activeLayers.jets ? toFeatures(data.private_jets) : []);
    setGeo('jet-trails', activeLayers.jets ? toTrailFeatures(data.private_jets) : []);
    setGeo('military', activeLayers.military ? toFeatures(data.military_flights) : []);
    setGeo('military-trails', activeLayers.military ? toTrailFeatures(data.military_flights) : []);
  }, [mapReady, data.commercial_flights, data.private_flights, data.private_jets, data.military_flights, activeLayers.flights, activeLayers.private, activeLayers.jets, activeLayers.military, setGeo]);

  // ── DECOUPLED LAYER RENDERERS (Performance Optimized) ──

  useEffect(() => {
    if (!mapReady) return;
    setGeo('earthquakes', activeLayers.earthquakes && data.earthquakes ? data.earthquakes.map((eq: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [eq.lng, eq.lat] }, properties: { magnitude: eq.magnitude, place: eq.place } })) : []);
  }, [mapReady, data.earthquakes, activeLayers.earthquakes, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('satellites', activeLayers.satellites && data.satellites ? data.satellites.map((s: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name, color: s.color, mission: s.mission, alt: s.alt, noradId: s.noradId } })) : []);
  }, [mapReady, data.satellites, activeLayers.satellites, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const incidents = activeLayers.global_incidents && data.gdelt ? data.gdelt.filter((e: MapEntity) => typeof e.lng === 'number' && typeof e.lat === 'number') : [];
    setGeo('gdelt', incidents.map((e: MapEntity) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
      properties: {
        name: e.name,
        title: e.title,
        url: e.url,
        source: e.source,
        severity: e.severity,
        theme: e.theme,
        mentions: e.mentions,
        date: e.date,
        fusionScore: getFusionScore(e),
      },
    })));

    const hotspotMap = new Map<string, MapEntity & { fusionScore: number }>();
    incidents.forEach((incident: MapEntity) => {
      const fusionScore = getFusionScore(incident);
      const label = getHotspotLabel(incident);
      const existing = hotspotMap.get(label);
      if (!existing || fusionScore > existing.fusionScore) {
        hotspotMap.set(label, { ...incident, fusionScore });
      }
    });

    const hotspotFeatures = Array.from(hotspotMap.values())
      .sort((a, b) => b.fusionScore - a.fusionScore)
      .slice(0, 5)
      .map((incident, index) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [incident.lng, incident.lat] },
        properties: {
          name: incident.name,
          title: incident.title,
          url: incident.url,
          source: incident.source,
          severity: incident.severity,
          theme: incident.theme,
          mentions: incident.mentions,
          date: incident.date,
          fusionScore: incident.fusionScore,
          hotspotLabel: getHotspotLabel(incident),
          priorityRank: index + 1,
        },
      }));
    setGeo('gdelt-hotspots', hotspotFeatures);
  }, [mapReady, data.gdelt, activeLayers.global_incidents, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('gps-jamming', activeLayers.gps_jamming && data.gps_jamming ? data.gps_jamming.map((z: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [z.lng, z.lat] }, properties: { severity: z.severity } })) : []);
  }, [mapReady, data.gps_jamming, activeLayers.gps_jamming, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const cameras = isOverviewMode
      ? takeTopEntities(data.cameras, OVERVIEW_ENTITY_LIMITS.cctv, (c: MapEntity) => Number(c.priority ?? c.rank ?? 0))
      : (data.cameras || []);
    setGeo('cctv', activeLayers.cctv && cameras ? cameras.map((c: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] }, properties: { id: c.id, name: c.name, city: c.city, country: c.country, source: c.source, feed_url: c.feed_url, stream_url: c.stream_url, stream_type: c.stream_type, external_url: c.external_url } })) : []);
  }, [mapReady, data.cameras, activeLayers.cctv, isOverviewMode, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('fires', activeLayers.fires && data.fires ? data.fires.map((f: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] }, properties: { brightness: f.brightness } })) : []);
  }, [mapReady, data.fires, activeLayers.fires, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const weatherEvents = isOverviewMode
      ? takeTopEntities(data.weather_events, OVERVIEW_ENTITY_LIMITS.weather, (w: MapEntity) => getSeverityWeight(w.severity))
      : (data.weather_events || []);
    setGeo('weather', activeLayers.weather && weatherEvents ? weatherEvents.map((w: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [w.lng, w.lat] }, properties: { title: w.title, type: w.type, icon: w.icon, severity: w.severity, source: w.source, id: w.id } })) : []);
  }, [mapReady, data.weather_events, activeLayers.weather, isOverviewMode, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const infrastructureItems = isOverviewMode
      ? takeTopEntities(data.infrastructure, OVERVIEW_ENTITY_LIMITS.infrastructure, (i: MapEntity) => Number(i.capacityMW ?? 0) + (Number(i.reactors ?? 0) * 2000))
      : (data.infrastructure || []);
    setGeo('infrastructure', activeLayers.infrastructure && infrastructureItems ? infrastructureItems.map((i: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [i.lng, i.lat] }, properties: { name: i.name, city: i.city, country: i.country, status: i.status, reactors: i.reactors, capacityMW: i.capacityMW, owner: i.owner } })) : []);
  }, [mapReady, data.infrastructure, activeLayers.infrastructure, isOverviewMode, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const ports = isOverviewMode
      ? takeTopEntities(data.maritime_ports, OVERVIEW_ENTITY_LIMITS.maritimePorts, (p: MapEntity) => Number(p.rank ?? p.volume ?? 0))
      : (data.maritime_ports || []);
    const chokepoints = isOverviewMode
      ? takeTopEntities(data.maritime_chokepoints, OVERVIEW_ENTITY_LIMITS.maritimeChokepoints, (c: MapEntity) => getSeverityWeight(c.risk))
      : (data.maritime_chokepoints || []);
    const ships = isOverviewMode
      ? takeTopEntities(data.maritime_ships, OVERVIEW_ENTITY_LIMITS.maritimeShips, (s: MapEntity) => {
          const typeWeight = String(s.type || '').toLowerCase() === 'military' ? 300 : String(s.type || '').toLowerCase() === 'tanker' ? 180 : 90;
          return typeWeight + Number(s.speed ?? 0);
        })
      : (data.maritime_ships || []);
    setGeo('maritime', activeLayers.maritime && ports ? ports.map((p: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { name: p.name, country: p.country, type: p.type, volume: p.volume, fleet: p.fleet, rank: p.rank } })) : []);
    setGeo('maritime-choke', activeLayers.maritime && chokepoints ? chokepoints.map((c: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] }, properties: { name: c.name, traffic: c.traffic, risk: c.risk } })) : []);
    setGeo('maritime-ships', activeLayers.maritime && ships ? ships.map((s: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name || s.mmsi?.toString(), type: s.type || 'cargo', speed: s.speed, heading: s.heading, destination: s.destination, flag: s.flag } })) : []);
  }, [mapReady, data.maritime_ports, data.maritime_chokepoints, data.maritime_ships, activeLayers.maritime, isOverviewMode, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const balloons = isOverviewMode
      ? takeTopEntities(data.balloons, OVERVIEW_ENTITY_LIMITS.balloons, (b: MapEntity) => Number(b.altitude ?? 0) + Number(b.speed ?? 0))
      : (data.balloons || []);
    setGeo('balloons', activeLayers.balloons && balloons ? balloons.map((b: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [b.lng, b.lat] }, properties: { callsign: b.callsign, type: b.type, status: b.status, altitude: b.altitude, speed: b.speed, verticalRate: b.verticalRate, temperature: b.temperature, color: b.color } })) : []);
  }, [mapReady, data.balloons, activeLayers.balloons, isOverviewMode, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const radiationStations = isOverviewMode
      ? takeTopEntities(data.radiation, OVERVIEW_ENTITY_LIMITS.radiation, (r: MapEntity) => Number(r.reading ?? 0) + getSeverityWeight(r.status))
      : (data.radiation || []);
    setGeo('radiation', activeLayers.radiation && radiationStations ? radiationStations.map((r: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng, r.lat] }, properties: { name: r.name, city: r.city, country: r.country, reading: r.reading, status: r.status, network: r.network } })) : []);
  }, [mapReady, data.radiation, activeLayers.radiation, isOverviewMode, setGeo]);

  // ══ AEGIS SDK — Lattice Sensor Mesh ══
  // Multi-waypoint routes tracing real-world shipping lanes, air corridors, and intel lines
  useEffect(() => {
    if (!mapReady) return;
    setGeo('sdk-entities', []);

    if (!activeLayers.sdk_stream) {
      setGeo('sdk-links', []);
      return;
    }

    // Spline curve generator for ultra-smooth paths
    const splineCurve = (points: [number,number][], segments = 15): [number,number][] => {
      if (points.length < 2) return points;
      const res: [number,number][] = [];
      const p = [...points];
      p.unshift(p[0]); // Duplicate first
      p.push(p[p.length-1]); // Duplicate last
      for (let i = 1; i < p.length - 2; i++) {
        for (let t = 0; t <= 1; t += 1/segments) {
          const t2 = t*t, t3 = t2*t;
          const x = 0.5 * ((2*p[i][0]) + (-p[i-1][0] + p[i+1][0])*t + (2*p[i-1][0] - 5*p[i][0] + 4*p[i+1][0] - p[i+2][0])*t2 + (-p[i-1][0] + 3*p[i][0] - 3*p[i+1][0] + p[i+2][0])*t3);
          const y = 0.5 * ((2*p[i][1]) + (-p[i-1][1] + p[i+1][1])*t + (2*p[i-1][1] - 5*p[i][1] + 4*p[i+1][1] - p[i+2][1])*t2 + (-p[i-1][1] + 3*p[i][1] - 3*p[i+1][1] + p[i+2][1])*t3);
          res.push([x,y]);
        }
      }
      return res;
    };

    // Route builder — applies spline smoothing
    const route = (waypoints: Coordinates[], props: EntityProperties): GeoJsonFeature => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: splineCurve(waypoints) },
      properties: props,
    });

    const links: GeoJsonFeature[] = [];

    // ── MARITIME: Real shipping lane waypoints (strictly over water) ──

    links.push(route([
      [121.47,31.23], [122.5,30.5], [120.0,26.0], [119.0,24.0], [116.0,21.0], [111.0,15.0], [109.0,10.0], [105.0,4.0], [103.84,1.26]
    ], { fromName:'Shanghai', toName:'Singapore', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [103.84,1.26], [103.0,1.8], [100.0,4.0], [96.0,6.0], [88.0,6.0], [80.0,5.5], [70.0,8.0], [60.0,12.0], [52.0,14.0], [45.0,12.0], [43.33,12.58]
    ], { fromName:'Singapore', toName:'Bab el-Mandeb', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [43.33,12.58], [41.0,17.0], [38.0,21.0], [35.0,25.0], [32.34,30.43]
    ], { fromName:'Bab el-Mandeb', toName:'Suez Canal', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [32.34,30.43], [32.3,31.3], [31.5,31.8], [26.0,34.0], [18.0,35.0], [15.0,36.0], [11.0,37.5], [6.0,38.0], [0.0,36.5], [-5.35,36.0]
    ], { fromName:'Suez Canal', toName:'Gibraltar', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [-5.35,36.0], [-9.0,36.0], [-10.0,38.0], [-10.0,43.0], [-8.0,45.0], [-5.5,48.5], [-2.0,49.5], [1.5,51.0], [3.5,51.5], [4.50,51.90]
    ], { fromName:'Gibraltar', toName:'Rotterdam', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [121.47,31.23], [123.0,30.5], [130.0,30.0], [140.0,34.0], [150.0,40.0], [165.0,43.0], [180.0,44.0], [200.0,43.0], [220.0,38.0], [235.0,34.0], [241.73,33.74]
    ], { fromName:'Shanghai', toName:'Los Angeles', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [103.84,1.26], [105.0,4.0], [109.0,10.0], [111.0,15.0], [116.0,21.0], [119.0,24.0], [120.0,26.0], [124.0,30.0], [127.0,32.0], [129.04,35.10]
    ], { fromName:'Singapore', toName:'Busan', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [4.50,51.90], [3.5,51.5], [1.5,51.0], [-2.0,49.5], [-5.5,48.5], [-8.0,45.0], [-10.0,43.0], [-10.0,38.0], [-18.0,25.0], [-25.0,15.0], [-20.0,0.0], [-10.0,-20.0], [5.0,-32.0], [18.47,-34.36]
    ], { fromName:'Rotterdam', toName:'Cape of Good Hope', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [18.47,-34.36], [22.0,-35.0], [30.0,-33.0], [40.0,-20.0], [45.0,-10.0], [52.0,5.0], [56.0,14.0], [59.0,22.0], [56.25,26.57]
    ], { fromName:'Cape of Good Hope', toName:'Strait of Hormuz', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [-79.68,9.08], [-79.0,11.0], [-75.0,15.0], [-72.0,20.0], [-65.0,30.0], [-50.0,42.0], [-30.0,48.0], [-10.0,49.0], [-5.5,48.5], [-2.0,49.5], [1.5,51.0], [4.50,51.90]
    ], { fromName:'Panama', toName:'Rotterdam', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [-118.27,33.74], [-118.0,32.0], [-115.0,26.0], [-105.0,18.0], [-95.0,13.0], [-85.0,8.0], [-80.0,7.5], [-79.68,9.08]
    ], { fromName:'Los Angeles', toName:'Panama', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [-46.31,-23.95], [-44.0,-25.0], [-30.0,-28.0], [-15.0,-30.0], [0.0,-32.0], [10.0,-33.0], [18.47,-34.36]
    ], { fromName:'Santos', toName:'Cape of Good Hope', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [55.06,25.01], [54.5,25.5], [53.0,25.8], [51.0,26.0], [50.16,26.64]
    ], { fromName:'Dubai', toName:'Ras Tanura', domain:'SEA', source:'AIS Maritime' }));

    links.push(route([
      [79.84,6.94], [80.0,5.5], [88.0,6.0], [96.0,6.0], [100.0,4.0], [103.0,1.8], [103.84,1.26]
    ], { fromName:'Colombo', toName:'Singapore', domain:'SEA', source:'AIS Maritime' }));

    // ── AIR CORRIDORS: High altitude splined curves ──

    links.push(route([
      [-73.78,40.64], [-65.0,44.0], [-50.0,50.0], [-35.0,53.0], [-20.0,53.5], [-10.0,52.5], [-0.46,51.47]
    ], { fromName:'JFK New York', toName:'London Heathrow', domain:'AIR', source:'ADS-B / OpenSky' }));

    links.push(route([
      [-0.46,51.47], [8.0,48.0], [18.0,44.0], [28.81,41.27], [35.0,37.0], [42.0,32.0], [50.0,28.0], [55.36,25.25]
    ], { fromName:'London', toName:'Dubai', domain:'AIR', source:'ADS-B / OpenSky' }));

    links.push(route([
      [55.36,25.25], [65.0,20.0], [75.0,15.0], [85.0,10.0], [95.0,5.0], [103.99,1.36], [110.0,8.0], [118.0,16.0], [125.0,25.0], [132.0,30.0], [139.79,35.61]
    ], { fromName:'Dubai', toName:'Tokyo', domain:'AIR', source:'ADS-B / OpenSky' }));

    links.push(route([
      [139.79,35.61], [148.0,38.0], [158.0,41.0], [170.0,43.0], [180.0,44.0], [195.0,43.0], [210.0,41.0], [225.0,38.0], [235.0,36.0], [241.59,33.94]
    ], { fromName:'Tokyo', toName:'LAX', domain:'AIR', source:'ADS-B / OpenSky' }));

    links.push(route([
      [-118.41,33.94], [-110.0,35.0], [-100.0,37.0], [-90.0,39.0], [-80.0,40.0], [-73.78,40.64]
    ], { fromName:'LAX', toName:'JFK', domain:'AIR', source:'ADS-B / OpenSky' }));

    links.push(route([
      [28.81,41.27], [40.0,42.0], [52.0,42.5], [65.0,43.0], [78.0,43.0], [90.0,42.5], [103.0,41.5], [116.60,40.08]
    ], { fromName:'Istanbul', toName:'Beijing', domain:'AIR', source:'ADS-B / OpenSky' }));

    // ── NAVAL/INTEL: Fleet deployment corridors (smooth curves) ──

    links.push(route([
      [-76.33,36.95], [-68.0,38.0], [-55.0,42.0], [-40.0,46.0], [-25.0,49.0], [-10.0,50.5], [-1.11,50.80]
    ], { fromName:'Norfolk NAS', toName:'Portsmouth (Royal Navy)', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [-76.33,36.95], [-65.0,37.0], [-45.0,36.5], [-25.0,36.0], [-10.0,36.0], [-5.35,36.0], [2.0,37.0], [10.0,38.0], [20.0,37.0], [28.0,36.0], [35.89,34.89]
    ], { fromName:'Norfolk NAS', toName:'Tartus (Russian Base)', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [-117.15,32.69], [-130.0,29.0], [-145.0,25.0], [-157.97,21.35], [-170.0,25.0], [-180.0,29.0], [-192.0,31.0], [-205.0,33.0], [-215.0,34.0], [-220.33,35.28]
    ], { fromName:'San Diego NB', toName:'Yokosuka (7th Fleet)', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [139.67,35.28], [130.0,30.0], [120.0,22.0], [110.0,12.0], [104.01,1.33], [95.0,5.0], [85.0,10.0], [78.0,15.0], [72.84,18.93]
    ], { fromName:'Yokosuka', toName:'Mumbai (Indian Navy)', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [33.42,69.07], [35.0,65.0], [30.0,58.0], [28.0,52.0], [30.0,46.0], [33.0,42.0], [30.0,38.0], [35.89,34.89]
    ], { fromName:'Severomorsk (Northern Fleet)', toName:'Tartus', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [110.39,21.20], [112.0,24.0], [115.0,28.0], [118.0,32.0], [120.43,36.09]
    ], { fromName:'Zhanjiang (PLA Southern Theater)', toName:'Qingdao (PLA Northern Theater)', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [5.93,43.12], [8.0,41.0], [12.0,39.0], [18.0,37.5], [25.0,36.0], [30.0,35.0], [35.89,34.89]
    ], { fromName:'Toulon (Marine Nationale)', toName:'Tartus', domain:'INTEL', source:'Naval Intelligence' }));

    links.push(route([
      [72.84,18.93], [68.0,21.0], [63.0,23.5], [58.0,25.0], [56.25,26.57]
    ], { fromName:'Mumbai (Western Naval Command)', toName:'Strait of Hormuz', domain:'INTEL', source:'Naval Intelligence', url:'https://www.indiannavy.nic.in/content/western-naval-command' }));

    // ── ADDITIONAL HIGH-FIDELITY ROUTES ──

    // Maritime: US West Coast → Hawaii → Guam → Taiwan
    links.push(route([
      [-122.42,37.77], [-130.0,34.0], [-140.0,29.0], [-150.0,24.0], [-157.86,21.31]
    ], { fromName:'San Francisco', toName:'Honolulu', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:-140/centery:29/zoom:4' }));
    
    links.push(route([
      [-157.86,21.31], [-170.0,18.0], [-180.0,16.5], [-200.0,14.0], [-215.25,13.44]
    ], { fromName:'Honolulu', toName:'Guam', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:-170/centery:18/zoom:4' }));
    
    links.push(route([
      [144.75,13.44], [135.0,18.0], [125.0,23.0], [121.5,25.04]
    ], { fromName:'Guam', toName:'Taipei', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:135/centery:18/zoom:5' }));

    // Maritime: US East Coast → Gulf of Mexico
    links.push(route([
      [-76.3,36.8], [-75.0,34.0], [-79.0,30.0], [-80.0,26.0], [-82.0,24.0], [-86.0,25.0], [-90.0,27.0], [-94.8,29.3]
    ], { fromName:'Norfolk', toName:'Galveston', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:-85/centery:26/zoom:5' }));

    // Maritime: Europe → West Africa
    links.push(route([
      [-9.14,38.72], [-12.0,34.0], [-15.0,28.0], [-17.0,22.0], [-17.53,14.71]
    ], { fromName:'Lisbon', toName:'Dakar', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:-15/centery:25/zoom:4' }));
    
    links.push(route([
      [-17.53,14.71], [-15.0,9.0], [-10.0,5.0], [-5.0,4.0], [0.0,4.5], [3.4,6.4]
    ], { fromName:'Dakar', toName:'Lagos', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:-5/centery:4/zoom:5' }));

    // Maritime: Australia → Japan
    links.push(route([
      [151.2,-33.8], [153.0,-25.0], [155.0,-15.0], [154.0,-5.0], [150.0,5.0], [145.0,15.0], [140.0,25.0], [139.7,35.6]
    ], { fromName:'Sydney', toName:'Tokyo', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:145/centery:0/zoom:3' }));

    // Maritime: Australia → Singapore
    links.push(route([
      [115.8,-31.9], [113.0,-25.0], [110.0,-15.0], [107.0,-5.0], [105.0,0.0], [103.8,1.2]
    ], { fromName:'Perth', toName:'Singapore', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:110/centery:-15/zoom:4' }));

    // Air: Trans-polar NY to Beijing
    links.push(route([
      [-73.78,40.64], [-75.0,55.0], [-78.0,70.0], [-80.0,85.0], [110.0,80.0], [115.0,60.0], [116.60,40.08]
    ], { fromName:'JFK', toName:'Beijing', domain:'AIR', source:'ADS-B / OpenSky', url:'https://www.flightradar24.com/65.0,-75.0/4' }));

    // Air: South America to Europe
    links.push(route([
      [-46.63,-23.55], [-40.0,-15.0], [-35.0,-5.0], [-30.0,5.0], [-20.0,15.0], [-15.0,25.0], [-10.0,35.0], [-0.46,51.47]
    ], { fromName:'Sao Paulo', toName:'London', domain:'AIR', source:'ADS-B / OpenSky', url:'https://www.flightradar24.com/15.0,-20.0/4' }));

    // Air: Middle East to Australia
    links.push(route([
      [55.36,25.25], [65.0,15.0], [75.0,5.0], [85.0,-5.0], [100.0,-15.0], [115.0,-25.0], [130.0,-30.0], [151.2,-33.8]
    ], { fromName:'Dubai', toName:'Sydney', domain:'AIR', source:'ADS-B / OpenSky', url:'https://www.flightradar24.com/-5.0,90.0/4' }));

    // Intel: Trans-Atlantic Subsea Data Cable (TAT-14 equivalent)
    links.push(route([
      [-74.01,40.12], [-65.0,42.0], [-50.0,46.0], [-35.0,48.0], [-20.0,49.0], [-5.0,50.0], [4.5,52.0]
    ], { fromName:'New Jersey Landing', toName:'Europe Landing', domain:'INTEL', source:'Global Subsea Cable Network', url:'https://www.submarinecablemap.com/' }));

    // Intel: Trans-Pacific Subsea Data Cable (FASTER equivalent)
    links.push(route([
      [-124.0,43.0], [-135.0,45.0], [-150.0,47.0], [-165.0,48.0], [-185.0,47.0], [-205.0,42.0], [-220.0,35.0]
    ], { fromName:'Oregon Landing', toName:'Japan Landing', domain:'INTEL', source:'Global Subsea Cable Network', url:'https://www.submarinecablemap.com/' }));

    // Intel: Mediterranean Subsea Cable (SEA-ME-WE)
    links.push(route([
      [5.3,43.3], [10.0,38.0], [18.0,35.0], [25.0,33.0], [31.2,31.2]
    ], { fromName:'Marseille', toName:'Alexandria', domain:'INTEL', source:'Global Subsea Cable Network', url:'https://www.submarinecablemap.com/' }));

    // Maritime: Suez to Mumbai (Arabian Sea)
    links.push(route([
      [32.34,30.43], [35.0,25.0], [38.0,21.0], [41.0,17.0], [43.33,12.58], [45.0,12.0], [52.0,14.0], [60.0,15.0], [68.0,17.0], [72.84,18.93]
    ], { fromName:'Suez Canal', toName:'Mumbai', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:60/centery:15/zoom:5' }));

    // Maritime: Cape of Good Hope to Australia (Southern Ocean)
    links.push(route([
      [18.47,-34.36], [40.0,-40.0], [60.0,-42.0], [80.0,-43.0], [100.0,-40.0], [115.8,-31.9]
    ], { fromName:'Cape of Good Hope', toName:'Perth', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:70/centery:-40/zoom:3' }));

    // Maritime: Panama Canal to Valparaiso (South America West Coast)
    links.push(route([
      [-79.68,9.08], [-80.0,2.0], [-81.5,-5.0], [-78.0,-15.0], [-74.0,-25.0], [-71.6,-33.0]
    ], { fromName:'Panama Canal', toName:'Valparaiso', domain:'SEA', source:'AIS Maritime', url:'https://www.marinetraffic.com/en/ais/home/centerx:-78/centery:-15/zoom:4' }));

    // Air: London to Singapore
    links.push(route([
      [-0.46,51.47], [15.0,48.0], [35.0,42.0], [55.0,35.0], [70.0,25.0], [85.0,15.0], [95.0,8.0], [103.8,1.2]
    ], { fromName:'London', toName:'Singapore', domain:'AIR', source:'ADS-B / OpenSky', url:'https://www.flightradar24.com/55.0,35.0/4' }));

    // Air: New York to Buenos Aires
    links.push(route([
      [-73.78,40.64], [-70.0,20.0], [-65.0,0.0], [-55.0,-15.0], [-58.4,-34.6]
    ], { fromName:'JFK New York', toName:'Buenos Aires', domain:'AIR', source:'ADS-B / OpenSky', url:'https://www.flightradar24.com/-65.0,0.0/4' }));

    // Air: Tokyo to Sydney
    links.push(route([
      [139.7,35.6], [142.0,20.0], [145.0,0.0], [148.0,-15.0], [151.2,-33.8]
    ], { fromName:'Tokyo', toName:'Sydney', domain:'AIR', source:'ADS-B / OpenSky', url:'https://www.flightradar24.com/145.0,0.0/4' }));

    // Intel: Arctic Patrol Route (Northern Fleet)
    links.push(route([
      [33.42,69.07], [20.0,72.0], [0.0,75.0], [-20.0,72.0], [-30.0,65.0]
    ], { fromName:'Severomorsk', toName:'Greenland Sea', domain:'INTEL', source:'Naval Intelligence', url:'https://www.odni.gov' }));

    // Intel: South China Sea Carrier Patrol
    links.push(route([
      [127.6,26.2], [123.0,24.0], [118.0,20.0], [114.0,15.0], [112.0,10.0]
    ], { fromName:'Okinawa', toName:'South China Sea', domain:'INTEL', source:'Naval Intelligence', url:'https://www.odni.gov' }));

    setGeo('sdk-links', isOverviewMode ? links.slice(0, OVERVIEW_ENTITY_LIMITS.sdkLinks) : links);
  }, [mapReady, activeLayers.sdk_stream, isOverviewMode, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const liveFeeds = isOverviewMode
      ? takeTopEntities(data.live_feeds, OVERVIEW_ENTITY_LIMITS.liveNews, (f: MapEntity) => Number(f.priority ?? f.rank ?? f.score ?? 0))
      : (data.live_feeds || []);
    setGeo('live-news', activeLayers.live_news && liveFeeds ? liveFeeds.map((f: MapEntity) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] }, properties: { name: f.name, city: f.city, country: f.country, url: f.url, category: f.category, embed_allowed: f.embed_allowed !== false } })) : []);
  }, [mapReady, data.live_feeds, activeLayers.live_news, isOverviewMode, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    const items = isOverviewMode
      ? takeTopEntities(data.news, OVERVIEW_ENTITY_LIMITS.sigintNews, (n: MapEntity) => Number(n.risk_score ?? 0) + getRecencyWeight(n.published_at ?? n.date))
      : (data.news || []);
    setGeo('sigint-news', activeLayers.news_intel && items.length > 0
      ? items.filter((n: MapEntity) => n.coords?.length === 2).map((n: MapEntity) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [n.coords[1], n.coords[0]] },
          properties: { title: n.title, source: n.source, risk_score: n.risk_score, link: n.link }
        }))
      : []);
  }, [mapReady, data.news, activeLayers.news_intel, isOverviewMode, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    // ── CONFLICT ZONES — center-point warning markers ──
    const CONFLICT_ZONES = [
      { label: 'UKRAINE WAR', severity: 'war', lat: 48.5, lng: 31.2 },
      { label: 'GAZA CONFLICT', severity: 'war', lat: 31.35, lng: 34.35 },
      { label: 'LEBANON BORDER', severity: 'high', lat: 33.4, lng: 35.8 },
      { label: 'SUDAN CIVIL WAR', severity: 'war', lat: 15.0, lng: 30.0 },
      { label: 'MYANMAR CONFLICT', severity: 'war', lat: 19.5, lng: 96.5 },
      { label: 'DRC EASTERN CONFLICT', severity: 'war', lat: -1.0, lng: 28.5 },
      { label: 'YEMEN WAR', severity: 'war', lat: 15.5, lng: 48.0 },
      { label: 'SYRIA', severity: 'high', lat: 35.0, lng: 38.5 },
      { label: 'TAIWAN STRAIT', severity: 'elevated', lat: 24.0, lng: 119.5 },
      { label: 'KOREAN DMZ', severity: 'elevated', lat: 38.3, lng: 127.0 },
      { label: 'SAHEL INSTABILITY', severity: 'high', lat: 14.0, lng: 5.0 },
      { label: 'SOMALIA', severity: 'high', lat: 5.0, lng: 46.0 },
      { label: 'RED SEA THREAT', severity: 'high', lat: 16.0, lng: 40.0 },
    ];
    const conflictFeatures = CONFLICT_ZONES.map(z => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [z.lng, z.lat] },
      properties: { label: z.label, severity: z.severity },
    }));
    setGeo('conflict-zones', conflictFeatures);
  }, [mapReady, setGeo]);


  // Visibility
  useEffect(() => {
    if (!mapReady) return;
    setVis(['eq-circles','eq-label'], activeLayers.earthquakes);
    setVis(['sat-dots','sat-glow'], activeLayers.satellites);
    setVis(['gdelt-dots','gdelt-hotspot-halo','gdelt-hotspot-core','gdelt-hotspot-label'], activeLayers.global_incidents);
    setVis(['jam-fill','jam-label'], activeLayers.gps_jamming);
    setVis(['day-night-fill'], activeLayers.day_night);
    setVis(['fl-commercial'], activeLayers.flights);
    setVis(['fl-private'], activeLayers.private);
    setVis(['fl-jets'], activeLayers.jets);
    setVis(['fl-military'], activeLayers.military);
    setVis(['cctv-glow','cctv-dots','cctv-label'], activeLayers.cctv);
    setVis(['fires-heat'], activeLayers.fires);
    setVis(['weather-glow','weather-dots','weather-label'], activeLayers.weather);
    setVis(['infra-glow','infra-dots','infra-label'], activeLayers.infrastructure);
    setVis(['maritime-glow','maritime-dots','maritime-label'], activeLayers.maritime);
    setVis(['choke-glow','choke-dots','choke-label'], activeLayers.maritime);
    setVis(['ship-dots','ship-label'], activeLayers.maritime);
    setVis(['news-glow','news-dots','news-label'], activeLayers.live_news);
    setVis(['sigint-news-glow','sigint-news-dots','sigint-news-label'], activeLayers.news_intel);
    setVis(['conflict-icons'], activeLayers.conflict_zones !== false);

    setVis(['balloon-dots','balloon-label'], activeLayers.balloons);
    setVis(['rad-glow','rad-dots','rad-label'], activeLayers.radiation);
    setVis(['sdk-sea-glow','sdk-air-glow','sdk-intel-glow','sdk-sea','sdk-air','sdk-intel'], activeLayers.sdk_stream !== false);
    // Sweep layers always visible when data is present (controlled by useEffect)
    setVis(['sweep-connections','sweep-pulse-ring','sweep-device-glow','sweep-device-dots','sweep-device-labels'], true);
    applyAdaptiveDeclutter();
  }, [mapReady, activeLayers, setVis, applyAdaptiveDeclutter]);

  useEffect(() => {
    if (!mapReady) return;
    applyAdaptiveDeclutter();
  }, [mapReady, adaptiveZoom, projection, applyAdaptiveDeclutter]);

  // IP Sweep visualization
  useEffect(() => {
    if (!mapReady) return;
    if (!sweepData?.devices?.length) {
      setGeo('ip-sweep-devices', []);
      setGeo('ip-sweep-pulse', []);
      setGeo('ip-sweep-connections', []);
      return;
    }

    const map = mapRef.current;
    if (!map) return;

    const { center, devices } = sweepData;
    const centerCoord: [number, number] = [center.lng, center.lat];

    // Switch to globe and fly to the sweep location
    try {
      (map as maplibregl.Map & { setProjection?: (projection: { type: 'mercator' | 'globe' }) => void }).setProjection({ type: 'globe' });
      applyAegisGlobeStyling(map, 'globe', mapStyle);
    } catch { /* projection may not be supported */ }

    map.flyTo({ center: centerCoord, zoom: 14, pitch: 50, bearing: -20, duration: 3000, essential: true });

    // Set center pulse
    setGeo('ip-sweep-pulse', [{
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: centerCoord },
      properties: { ip: sweepData.target_ip },
    }]);

    // Build device features spread in a circle around center
    const allDeviceFeatures = devices.map((d: SweepDevice, i: number) => {
      const angle = (i / devices.length) * Math.PI * 2;
      const radius = 0.001 + ((i % 7 + 1) * 0.0004);
      const dLng = centerCoord[0] + Math.cos(angle) * radius * (1 / Math.cos(center.lat * Math.PI / 180));
      const dLat = centerCoord[1] + Math.sin(angle) * radius;
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [dLng, dLat] },
        properties: {
          ip: d.ip, device_type: d.device_type, device_icon: d.device_icon,
          color: d.device_color, risk_level: d.risk_level,
          ports: JSON.stringify(d.ports), hostnames: JSON.stringify(d.hostnames),
          vulns: JSON.stringify(d.vulns), cpes: JSON.stringify(d.cpes), tags: JSON.stringify(d.tags),
        },
      };
    });

    // Connection lines from center to each device
    const connectionFeatures = allDeviceFeatures.map((f) => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: [centerCoord, f.geometry.coordinates] },
      properties: { color: f.properties.color },
    }));

    // Stagger the appearance after 3s flyTo completes
    const timer = setTimeout(() => {
      setGeo('ip-sweep-connections', connectionFeatures);
      const batchSize = 5;
      const batches = Math.ceil(allDeviceFeatures.length / batchSize);
      for (let b = 0; b < batches; b++) {
        setTimeout(() => {
          setGeo('ip-sweep-devices', allDeviceFeatures.slice(0, (b + 1) * batchSize));
        }, b * 100);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [applyAegisGlobeStyling, mapReady, sweepData, setGeo, mapStyle]);

  // Scan Targets visualization
  useEffect(() => {
    if (!mapReady || !mapRef.current || !scanTargets) return;
    const map = mapRef.current;
    
    const features = scanTargets.map(t => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [t.lng, t.lat] },
      properties: { ...t }
    }));
    
    const src = map.getSource('scan-targets') as maplibregl.GeoJSONSource;
    if (src) src.setData({ type: 'FeatureCollection', features });
  }, [scanTargets, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const routeSource = map.getSource('user-route') as maplibregl.GeoJSONSource;
    const markerSource = map.getSource('route-markers') as maplibregl.GeoJSONSource;

    if (routeSource) {
      routeSource.setData({
        type: 'FeatureCollection',
        features: routePath.length >= 2
          ? [{
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: routePath },
              properties: { label: 'AEGIS VECTOR', mode: navigationActive ? 'follow' : 'ready' },
            }]
          : [],
      });
    }

    if (markerSource) {
      const markerFeatures: GeoJsonFeature[] = [];
      if (currentLocation) {
        markerFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [currentLocation.lng, currentLocation.lat] },
          properties: { role: 'origin', label: window.innerWidth < 768 ? '' : 'FROM GPS' },
        });
      }
      if (routeDestination) {
        markerFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [routeDestination.lng, routeDestination.lat] },
          properties: { role: 'destination', label: window.innerWidth < 768 ? '' : 'DEST' },
        });
      }
      markerSource.setData({ type: 'FeatureCollection', features: markerFeatures });
    }
  }, [currentLocation, mapReady, navigationActive, routeDestination, routePath]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !currentLocation || !navigationActive) return;
    const map = mapRef.current;
    const now = Date.now();
    const lastCenter = lastNavCameraCenterRef.current;
    const nextBearing = navigationBearing ?? map.getBearing();
    const lastBearing = lastNavCameraBearingRef.current;
    const movementDelta = lastCenter
      ? Math.abs(lastCenter.lat - currentLocation.lat) + Math.abs(lastCenter.lng - currentLocation.lng)
      : Number.POSITIVE_INFINITY;
    const bearingDelta = lastBearing === null
      ? Number.POSITIVE_INFINITY
      : Math.abs((((nextBearing - lastBearing) % 360) + 540) % 360 - 180);

    if (movementDelta < 0.00025 && bearingDelta < 3) return;
    if (movementDelta < 0.0009 && bearingDelta < 8 && now - lastNavCameraUpdateRef.current < 850) return;

    lastNavCameraUpdateRef.current = now;
    lastNavCameraCenterRef.current = currentLocation;
    lastNavCameraBearingRef.current = nextBearing;

    map.easeTo({
      center: [currentLocation.lng, currentLocation.lat + (window.innerWidth < 768 ? 0.0009 : 0.0035)],
      zoom: Math.max(map.getZoom(), window.innerWidth < 768 ? 17.1 : 15.7),
      pitch: window.innerWidth < 768 ? 72 : 54,
      bearing: nextBearing,
      padding: window.innerWidth < 768
        ? { top: 112, bottom: 86, left: 18, right: 18 }
        : { top: 108, bottom: 156, left: 64, right: 64 },
      duration: window.innerWidth < 768 ? 560 : 720,
      essential: true,
    });
  }, [currentLocation, mapReady, navigationActive, navigationBearing]);

  useEffect(() => {

    if (!mapReady || !mapRef.current || projection !== 'globe' || navigationActive) return;

    const map = mapRef.current;
    let frame = 0;
    let lastTime = performance.now();
    const MAX_IDLE_SPIN_ZOOM = 2.4;

    const spin = (timestamp: number) => {
      if (!mapRef.current) return;
      frame = window.requestAnimationFrame(spin);

      if (
        adaptiveZoom > MAX_IDLE_SPIN_ZOOM
        || Date.now() < globeSpinPauseUntilRef.current
        || map.isMoving()
      ) {
        lastTime = timestamp;
        return;
      }

      const deltaMs = Math.max(0, timestamp - lastTime);
      if (deltaMs < 32) return;
      const deltaSeconds = deltaMs / 1000;
      lastTime = timestamp;
      if (deltaSeconds <= 0) return;

      const center = map.getCenter();
      map.jumpTo({ center: [normalizeLongitude(center.lng - deltaSeconds * 1.35), center.lat] });
    };

    frame = window.requestAnimationFrame(spin);
    return () => window.cancelAnimationFrame(frame);
  }, [adaptiveZoom, mapReady, navigationActive, projection]);

  // Fly-to
  useEffect(() => {
    if (!mapReady || !mapRef.current || !flyToLocation) return;
    const map = mapRef.current;
    const targetZoom = flyToLocation.zoom ?? (projection === 'globe' ? 7.2 : 10);

    if (navigationActive && currentLocation && window.innerWidth < 768) {
      map.easeTo({
        center: [currentLocation.lng, currentLocation.lat + 0.0009],
        zoom: Math.max(map.getZoom(), 17.1),
        pitch: 72,
        bearing: navigationBearing ?? map.getBearing(),
        padding: { top: 112, bottom: 86, left: 18, right: 18 },
        duration: 520,
        essential: true,
      });
      return;
    }

    if (flyToLocation.bbox) {
      const [west, south, east, north] = flyToLocation.bbox;
      map.fitBounds(
        [[west, south], [east, north]],
        {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          maxZoom: Math.max(targetZoom, 4),
          duration: 2200,
        }
      );
      return;
    }

    map.flyTo({
      center: [flyToLocation.lng, flyToLocation.lat],
      zoom: targetZoom,
      pitch: projection === 'globe' ? 42 : (window.innerWidth < 768 ? 62 : 0),
      duration: 2400,
      essential: true,
    });
  }, [currentLocation, flyToLocation, mapReady, navigationActive, navigationBearing, projection]);

  // Dynamic projection switching (lightweight — no terrain DEM)
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    try {
      (map as maplibregl.Map & { setProjection?: (projection: { type: 'mercator' | 'globe' }) => void }).setProjection({ type: projection });
      applyAegisGlobeStyling(map, projection, mapStyle);
      if (projection === 'globe') {
        if (!navigationActive && !currentLocation) {
          map.easeTo({ center: [0, 31], zoom: Math.min(map.getZoom(), 1.82), pitch: 12, duration: 1200 });
        }
      } else {
        map.easeTo({ pitch: 0, duration: 800 });
      }
    } catch (e) {
      console.warn('Projection switch failed:', e);
    }
  }, [applyAegisGlobeStyling, currentLocation, mapReady, navigationActive, navigationBearing, projection, mapStyle]);

  // Satellite / globe presentation switching
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    prevStyleRef.current = mapStyle;
    const map = mapRef.current;
    const shouldShowSatelliteLayer = mapStyle === 'satellite';

    try {
      if (shouldShowSatelliteLayer) {
        if (!map.getSource('satellite-tiles')) {
          map.addSource('satellite-tiles', {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 18,
          });
        }

        if (!map.getLayer('satellite-layer')) {
          map.addLayer(
            {
              id: 'satellite-layer',
              type: 'raster',
              source: 'satellite-tiles',
              paint: {
                'raster-opacity': 0.92,
                'raster-saturation': 0.22,
                'raster-contrast': 0.1,
                'raster-brightness-min': 0.12,
                'raster-brightness-max': 0.96,
              },
            },
            'day-night-fill',
          );
        } else {
          map.setLayoutProperty('satellite-layer', 'visibility', 'visible');
        }
      } else if (map.getLayer('satellite-layer')) {
        map.setLayoutProperty('satellite-layer', 'visibility', 'none');
      }

      applyAegisGlobeStyling(map, projection, mapStyle);
    } catch (e) {
      console.warn('Style switch failed:', e);
    }
  }, [applyAegisGlobeStyling, mapReady, mapStyle, projection]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}

export default memo(AegisMap);
