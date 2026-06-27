export type Coordinate = { lat: number; lng: number };
export type FlyToLocation = Coordinate & { ts: number };
export type MapView = { zoom: number; latitude: number };
export type ActiveLayers = Record<string, boolean>;

export interface DashboardEntity extends Partial<Coordinate> {
  [key: string]: unknown;
}

export interface DashboardNews {
  coords?: [number, number];
  title?: string;
  source?: string;
  [key: string]: unknown;
}

export interface MarketQuote {
  price?: number;
  change_percent?: number;
  up?: boolean;
}

export interface DashboardMarkets {
  stocks?: Record<string, MarketQuote>;
  oil?: Record<string, MarketQuote>;
  commodities?: Record<string, MarketQuote>;
  crypto?: Record<string, MarketQuote>;
  indices?: Record<string, MarketQuote>;
  scm_alerts?: string[];
}

export interface DashboardData extends Record<string, unknown> {
  commercial_flights?: DashboardEntity[];
  private_flights?: DashboardEntity[];
  private_jets?: DashboardEntity[];
  military_flights?: DashboardEntity[];
  maritime_ships?: DashboardEntity[];
  maritime_ports?: DashboardEntity[];
  maritime_chokepoints?: DashboardEntity[];
  earthquakes?: (DashboardEntity & { magnitude?: number; place?: string })[];
  gdelt?: (DashboardEntity & {
    name?: string;
    title?: string;
    url?: string;
    html?: string;
    type?: string;
    source?: string;
    date?: string;
    tone?: number;
    severity?: string;
    theme?: string;
    mentions?: number;
  })[];
  news?: DashboardNews[];
  satellites?: DashboardEntity[];
  cameras?: DashboardEntity[];
  weather_events?: DashboardEntity[];
  infrastructure?: DashboardEntity[];
  balloons?: DashboardEntity[];
  radiation?: DashboardEntity[];
  fires?: DashboardEntity[];
  gps_jamming?: DashboardEntity[];
  sdk_entities?: unknown[];
  markets?: DashboardMarkets;
}

export interface GlobalStats {
  flights: number;
  sats: number;
  cctv: number;
  weather: number;
  nuclear: number;
}

export interface UsageMetrics {
  onlineUsers: number;
  totalUsers: number;
  updatedAt?: string;
}

export interface RegionDossier {
  location?: { display_name?: string };
  country?: {
    flag?: string;
    name?: string;
    capital?: string;
    population?: number;
    subregion?: string;
    region?: string;
    languages?: string[];
    area?: number;
  };
  head_of_state?: { name?: string; position?: string };
  wikipedia?: { thumbnail?: string; extract?: string };
}

export interface SpaceWeather {
  storm_color?: string;
  kp_index?: number | string;
  [key: string]: unknown;
}

export interface ActiveCamera {
  type?: string;
  url?: string;
  name?: string;
  embed_allowed?: boolean;
  [key: string]: unknown;
}

export interface ScanTarget extends Coordinate {
  id: string;
  timestamp: number;
  [key: string]: unknown;
}

export interface OsintGeolocatePayload extends Coordinate {
  [key: string]: unknown;
}

export interface InitialUrlState {
  flyToLocation: FlyToLocation | null;
  mapView: MapView;
  activeLayers: ActiveLayers;
}

export const DEFAULT_ACTIVE_LAYERS: ActiveLayers = {
  flights: false,
  private: false,
  jets: false,
  military: false,
  maritime: true,
  satellites: false,
  balloons: false,
  cctv: true,
  live_news: true,
  news_intel: true,
  earthquakes: true,
  fires: false,
  weather: false,
  radiation: false,
  infrastructure: false,
  global_incidents: true,
  war_alerts: false,
  gps_jamming: false,
  day_night: true,
  sdk_stream: true,
};

export function getYouTubeWatchUrl(url: string): string {
  if (url.includes('channel=')) {
    return `https://www.youtube.com/channel/${url.split('channel=')[1].split('&')[0]}/live`;
  }

  if (url.includes('/embed/')) {
    return `https://www.youtube.com/watch?v=${url.split('/embed/')[1].split('?')[0]}`;
  }

  return url;
}

export function getInitialUrlState(): InitialUrlState {
  if (typeof window === 'undefined') {
    return {
      flyToLocation: null,
      mapView: { zoom: 2.05, latitude: 20 },
      activeLayers: DEFAULT_ACTIVE_LAYERS,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get('lat') || '');
  const lon = parseFloat(params.get('lon') || '');
  const zoom = parseFloat(params.get('zoom') || '');
  const nextLayers: ActiveLayers = { ...DEFAULT_ACTIVE_LAYERS };
  const layers = params.get('layers');

  if (layers) {
    const active = new Set(layers.split(','));
    Object.keys(nextLayers).forEach((key) => {
      nextLayers[key] = active.has(key);
    });
  }

  return {
    flyToLocation: !Number.isNaN(lat) && !Number.isNaN(lon) ? { lat, lng: lon, ts: Date.now() } : null,
    mapView: { zoom: !Number.isNaN(zoom) ? zoom : 2.05, latitude: 20 },
    activeLayers: nextLayers,
  };
}
