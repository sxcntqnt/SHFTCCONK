// ============================================
// SSE Streamer Service - Real-time Map Data Streaming
// Handles Server-Sent Events for map updates with:
// - Heartbeat management
// - Reconnection support
// - Backpressure handling
// - Event aggregation
// ============================================

import type {
  StreamEvent,
  StreamEventType,
  VehicleStreamData,
  TrafficStreamData,
  BoundingBox,
} from './types'

// ============================================
// SSE Stream Client
// ============================================

interface SSEClient {
  id: string
  response: {
    write: (data: string) => boolean
    flush: () => void
    end: () => void
    on: (event: string, cb: () => void) => void
  }
  filters: StreamFilters
  subscriptions: Set<StreamEventType>
  connectedAt: Date
  lastEventAt: Date
  messageBuffer: StreamEvent[]
  isAlive: boolean
}

interface StreamFilters {
  bounds?: BoundingBox
  vehicleIds?: string[]
  nodeIds?: string[]
  includeHeartbeat: boolean
  heartbeatInterval: number
}

// ============================================
// SSE Stream Manager
// ============================================

export class SSEStreamManager {
  private clients: Map<string, SSEClient> = new Map()
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map()
  private cleanupIntervals: Map<string, NodeJS.Timeout> = new Map()
  private readonly maxClients: number
  private readonly defaultHeartbeatInterval: number
  private readonly clientTimeout: number
  private readonly bufferMaxSize: number

  constructor(options?: {
    maxClients?: number
    heartbeatInterval?: number
    clientTimeout?: number
    bufferMaxSize?: number
  }) {
    this.maxClients = options?.maxClients || 1000
    this.defaultHeartbeatInterval = options?.heartbeatInterval || 25000 // 25 seconds
    this.clientTimeout = options?.clientTimeout || 60000 // 60 seconds
    this.bufferMaxSize = options?.bufferMaxSize || 100
  }

  // ============================================
  // Client Management
  // ============================================

  /**
   * Register a new SSE client
   */
  registerClient(
    clientId: string,
    response: SSEClient['response'],
    filters?: Partial<StreamFilters>,
  ): { success: boolean; error?: string } {
    // Check max clients
    if (this.clients.size >= this.maxClients) {
      return {
        success: false,
        error: `Maximum clients (${this.maxClients}) reached. Please try again later.`,
      }
    }

    // Check for duplicate
    if (this.clients.has(clientId)) {
      this.removeClient(clientId)
    }

    const client: SSEClient = {
      id: clientId,
      response,
      filters: {
        includeHeartbeat: filters?.includeHeartbeat ?? true,
        heartbeatInterval: filters?.heartbeatInterval || this.defaultHeartbeatInterval,
        bounds: filters?.bounds,
        vehicleIds: filters?.vehicleIds,
        nodeIds: filters?.nodeIds,
      },
      subscriptions: new Set([
        'vehicle_update',
        'traffic_update',
        'reservation_update',
        'node_saturation',
        'corridor_alert',
      ]),
      connectedAt: new Date(),
      lastEventAt: new Date(),
      messageBuffer: [],
      isAlive: true,
    }

    this.clients.set(clientId, client)

    // Setup heartbeat
    this.startHeartbeat(clientId)

    // Setup cleanup check
    this.startCleanupTimer(clientId)

    // Send connected event
    this.sendToClient(clientId, {
      type: 'connected',
      timestamp: new Date().toISOString(),
      data: {
        clientId,
        subscribedEvents: Array.from(client.subscriptions),
        filters: client.filters,
        serverTime: new Date().toISOString(),
      },
    })

    console.log(`[SSE] Client connected: ${clientId} (Total: ${this.clients.size})`)

    return { success: true }
  }

  /**
   * Remove a client
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    // Clear intervals
    const heartbeatInterval = this.heartbeatIntervals.get(clientId)
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      this.heartbeatIntervals.delete(clientId)
    }

    const cleanupInterval = this.cleanupIntervals.get(clientId)
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      this.cleanupIntervals.delete(cleanupInterval)
    }

    // End response
    try {
      client.response.end()
    } catch (e) {
      // Client already disconnected
    }

    this.clients.delete(clientId)
    console.log(`[SSE] Client disconnected: ${clientId} (Total: ${this.clients.size})`)
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size
  }

  /**
   * Get all client IDs
   */
  getClientIds(): string[] {
    return Array.from(this.clients.keys())
  }

  // ============================================
  // Event Broadcasting
  // ============================================

