/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  POLYBOLOS SDK — Client Controller                              ║
 * ║  Unified Intelligence Fusion Engine                             ║
 * ║                                                                 ║
 * ║  Subscribes to OSIRIS feeds + external providers (Lattice),     ║
 * ║  normalizes all data into PolybolosEntity[], and emits a        ║
 * ║  fused Common Operating Picture stream.                         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  type PolybolosEntity,
  type PolybolosClientConfig,
  type SDKStatus,
  Domain,
  EntityType,
  ThreatLevel,
  Classification,
} from './types';
import { LatticeAdapter } from './LatticeAdapter';

// ── OSIRIS Feed → Entity Translators ───────────────────────────────

interface FlightRecord {
  icao24?: string;
  callsign?: string;
  lat: number;
  lng: number;
  alt?: number;
  heading?: number;
  speed_knots?: number;
  model?: string;
  registration?: string;
}

interface MaritimeRecord {
  id?: string;
  mmsi?: number | string;
  name?: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  type?: string;
  destination?: string;
  flag?: string;
}

interface EarthquakeRecord {
  id?: string;
  magnitude: number;
  place?: string;
  lat: number;
  lng: number;
  depth?: number;
}

interface SatelliteRecord {
  noradId?: number | string;
  name?: string;
  lat: number;
  lng: number;
  alt?: number;
  mission?: string;
  color?: string;
}

interface FireRecord {
  lat: number;
  lng: number;
  brightness?: number;
}

interface CctvRecord {
  id?: string;
  name?: string;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  source?: string;
  feed_url?: string;
  stream_url?: string;
}

interface RadiationRecord {
  name?: string;
  lat: number;
  lng: number;
  status?: string;
  reading?: number | string;
  network?: string;
  city?: string;
  country?: string;
}

interface OsirisIngestPayload {
  commercial_flights?: FlightRecord[];
  private_flights?: FlightRecord[];
  private_jets?: FlightRecord[];
  military_flights?: FlightRecord[];
  maritime_ships?: MaritimeRecord[];
  satellites?: SatelliteRecord[];
  earthquakes?: EarthquakeRecord[];
  fires?: FireRecord[];
  cameras?: CctvRecord[];
  radiation?: RadiationRecord[];
}

function translateFlights(flights: FlightRecord[], subtype: string): PolybolosEntity[] {
  if (!flights?.length) return [];
  const colorMap: Record<string, string> = {
    commercial: '#00E5FF', private: '#00E676', jets: '#FF69B4', military: '#FF3D3D',
  };
  const threatMap: Record<string, ThreatLevel> = {
    commercial: ThreatLevel.NONE, private: ThreatLevel.NONE,
    jets: ThreatLevel.LOW, military: ThreatLevel.ELEVATED,
  };
  return flights.map((f) => ({
    id: `osiris-air-${f.icao24 || f.callsign || Math.random().toString(36).slice(2)}`,
    name: f.callsign?.trim() || 'UNKNOWN',
    domain: Domain.AIR,
    entityType: EntityType.TRACK,
    position: { lat: f.lat, lng: f.lng, alt: f.alt, heading: f.heading, speed: f.speed_knots },
    threat: threatMap[subtype] || ThreatLevel.NONE,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'osiris', feed: `flights-${subtype}`, originalId: f.icao24, confidence: 0.9 },
    timestamp: new Date().toISOString(),
    properties: { model: f.model, registration: f.registration, icao24: f.icao24, subtype },
    display: { color: colorMap[subtype] || '#00E5FF', icon: `plane-${subtype === 'military' ? 'red' : 'cyan'}`, layerType: 'symbol' as const },
  }));
}

function translateMaritime(ships: MaritimeRecord[]): PolybolosEntity[] {
  if (!ships?.length) return [];
  return ships.map((s) => ({
    id: `osiris-sea-${s.mmsi || s.id || Math.random().toString(36).slice(2)}`,
    name: s.name || `MMSI-${s.mmsi}`,
    domain: Domain.SEA,
    entityType: EntityType.TRACK,
    position: { lat: s.lat, lng: s.lng, heading: s.heading, speed: s.speed },
    threat: s.type === 'military' ? ThreatLevel.ELEVATED : ThreatLevel.NONE,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'osiris', feed: 'maritime-ais', originalId: s.mmsi?.toString(), confidence: 0.85 },
    timestamp: new Date().toISOString(),
    properties: { type: s.type, destination: s.destination, flag: s.flag, mmsi: s.mmsi },
    display: {
      color: s.type === 'military' ? '#FF1744' : s.type === 'tanker' ? '#FF9500' : '#00BCD4',
      icon: 'dot-orange', layerType: 'circle' as const,
    },
  }));
}

