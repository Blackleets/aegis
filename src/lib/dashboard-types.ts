export type Coordinate = { lat: number; lng: number };
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

export interface DashboardData extends Record<string, unknown> {
  commercial_flights?: DashboardEntity[];
  private_flights?: DashboardEntity[];
  private_jets?: DashboardEntity[];
  military_flights?: DashboardEntity[];
  maritime_ships?: DashboardEntity[];
  maritime_ports?: DashboardEntity[];
  maritime_chokepoints?: DashboardEntity[];
  earthquakes?: (DashboardEntity & { magnitude?: number; place?: string })[];
  gdelt?: (DashboardEntity & { name?: string })[];
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
}

export interface GlobalStats {
  flights: number;
  sats: number;
  cctv: number;
  weather: number;
  nuclear: number;
}

export interface SpaceWeather {
  storm_color?: string;
  kp_index?: number | string;
  [key: string]: unknown;
}
