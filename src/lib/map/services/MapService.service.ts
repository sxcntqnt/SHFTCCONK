// ============================================
// Map Service - Main Entry Point (DuckDB + SvelteKit)
// .server.ts suffix ensures this is NEVER included in the client bundle.
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

import { DuckDBService } from './DuckDB.service';
import type { SSEStreamManager } from './SseStreamer.service';

// ============================================
// Upstream Service Client
// ============================================
class UpstreamMapClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config: MapServiceConfig['upstream']) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.retryAttempts = config.retryAttempts;
    this.retryDelay = config.retryAttempts > 0 ? 1000 : 0;
  }

  async fetchTile(
    x: number,
    y: number,
    z: number,
  ): Promise<{ data: ArrayBuffer; headers: Record<string, string> }> {
    return this.request(`/tiles/${z}/${x}/${y}.pbf`);
  }

  async fetchFeatures(bounds: BoundingBox): Promise<GeoJSONFeatureCollection> {
    const query = new URLSearchParams({
      sw_lat: bounds.southWest.lat.toString(),
      sw_lng: bounds.southWest.lng.toString(),
      ne_lat: bounds.northEast.lat.toString(),
      ne_lng: bounds.northEast.lng.toString(),
    });
    return this.request(`/features?${query}`);
  }

  async fetchRouteGeometry(
    routeId: string,
  ): Promise<{ geometry: Coordinates[]; segments: number }> {
    return this.request(`/routes/${routeId}/geometry`);
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        }
        if (contentType?.includes('application/x-protobuf')) {
          const data = await response.arrayBuffer();
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => (headers[key] = value));
          return { data, headers } as unknown as T;
        }
        return (await response.text()) as unknown as T;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw new Error(
      `Failed after ${this.retryAttempts + 1} attempts: ${lastError?.message}`,
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// Main Map Service
//
// EventEmitter intentionally removed — it pulled in Node's `events`
// module which Vite stubs to a browser no-op, breaking SSR builds.
// Event broadcasting is handled directly via SSEStreamManager.
// ============================================
export class MapService {
  private db: DuckDBService;
  private sse: SSEStreamManager;
  private upstream: UpstreamMapClient;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor(db: DuckDBService, sse: SSEStreamManager, config: MapServiceConfig) {
    this.db = db;
    this.sse = sse;
    this.upstream = new UpstreamMapClient(config.upstream);
  }

  // ============================================
  // Lifecycle
  // ============================================
  async start(): Promise<void> {
    if (this.isRunning) return;
    console.log('[MapService] Starting with DuckDB...');

    await this.db.connect();
    this.startPeriodicUpdates();

    this.isRunning = true;
    console.log('[MapService] Started successfully (DuckDB)');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    console.log('[MapService] Stopping...');

    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();

    await this.sse.shutdown();
    await this.db.disconnect();

    this.isRunning = false;
    console.log('[MapService] Stopped');
  }

  // ============================================
  // Data API Methods
  // ============================================
  async getTrafficNodes(
    bounds: BoundingBox,
    options?: { nodeTypes?: TrafficNode['type'][]; minSaturation?: number },
  ): Promise<TrafficNode[]> {
    return this.db.getNodesInBounds(bounds, options);
  }

  async getCorridorAnalytics(bounds: BoundingBox): Promise<CorridorAnalytics[]> {
    return this.db.getCorridorsInBounds(bounds);
  }

  async getNodeById(id: string): Promise<TrafficNode | null> {
    return this.db.getNodeById(id);
  }

  async getNodeSaturation(nodeId: string): Promise<H3Metrics | null> {
    const node = await this.getNodeById(nodeId);
    if (!node) return null;

    return {
      cellId: nodeId,
      commuterThroughput: node.metrics.passengerThroughput,
      averageDwellTime: node.metrics.averageDwellTime,
      transferVelocity: 0,
      walkingToWaitingRatio: 0,
      nodeSaturation: node.metrics.saturationLevel,
    };
  }

  async getVehicles(bounds: BoundingBox): Promise<Vehicle[]> {
    return this.db.getVehiclesInBounds(bounds);
  }

  async getNearestVehicles(
    point: Coordinates,
    limit: number = 10,
    maxDistance: number = 5000,
  ): Promise<Vehicle[]> {
    return this.db.getNearestVehicles(point, limit, maxDistance);
  }

  async getH3Cells(bounds: BoundingBox, resolution: number = 9): Promise<H3Cell[]> {
    return this.db.getH3CellsInBounds(bounds, resolution);
  }

  async exportGeoJSON(bounds: BoundingBox): Promise<GeoJSONFeatureCollection> {
    return this.db.getFullMapAsGeoJSON(bounds);
  }

  async exportNodesGeoJSON(bounds: BoundingBox): Promise<GeoJSONFeatureCollection> {
    return this.db.getNodesAsGeoJSON(bounds);
  }

  // ============================================
  // Upstream Integration
  // ============================================
  async getTile(x: number, y: number, z: number): Promise<ArrayBuffer> {
    const result = await this.upstream.fetchTile(x, y, z);
    return result.data;
  }

  async getUpstreamFeatures(bounds: BoundingBox): Promise<GeoJSONFeatureCollection> {
    return this.upstream.fetchFeatures(bounds);
  }

  async getRouteGeometry(
    routeId: string,
  ): Promise<{ geometry: Coordinates[]; segments: number }> {
    return this.upstream.fetchRouteGeometry(routeId);
  }

  // ============================================
  // Real-time Updates (Polling)
  // ============================================
  private startPeriodicUpdates(): void {
    // Refresh vehicles every 5 seconds
    this.updateIntervals.set(
      'vehicle_refresh',
      setInterval(() => this.refreshVehicles(), 5000),
    );

    // Refresh traffic data every 30 seconds
    this.updateIntervals.set(
      'traffic_refresh',
      setInterval(() => this.refreshTrafficData(), 30000),
    );
  }

  private async refreshVehicles(): Promise<void> {
    try {
      const bounds: BoundingBox = {
        northEast: { lat: -1.15, lng: 36.95 },
        southWest: { lat: -1.45, lng: 36.65 },
      };

      const vehicles = await this.getVehicles(bounds);
      const data: VehicleStreamData = { vehicles, bounds };

      this.sse.broadcastVehicles(data);
    } catch (error) {
      console.error('[MapService] Error refreshing vehicles:', error);
    }
  }

  private async refreshTrafficData(): Promise<void> {
    try {
      const bounds: BoundingBox = {
        northEast: { lat: -1.15, lng: 36.95 },
        southWest: { lat: -1.45, lng: 36.65 },
      };

      const [nodes, corridors] = await Promise.all([
        this.getTrafficNodes(bounds),
        this.getCorridorAnalytics(bounds),
      ]);

      const data: TrafficStreamData = {
        nodes,
        corridors,
        updatedAt: new Date().toISOString(),
      };

      this.sse.broadcastTraffic(data);
    } catch (error) {
      console.error('[MapService] Error refreshing traffic data:', error);
    }
  }

  // ============================================
  // Health & Stats
  // ============================================
  async getHealth(): Promise<{
    healthy: boolean;
    database: boolean;
    sse: { clients: number };
    uptime: number;
  }> {
    const dbHealth = await this.db.healthCheck();
    const stats = this.sse.getClientCount();

    return {
      healthy: dbHealth.healthy,
      database: dbHealth.healthy,
      sse: { clients: stats },
      uptime: process.uptime(),
    };
  }

  getSSEStats(): { clients: number; clientIds: string[] } {
    return {
      clients: this.sse.getClientCount(),
      clientIds: this.sse.getClientIds(),
    };
  }
}

// ============================================
// Service Factory
// ============================================
let mapServiceInstance: MapService | null = null;

export async function createMapService(config: MapServiceConfig): Promise<MapService> {
  const db = new DuckDBService(config.duckdb);
  const sse = (await import('./SseStreamer.service')).sseStreamManager;

  mapServiceInstance = new MapService(db, sse, config);
  await mapServiceInstance.start();

  return mapServiceInstance;
}

export function getMapService(): MapService | null {
  return mapServiceInstance;
}