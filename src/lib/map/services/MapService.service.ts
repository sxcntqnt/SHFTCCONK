// ============================================
// Map Service - Main Entry Point (DuckDB + ClickHouse)
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
import {  initClickHouse, initializeClickHouseTables, getClickHouseInstance } from '$lib/realtime/ClickHouse.service';

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
// Dual-database architecture:
// - DuckDB: Static map data (buildings, base maps, H3 cells)
// - ClickHouse: Real-time data (vehicles, traffic nodes, corridors)
// ============================================
export class MapService {
  private duckdb: DuckDBService;
  private sse: SSEStreamManager;
  private upstream: UpstreamMapClient;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private clickhouseInitialized: boolean = false;

  constructor(duckdb: DuckDBService, sse: SSEStreamManager, config: MapServiceConfig) {
    this.duckdb = duckdb;
    this.sse = sse;
    this.upstream = new UpstreamMapClient(config.upstream);
  }

  // ============================================
  // Lifecycle
  // ============================================
  async start(): Promise<void> {
    if (this.isRunning) return;
    console.log('[MapService] Starting with DuckDB (static) + ClickHouse (real-time)...');

    // Initialize ClickHouse connection and tables
    await this.initializeClickHouse();
    
    // Connect to DuckDB for static map data
    await this.duckdb.connect();
    
    // Start periodic updates from ClickHouse
    this.startPeriodicUpdates();

    this.isRunning = true;
    console.log('[MapService] Started successfully (DuckDB + ClickHouse)');
  }

