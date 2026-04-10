// ============================================
// Map Service - Main Entry Point
// Integrates PostGIS, SSE Streaming, and Upstream Service
// ============================================

import { EventEmitter } from 'events'
import type {
  Coordinates,
  BoundingBox,
  TrafficNode,
  CorridorAnalytics,
  Vehicle,
  H3Cell,
  H3Metrics,
  MapMarker,
  GeoJSONFeatureCollection,
  MapServiceConfig,
  StreamEvent,
  VehicleStreamData,
  TrafficStreamData,
} from './types'
import type { PostGISService } from './postgis.service'
import type { SSEStreamManager } from './sse-streamer.service'

// ============================================
// Upstream Service Client
// ============================================

class UpstreamMapClient {
  private baseUrl: string
  private timeout: number
  private retryAttempts: number
  private retryDelay: number

  constructor(config: MapServiceConfig['upstream']) {
    this.baseUrl = config.baseUrl
    this.timeout = config.timeout
    this.retryAttempts = config.retryAttempts
    this.retryDelay = config.retryAttempts > 0 ? 1000 : 0
  }

  async fetchTile(
    x: number,
    y: number,
    z: number,
  ): Promise<{ data: ArrayBuffer; headers: Record<string, string> }> {
    return this.request(`/tiles/${z}/${x}/${y}.pbf`)
  }

  async fetchFeatures(
    bounds: BoundingBox,
  ): Promise<GeoJSONFeatureCollection> {
    const query = new URLSearchParams({
      sw_lat: bounds.southWest.lat.toString(),
      sw_lng: bounds.southWest.lng.toString(),
      ne_lat: bounds.northEast.lat.toString(),
      ne_lng: bounds.northEast.lng.toString(),
    })

    return this.request(`/features?${query}`)
  }

  async fetchRouteGeometry(
    routeId: string,
  ): Promise<{ geometry: Coordinates[]; segments: number }> {
    return this.request(`/routes/${routeId}/geometry`)
  }

  private async request<T>(path: string, options?: { retries?: number }): Promise<T> {
    const url = `${this.baseUrl}${path}`
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          return await response.json()
        }

        if (contentType?.includes('application/x-protobuf')) {
          const data = await response.arrayBuffer()
          const headers: Record<string, string> = {}
          response.headers.forEach((value, key) => {
            headers[key] = value
          })
          return { data, headers } as unknown as T
        }

        return await response.text() as unknown as T
      } catch (error) {
        lastError = error as Error

        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * Math.pow(2, attempt)) // Exponential backoff
        }
      }
    }

    throw new Error(`Failed after ${this.retryAttempts + 1} attempts: ${lastError?.message}`)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// ============================================
// Main Map Service
// ============================================

export class MapService extends EventEmitter {
  private postgis: PostGISService
  private sse: SSEStreamManager
  private upstream: UpstreamMapClient
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map()
  private isRunning: boolean = false

  constructor(
    postgis: PostGISService,
    sse: SSEStreamManager,
    config: MapServiceConfig,
  ) {
    super()
    this.postgis = postgis
    this.sse = sse
    this.upstream = new UpstreamMapClient(config.upstream)
  }

  // ============================================
  // Lifecycle
  // ============================================