function translateEarthquakes(events: EarthquakeRecord[]): PolybolosEntity[] {
  if (!events?.length) return [];
  return events.map((eq) => ({
    id: `osiris-event-eq-${eq.id || Math.random().toString(36).slice(2)}`,
    name: `M${eq.magnitude} ${eq.place || 'Earthquake'}`,
    domain: Domain.LAND,
    entityType: EntityType.EVENT,
    position: { lat: eq.lat, lng: eq.lng },
    threat: eq.magnitude >= 6 ? ThreatLevel.CRITICAL : eq.magnitude >= 5 ? ThreatLevel.HIGH : eq.magnitude >= 4 ? ThreatLevel.ELEVATED : ThreatLevel.LOW,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'osiris', feed: 'usgs-earthquakes', originalId: eq.id, confidence: 0.99 },
    timestamp: new Date().toISOString(),
    properties: { magnitude: eq.magnitude, depth: eq.depth, place: eq.place },
    display: { color: eq.magnitude >= 6 ? '#FF1744' : '#FF9500', icon: 'dot-red', layerType: 'circle' as const, glow: eq.magnitude >= 5 },
  }));
}

function translateSatellites(sats: SatelliteRecord[]): PolybolosEntity[] {
  if (!sats?.length) return [];
  return sats.map((s) => ({
    id: `osiris-space-${s.noradId || Math.random().toString(36).slice(2)}`,
    name: s.name || 'UNKNOWN SAT',
    domain: Domain.SPACE,
    entityType: EntityType.TRACK,
    position: { lat: s.lat, lng: s.lng, alt: s.alt ? s.alt * 1000 : undefined },
    threat: ThreatLevel.NONE,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'osiris', feed: 'satnogs', originalId: s.noradId?.toString(), confidence: 0.95 },
    timestamp: new Date().toISOString(),
    properties: { mission: s.mission, noradId: s.noradId, color: s.color },
    display: { color: s.color || '#D4AF37', icon: 'dot-gold', layerType: 'circle' as const },
  }));
}

function translateFires(fires: FireRecord[]): PolybolosEntity[] {
  if (!fires?.length) return [];
  return fires.map((f, i: number) => ({
    id: `osiris-event-fire-${i}`,
    name: 'Active Fire',
    domain: Domain.LAND,
    entityType: EntityType.EVENT,
    position: { lat: f.lat, lng: f.lng },
    threat: ThreatLevel.ELEVATED,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'osiris', feed: 'nasa-firms', confidence: 0.9 },
    timestamp: new Date().toISOString(),
    properties: { brightness: f.brightness },
    display: { color: '#FF6B00', icon: 'dot-fire', layerType: 'circle' as const },
  }));
}

function translateCCTV(cameras: CctvRecord[]): PolybolosEntity[] {
  if (!cameras?.length) return [];
  return cameras.map((c) => ({
    id: `osiris-sensor-cctv-${c.id || Math.random().toString(36).slice(2)}`,
    name: c.name || 'Camera',
    domain: Domain.LAND,
    entityType: EntityType.SENSOR,
    position: { lat: c.lat, lng: c.lng },
    threat: ThreatLevel.NONE,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'osiris', feed: 'cctv-network', originalId: c.id, confidence: 1.0 },
    timestamp: new Date().toISOString(),
    properties: { city: c.city, country: c.country, source: c.source, feed_url: c.feed_url, stream_url: c.stream_url },
    display: { color: '#39FF14', icon: 'dot-cctv', layerType: 'circle' as const },
  }));
}

function translateRadiation(stations: RadiationRecord[]): PolybolosEntity[] {
  if (!stations?.length) return [];
  return stations.map((r) => ({
    id: `osiris-sensor-rad-${r.name || Math.random().toString(36).slice(2)}`,
    name: r.name || 'Radiation Monitor',
    domain: Domain.LAND,
    entityType: EntityType.SENSOR,
    position: { lat: r.lat, lng: r.lng },
    threat: r.status === 'DANGER' ? ThreatLevel.CRITICAL : r.status === 'WARNING' ? ThreatLevel.HIGH : ThreatLevel.LOW,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'osiris', feed: 'radiation-network', confidence: 0.95 },
    timestamp: new Date().toISOString(),
    properties: { reading: r.reading, status: r.status, network: r.network, city: r.city, country: r.country },
    display: {
      color: r.status === 'DANGER' ? '#FF1744' : r.status === 'WARNING' ? '#FF9500' : '#AB47BC',
      icon: 'dot-red', layerType: 'circle' as const, glow: r.status === 'DANGER',
    },
  }));
}

// ── Main Client ────────────────────────────────────────────────────

export class PolybolosClient {
  private config: PolybolosClientConfig;
  private latticeAdapter: LatticeAdapter | null = null;
  private entityStore: Map<string, PolybolosEntity> = new Map();
  private startTime: number = Date.now();
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private sseConnection: EventSource | null = null;

  constructor(config: PolybolosClientConfig) {
    this.config = config;

    // Initialize Lattice adapter if configured
    if (config.lattice) {
      this.latticeAdapter = new LatticeAdapter(config.lattice);
    }
  }

  /** Initialize the SDK and connect all feeds */
  async initialize(): Promise<void> {
    // Connect Lattice if configured
    if (this.latticeAdapter) {
      await this.latticeAdapter.connect();
    }

    // Try SSE stream first (for real-time updates)
    this.connectSSE();

    // Emit initial status
    this.config.onStatusChange?.(this.getStatus());
  }