  /**
   * Broadcast an event to all subscribed clients
   */
  broadcast<T>(event: StreamEvent<T>): number {
    let sent = 0

    for (const [clientId, client] of this.clients) {
      if (!client.isAlive) continue
      if (!client.subscriptions.has(event.type)) continue

      // Apply filters
      if (!this.shouldSendToClient(client, event)) continue

      this.sendToClient(clientId, event)
      sent++
    }

    return sent
  }

  /**
   * Send event to specific clients by filter
   */
  broadcastToBounds<T>(
    event: StreamEvent<T>,
    bounds: BoundingBox,
  ): number {
    let sent = 0

    for (const [clientId, client] of this.clients) {
      if (!client.isAlive) continue
      if (!client.subscriptions.has(event.type)) continue
      if (!client.filters.bounds) {
        // No bounds filter = receive all
        this.sendToClient(clientId, event)
        sent++
        continue
      }

      // Check if bounds overlap
      if (this.boundsOverlap(client.filters.bounds, bounds)) {
        this.sendToClient(clientId, event)
        sent++
      }
    }

    return sent
  }

  /**
   * Send vehicle updates (optimized batch)
   */
  broadcastVehicles(data: VehicleStreamData): void {
    const event: StreamEvent<VehicleStreamData> = {
      type: 'vehicle_update',
      timestamp: new Date().toISOString(),
      data,
    }
    this.broadcast(event)
  }

  /**
   * Send traffic updates (optimized batch)
   */
  broadcastTraffic(data: TrafficStreamData): void {
    const event: StreamEvent<TrafficStreamData> = {
      type: 'traffic_update',
      timestamp: new Date().toISOString(),
      data,
    }
    this.broadcast(event)
  }

  /**
   * Send node saturation alert
   */
  broadcastNodeSaturation(
    nodeId: string,
    nodeName: string,
    saturation: number,
    bounds: BoundingBox,
  ): void {
    const event: StreamEvent<{
      nodeId: string
      nodeName: string
      saturation: number
      severity: 'low' | 'medium' | 'high' | 'critical'
    }> = {
      type: 'node_saturation',
      timestamp: new Date().toISOString(),
      data: {
        nodeId,
        nodeName,
        saturation,
        severity:
          saturation > 0.9
            ? 'critical'
            : saturation > 0.7
              ? 'high'
              : saturation > 0.5
                ? 'medium'
                : 'low',
      },
    }

    this.broadcastToBounds(event, bounds)
  }

  /**
   * Send corridor alert
   */
  broadcastCorridorAlert(
    corridorId: string,
    corridorName: string,
    alertType: 'congestion' | 'delay' | 'closure',
    severity: number,
    bounds: BoundingBox,
  ): void {
    const event: StreamEvent<{
      corridorId: string
      corridorName: string
      alertType: string
      severity: number
    }> = {
      type: 'corridor_alert',
      timestamp: new Date().toISOString(),
      data: {
        corridorId,
        corridorName,
        alertType,
        severity,
      },
    }

    this.broadcastToBounds(event, bounds)
  }

  // ============================================
  // Private Helpers
  // ============================================

  private sendToClient<T>(clientId: string, event: StreamEvent<T>): void {
    const client = this.clients.get(clientId)
    if (!client || !client.isAlive) return

    try {
      const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
      const canContinue = client.response.write(data)

      if (canContinue) {
        client.response.flush()
        client.lastEventAt = new Date()
      } else {
        // Backpressure - buffer the event
        client.messageBuffer.push(event)
        if (client.messageBuffer.length > this.bufferMaxSize) {
          client.messageBuffer.shift() // Drop oldest
          console.warn(`[SSE] Buffer overflow for client ${clientId}, dropping oldest event`)
        }
      }
    } catch (error) {
      console.error(`[SSE] Error sending to client ${clientId}:`, error)
      client.isAlive = false
    }
  }

  private shouldSendToClient<T>(
    client: SSEClient,
    event: StreamEvent<T>,
  ): boolean {
    // If no vehicle filter, send all vehicle updates
    if (event.type === 'vehicle_update' && client.filters.vehicleIds) {
      const vehicleData = event.data as unknown as VehicleStreamData
      const hasMatchingVehicle = vehicleData.vehicles.some((v) =>
        client.filters.vehicleIds?.includes(v.id),
      )
      if (!hasMatchingVehicle) return false
    }

    // If no node filter, send all node updates
    if (
      (event.type === 'traffic_update' || event.type === 'node_saturation') &&
      client.filters.nodeIds
    ) {
      const trafficData = event.data as unknown as TrafficStreamData
      const hasMatchingNode = trafficData.nodes.some((n) =>
        client.filters.nodeIds?.includes(n.id),
      )
      if (!hasMatchingNode) return false
    }

    return true
  }

