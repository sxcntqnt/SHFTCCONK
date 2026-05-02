// ============================================
// SSE Streamer Service — Real-time Map Data Streaming
// ============================================
//
// FIX: Added broadcastBootstrap() so MapService can push CityBootstrapManifest
// to all connected clients. Clients relay it to the service worker via
// navigator.serviceWorker.controller.postMessage({ type: 'BOOTSTRAP_MANIFEST', manifest }).

import type {
  StreamEvent,
  StreamEventType,
  VehicleStreamData,
  TrafficStreamData,
  BoundingBox,
} from '../types'
import type { CityBootstrapManifest } from './bootstrap-manifest.service'

interface SSEClient {
  id: string
  controller: ReadableStreamDefaultController
  filters: StreamFilters
  subscriptions: Set<StreamEventType>
  connectedAt: Date
  lastEventAt: Date
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
  private heartbeatIntervals: Map<string, ReturnType<typeof setInterval>> = new Map()
  private readonly maxClients: number
  private readonly defaultHeartbeatInterval: number
  private readonly clientTimeout: number

  constructor(options?: {
    maxClients?: number
    heartbeatInterval?: number
    clientTimeout?: number
  }) {
    this.maxClients = options?.maxClients ?? 500
    this.defaultHeartbeatInterval = options?.heartbeatInterval ?? 25_000
    this.clientTimeout = options?.clientTimeout ?? 60_000
  }

  // ============================================
  // Client Management
  // ============================================
  registerClient(
    clientId: string,
    controller: ReadableStreamDefaultController,
    filters?: Partial<StreamFilters>,
  ): { success: boolean; error?: string } {
    if (this.clients.size >= this.maxClients) {
      return { success: false, error: `Maximum clients (${this.maxClients}) reached` }
    }

    if (this.clients.has(clientId)) this.removeClient(clientId)

    const client: SSEClient = {
      id: clientId,
      controller,
      filters: {
        includeHeartbeat: filters?.includeHeartbeat ?? true,
        heartbeatInterval: filters?.heartbeatInterval ?? this.defaultHeartbeatInterval,
        bounds: filters?.bounds,
        vehicleIds: filters?.vehicleIds,
        nodeIds: filters?.nodeIds,
      },
      subscriptions: new Set(['vehicle_update', 'traffic_update']),
      connectedAt: new Date(),
      lastEventAt: new Date(),
      isAlive: true,
    }

    this.clients.set(clientId, client)
    this.startHeartbeat(clientId)

    this.sendToClient(clientId, {
      type: 'connected',
      timestamp: new Date().toISOString(),
      data: {
        clientId,
        subscribedEvents: Array.from(client.subscriptions),
        filters: client.filters,
      },
    })

    console.log(`[SSE] Client connected: ${clientId} (total: ${this.clients.size})`)
    return { success: true }
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    const heartbeat = this.heartbeatIntervals.get(clientId)
    if (heartbeat) {
      clearInterval(heartbeat)
      this.heartbeatIntervals.delete(clientId)
    }

    try { client.controller.close() } catch {}

    this.clients.delete(clientId)
    console.log(`[SSE] Client disconnected: ${clientId} (total: ${this.clients.size})`)
  }

  getClientCount(): number { return this.clients.size }
  getClientIds(): string[] { return Array.from(this.clients.keys()) }

  // ============================================
  // Broadcasting
  // ============================================

  /**
   * Push a CityBootstrapManifest to all connected SSE clients.
   *
   * The browser client listens for `bootstrap_manifest` events and forwards
   * the manifest to the service worker:
   *
   *   evtSource.addEventListener('bootstrap_manifest', (e) => {
   *     const { manifest } = JSON.parse(e.data)
   *     navigator.serviceWorker.controller?.postMessage({
   *       type: 'BOOTSTRAP_MANIFEST',
   *       manifest,
   *     })
   *   })
   *
   * This is the critical bridge: SSE → client JS → SW prefetch.
   */
  broadcastBootstrap(manifest: CityBootstrapManifest): number {
    return this.broadcastRaw({
      type: 'bootstrap_manifest' as StreamEventType,
      timestamp: new Date().toISOString(),
      data: { manifest },
    })
  }

