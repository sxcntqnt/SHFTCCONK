// ============================================
// DuckDB Service - Spatial Queries (PostGIS replacement)
// ============================================
import duckdb from '@duckdb/node-api'; // or '@duckdb/duckdb-wasm' for browser
import type {
  Coordinates,
  BoundingBox,
  TrafficNode,
  CorridorAnalytics,
  Vehicle,
  H3Cell,
  MapMarker,
  GeoJSONFeatureCollection,
  MapServiceConfig,
} from './types/MapTypes';

export class DuckDBService {
  private db: duckdb.DuckDB | null = null;
  private connection: duckdb.DuckDBConnection | null = null;
  private isConnected: boolean = false;

  constructor(private config: MapServiceConfig['duckdb']) {}

  // ============================================
  // Connection Management
  // ============================================
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // For Node.js: use persistent file or :memory:
      const dbPath = this.config.database || ':memory:';
      this.db = await duckdb.createDatabase(dbPath);

      this.connection = await this.db.connect();

      // Load required extensions
      await this.connection.query(`INSTALL spatial;`);
      await this.connection.query(`LOAD spatial;`);

      // Optional: H3 extension if you need it
      try {
        await this.connection.query(`INSTALL h3;`);
        await this.connection.query(`LOAD h3;`);
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
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    this.isConnected = false;
    console.log('[DuckDB] Disconnected');
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // ============================================
  // Traffic Node Queries
  // ============================================
  async getNodesInBounds(
    bounds: BoundingBox,
    options?: {
      nodeTypes?: TrafficNode['type'][];
      minSaturation?: number;
    }
  ): Promise<TrafficNode[]> {
    let query = `
      SELECT
        id,
        name,
        ST_AsGeoJSON(geom) AS geojson,
        node_type,
        passenger_throughput,
        average_dwell_time,
        peak_hour,
        saturation_level,
        connected_routes
      FROM traffic_nodes
      WHERE ST_Intersects(
        geom,
        ST_MakeEnvelope(?, ?, ?, ?, 4326)
      )
    `;

    const params: any[] = [
      bounds.southWest.lng,
      bounds.southWest.lat,
      bounds.northEast.lng,
      bounds.northEast.lat,
    ];

    if (options?.nodeTypes?.length) {
      query += ` AND node_type = ANY(?)`;
      params.push(options.nodeTypes);
    }

    if (options?.minSaturation !== undefined) {
      query += ` AND saturation_level >= ?`;
      params.push(options.minSaturation);
    }

    query += ` ORDER BY passenger_throughput DESC LIMIT 500`;

    const result = await this.connection!.query(query, params);
    const rows = await result.getRows();

    return rows.map((row: any) => {
      const coords = row.geojson.coordinates;
      return {
        id: row.id,
        name: row.name,
        position: {
          lat: coords[1],
          lng: coords[0],
        },
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
    const query = `
      SELECT
        id,
        name,
        ST_AsGeoJSON(geom) AS geojson,
        node_type,
        passenger_throughput,
        average_dwell_time,
        peak_hour,
        saturation_level,
        connected_routes
      FROM traffic_nodes
      WHERE id = ?
    `;

    const result = await this.connection!.query(query, [id]);
    const rows = await result.getRows();

    if (rows.length === 0) return null;

    const row = rows[0];
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
    const query = `
      SELECT
        id,
        name,
        start_node,
        end_node,
        ST_AsGeoJSON(geom) AS geojson,
        fuel_burn_rate,
        idling_hotspot_score,
        vehicle_stress_index,
        average_speed,
        peak_flow_time
      FROM corridor_analytics
      WHERE ST_Intersects(
        geom,
        ST_MakeEnvelope(?, ?, ?, ?, 4326)
      )
      ORDER BY idling_hotspot_score DESC
      LIMIT 200
    `;

    const result = await this.connection!.query(query, [
      bounds.southWest.lng,
      bounds.southWest.lat,
      bounds.northEast.lng,
      bounds.northEast.lat,
    ]);

    const rows = await result.getRows();

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
    const query = `
      SELECT
        v.id,
        v.sacco_id,
        s.name as sacco_name,
        v.plate_number,
        v.capacity,
        ST_AsGeoJSON(v.position) AS geojson,
        v.heading,
        v.speed,
        v.status,
        v.last_updated
      FROM vehicles v
      JOIN saccos s ON v.sacco_id = s.id
      WHERE ST_Intersects(
        v.position,
        ST_MakeEnvelope(?, ?, ?, ?, 4326)
      )
      AND v.status = 'active'
      ORDER BY v.last_updated DESC
      LIMIT 1000
    `;

    const result = await this.connection!.query(query, [
      bounds.southWest.lng,
      bounds.southWest.lat,
      bounds.northEast.lng,
      bounds.northEast.lat,
    ]);

    const rows = await result.getRows();

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
    maxDistance: number = 5000 // meters
  ): Promise<Vehicle[]> {
    const query = `
      SELECT
        v.id,
        v.sacco_id,
        s.name as sacco_name,
        v.plate_number,
        v.capacity,
        ST_AsGeoJSON(v.position) AS geojson,
        v.heading,
        v.speed,
        v.status,
        v.last_updated
      FROM vehicles v
      JOIN saccos s ON v.sacco_id = s.id
      WHERE ST_DWithin(
        v.position::GEOGRAPHY,
        ST_SetSRID(ST_MakePoint(?, ?), 4326)::GEOGRAPHY,
        ?
      )
      AND v.status = 'active'
      ORDER BY ST_Distance(v.position::GEOGRAPHY, ST_SetSRID(ST_MakePoint(?, ?), 4326)::GEOGRAPHY) ASC
      LIMIT ?
    `;

    const result = await this.connection!.query(query, [
      point.lng,
      point.lat,
      maxDistance,
      point.lng,
      point.lat,
      limit,
    ]);

    const rows = await result.getRows();

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
  // H3 Grid Queries (requires h3 extension)
  // ============================================
  async getH3CellsInBounds(
    bounds: BoundingBox,
    resolution: number = 9
  ): Promise<H3Cell[]> {
    const query = `
      SELECT
        h3_cell_id,
        resolution,
        ST_AsGeoJSON(h3_boundary) AS boundary_geojson,
        ST_AsGeoJSON(h3_center) AS center_geojson,
        properties
      FROM h3_cells
      WHERE resolution = ?
        AND ST_Intersects(
          h3_boundary,
          ST_MakeEnvelope(?, ?, ?, ?, 4326)
        )
      LIMIT 5000
    `;

    const result = await this.connection!.query(query, [
      resolution,
      bounds.southWest.lng,
      bounds.southWest.lat,
      bounds.northEast.lng,
      bounds.northEast.lat,
    ]);

    const rows = await result.getRows();

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
    const query = `
      SELECT json({
        'type': 'FeatureCollection',
        'features': json_group_array(
          json({
            'type': 'Feature',
            'id': id,
            'geometry': ST_AsGeoJSON(geom)::JSON,
            'properties': {
              'name': name,
              'node_type': node_type,
              'passenger_throughput': passenger_throughput,
              'saturation_level': saturation_level,
              'peak_hour': peak_hour
            }
          })
        )
      }) AS geojson
      FROM traffic_nodes
      WHERE ST_Intersects(geom, ST_MakeEnvelope(?, ?, ?, ?, 4326))
    `;

    const result = await this.connection!.query(query, [
      bounds.southWest.lng,
      bounds.southWest.lat,
      bounds.northEast.lng,
      bounds.northEast.lat,
    ]);

    const rows = await result.getRows();
    return rows[0].geojson;
  }

  // (Similar pattern for getFullMapAsGeoJSON – let me know if you need it expanded)

  // ============================================
  // Utility
  // ============================================
  async getBoundsStats(bounds: BoundingBox): Promise<{
    nodeCount: number;
    vehicleCount: number;
    corridorCount: number;
  }> {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM traffic_nodes 
         WHERE ST_Intersects(geom, ST_MakeEnvelope(?, ?, ?, ?, 4326))) AS node_count,
        (SELECT COUNT(*) FROM vehicles 
         WHERE ST_Intersects(position, ST_MakeEnvelope(?, ?, ?, ?, 4326))) AS vehicle_count,
        (SELECT COUNT(*) FROM corridor_analytics 
         WHERE ST_Intersects(geom, ST_MakeEnvelope(?, ?, ?, ?, 4326))) AS corridor_count
    `;

    const result = await this.connection!.query(query, [
      bounds.southWest.lng, bounds.southWest.lat,
      bounds.northEast.lng, bounds.northEast.lat,
    ].flat()); // repeat bounds

    const row = (await result.getRows())[0];

    return {
      nodeCount: Number(row.node_count),
      vehicleCount: Number(row.vehicle_count),
      corridorCount: Number(row.corridor_count),
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try {
      await this.connection!.query(`SELECT 1`);
      return { healthy: true, latency: Date.now() - start };
    } catch {
      return { healthy: false, latency: Date.now() - start };
    }
  }
}