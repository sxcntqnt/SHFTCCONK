// ============================================
// DuckDB Service - Spatial Queries (PostGIS replacement)
// Uses @duckdb/node-api v1.x — named exports, DuckDBInstance pattern
// ============================================
import { DuckDBInstance } from '@duckdb/node-api';
import type { DuckDBConnection } from '@duckdb/node-api';
import type {
  Coordinates,
  BoundingBox,
  TrafficNode,
  CorridorAnalytics,
  Vehicle,
  H3Cell,
  GeoJSONFeatureCollection,
  MapServiceConfig,
} from '../types/MapTypes';

export class DuckDBService {
  private instance: DuckDBInstance | null = null;
  private connection: DuckDBConnection | null = null;
  private isConnected: boolean = false;

  constructor(private config: MapServiceConfig['duckdb']) {}

  // ============================================
  // Connection Management
  // ============================================
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      const dbPath = this.config.database || ':memory:';

      // @duckdb/node-api v1.x API — DuckDBInstance.create() replaces createDatabase()
      this.instance = await DuckDBInstance.create(dbPath, {
        access_mode: this.config.readOnly ? 'READ_ONLY' : 'READ_WRITE',
      });

      this.connection = await this.instance.connect();

      // Load required extensions
      await this.connection.run(`INSTALL spatial;`);
      await this.connection.run(`LOAD spatial;`);

      // H3 extension — optional, warn and continue if unavailable
      try {
        await this.connection.run(`INSTALL h3 FROM community;`);
        await this.connection.run(`LOAD h3;`);
      } catch (e) {
        console.warn('[DuckDB] H3 extension not available:', e);
      }