  broadcastVehicles(data: VehicleStreamData): number {
    return this.broadcast<VehicleStreamData>({ type: 'vehicle_update', timestamp: new Date().toISOString(), data })
  }

  broadcastTraffic(data: TrafficStreamData): number {
    return this.broadcast<TrafficStreamData>({ type: 'traffic_update', timestamp: new Date().toISOString(), data })
  }

  private broadcast<T>(event: StreamEvent<T>): number {
    let sent = 0
    for (const [clientId, client] of this.clients) {
      if (!client.isAlive) continue
      if (!client.subscriptions.has(event.type)) continue

      // Spatial filter for vehicle updates
      if (client.filters.bounds && event.type === 'vehicle_update') {
        const vehicleData = event.data as VehicleStreamData
        const inBounds = vehicleData.vehicles.some(v =>
          this.isInBounds(v.currentPosition, client.filters.bounds!),
        )
        if (!inBounds) continue
      }

      this.sendToClient(clientId, event)
      sent++
    }
    return sent
  }

  // Used for event types not in the StreamEventType union (like bootstrap_manifest)
  private broadcastRaw(event: { type: string; timestamp: string; data: unknown }): number {
    let sent = 0
    for (const [clientId, client] of this.clients) {
      if (!client.isAlive) continue
      try {
        const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
        client.controller.enqueue(payload)
        client.lastEventAt = new Date()
        sent++
      } catch {
        client.isAlive = false
        this.removeClient(clientId)
      }
    }
    return sent
  }

  private sendToClient<T>(clientId: string, event: StreamEvent<T> | any): void {
    const client = this.clients.get(clientId)
    if (!client || !client.isAlive) return
    try {
      const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
      client.controller.enqueue(data)
      client.lastEventAt = new Date()
    } catch (err) {
      console.error(`[SSE] Failed to send to ${clientId}:`, err)
      client.isAlive = false
      this.removeClient(clientId)
    }
  }

  private isInBounds(position: { lat: number; lng: number }, bounds: BoundingBox): boolean {
    return (
      position.lat >= bounds.southWest.lat &&
      position.lat <= bounds.northEast.lat &&
      position.lng >= bounds.southWest.lng &&
      position.lng <= bounds.northEast.lng
    )
  }

  // ============================================
  // Heartbeat
  // ============================================
  private startHeartbeat(clientId: string): void {
    const interval = setInterval(() => {
      const client = this.clients.get(clientId)
      if (!client || !client.isAlive) {
        clearInterval(interval)
        return
      }
      if (!client.filters.includeHeartbeat) return
      try {
        const beat = { type: 'heartbeat', timestamp: new Date().toISOString(), data: { ping: 'keep-alive' } }
        client.controller.enqueue(`event: heartbeat\ndata: ${JSON.stringify(beat)}\n\n`)
      } catch {
        client.isAlive = false
        this.removeClient(clientId)
      }
    }, this.defaultHeartbeatInterval)

    this.heartbeatIntervals.set(clientId, interval)
  }

  // ============================================
  // Shutdown
  // ============================================
  async shutdown(): Promise<void> {
    console.log('[SSE] Shutting down...')
    for (const interval of this.heartbeatIntervals.values()) clearInterval(interval)
    for (const clientId of this.clients.keys()) this.removeClient(clientId)
    this.clients.clear()
    this.heartbeatIntervals.clear()
    console.log('[SSE] Shutdown complete')
  }
}

// ============================================
// Singleton
// ============================================
export const sseStreamManager = new SSEStreamManager({
  maxClients: 500,
  heartbeatInterval: 25_000,
  clientTimeout: 60_000,
})