// ============================================
// PostGIS Service - Database Connection & Spatial Queries
// ============================================

import { Pool, PoolClient, Notification } from 'pg'
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
} from './types'

// ============================================
// PostGIS Query Builder
// ============================================

export class PostGISService {
  private pool: Pool
  private isConnected: boolean = false

  constructor(private config: MapServiceConfig['postgis']) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.poolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    this.pool.on('error', (err) => {
      console.error('[PostGIS] Unexpected error on idle client:', err)
    })
  }

  // ============================================
  // Connection Management
  // ============================================

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect()
      const result = await client.query('SELECT PostGIS_Version()')
      console.log(`[PostGIS] Connected: ${result.rows[0].postgis_version}`)
      client.release()
      this.isConnected = true
    } catch (error) {
      console.error('[PostGIS] Connection failed:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end()
    this.isConnected = false
  }

  isReady(): boolean {
    return this.isConnected
  }

  // ============================================
  // LISTEN/NOTIFY for Real-time Updates
  // ============================================

  /**
   * Subscribe to PostGIS table changes
   * Use this for real-time map updates via SSE
   */
  async listenToChanges(
    channel: string,
    callback: (notification: Notification) => void,
  ): Promise<() => Promise<void>> {
    const client = await this.pool.connect()

    await client.query(`LISTEN ${channel}`)

    client.on('notification', callback)

    // Return cleanup function
    return async () => {
      client.removeListener('notification', callback)
      await client.query(`UNLISTEN ${channel}`)
      client.release()
    }
  }

  // ============================================
  // Traffic Node Queries
  // ============================================

  /**
   * Get all traffic nodes within a bounding box
   */
  async getNodesInBounds(
    bounds: BoundingBox,
    options?: {
      nodeTypes?: TrafficNode['type'][]
      minSaturation?: number
    },
  ): Promise<TrafficNode[]> {
    const client = await this.pool.connect()

    try {
      let query = `
        SELECT 
          id,
          name,
          ST_AsGeoJSON(geom)::json -> 'coordinates' as coordinates,
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
      `
      const params: (number | string)[] = [
        bounds.southWest.lng,
        bounds.southWest.lat,
        bounds.northEast.lng,
        bounds.northEast.lat,
      ]

      if (options?.nodeTypes?.length) {
        query += ` AND node_type = ANY($5)`
        params.push(options.nodeTypes)
      }

      if (options?.minSaturation !== undefined) {
        query += ` AND saturation_level >= $${params.length + 1}`
        params.push(options.minSaturation)
      }

      query += ' ORDER BY passenger_throughput DESC LIMIT 500'

      const result = await client.query(query, params)

      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        position: {
          lat: row.coordinates[1],
          lng: row.coordinates[0],
        },
        type: row.node_type,
        metrics: {
          passengerThroughput: row.passenger_throughput,
          averageDwellTime: row.average_dwell_time,
          peakHour: row.peak_hour,
          saturationLevel: row.saturation_level,
        },
        connectedRoutes: row.connected_routes || [],
      }))
    } finally {
      client.release()
    }
  }

  /**
   * Get node by ID with full details
   */
  async getNodeById(id: string): Promise<TrafficNode | null> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        SELECT 
          id,
          name,
          ST_AsGeoJSON(geom)::json -> 'coordinates' as coordinates,
          node_type,
          passenger_throughput,
          average_dwell_time,
          peak_hour,
          saturation_level,
          connected_routes
        FROM traffic_nodes
        WHERE id = $1
      `,
        [id],
      )

      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        name: row.name,
        position: {
          lat: row.coordinates[1],
          lng: row.coordinates[0],
        },
        type: row.node_type,
        metrics: {
          passengerThroughput: row.passenger_throughput,
          averageDwellTime: row.average_dwell_time,
          peakHour: row.peak_hour,
          saturationLevel: row.saturation_level,
        },
        connectedRoutes: row.connected_routes || [],
      }
    } finally {
      client.release()
    }
  }

  // ============================================
  // Corridor Analytics Queries
  // ============================================

  /**
   * Get corridors within bounds
   */
  async getCorridorsInBounds(
    bounds: BoundingBox,
  ): Promise<CorridorAnalytics[]> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        SELECT 
          id,
          name,
          start_node,
          end_node,
          ST_AsGeoJSON(geom)::json -> 'coordinates' as geometry,
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
        LIMIT 200
      `,
        [
          bounds.southWest.lng,
          bounds.southWest.lat,
          bounds.northEast.lng,
          bounds.northEast.lat,
        ],
      )

      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        startNode: row.start_node,
        endNode: row.end_node,
        geometry: row.geometry.map((coord: number[]) => ({
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
      }))
    } finally {
      client.release()
    }
  }

  // ============================================
  // Vehicle Tracking Queries
  // ============================================

  /**
   * Get active vehicles within bounds
   */
  async getVehiclesInBounds(bounds: BoundingBox): Promise<Vehicle[]> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        SELECT 
          v.id,
          v.sacco_id,
          s.name as sacco_name,
          v.plate_number,
          v.capacity,
          ST_AsGeoJSON(v.position)::json -> 'coordinates' as coordinates,
          v.heading,
          v.speed,
          v.status,
          v.last_updated,
          s.name as sacco_name
        FROM vehicles v
        JOIN saccos s ON v.sacco_id = s.id
        WHERE ST_Intersects(
          v.position,
          ST_MakeEnvelope($1, $2, $3, $4, 4326)
        )
        AND v.status = 'active'
        ORDER BY v.last_updated DESC
        LIMIT 1000
      `,
        [
          bounds.southWest.lng,
          bounds.southWest.lat,
          bounds.northEast.lng,
          bounds.northEast.lat,
        ],
      )

      return result.rows.map((row) => ({
        id: row.id,
        saccoId: row.sacco_id,
        saccoName: row.sacco_name,
        plateNumber: row.plate_number,
        capacity: row.capacity,
        currentPosition: {
          lat: row.coordinates[1],
          lng: row.coordinates[0],
        },
        heading: row.heading,
        speed: row.speed,
        status: row.status,
        lastUpdated: row.last_updated,
      }))
    } finally {
      client.release()
    }
  }

  /**
   * Get nearest vehicles to a point
   */
  async getNearestVehicles(
    point: Coordinates,
    limit: number = 10,
    maxDistance: number = 5000, // meters
  ): Promise<Vehicle[]> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        SELECT 
          v.id,
          v.sacco_id,
          s.name as sacco_name,
          v.plate_number,
          v.capacity,
          ST_AsGeoJSON(v.position)::json -> 'coordinates' as coordinates,
          v.heading,
          v.speed,
          v.status,
          v.last_updated,
          ST_Distance(v.position::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance
        FROM vehicles v
        JOIN saccos s ON v.sacco_id = s.id
        WHERE ST_DWithin(
          v.position::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        AND v.status = 'active'
        ORDER BY distance ASC
        LIMIT $4
      `,
        [point.lng, point.lat, maxDistance, limit],
      )

      return result.rows.map((row) => ({
        id: row.id,
        saccoId: row.sacco_id,
        saccoName: row.sacco_name,
        plateNumber: row.plate_number,
        capacity: row.capacity,
        currentPosition: {
          lat: row.coordinates[1],
          lng: row.coordinates[0],
        },
        heading: row.heading,
        speed: row.speed,
        status: row.status,
        lastUpdated: row.last_updated,
      }))
    } finally {
      client.release()
    }
  }

  // ============================================
  // H3 Grid Queries
  // ============================================

  /**
   * Get H3 cells within bounds
   */
  async getH3CellsInBounds(
    bounds: BoundingBox,
    resolution: number = 9,
  ): Promise<H3Cell[]> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        SELECT 
          h3_cell_id,
          resolution,
          ST_AsGeoJSON(h3_boundary)::json as boundary,
          ST_AsGeoJSON(h3_center)::json -> 'coordinates' as center,
          properties
        FROM h3_cells
        WHERE resolution = $1
        AND ST_Intersects(
          h3_boundary,
          ST_MakeEnvelope($2, $3, $4, $5, 4326)
        )
        LIMIT 5000
      `,
        [
          resolution,
          bounds.southWest.lng,
          bounds.southWest.lat,
          bounds.northEast.lng,
          bounds.northEast.lat,
        ],
      )

      return result.rows.map((row) => ({
        cellId: row.h3_cell_id,
        resolution: row.resolution,
        boundary: row.boundary.coordinates[0].map((coord: number[]) => ({
          lng: coord[0],
          lat: coord[1],
        })),
        center: {
          lng: row.center[0],
          lat: row.center[1],
        },
        properties: row.properties,
      }))
    } finally {
      client.release()
    }
  }

  // ============================================
  // GeoJSON Export
  // ============================================

  /**
   * Export traffic nodes as GeoJSON
   */
  async getNodesAsGeoJSON(bounds: BoundingBox): Promise<GeoJSONFeatureCollection> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', jsonb_agg(feature)
        ) as geojson
        FROM (
          SELECT 
            jsonb_build_object(
              'type', 'Feature',
              'id', id,
              'geometry', ST_AsGeoJSON(geom)::json,
              'properties', jsonb_build_object(
                'name', name,
                'node_type', node_type,
                'passenger_throughput', passenger_throughput,
                'saturation_level', saturation_level,
                'peak_hour', peak_hour
              )
            ) as feature
          FROM traffic_nodes
          WHERE ST_Intersects(
            geom,
            ST_MakeEnvelope($1, $2, $3, $4, 4326)
          )
        ) features
      `,
        [
          bounds.southWest.lng,
          bounds.southWest.lat,
          bounds.northEast.lng,
          bounds.northEast.lat,
        ],
      )

      return result.rows[0].geojson
    } finally {
      client.release()
    }
  }

  /**
   * Export all traffic data as GeoJSON (nodes + corridors)
   */
  async getFullMapAsGeoJSON(
    bounds: BoundingBox,
  ): Promise<GeoJSONFeatureCollection> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', jsonb_agg(feature ORDER BY type, id)
        ) as geojson
        FROM (
          SELECT 
            'Node' as type,
            id,
            jsonb_build_object(
              'type', 'Feature',
              'id', id,
              'geometry', ST_AsGeoJSON(geom)::json,
              'properties', jsonb_build_object(
                'category', 'node',
                'name', name,
                'node_type', node_type,
                'throughput', passenger_throughput
              )
            ) as feature
          FROM traffic_nodes
          WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
          
          UNION ALL
          
          SELECT 
            'Corridor' as type,
            id,
            jsonb_build_object(
              'type', 'Feature',
              'id', id,
              'geometry', ST_AsGeoJSON(geom)::json,
              'properties', jsonb_build_object(
                'category', 'corridor',
                'name', name,
                'fuel_burn', fuel_burn_rate,
                'stress_index', vehicle_stress_index
              )
            ) as feature
          FROM corridor_analytics
          WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))
        ) combined
      `,
        [
          bounds.southWest.lng,
          bounds.southWest.lat,
          bounds.northEast.lng,
          bounds.northEast.lat,
        ],
      )

      return result.rows[0].geojson
    } finally {
      client.release()
    }
  }

  // ============================================
  // Utility Queries
  // ============================================

  /**
   * Get statistics for a bounding box
   */
  async getBoundsStats(bounds: BoundingBox): Promise<{
    nodeCount: number
    vehicleCount: number
    corridorCount: number
  }> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `
        SELECT 
          (SELECT COUNT(*) FROM traffic_nodes WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))) as node_count,
          (SELECT COUNT(*) FROM vehicles WHERE ST_Intersects(position, ST_MakeEnvelope($1, $2, $3, $4, 4326))) as vehicle_count,
          (SELECT COUNT(*) FROM corridor_analytics WHERE ST_Intersects(geom, ST_MakeEnvelope($1, $2, $3, $4, 4326))) as corridor_count
      `,
        [
          bounds.southWest.lng,
          bounds.southWest.lat,
          bounds.northEast.lng,
          bounds.northEast.lat,
        ],
      )

      return {
        nodeCount: parseInt(result.rows[0].node_count),
        vehicleCount: parseInt(result.rows[0].vehicle_count),
        corridorCount: parseInt(result.rows[0].corridor_count),
      }
    } finally {
      client.release()
    }
  }

  /**
   * Health check query
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now()
    const client = await this.pool.connect()

    try {
      await client.query('SELECT 1')
      return {
        healthy: true,
        latency: Date.now() - start,
      }
    } catch {
      return {
        healthy: false,
        latency: Date.now() - start,
      }
    } finally {
      client.release()
    }
  }
}