      this.isConnected = true;
      console.log(`[DuckDB] Connected to: ${dbPath}`);
    } catch (error) {
      console.error('[DuckDB] Connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
    }
    this.isConnected = false;
    console.log('[DuckDB] Disconnected');
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // ============================================
  // Internal query helper
  // Runs a prepared statement and returns typed rows.
  // @duckdb/node-api uses .run() for mutations, .stream() / .all() for reads.
  // ============================================
  private async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    if (!this.connection) throw new Error('[DuckDB] Not connected');

    const prepared = await this.connection.prepare(sql);
    const result = await prepared.query(...params);
    // result.getRows() returns an array of plain objects keyed by column name
    return result.getRows() as T[];
  }

  // ============================================
  // Traffic Node Queries
  // ============================================
  async getNodesInBounds(
    bounds: BoundingBox,
    options?: {
      nodeTypes?: TrafficNode['type'][];
      minSaturation?: number;
    },
  ): Promise<TrafficNode[]> {
    let sql = `
      SELECT
        id,
        name,
        ST_AsGeoJSON(geom)::JSON AS geojson,
        node_type,
        passenger_throughput,
        average_dwell_time,
        peak_hour,
        saturation_level,
        connected_routes
      FROM traffic_nodes
      WHERE ST_Intersects(
        geom,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
    `;

    const params: unknown[] = [
      bounds.southWest.lng,
      bounds.southWest.lat,
      bounds.northEast.lng,
      bounds.northEast.lat,
    ];

    let paramIdx = 5;

    if (options?.nodeTypes?.length) {
      sql += ` AND node_type = ANY($${paramIdx++})`;
      params.push(options.nodeTypes);
    }

    if (options?.minSaturation !== undefined) {
      sql += ` AND saturation_level >= $${paramIdx++}`;
      params.push(options.minSaturation);
    }

    sql += ` ORDER BY passenger_throughput DESC LIMIT 500`;

    const rows = await this.query(sql, params);

    return rows.map((row: any) => {
      const coords = row.geojson.coordinates;
      return {
        id: row.id,
        name: row.name,
        position: { lat: coords[1], lng: coords[0] },
        type: row.node_type,
        metrics: {
          passengerThroughput: row.passenger_throughput,
          averageDwellTime: row.average_dwell_time,
          peakHour: row.peak_hour,
          saturationLevel: row.saturation_level,
        },
        connectedRoutes: row.connected_routes || [],
      };
    });
  }

  async getNodeById(id: string): Promise<TrafficNode | null> {
    const rows = await this.query(
      `SELECT
        id,
        name,
        ST_AsGeoJSON(geom)::JSON AS geojson,
        node_type,
        passenger_throughput,
        average_dwell_time,
        peak_hour,
        saturation_level,
        connected_routes
      FROM traffic_nodes
      WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) return null;

    const row: any = rows[0];
    const coords = row.geojson.coordinates;

    return {
      id: row.id,
      name: row.name,
      position: { lat: coords[1], lng: coords[0] },
      type: row.node_type,
      metrics: {
        passengerThroughput: row.passenger_throughput,
        averageDwellTime: row.average_dwell_time,
        peakHour: row.peak_hour,
        saturationLevel: row.saturation_level,
      },
      connectedRoutes: row.connected_routes || [],
    };
  }

  // ============================================
  // Corridor Analytics
  // ============================================
  async getCorridorsInBounds(bounds: BoundingBox): Promise<CorridorAnalytics[]> {
    const rows = await this.query(
      `SELECT
        id,
        name,
        start_node,
        end_node,
        ST_AsGeoJSON(geom)::JSON AS geojson,
        fuel_burn_rate,
        idling_hotspot_score,
        vehicle_stress_index,
        average_speed,
        peak_flow_time
      FROM corridor_analytics
      WHERE ST_Intersects(
        geom,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
      ORDER BY idling_hotspot_score DESC
      LIMIT 200`,
      [
        bounds.southWest.lng,
        bounds.southWest.lat,
        bounds.northEast.lng,
        bounds.northEast.lat,
      ],
    );

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      startNode: row.start_node,
      endNode: row.end_node,
      geometry: row.geojson.coordinates.map((coord: number[]) => ({
        lng: coord[0],
        lat: coord[1],
      })),
      metrics: {
        fuelBurnRate: row.fuel_burn_rate,
        idlingHotspotScore: row.idling_hotspot_score,
        vehicleStressIndex: row.vehicle_stress_index,
        averageSpeed: row.average_speed,
        peakFlowTime: row.peak_flow_time,
      },
    }));
  }

  // ============================================
  // Vehicle Tracking
  // ============================================
  async getVehiclesInBounds(bounds: BoundingBox): Promise<Vehicle[]> {
    const rows = await this.query(
      `SELECT
        v.id,
        v.sacco_id,
        s.name AS sacco_name,
        v.plate_number,
        v.capacity,
        ST_AsGeoJSON(v.position)::JSON AS geojson,
        v.heading,
        v.speed,
        v.status,
        v.last_updated
      FROM vehicles v
      JOIN saccos s ON v.sacco_id = s.id
      WHERE ST_Intersects(
        v.position,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
      AND v.status = 'active'
      ORDER BY v.last_updated DESC
      LIMIT 1000`,
      [
        bounds.southWest.lng,
        bounds.southWest.lat,
        bounds.northEast.lng,
        bounds.northEast.lat,
      ],
    );

    return rows.map((row: any) => {
      const coords = row.geojson.coordinates;
      return {
        id: row.id,
        saccoId: row.sacco_id,
        saccoName: row.sacco_name,
        plateNumber: row.plate_number,
        capacity: row.capacity,
        currentPosition: { lat: coords[1], lng: coords[0] },
        heading: row.heading,
        speed: row.speed,
        status: row.status,
        lastUpdated: row.last_updated,
      };
    });
  }

  async getNearestVehicles(
    point: Coordinates,
    limit: number = 10,
    maxDistance: number = 5000,
  ): Promise<Vehicle[]> {
    const rows = await this.query(
      `SELECT
        v.id,
        v.sacco_id,
        s.name AS sacco_name,
        v.plate_number,
        v.capacity,
        ST_AsGeoJSON(v.position)::JSON AS geojson,
        v.heading,
        v.speed,
        v.status,
        v.last_updated
      FROM vehicles v
      JOIN saccos s ON v.sacco_id = s.id
      WHERE ST_DWithin(
        v.position::GEOGRAPHY,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
        $3
      )
      AND v.status = 'active'
      ORDER BY ST_Distance(
        v.position::GEOGRAPHY,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY
      ) ASC
      LIMIT $4`,
      [point.lng, point.lat, maxDistance, limit],
    );

    return rows.map((row: any) => {
      const coords = row.geojson.coordinates;
      return {
        id: row.id,
        saccoId: row.sacco_id,
        saccoName: row.sacco_name,
        plateNumber: row.plate_number,
        capacity: row.capacity,
        currentPosition: { lat: coords[1], lng: coords[0] },
        heading: row.heading,
        speed: row.speed,
        status: row.status,
        lastUpdated: row.last_updated,
      };
    });
  }

  // ============================================
  // H3 Grid Queries (requires h3 community extension)
  // ============================================
  async getH3CellsInBounds(
    bounds: BoundingBox,
    resolution: number = 9,
  ): Promise<H3Cell[]> {
    const rows = await this.query(
      `SELECT
        h3_cell_id,
        resolution,
        ST_AsGeoJSON(h3_boundary)::JSON AS boundary_geojson,
        ST_AsGeoJSON(h3_center)::JSON  AS center_geojson,
        properties
      FROM h3_cells
      WHERE resolution = $1
        AND ST_Intersects(
          h3_boundary,
          ST_MakeEnvelope($2, $3, $4, $5, 4326)
        )
      LIMIT 5000`,
      [
        resolution,
        bounds.southWest.lng,
        bounds.southWest.lat,
        bounds.northEast.lng,
        bounds.northEast.lat,
      ],
    );

    return rows.map((row: any) => ({
      cellId: row.h3_cell_id,
      resolution: row.resolution,
      boundary: row.boundary_geojson.coordinates[0].map((coord: number[]) => ({
        lng: coord[0],
        lat: coord[1],
      })),
      center: {
        lng: row.center_geojson.coordinates[0],
        lat: row.center_geojson.coordinates[1],
      },
      properties: row.properties,
    }));
  }

  // ============================================
  // GeoJSON Export
  // ============================================
  async getNodesAsGeoJSON(bounds: BoundingBox): Promise<GeoJSONFeatureCollection> {
    const rows = await this.query(
      `SELECT json_object(
        'type', 'FeatureCollection',
        'features', json_group_array(
          json_object(
            'type', 'Feature',
            'id', id,
            'geometry', ST_AsGeoJSON(geom)::JSON,
            'properties', json_object(
              'name', name,
              'node_type', node_type,
              'passenger_throughput', passenger_throughput,
              'saturation_level', saturation_level,
              'peak_hour', peak_hour
            )
          )
        )
      ) AS geojson
      FROM traffic_nodes
      WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))`,
      [
        bounds.southWest.lng,
        bounds.southWest.lat,
        bounds.northEast.lng,
        bounds.northEast.lat,
      ],
    );

    return (rows[0] as any).geojson as GeoJSONFeatureCollection;
  }

  async getFullMapAsGeoJSON(bounds: BoundingBox): Promise<GeoJSONFeatureCollection> {
    // Merge nodes + corridors into a single FeatureCollection
    const rows = await this.query(
      `SELECT json_object(
        'type', 'FeatureCollection',
        'features', json_group_array(feature)
      ) AS geojson
      FROM (
        SELECT json_object(
          'type', 'Feature',
          'id', 'node-' || id,
          'geometry', ST_AsGeoJSON(geom)::JSON,
          'properties', json_object('layer', 'nodes', 'name', name, 'node_type', node_type)
        ) AS feature
        FROM traffic_nodes
        WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))

        UNION ALL

        SELECT json_object(
          'type', 'Feature',
          'id', 'corridor-' || id,
          'geometry', ST_AsGeoJSON(geom)::JSON,
          'properties', json_object('layer', 'corridors', 'name', name)
        ) AS feature
        FROM corridor_analytics
        WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
      )`,
      [
        bounds.southWest.lng,
        bounds.southWest.lat,
        bounds.northEast.lng,
        bounds.northEast.lat,
      ],
    );

    return (rows[0] as any).geojson as GeoJSONFeatureCollection;
  }

  // ============================================
  // Utility
  // ============================================
  async getBoundsStats(bounds: BoundingBox): Promise<{
    nodeCount: number;
    vehicleCount: number;
    corridorCount: number;
  }> {
    const p = [
      bounds.southWest.lng,
      bounds.southWest.lat,
      bounds.northEast.lng,
      bounds.northEast.lat,
    ];

    const rows = await this.query(
      `SELECT
        (SELECT COUNT(*) FROM traffic_nodes
         WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))) AS node_count,
        (SELECT COUNT(*) FROM vehicles
         WHERE ST_Intersects(position, ST_MakeEnvelope($1, $2, $3, $4, 4326))) AS vehicle_count,
        (SELECT COUNT(*) FROM corridor_analytics
         WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))) AS corridor_count`,
      p,
    );

    const row: any = rows[0];
    return {
      nodeCount: Number(row.node_count),
      vehicleCount: Number(row.vehicle_count),
      corridorCount: Number(row.corridor_count),
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try {
      await this.query(`SELECT 1`);
      return { healthy: true, latency: Date.now() - start };
    } catch {
      return { healthy: false, latency: Date.now() - start };
    }
  }
}