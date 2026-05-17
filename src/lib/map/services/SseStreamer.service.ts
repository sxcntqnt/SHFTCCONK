// src/lib/map/services/SseStreamer.service.ts
//
// SSE Stream Manager — Real-time Map Data Streaming
//
// Manages persistent SSE connections from browser clients.
// MapService is the only producer — it calls broadcast* methods.
// Browser clients consume via EventSource / VehicleTrafficClient.
//
// Event types emitted:
//   connected          — on client registration (with clientId + filters)
//   heartbeat          — keep-alive ping (every 25s by default)
//   vehicle_update     — bulk vehicle positions (from Hypnotiz via controller)
//   traffic_update     — traffic nodes + corridors (HTTP poll, 30s)
//   anomaly            — single high-score vehicle highlight (immediate)
//   system_event       — backpressure / controller state changes
//   bootstrap_manifest — CityBootstrapManifest (→ SW prefetch)

import type {
  StreamEvent,
  StreamEventType,
  VehicleStreamData,
  TrafficStreamData,
  BoundingBox,
} from '../types'
import type { CityBootstrapManifest } from './bootstrap-manifest.service'

// ============================================================================
// Internal types
// ============================================================================

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

interface AnomalyPayload {
  vehicleId: string
  lat: number
  lng: number
  score: number
  speed: number
  detectedAt: string
}

interface SystemEventPayload {
  type: string
  [key: string]: unknown
}