  private boundsOverlap(a: BoundingBox, b: BoundingBox): boolean {
    return !(
      a.northEast.lat < b.southWest.lat ||
      a.southWest.lat > b.northEast.lat ||
      a.northEast.lng < b.southWest.lng ||
      a.southWest.lng > b.northEast.lng
    )
  }

  private startHeartbeat(clientId: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    const interval = setInterval(() => {
      const currentClient = this.clients.get(clientId)
      if (!currentClient) {
        clearInterval(interval)
        return
      }

      if (currentClient.filters.includeHeartbeat) {
        try {
          const heartbeat: StreamEvent<{ ping: string }> = {
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            data: { ping: 'keep-alive' },
            metadata: {
              requestId: clientId,
              retry: 1,
            },
          }

          currentClient.response.write(`:keep-alive\n\n`)
          currentClient.response.write(
            `event: heartbeat\ndata: ${JSON.stringify(heartbeat)}\n\n`,
          )
          currentClient.response.flush()
        } catch (error) {
          console.error(`[SSE] Heartbeat failed for ${clientId}:`, error)
          currentClient.isAlive = false
          clearInterval(interval)
        }
      }

      // Flush buffered messages
      this.flushBuffer(clientId)
    }, client.filters.heartbeatInterval)

    this.heartbeatIntervals.set(clientId, interval)
  }

  private flushBuffer(clientId: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    while (client.messageBuffer.length > 0) {
      const event = client.messageBuffer.shift()
      if (event) {
        const canContinue = client.response.write(
          `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
        )
        if (!canContinue) {
          // Put back in buffer and stop
          client.messageBuffer.unshift(event)
          break
        }
      }
    }

    if (client.messageBuffer.length > 0) {
      client.response.flush()
    }
  }

  private startCleanupTimer(clientId: string): void {
    const interval = setInterval(() => {
      const client = this.clients.get(clientId)
      if (!client) {
        clearInterval(interval)
        return
      }

      const idleTime = Date.now() - client.lastEventAt.getTime()
      if (idleTime > this.clientTimeout) {
        console.warn(`[SSE] Client ${clientId} timed out (idle: ${idleTime}ms)`)
        client.isAlive = false
        this.removeClient(clientId)
        clearInterval(interval)
      }
    }, 10000) // Check every 10 seconds

    this.cleanupIntervals.set(clientId, interval)
  }

  // ============================================
  // Express Middleware Factory
  // ============================================

  createMiddleware() {
    return (req: { query: Record<string, string>; headers: Record<string, string> }, res: Record<string, unknown>) => {
      const clientId =
        (req.query.clientId as string) ||
        `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const bounds = req.query.bounds
        ? this.parseBounds(req.query.bounds as string)
        : undefined

      const result = this.registerClient(
        clientId,
        res as SSEClient['response'],
        {
          bounds,
          includeHeartbeat: req.query.heartbeat !== 'false',
        },
      )

      if (!result.success) {
        return result
      }

      // Set SSE headers
      const response = res as unknown as {
        writeHead: (status: number, headers: Record<string, string>) => void
        setHeader: (key: string, value: string) => void
        end: () => void
      }

      response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      })

      // Handle client disconnect
      req.headers['close'] && this.removeClient(clientId)

      return { clientId, success: true }
    }
  }

  private parseBounds(boundsStr: string): BoundingBox | undefined {
    try {
      const [swLat, swLng, neLat, neLng] = boundsStr.split(',').map(Number)
      if (isNaN(swLat) || isNaN(swLng) || isNaN(neLat) || isNaN(neLng)) {
        return undefined
      }
      return {
        southWest: { lat: swLat, lng: swLng },
        northEast: { lat: neLat, lng: neLng },
      }
    } catch {
      return undefined
    }
  }

  // ============================================
  // Shutdown
  // ============================================

  async shutdown(): Promise<void> {
    console.log('[SSE] Shutting down stream manager...')

    // Clear all intervals
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval)
    }
    for (const interval of this.cleanupIntervals.values()) {
      clearInterval(interval)
    }

    // Remove all clients
    const clientIds = Array.from(this.clients.keys())
    for (const clientId of clientIds) {
      this.removeClient(clientId)
    }

    console.log('[SSE] Stream manager shutdown complete')
  }
}

// ============================================
// Singleton Export
// ============================================

export const sseStreamManager = new SSEStreamManager({
  maxClients: 1000,
  heartbeatInterval: 25000,
  clientTimeout: 60000,
  bufferMaxSize: 100,
})