  async start(): Promise<void> {
    if (this.isRunning) return

    console.log('[MapService] Starting...')
    await this.postgis.connect()

    // Start periodic updates
    this.startPeriodicUpdates()

    this.isRunning = true
    console.log('[MapService] Started successfully')
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    console.log('[MapService] Stopping...')

    // Clear all intervals
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval)
    }
    this.updateIntervals.clear()

    // Shutdown SSE
    await this.sse.shutdown()

    // Disconnect PostGIS
    await this.postgis.disconnect()

    this.isRunning = false
    console.log('[MapService] Stopped')
  }

  // ============================================
  // Traffic Data API
  // ============================================

  /**
   * Get traffic nodes within bounds
   */
  async getTrafficNodes(
    bounds: BoundingBox,
    options?: {
      nodeTypes?: TrafficNode['type'][]
      minSaturation?: number
    },
  ): Promise<TrafficNode[]> {
    return this.postgis.getNodesInBounds(bounds, options)
  }

  /**
   * Get corridors within bounds
   */
  async getCorridorAnalytics(bounds: BoundingBox): Promise<CorridorAnalytics[]> {
    return this.postgis.getCorridorsInBounds(bounds)
  }

  /**
   * Get node by ID
   */
  async getNodeById(id: string): Promise<TrafficNode | null> {
    return this.postgis.getNodeById(id)
  }

  /**
   * Get node saturation metrics
   */
  async getNodeSaturation(nodeId: string): Promise<H3Metrics | null> {
    // This would query a separate metrics table
    const node = await this.postgis.getNodeById(nodeId)
    if (!node) return null

    return {
      cellId: nodeId,
      commuterThroughput: node.metrics.passengerThroughput,
      averageDwellTime: node.metrics.averageDwellTime,
      transferVelocity: 0, // Would be calculated from historical data
      walkingToWaitingRatio: 0,
      nodeSaturation: node.metrics.saturationLevel,
    }
  }

  // ============================================
  // Vehicle Tracking API
  // ============================================

  /**
   * Get vehicles within bounds
   */
  async getVehicles(bounds: BoundingBox): Promise<Vehicle[]> {
    return this.postgis.getVehiclesInBounds(bounds)
  }

  /**
   * Get nearest vehicles to a point
   */
  async getNearestVehicles(
    point: Coordinates,
    limit?: number,
    maxDistance?: number,
  ): Promise<Vehicle[]> {
    return this.postgis.getNearestVehicles(point, limit, maxDistance)
  }

  /**
   * Track a specific vehicle
   */
  async trackVehicle(
    vehicleId: string,
  ): Promise<{ vehicle: Vehicle; history: Coordinates[] } | null> {
    const vehicles = await this.postgis.getNearestVehicles(
      { lat: 0, lng: 0 }, // This would need a different approach
      1,
      0,
    )
    return vehicles.length > 0 ? { vehicle: vehicles[0], history: [] } : null
  }

  // ============================================
  // H3 Grid API
  // ============================================

  /**
   * Get H3 cells for a bounding box
   */
  async getH3Cells(
    bounds: BoundingBox,
    resolution?: number,
  ): Promise<H3Cell[]> {
    return this.postgis.getH3CellsInBounds(bounds, resolution)
  }

  /**
   * Get H3 metrics for specific cells
   */
  async getH3Metrics(cellIds: string[]): Promise<H3Metrics[]> {
    // Would query a metrics/materialized view table
    return cellIds.map((cellId) => ({
      cellId,
      commuterThroughput: Math.floor(Math.random() * 10000),
      averageDwellTime: Math.floor(Math.random() * 300),
      transferVelocity: Math.random() * 50,
      walkingToWaitingRatio: Math.random() * 2,
      nodeSaturation: Math.random(),
    }))
  }

  /**
   * Export H3 data as GeoJSON
   */
  async exportH3GeoJSON(bounds: BoundingBox): Promise<GeoJSONFeatureCollection> {
    const cells = await this.getH3Cells(bounds)
    
    return {
      type: 'FeatureCollection',
      features: cells.map((cell) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [cell.boundary.map(c => [c.lng, c.lat])],
        },
        properties: {
          cellId: cell.cellId,
          resolution: cell.resolution,
          ...cell.properties,
        },
      })),
    }
  }

  // ============================================
  // GeoJSON Export API
  // ============================================

  /**
   * Export traffic data as GeoJSON
   */
  async exportGeoJSON(bounds: BoundingBox): Promise<GeoJSONFeatureCollection> {
    return this.postgis.getFullMapAsGeoJSON(bounds)
  }

  /**
   * Export nodes as GeoJSON
   */
  async exportNodesGeoJSON(bounds: BoundingBox): Promise<GeoJSONFeatureCollection> {
    return this.postgis.getNodesAsGeoJSON(bounds)
  }

  // ============================================
  // Upstream Integration
  // ============================================

  /**
   * Get tile from upstream service
   */
  async getTile(x: number, y: number, z: number): Promise<ArrayBuffer> {
    const result = await this.upstream.fetchTile(x, y, z)
    return result.data
  }

  /**
   * Get features from upstream
   */
  async getUpstreamFeatures(
    bounds: BoundingBox,
  ): Promise<GeoJSONFeatureCollection> {
    return this.upstream.fetchFeatures(bounds)
  }

  /**
   * Get route geometry from upstream
   */
  async getRouteGeometry(
    routeId: string,
  ): Promise<{ geometry: Coordinates[]; segments: number }> {
    return this.upstream.fetchRouteGeometry(routeId)
  }

  // ============================================
  // Site Selection Tools
  // ============================================

  /**
   * Simulate impact of placing a point on commuter flow
   */
  async simulateSiteImpact(
    point: Coordinates,
    radiusMeters: number = 500,
  ): Promise<{
    dailyCommuters: number
    peakHourVolume: number
    vehiclePassThrough: number
    saturationLevel: number
    recommendations: string[]
  }> {
    const bounds: BoundingBox = {
      northEast: {
        lat: point.lat + 0.01,
        lng: point.lng + 0.01,
      },
      southWest: {
        lat: point.lat - 0.01,
        lng: point.lng - 0.01,
      },
    }

    const [nodes, vehicles] = await Promise.all([
      this.getTrafficNodes(bounds),
      this.getVehicles(bounds),
    ])

    // Calculate metrics
    const totalCommuters = nodes.reduce(
      (sum, n) => sum + n.metrics.passengerThroughput,
      0,
    )
    const avgSaturation =
      nodes.length > 0
        ? nodes.reduce((sum, n) => sum + n.metrics.saturationLevel, 0) /
          nodes.length
        : 0

    const recommendations: string[] = []
    
    if (avgSaturation > 0.8) {
      recommendations.push(
        'High saturation detected - consider differentiating from existing services',
      )
    }
    if (avgSaturation < 0.3) {
      recommendations.push(
        'Low saturation area - potential for capturing unmet demand',
      )
    }
    if (totalCommuters > 10000) {
      recommendations.push('High commuter volume - prime location for retail/food service')
    }

    return {
      dailyCommuters: totalCommuters,
      peakHourVolume: Math.floor(totalCommuters * 0.15), // Assuming 15% peak
      vehiclePassThrough: vehicles.length * 20, // Estimated passes per day
      saturationLevel: avgSaturation,
      recommendations,
    }
  }

  // ============================================
  // Reservation Tracking
  // ============================================

  /**
   * Get vehicles for reserved routes
   */
  async getReservedVehicles(reservationIds: string[]): Promise<Vehicle[]> {
    // Would filter by reservation in a real implementation
    return []
  }

  // ============================================
  // Real-time Updates
  // ============================================

  /**
   * Start listening to PostGIS notifications
   */
  async startDBNotifications(): Promise<void> {
    const cleanup = await this.postgis.listenToChanges(
      'map_updates',
      async (notification) => {
        const payload = JSON.parse(notification.payload || '{}')
        this.handleDBNotification(payload)
      },
    )

    // Store cleanup function
    this.updateIntervals.set('db_notifications', cleanup as unknown as NodeJS.Timeout)
  }

  private handleDBNotification(payload: {
    type: 'vehicle' | 'node' | 'corridor'
    action: 'insert' | 'update' | 'delete'
    data: unknown
  }): void {
    switch (payload.type) {
      case 'vehicle':
        this.refreshVehicles()
        break
      case 'node':
        this.refreshTrafficData()
        break
      case 'corridor':
        this.refreshTrafficData()
        break
    }

    this.emit('db_update', payload)
  }

  private startPeriodicUpdates(): void {
    // Refresh vehicle positions every 5 seconds
    this.updateIntervals.set(
      'vehicle_refresh',
      setInterval(() => this.refreshVehicles(), 5000),
    )

    // Refresh traffic data every 30 seconds
    this.updateIntervals.set(
      'traffic_refresh',
      setInterval(() => this.refreshTrafficData(), 30000),
    )
  }

  private async refreshVehicles(): Promise<void> {
    try {
      // Get a default bounds or use the first connected client's bounds
      const bounds: BoundingBox = {
        northEast: { lat: -1.15, lng: 36.95 },
        southWest: { lat: -1.45, lng: 36.65 },
      }

      const vehicles = await this.getVehicles(bounds)
      const data: VehicleStreamData = { vehicles, bounds }

      this.sse.broadcastVehicles(data)
    } catch (error) {
      console.error('[MapService] Error refreshing vehicles:', error)
    }
  }

  private async refreshTrafficData(): Promise<void> {
    try {
      const bounds: BoundingBox = {
        northEast: { lat: -1.15, lng: 36.95 },
        southWest: { lat: -1.45, lng: 36.65 },
      }

      const [nodes, corridors] = await Promise.all([
        this.getTrafficNodes(bounds),
        this.getCorridorAnalytics(bounds),
      ])

      const data: TrafficStreamData = {
        nodes,
        corridors,
        updatedAt: new Date().toISOString(),
      }

      this.sse.broadcastTraffic(data)
    } catch (error) {
      console.error('[MapService] Error refreshing traffic data:', error)
    }
  }

  // ============================================
  // Health & Stats
  // ============================================

  async getHealth(): Promise<{
    healthy: boolean
    postgis: boolean
    sse: { clients: number }
    uptime: number
  }> {
    const pgHealth = await this.postgis.healthCheck()
    const stats = this.sse.getClientCount()

    return {
      healthy: pgHealth.healthy,
      postgis: pgHealth.healthy,
      sse: { clients: stats },
      uptime: process.uptime(),
    }
  }

  getSSEStats(): { clients: number; clientIds: string[] } {
    return {
      clients: this.sse.getClientCount(),
      clientIds: this.sse.getClientIds(),
    }
  }
}

// ============================================
// Service Factory
// ============================================

let mapServiceInstance: MapService | null = null

export async function createMapService(
  config: MapServiceConfig,
): Promise<MapService> {
  // Create PostGIS service
  const postgis = new PostGISService(config.postgis)

  // Use singleton SSE manager
  const sse = (await import('./sse-streamer.service')).sseStreamManager

  // Create and start map service
  mapServiceInstance = new MapService(postgis, sse, config)
  await mapServiceInstance.start()

  return mapServiceInstance
}

export function getMapService(): MapService | null {
  return mapServiceInstance
}