// ============================================================================
// SSEStreamManager
// ============================================================================

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
    this.maxClients             = options?.maxClients        ?? 500
    this.defaultHeartbeatInterval = options?.heartbeatInterval ?? 25_000
    this.clientTimeout          = options?.clientTimeout      ?? 60_000
  }

  // ==========================================================================
  // Client management
  // ==========================================================================

  registerClient(
    clientId: string,
    controller: ReadableStreamDefaultController,
    filters?: Partial<StreamFilters>,
  ): { success: boolean; error?: string } {
    if (this.clients.size >= this.maxClients) {
      return { success: false, error: `Maximum clients (${this.maxClients}) reached` }
    }

    // Replace existing connection for same clientId (tab reload, reconnect)
    if (this.clients.has(clientId)) this.removeClient(clientId)

    const client: SSEClient = {
      id: clientId,
      controller,
      filters: {
        includeHeartbeat:  filters?.includeHeartbeat  ?? true,
        heartbeatInterval: filters?.heartbeatInterval ?? this.defaultHeartbeatInterval,
        bounds:            filters?.bounds,
        vehicleIds:        filters?.vehicleIds,
        nodeIds:           filters?.nodeIds,
      },
      subscriptions: new Set(['vehicle_update', 'traffic_update']),
      connectedAt:  new Date(),
      lastEventAt:  new Date(),
      isAlive:      true,
    }

    this.clients.set(clientId, client)
    this._startHeartbeat(clientId)

    this._sendToClient(clientId, {
      type:      'connected',
      timestamp: new Date().toISOString(),
      data: {
        clientId,
        subscribedEvents: Array.from(client.subscriptions),
        filters:          client.filters,
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

  getClientCount(): number  { return this.clients.size }
  getClientIds(): string[]  { return Array.from(this.clients.keys()) }

  // ==========================================================================
  // Broadcasting — public API consumed by MapService
  // ==========================================================================

  /**
   * Push a CityBootstrapManifest to all connected clients.
   *
   * Browser listener pattern:
   *   evtSource.addEventListener('bootstrap_manifest', (e) => {
   *     const { manifest } = JSON.parse(e.data).data
   *     navigator.serviceWorker.controller?.postMessage({
   *       type: 'BOOTSTRAP_MANIFEST', manifest,
   *     })
   *   })
   */
  broadcastBootstrap(manifest: CityBootstrapManifest): number {
    return this._broadcastRaw({
      type:      'bootstrap_manifest',
      timestamp: new Date().toISOString(),
      data:      { manifest },
    })
  }

  /** Bulk vehicle positions — filtered spatially per client. */
  broadcastVehicles(data: VehicleStreamData): number {
    return this._broadcast<VehicleStreamData>({
      type:      'vehicle_update',
      timestamp: new Date().toISOString(),
      data,
    })
  }

  /** Traffic nodes + corridor analytics — lower frequency (30s poll). */
  broadcastTraffic(data: TrafficStreamData): number {
    return this._broadcast<TrafficStreamData>({
      type:      'traffic_update',
      timestamp: new Date().toISOString(),
      data,
    })
  }

  /**
   * Single anomaly vehicle — broadcast immediately without waiting for
   * the next bulk vehicle_update tick. Browser uses this for instant
   * highlight rendering.
   *
   * Called by MapService._wireControllerEvents → controller.on('anomaly')
   */
  broadcastAnomaly(payload: AnomalyPayload): number {
    return this._broadcastRaw({
      type:      'anomaly',
      timestamp: new Date().toISOString(),
      data:      payload,
    })
  }

  /**
   * System-level events: backpressure signals, controller state changes.
   * Browser uses these to adapt rendering (e.g. switch to cluster mode
   * under backpressure, show reconnecting UI on controller_reconnecting).
   *
   * Called by MapService._wireControllerEvents → controller.on('backpressure')
   *                                             → controller.on('state:change')
   *
   * Known payload types:
   *   { type: 'backpressure',           active: boolean }
   *   { type: 'controller_reconnecting' }
   *   { type: 'controller_ready' }
   */
  broadcastSystemEvent(payload: SystemEventPayload): number {
    return this._broadcastRaw({
      type:      'system_event',
      timestamp: new Date().toISOString(),
      data:      payload,
    })
  }

  // ==========================================================================
  // Internal broadcast helpers
  // ==========================================================================

  /**
   * Broadcast to clients subscribed to this event type.
   * Applies spatial filter for vehicle_update events.
   */
  private _broadcast<T>(event: StreamEvent<T>): number {
    let sent = 0

    for (const [clientId, client] of this.clients) {
      if (!client.isAlive) continue
      if (!client.subscriptions.has(event.type)) continue

      // Spatial filter — only send vehicle updates relevant to the client's viewport
      if (client.filters.bounds && event.type === 'vehicle_update') {
        const vehicleData = event.data as VehicleStreamData
        const inBounds = vehicleData.vehicles.some(v =>
          this._isInBounds(v.currentPosition, client.filters.bounds!),
        )
        if (!inBounds) continue
      }

      this._sendToClient(clientId, event)
      sent++
    }

    return sent
  }

  /**
   * Broadcast to ALL alive clients regardless of subscription set.
   * Used for: anomaly, system_event, bootstrap_manifest.
   * These are always relevant and not filterable by viewport.
   */
  private _broadcastRaw(event: { type: string; timestamp: string; data: unknown }): number {
    let sent = 0

    for (const [clientId, client] of this.clients) {
      if (!client.isAlive) continue
      try {
        client.controller.enqueue(
          `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
        )
        client.lastEventAt = new Date()
        sent++
      } catch {
        client.isAlive = false
        this.removeClient(clientId)
      }
    }

    return sent
  }

  private _sendToClient(clientId: string, event: Record<string, unknown>): void {
    const client = this.clients.get(clientId)
    if (!client || !client.isAlive) return

    try {
      client.controller.enqueue(
        `event: ${event['type']}\ndata: ${JSON.stringify(event)}\n\n`
      )
      client.lastEventAt = new Date()
    } catch (err) {
      console.error(`[SSE] Failed to send to ${clientId}:`, err)
      client.isAlive = false
      this.removeClient(clientId)
    }
  }

  private _isInBounds(
    position: { lat: number; lng: number },
    bounds: BoundingBox,
  ): boolean {
    return (
      position.lat >= bounds.southWest.lat &&
      position.lat <= bounds.northEast.lat &&
      position.lng >= bounds.southWest.lng &&
      position.lng <= bounds.northEast.lng
    )
  }

  // ==========================================================================
  // Heartbeat
  // ==========================================================================

  private _startHeartbeat(clientId: string): void {
    const interval = setInterval(() => {
      const client = this.clients.get(clientId)

      if (!client || !client.isAlive) {
        clearInterval(interval)
        return
      }

      if (!client.filters.includeHeartbeat) return

      try {
        client.controller.enqueue(
          `event: heartbeat\ndata: ${JSON.stringify({
            type:      'heartbeat',
            timestamp: new Date().toISOString(),
            data:      { ping: 'keep-alive' },
          })}\n\n`
        )
      } catch {
        client.isAlive = false
        this.removeClient(clientId)
      }
    }, this.defaultHeartbeatInterval)

    this.heartbeatIntervals.set(clientId, interval)
  }

  // ==========================================================================
  // Shutdown
  // ==========================================================================

  async shutdown(): Promise<void> {
    console.log('[SSE] Shutting down...')

    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval)
    }

    for (const clientId of this.clients.keys()) {
      this.removeClient(clientId)
    }

    this.clients.clear()
    this.heartbeatIntervals.clear()

    console.log('[SSE] Shutdown complete')
  }
}

// ============================================================================
// Singleton — one instance per process lifetime
// ============================================================================

export const sseStreamManager = new SSEStreamManager({
  maxClients:        500,
  heartbeatInterval: 25_000,
  clientTimeout:     60_000,
})