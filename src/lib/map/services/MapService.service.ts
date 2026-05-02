// ============================================
// Map Service - Orchestrator (WASM + ClickHouse)
// ============================================

import type {
  Coordinates,
  BoundingBox,
  TrafficNode,
  CorridorAnalytics,
  Vehicle,
  H3Cell,
  H3Metrics,
  GeoJSONFeatureCollection,
  MapServiceConfig,
  VehicleStreamData,
  TrafficStreamData,
} from '../types/MapTypes';

import { DuckDBWasmCore } from './DuckDBWasmCore';
import {
  getNodesInBounds,
  getNodeById,
} from './MapQueries';

import type { SSEStreamManager } from './SseStreamer.service';
import {
  getClickHouseInstance,
  initializeClickHouseTables,
} from '$lib/realtime/ClickHouse.service';

// ============================================
// Upstream Client (unchanged)
// ============================================
class UpstreamMapClient {
  constructor(private config: MapServiceConfig['upstream']) {}

  async fetchTile(x: number, y: number, z: number) {
    const res = await fetch(`${this.config.baseUrl}/tiles/${z}/${x}/${y}.pbf`);
    return res.arrayBuffer();
  }
}

// ============================================
// Map Service
// ============================================
export class MapService {
  private duckdb: DuckDBWasmCore;
  private sse: SSEStreamManager;
  private upstream: UpstreamMapClient;

  private isRunning = false;
  private clickhouseInitialized = false;
  private intervals = new Map<string, NodeJS.Timeout>();

  constructor(
    duckdb: DuckDBWasmCore,
    sse: SSEStreamManager,
    config: MapServiceConfig
  ) {
    this.duckdb = duckdb;
    this.sse = sse;
    this.upstream = new UpstreamMapClient(config.upstream);
  }

  // ============================================
  // Lifecycle
  // ============================================
  async start() {
    if (this.isRunning) return;

    console.log('[MapService] Starting (WASM + ClickHouse)...');

    await this.initClickHouse();
    await this.duckdb.init();

    this.startPolling();

    this.isRunning = true;
  }

  async stop() {
    if (!this.isRunning) return;

    for (const i of this.intervals.values()) clearInterval(i);

    await this.sse.shutdown();
    await this.duckdb.close();

    this.isRunning = false;
  }

  // ============================================
  // ClickHouse
  // ============================================
  private async initClickHouse() {
    const ch = getClickHouseInstance({
      host: process.env.CLICKHOUSE_HOST || 'localhost',
      port: Number(process.env.CLICKHOUSE_PORT || 8123),
      database: process.env.CLICKHOUSE_DATABASE || 'traffic_db',
    });

    await ch.connect();
    await initializeClickHouseTables(ch);

    this.clickhouseInitialized = true;
  }

  private ensureCH() {
    if (!this.clickhouseInitialized) {
      throw new Error('ClickHouse not initialized');
    }
  }

  // ============================================
  // Static Data (DuckDB WASM)
  // ============================================

  async getTrafficNodes(
    bounds: BoundingBox,
    options?: {
      nodeTypes?: string[];
      minSaturation?: number;
    }
  ): Promise<TrafficNode[]> {
    return getNodesInBounds(this.duckdb, bounds, options);
  }

  async getNodeById(id: string) {
    return getNodeById(this.duckdb, id);
  }

  // ============================================
  // Real-time (ClickHouse)
  // ============================================

  async getVehicles(bounds: BoundingBox): Promise<Vehicle[]> {
    this.ensureCH();
    return getClickHouseInstance().getVehicles(bounds);
  }

  async getCorridorAnalytics(bounds: BoundingBox): Promise<CorridorAnalytics[]> {
    this.ensureCH();
    return getClickHouseInstance().getTrafficCorridors(bounds);
  }

  async getNearestVehicles(
    point: Coordinates,
    limit = 10,
    maxDistance = 5000
  ) {
    const bounds: BoundingBox = {
      northEast: { lat: point.lat + 0.05, lng: point.lng + 0.05 },
      southWest: { lat: point.lat - 0.05, lng: point.lng - 0.05 },
    };

    const vehicles = await this.getVehicles(bounds);

    return vehicles
      .map(v => ({
        ...v,
        distance: this.dist(point, v),
      }))
      .filter(v => v.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  private dist(a: Coordinates, b: Coordinates) {
    const R = 6371e3;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;

    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * Math.PI / 180) *
        Math.cos(b.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
  }

  // ============================================
  // Polling → SSE
  // ============================================
  private startPolling() {
    this.intervals.set(
      'vehicles',
      setInterval(() => this.pushVehicles(), 5000)
    );

    this.intervals.set(
      'traffic',
      setInterval(() => this.pushTraffic(), 30000)
    );
  }

  private async pushVehicles() {
    if (!this.clickhouseInitialized) return;

    const bounds: BoundingBox = {
      northEast: { lat: -1.15, lng: 36.95 },
      southWest: { lat: -1.45, lng: 36.65 },
    };

    const vehicles = await this.getVehicles(bounds);

    const payload: VehicleStreamData = { vehicles, bounds };

    this.sse.broadcastVehicles(payload);
  }

  private async pushTraffic() {
    if (!this.clickhouseInitialized) return;

    const bounds: BoundingBox = {
      northEast: { lat: -1.15, lng: 36.95 },
      southWest: { lat: -1.45, lng: 36.65 },
    };

    const [nodes, corridors] = await Promise.all([
      this.getTrafficNodes(bounds),
      this.getCorridorAnalytics(bounds),
    ]);

    const payload: TrafficStreamData = {
      nodes,
      corridors,
      updatedAt: new Date().toISOString(),
    };

    this.sse.broadcastTraffic(payload);
  }

  // ============================================
  // Health
  // ============================================
  async getHealth() {
    const duck = await this.duckdb.healthCheck();

    let chHealthy = false;
    try {
      const ch = getClickHouseInstance();
      chHealthy = (await ch.healthCheck()).healthy;
    } catch {}

    return {
      healthy: duck.healthy && chHealthy,
      duckdb: duck.healthy,
      clickhouse: chHealthy,
      sse: { clients: this.sse.getClientCount() },
    };
  }
}

// ============================================
// Factory
// ============================================

let instance: MapService | null = null;

export async function createMapService(config: MapServiceConfig) {
  const db = new DuckDBWasmCore({
    dbName: 'nairobi.duckdb',
    dbUrl: '/data/nairobi.duckdb',
    useOPFS: true,
  });

  const sse = (await import('./SseStreamer.service')).sseStreamManager;

  instance = new MapService(db, sse, config);
  return instance;
}

export function getMapService() {
  return instance;
}