  /**
   * Initialize ClickHouse connection and ensure tables exist
   */
  private async initializeClickHouse(): Promise<void> {
    try {
      console.log('[MapService] Initializing ClickHouse...');
      
      // Initialize ClickHouse connection
      await initClickHouse({
        host: process.env.CLICKHOUSE_HOST || 'localhost',
        port: parseInt(process.env.CLICKHOUSE_PORT || '8123'),
        username: process.env.CLICKHOUSE_USER || 'default',
        password: process.env.CLICKHOUSE_PASSWORD || '',
        database: process.env.CLICKHOUSE_DATABASE || 'traffic_db',
        protocol: (process.env.CLICKHOUSE_PROTOCOL as 'http' | 'https') || 'http',
      });
      
      // Initialize required tables
      await initializeClickHouseTables();
      
      this.clickhouseInitialized = true;
      console.log('[MapService] ClickHouse initialized successfully');
    } catch (error) {
      console.error('[MapService] Failed to initialize ClickHouse:', error);
      throw new Error(`ClickHouse initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    console.log('[MapService] Stopping...');

    // Clear update intervals
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();

    // Shutdown SSE
    await this.sse.shutdown();
    
    // Disconnect DuckDB
    await this.duckdb.disconnect();
    
    // Disconnect ClickHouse
    try {
      const clickhouse = getClickHouseInstance();
      await clickhouse.disconnect();
      console.log('[MapService] ClickHouse disconnected');
    } catch (error) {
      console.error('[MapService] Error disconnecting ClickHouse:', error);
    }

    this.isRunning = false;
    this.clickhouseInitialized = false;
    console.log('[MapService] Stopped');
  }

  // ============================================
  // Static Map Data from DuckDB
  // ============================================
  
  async getH3Cells(bounds: BoundingBox, resolution: number = 9): Promise<H3Cell[]> {
    // Static H3 grid data from DuckDB
    return this.duckdb.getH3CellsInBounds(bounds, resolution);
  }

  async exportGeoJSON(bounds: BoundingBox): Promise<GeoJSONFeatureCollection> {
    // Static map features from DuckDB
    return this.duckdb.getFullMapAsGeoJSON(bounds);
  }

  async exportNodesGeoJSON(bounds: BoundingBox): Promise<GeoJSONFeatureCollection> {
    // Static node geometries from DuckDB
    return this.duckdb.getNodesAsGeoJSON(bounds);
  }

  // ============================================
  // Real-time Traffic Data from ClickHouse
  // ============================================
  
  async getTrafficNodes(
    bounds: BoundingBox,
    options?: { nodeTypes?: TrafficNode['type'][]; minSaturation?: number },
  ): Promise<TrafficNode[]> {
    this.ensureClickHouseInitialized();
    
    // Real-time traffic node data from ClickHouse
    let nodes = await clickHouseMapService.getTrafficNodes(bounds);
    
    // Apply filters if provided
    if (options?.minSaturation) {
      nodes = nodes.filter(node => (node.saturation || 0) >= options.minSaturation!);
    }
    if (options?.nodeTypes?.length) {
      nodes = nodes.filter(node => options.nodeTypes!.includes(node.type));
    }
    
    return nodes;
  }

  async getCorridorAnalytics(bounds: BoundingBox): Promise<CorridorAnalytics[]> {
    this.ensureClickHouseInitialized();
    
    // Real-time corridor analytics from ClickHouse
    return clickHouseMapService.getTrafficCorridors(bounds);
  }

  async getNodeById(id: string): Promise<TrafficNode | null> {
    this.ensureClickHouseInitialized();
    
    // Get specific traffic node from ClickHouse
    const nodes = await clickHouseMapService.getTrafficNodes({
      northEast: { lat: 90, lng: 180 },
      southWest: { lat: -90, lng: -180 }
    });
    return nodes.find(node => node.id === id) || null;
  }

  async getNodeSaturation(nodeId: string): Promise<H3Metrics | null> {
    this.ensureClickHouseInitialized();
    
    // Calculate saturation metrics from ClickHouse node data
    const node = await this.getNodeById(nodeId);
    if (!node) return null;

    return {
      cellId: nodeId,
      commuterThroughput: node.saturation ? node.saturation * 1000 : 0,
      averageDwellTime: 120, // Example value - would come from ClickHouse
      transferVelocity: 0,
      walkingToWaitingRatio: 0,
      nodeSaturation: node.saturation || 0,
    };
  }

  async getVehicles(bounds: BoundingBox): Promise<Vehicle[]> {
    this.ensureClickHouseInitialized();
    
    // Real-time vehicle positions from ClickHouse
    return clickHouseMapService.getVehicles(bounds);
  }

  async getNearestVehicles(
    point: Coordinates,
    limit: number = 10,
    maxDistance: number = 5000,
  ): Promise<Vehicle[]> {
    this.ensureClickHouseInitialized();
    
    // Get all vehicles within bounds first, then calculate distances
    const bounds: BoundingBox = {
      northEast: { lat: point.lat + 0.05, lng: point.lng + 0.05 },
      southWest: { lat: point.lat - 0.05, lng: point.lng - 0.05 }
    };
    
    const vehicles = await this.getVehicles(bounds);
    
    // Calculate distances and filter
    const vehiclesWithDistance = vehicles.map(vehicle => ({
      ...vehicle,
      distance: this.calculateDistance(point, { lat: vehicle.lat, lng: vehicle.lng })
    }));
    
    return vehiclesWithDistance
      .filter(v => v.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  // Helper method for distance calculation
  private calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Ensure ClickHouse is initialized before making queries
  private ensureClickHouseInitialized(): void {
    if (!this.clickhouseInitialized) {
      throw new Error('ClickHouse not initialized. Call start() first or check connection.');
    }
  }

  // ============================================
  // Upstream Integration (External APIs)
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
  // Real-time Updates (Polling from ClickHouse)
  // ============================================
  
  private startPeriodicUpdates(): void {
    // Refresh vehicles from ClickHouse every 5 seconds
    this.updateIntervals.set(
      'vehicle_refresh',
      setInterval(() => this.refreshVehicles(), 5000),
    );

    // Refresh traffic data from ClickHouse every 30 seconds
    this.updateIntervals.set(
      'traffic_refresh',
      setInterval(() => this.refreshTrafficData(), 30000),
    );
  }

  private async refreshVehicles(): Promise<void> {
    if (!this.clickhouseInitialized) return;
    
    try {
      const bounds: BoundingBox = {
        northEast: { lat: -1.15, lng: 36.95 },
        southWest: { lat: -1.45, lng: 36.65 },
      };

      const vehicles = await this.getVehicles(bounds);
      const data: VehicleStreamData = { vehicles, bounds };

      this.sse.broadcastVehicles(data);
    } catch (error) {
      console.error('[MapService] Error refreshing vehicles from ClickHouse:', error);
    }
  }

  private async refreshTrafficData(): Promise<void> {
    if (!this.clickhouseInitialized) return;
    
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
      console.error('[MapService] Error refreshing traffic data from ClickHouse:', error);
    }
  }

  // ============================================
  // Health & Stats
  // ============================================
  
  async getHealth(): Promise<{
    healthy: boolean;
    duckdb: boolean;
    clickhouse: boolean;
    sse: { clients: number };
    uptime: number;
  }> {
    const duckdbHealth = await this.duckdb.healthCheck();
    const stats = this.sse.getClientCount();
    
    // Health check for ClickHouse
    let clickhouseHealthy = false;
    if (this.clickhouseInitialized) {
      try {
        const clickhouse = getClickHouseInstance();
        const health = await clickhouse.healthCheck();
        clickhouseHealthy = health.healthy;
      } catch (error) {
        console.error('[MapService] ClickHouse health check failed:', error);
      }
    }

    return {
      healthy: duckdbHealth.healthy && clickhouseHealthy,
      duckdb: duckdbHealth.healthy,
      clickhouse: clickhouseHealthy,
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

  // ============================================
  // Additional Utility Methods
  // ============================================
  
  async getCombinedMapData(bounds: BoundingBox): Promise<{
    staticMap: GeoJSONFeatureCollection;
    vehicles: Vehicle[];
    trafficNodes: TrafficNode[];
    corridors: CorridorAnalytics[];
  }> {
    const [staticMap, vehicles, trafficNodes, corridors] = await Promise.all([
      this.exportGeoJSON(bounds),
      this.getVehicles(bounds),
      this.getTrafficNodes(bounds),
      this.getCorridorAnalytics(bounds),
    ]);

    return {
      staticMap,
      vehicles,
      trafficNodes,
      corridors,
    };
  }

  // Manual refresh methods for on-demand updates
  async manualRefreshVehicles(bounds: BoundingBox): Promise<Vehicle[]> {
    this.ensureClickHouseInitialized();
    const vehicles = await this.getVehicles(bounds);
    const data: VehicleStreamData = { vehicles, bounds };
    this.sse.broadcastVehicles(data);
    return vehicles;
  }

  async manualRefreshTraffic(bounds: BoundingBox): Promise<{ nodes: TrafficNode[]; corridors: CorridorAnalytics[] }> {
    this.ensureClickHouseInitialized();
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
    return { nodes, corridors };
  }
}

// ============================================
// Service Factory
// ============================================
let mapServiceInstance: MapService | null = null;

export async function createMapService(config: MapServiceConfig): Promise<MapService> {
  const duckdb = new DuckDBService(config.duckdb);
  const sse = (await import('./SseStreamer.service')).sseStreamManager;

  mapServiceInstance = new MapService(duckdb, sse, config);
  await mapServiceInstance.start();

  return mapServiceInstance;
}

export function getMapService(): MapService | null {
  return mapServiceInstance;
}

// ============================================
// Cleanup on app shutdown
// ============================================
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('[MapService] SIGTERM received, cleaning up...');
    if (mapServiceInstance) {
      await mapServiceInstance.stop();
    }
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[MapService] SIGINT received, cleaning up...');
    if (mapServiceInstance) {
      await mapServiceInstance.stop();
    }
    process.exit(0);
  });
}