  /** Connect to the OSIRIS SSE stream endpoint */
  private connectSSE(): void {
    if (typeof EventSource === 'undefined') return;

    try {
      this.sseConnection = new EventSource(
        `${this.config.osirisBaseUrl}/api/sdk/stream`
      );

      this.sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'entity_update' && Array.isArray(data.payload)) {
            for (const entity of data.payload) {
              this.entityStore.set(entity.id, entity);
            }
            this.emitUpdate();
          }
        } catch {
          // Skip malformed events
        }
      };

      this.sseConnection.onerror = () => {
        // SSE failed, connection will auto-retry
      };
    } catch {
      // EventSource not available or connection failed
    }
  }

  /**
   * Ingest raw OSIRIS data and translate it into Polybolos entities.
   * This is the primary method called by page.tsx to feed data into the SDK.
   */
  ingestOsirisData(data: OsirisIngestPayload): void {
    const entities: PolybolosEntity[] = [];

    // Air domain
    entities.push(...translateFlights(data.commercial_flights, 'commercial'));
    entities.push(...translateFlights(data.private_flights, 'private'));
    entities.push(...translateFlights(data.private_jets, 'jets'));
    entities.push(...translateFlights(data.military_flights, 'military'));

    // Sea domain
    entities.push(...translateMaritime(data.maritime_ships || []));

    // Space domain
    entities.push(...translateSatellites(data.satellites || []));

    // Land domain — Events
    entities.push(...translateEarthquakes(data.earthquakes || []));
    entities.push(...translateFires(data.fires || []));

    // Land domain — Sensors
    entities.push(...translateCCTV(data.cameras || []));
    entities.push(...translateRadiation(data.radiation || []));

    // Store all
    for (const entity of entities) {
      this.entityStore.set(entity.id, entity);
    }

    // Merge Lattice entities
    if (this.latticeAdapter) {
      for (const entity of this.latticeAdapter.getEntities()) {
        this.entityStore.set(entity.id, entity);
      }
    }

    this.emitUpdate();
  }

  /** Get all entities, optionally filtered by domain */
  getEntities(domain?: Domain): PolybolosEntity[] {
    const all = Array.from(this.entityStore.values());
    if (domain) return all.filter((entity) => entity.domain === domain);
    return all;
  }

  /** Get entity count by domain */
  getEntityCountByDomain(): Record<Domain, number> {
    const counts = {} as Record<Domain, number>;
    for (const d of Object.values(Domain)) counts[d] = 0;
    for (const entity of Array.from(this.entityStore.values())) {
      counts[entity.domain] = (counts[entity.domain] || 0) + 1;
    }
    return counts;
  }

  /** Get entities above a certain threat level */
  getThreats(minLevel: ThreatLevel = ThreatLevel.ELEVATED): PolybolosEntity[] {
    const levels = [ThreatLevel.NONE, ThreatLevel.LOW, ThreatLevel.ELEVATED, ThreatLevel.HIGH, ThreatLevel.CRITICAL];
    const minIndex = levels.indexOf(minLevel);
    return Array.from(this.entityStore.values())
      .filter((entity) => levels.indexOf(entity.threat) >= minIndex);
  }

  /** Get current SDK status */
  getStatus(): SDKStatus {
    return {
      connected: true,
      feedCount: this.getActiveFeedCount(),
      entityCount: this.entityStore.size,
      latticeStatus: this.latticeAdapter?.getStatus() || 'disconnected',
      lastUpdate: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  /** Convert current entity store to GeoJSON FeatureCollection for MapLibre */
  toGeoJSON(domain?: Domain): GeoJSON.FeatureCollection {
    const entities = this.getEntities(domain);
    return {
      type: 'FeatureCollection',
      features: entities.map((entity) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [entity.position.lng, entity.position.lat],
        },
        properties: {
          id: entity.id,
          name: entity.name,
          domain: entity.domain,
          entityType: entity.entityType,
          threat: entity.threat,
          color: entity.display.color,
          icon: entity.display.icon,
          heading: entity.position.heading || 0,
          alt: entity.position.alt,
          speed: entity.position.speed,
          glow: entity.display.glow || false,
          scale: entity.display.scale || 1.0,
          source: entity.source.provider,
          ...entity.properties,
        },
      })),
    };
  }

  /** Shutdown the SDK */
  destroy(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.sseConnection) this.sseConnection.close();
    if (this.latticeAdapter) this.latticeAdapter.disconnect();
    this.entityStore.clear();
  }

  private emitUpdate(): void {
    this.config.onEntityUpdate?.(Array.from(this.entityStore.values()));
    this.config.onStatusChange?.(this.getStatus());
  }

  private getActiveFeedCount(): number {
    let count = 0;
    // Count OSIRIS feeds that have data
    const feeds = ['commercial_flights', 'private_flights', 'military_flights', 'maritime_ships',
      'satellites', 'earthquakes', 'fires', 'cameras', 'radiation'];
    if (this.entityStore.size > 0) count = feeds.length; // Simplified: if store has data, feeds are active
    if (this.latticeAdapter && this.latticeAdapter.getEntityCount() > 0) count++;
    return Math.min(count, feeds.length);
  }
}
