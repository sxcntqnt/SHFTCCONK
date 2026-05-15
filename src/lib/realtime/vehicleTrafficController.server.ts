/**
 * vehicleTrafficController.server.ts
 *
 * Server-side controller. Connects to Hypnotiz using fetch()-based SSE
 * (no browser EventSource — compatible with Node.js 18+ and Cloudflare Workers).
 *
 * Owns:
 *   - SSE connection to Hypnotiz (fetch + ReadableStream)
 *   - ConnectionState FSM
 *   - Typed event emitter (update / anomaly / backpressure / state:change / error)
 *   - SirtebasinBrainV3 local scoring (selectLocal)
 *   - HTTP queries to Hypnotiz (vehicles, traffic nodes/edges, aggregations)
 *   - Metrics + healthCheck
 *
 * Does NOT own:
 *   - SSE to browser clients  → SseStreamer.service.ts
 *   - Parquet / DuckDB        → browser only
 */

import { SirtebasinBrainV3 } from '$lib/realtime/hypntyz'
import type {
  AttentionItem,
  BoundingBox,
  ClientContext,
  SirtebasinResponse,
  VehicleEvent,
  VehicleState,
} from '$lib/map/hypntyz'

// ============================================================================
// ConnectionState
// ============================================================================

export enum ConnectionState {
  DISCONNECTED  = 'DISCONNECTED',
  CONNECTING    = 'CONNECTING',
  CONNECTED     = 'CONNECTED',
  RECONNECTING  = 'RECONNECTING',
  DEGRADED      = 'DEGRADED',
}

const ALLOWED: Record<ConnectionState, ConnectionState[]> = {
  [ConnectionState.DISCONNECTED]:  [ConnectionState.CONNECTING],
  [ConnectionState.CONNECTING]:    [ConnectionState.CONNECTED, ConnectionState.DISCONNECTED],
  [ConnectionState.CONNECTED]:     [ConnectionState.DISCONNECTED, ConnectionState.RECONNECTING, ConnectionState.DEGRADED],
  [ConnectionState.RECONNECTING]:  [ConnectionState.CONNECTING, ConnectionState.DISCONNECTED],
  [ConnectionState.DEGRADED]:      [ConnectionState.CONNECTED, ConnectionState.DISCONNECTED, ConnectionState.RECONNECTING],
}

// ============================================================================
// Config
// ============================================================================

export interface HypnotizConfig {
  url: string
  regionId?: string
  maxVehiclesPerClient?: number
  connectionTimeoutMs?: number
  reconnectDelayMs?: number
  maxReconnectDelayMs?: number
  enableBackpressure?: boolean
}

export interface ControllerConfig {
  hypnotiz: HypnotizConfig
  localScoreThreshold?: number
  clientId?: string
}

function resolveConfig(partial: Partial<ControllerConfig>): Required<ControllerConfig> {
  return {
    hypnotiz: {
      url:                  'http://localhost:8080',
      regionId:             'default',
      maxVehiclesPerClient: 500,
      connectionTimeoutMs:  10_000,
      reconnectDelayMs:     2_000,
      maxReconnectDelayMs:  30_000,
      enableBackpressure:   true,
      ...partial.hypnotiz,
    },
    localScoreThreshold: partial.localScoreThreshold ?? 0.35,
    clientId:            partial.clientId            ?? generateClientId(),
  }
}

// ============================================================================
// Types (re-exported for MapService)
// ============================================================================

export type { AttentionItem, BoundingBox, ClientContext, SirtebasinResponse, VehicleState }

export interface TrafficNode {
  id: string
  lat: number
  lng: number
  type: string
  saturation: number
  passengerThroughput: number
  averageDwellTime: number
  updatedAt: string
}

export interface TrafficEdge {
  corridorId: string
  lat: number
  lng: number
  speed: number
  congestion: number
  updatedAt: string
}

export interface TrafficAggregation {
  intervalStart: string
  nodeId: string
  avgSaturation: number
  totalThroughput: number
  sampleCount: number
  lastUpdate: string
}

export interface ControllerMetrics {
  totalMessagesReceived: number
  totalItemsRendered: number
  totalItemsDropped: number
  averageItemsPerTick: number
  lastTickAt: Date | null
  connectionUptime: number
  reconnectCount: number
  backpressureEvents: number
  brainSelectCount: number
  averageBrainLatencyMs: number
}

export interface HealthStatus {
  healthy: boolean
  connected: boolean
  hypnotizReachable: boolean
  currentState: ConnectionState
  metrics: ControllerMetrics
  hypnotizHealth?: {
    status: string
    region?: string
    activeClients?: number
    vehicleCount?: number
  }
}

// ============================================================================
// Event map
// ============================================================================

type ControllerEventMap = {
  'update':       SirtebasinResponse
  'anomaly':      AttentionItem
  'backpressure': boolean
  'state:change': ConnectionState
  'error':        Error
  'disconnect':   void
}

type Handler<T> = (payload: T) => void

// ============================================================================
// Typed event emitter
// ============================================================================

class TypedEmitter {
  private map = new Map<string, Set<Handler<any>>>()

  on<K extends keyof ControllerEventMap>(ev: K, fn: Handler<ControllerEventMap[K]>): void {
    if (!this.map.has(ev)) this.map.set(ev, new Set())
    this.map.get(ev)!.add(fn)
  }

  off<K extends keyof ControllerEventMap>(ev: K, fn: Handler<ControllerEventMap[K]>): void {
    this.map.get(ev)?.delete(fn)
  }

  emit<K extends keyof ControllerEventMap>(ev: K, payload: ControllerEventMap[K]): void {
    this.map.get(ev)?.forEach(fn => {
      try { fn(payload) } catch (err) {
        console.error(`[VehicleTrafficController] Handler error on "${ev}":`, err)
      }
    })
  }

  clear(): void { this.map.clear() }
}

// ============================================================================
// Hypnotiz SSE payload
// ============================================================================

interface HypnotizStreamEvent {
  client_id: string
  timestamp: number
  items?: AttentionItem[]
  vehicles?: AttentionItem[]   // backwards-compat alias
  backpressure?: boolean
  mode?: 'realtime' | 'cluster' | 'degraded'
}

// ============================================================================
// VehicleTrafficController
// ============================================================================

export class VehicleTrafficController {
  private readonly cfg: Required<ControllerConfig>
  private readonly brain: SirtebasinBrainV3
  private readonly emitter = new TypedEmitter()

  private _state: ConnectionState = ConnectionState.DISCONNECTED
  private abortCtrl: AbortController | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnecting = false

  private currentContext: ClientContext | null = null

  // Metrics
  private connectedAt: number | null = null
  private _metrics = {
    totalMessagesReceived: 0,
    totalItemsRendered:    0,
    totalItemsDropped:     0,
    averageItemsPerTick:   0,
    lastTickAt:            null as Date | null,
    reconnectCount:        0,
    backpressureEvents:    0,
    brainSelectCount:      0,
  }
  private brainLatencies: number[] = []

  constructor(config: Partial<ControllerConfig> = {}) {
    this.cfg          = resolveConfig(config)
    this.brain        = new SirtebasinBrainV3()
  }

  // ==========================================================================
  // State
  // ==========================================================================

  get state(): ConnectionState { return this._state }
  get clientId(): string       { return this.cfg.clientId }

  private transition(next: ConnectionState): void {
    if (!ALLOWED[this._state].includes(next)) {
      console.warn(`[VehicleTrafficController] Ignoring ${this._state} → ${next}`)
      return
    }
    this._state = next
    this.emitter.emit('state:change', next)
  }

  // ==========================================================================
  // Lifecycle — fetch()-based SSE reader
  // ==========================================================================

  async connect(): Promise<void> {
    if (this._state === ConnectionState.CONNECTED ||
        this._state === ConnectionState.CONNECTING) return

    // BUG FIX: Hypnotiz requires POST /subscribe BEFORE GET /stream.
    // The streamHub.GetClient() check in Go will 404 if the client
    // hasn't registered first. Subscribe here if we already have a context
    // (reconnect path); first-time callers call subscribe() → connect() explicitly.
    if (this.currentContext) {
      await this._postSubscription(this.currentContext)
    }

    this.transition(ConnectionState.CONNECTING)
    this.abortCtrl = new AbortController()

    const url = `${this.cfg.hypnotiz.url}/stream` +
      `?client_id=${this.cfg.clientId}&region_id=${this.cfg.hypnotiz.regionId}`

    let response: Response
    try {
      response = await fetch(url, {
        signal: AbortSignal.any([
          this.abortCtrl.signal,
          AbortSignal.timeout(this.cfg.hypnotiz.connectionTimeoutMs!),
        ]),
        headers: {
          'Accept':        'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Client-ID':   this.cfg.clientId,
          'X-Region-ID':   this.cfg.hypnotiz.regionId!,
        },
      })
    } catch (err) {
      this.transition(ConnectionState.DISCONNECTED)
      throw err
    }

    if (!response.ok || !response.body) {
      this.transition(ConnectionState.DISCONNECTED)
      throw new Error(`Hypnotiz SSE HTTP ${response.status}`)
    }

    this.transition(ConnectionState.CONNECTED)
    this.connectedAt = Date.now()

    // Read stream in the background — errors trigger reconnect
    this._consumeStream(response.body).catch(err => {
      if (this._state === ConnectionState.DISCONNECTED) return
      this.emitter.emit('error', err instanceof Error ? err : new Error(String(err)))
      this._scheduleReconnect()
    })
  }

  async subscribe(context: ClientContext): Promise<void> {
    this.currentContext = context
    await this._postSubscription(context)
  }

  async disconnect(): Promise<void> {
    this._clearReconnect()
    this.abortCtrl?.abort()
    this.abortCtrl  = null
    this.connectedAt = null

    if (this._state !== ConnectionState.DISCONNECTED) {
      this.transition(ConnectionState.DISCONNECTED)
    }

    this.emitter.emit('disconnect', undefined as any)
    this.emitter.clear()
  }

  // ==========================================================================
  // Stream reader
  // ==========================================================================

  private async _consumeStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader  = body.getReader()
    const decoder = new TextDecoder()
    let   buf     = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })

        const blocks = buf.split('\n\n')
        buf = blocks.pop() ?? ''

        for (const block of blocks) {
          const dataLine = block.split('\n').find(l => l.startsWith('data:'))
          if (!dataLine) continue
          const raw = dataLine.slice(5).trim()
          if (raw) this._handleEvent(raw)
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // ==========================================================================
  // Event handling
  // ==========================================================================

  private _handleEvent(raw: string): void {
    let event: HypnotizStreamEvent
    try { event = JSON.parse(raw) } catch { return }

    this._metrics.totalMessagesReceived++
    this._metrics.lastTickAt = new Date()

    const items: AttentionItem[] = event.items ?? event.vehicles ?? []

    if (event.backpressure) {
      this._metrics.backpressureEvents++
      this.emitter.emit('backpressure', true)
      if (this._state === ConnectionState.CONNECTED) this.transition(ConnectionState.DEGRADED)
    } else if (this._state === ConnectionState.DEGRADED) {
      this.transition(ConnectionState.CONNECTED)
      this.emitter.emit('backpressure', false)
    }

    if (items.length === 0) return

    const vehicleEvents = this._toVehicleEvents(items)
    if (vehicleEvents.length > 0) this.brain.ingest(vehicleEvents)

    const filtered = this._brainFilter(items)
    const dropped  = items.length - filtered.length

    this._metrics.totalItemsRendered += filtered.length
    this._metrics.totalItemsDropped  += dropped
    this._metrics.averageItemsPerTick =
      this._metrics.totalItemsRendered / this._metrics.totalMessagesReceived

    for (const item of filtered) {
      if (item.score > 0.85 && item.kind !== 'cluster') {
        this.emitter.emit('anomaly', item)
      }
    }

    this.emitter.emit('update', { ts: event.timestamp, items: filtered })
  }

  // ==========================================================================
  // Brain
  // ==========================================================================

  selectLocal(context?: ClientContext): SirtebasinResponse {
    const ctx = context ?? this.currentContext
    if (!ctx) return { ts: Date.now(), items: [] }

    const t0 = performance.now()
    const result = this.brain.select(ctx)
    rollingPush(this.brainLatencies, performance.now() - t0)
    this._metrics.brainSelectCount++
    return result
  }

  getVehicleState(vehicleId: string): VehicleState | undefined {
    return this.brain.getVehicleState(vehicleId)
  }

  private _brainFilter(items: AttentionItem[]): AttentionItem[] {
    if (!this.currentContext) {
      return items.filter(i => i.score >= this.cfg.localScoreThreshold)
    }
    const t0 = performance.now()
    const result = this.brain.select(this.currentContext)
    rollingPush(this.brainLatencies, performance.now() - t0)

    const approved = new Set(result.items.map(i => i.id))
    return items.filter(i =>
      i.score >= this.cfg.localScoreThreshold || approved.has(i.id)
    )
  }

  // ==========================================================================
  // HTTP queries → Hypnotiz
  // ==========================================================================

  async queryVehicles(
    viewport: BoundingBox,
    options?: { maxResults?: number; includeAnomalies?: boolean; vehicleTypes?: string[] },
  ): Promise<AttentionItem[]> {
    const params = new URLSearchParams({
      min_lat:           String(viewport.minLat),
      max_lat:           String(viewport.maxLat),
      min_lon:           String(viewport.minLng),
      max_lon:           String(viewport.maxLng),
      max_results:       String(options?.maxResults ?? this.cfg.hypnotiz.maxVehiclesPerClient),
      include_anomalies: String(options?.includeAnomalies ?? true),
    })
    if (options?.vehicleTypes?.length) params.set('vehicle_types', options.vehicleTypes.join(','))
    const data = await this._fetch<{ items: AttentionItem[] }>(`/api/vehicles?${params}`)
    return data.items ?? []
  }

  async queryTrafficNodes(viewport: BoundingBox): Promise<TrafficNode[]> {
    const data = await this._fetch<{ nodes: TrafficNode[] }>(
      `/api/traffic/nodes?${this._vpParams(viewport)}`
    )
    return data.nodes ?? []
  }

  async queryTrafficEdges(viewport: BoundingBox): Promise<TrafficEdge[]> {
    const data = await this._fetch<{ edges: TrafficEdge[] }>(
      `/api/traffic/edges?${this._vpParams(viewport)}`
    )
    return data.edges ?? []
  }

  async queryTrafficAggregations(nodeId: string, windowMinutes = 60): Promise<TrafficAggregation[]> {
    const data = await this._fetch<{ aggregations: TrafficAggregation[] }>(
      `/api/traffic/aggregations?node_id=${encodeURIComponent(nodeId)}&window=${windowMinutes}`
    )
    return data.aggregations ?? []
  }

  // ==========================================================================
  // Event subscription
  // ==========================================================================

  on<K extends keyof ControllerEventMap>(ev: K, fn: Handler<ControllerEventMap[K]>): this {
    this.emitter.on(ev, fn)
    return this
  }

  off<K extends keyof ControllerEventMap>(ev: K, fn: Handler<ControllerEventMap[K]>): this {
    this.emitter.off(ev, fn)
    return this
  }

  // ==========================================================================
  // Health & Metrics
  // ==========================================================================

  async healthCheck(): Promise<HealthStatus> {
    let hypnotizHealth: HealthStatus['hypnotizHealth']
    let hypnotizReachable = false
    try {
      hypnotizHealth    = await this._fetch('/health')
      hypnotizReachable = hypnotizHealth?.status === 'ok'
    } catch { /* unreachable — don't throw */ }

    return {
      healthy:          this._state === ConnectionState.CONNECTED && hypnotizReachable,
      connected:        this._state !== ConnectionState.DISCONNECTED,
      hypnotizReachable,
      currentState:     this._state,
      metrics:          this.getMetrics(),
      hypnotizHealth,
    }
  }

  getMetrics(): ControllerMetrics {
    return {
      ...this._metrics,
      connectionUptime:     this.connectedAt ? Date.now() - this.connectedAt : 0,
      averageBrainLatencyMs: avg(this.brainLatencies),
    }
  }

  // ==========================================================================
  // Reconnect
  // ==========================================================================

  private _scheduleReconnect(): void {
    if (this.reconnecting || this._state === ConnectionState.DISCONNECTED) return
    this.reconnecting = true

    if (this._state !== ConnectionState.RECONNECTING) {
      this.transition(ConnectionState.RECONNECTING)
    }

    const delay = this._metrics.reconnectCount === 0
      ? this.cfg.hypnotiz.reconnectDelayMs!
      : Math.min(
          this.cfg.hypnotiz.reconnectDelayMs! * Math.pow(2, this._metrics.reconnectCount),
          this.cfg.hypnotiz.maxReconnectDelayMs!,
        )

    this.reconnectTimer = setTimeout(async () => {
      if (this._state === ConnectionState.DISCONNECTED) { this.reconnecting = false; return }
      try {
        // subscribe before connect — same order as initial startup
        if (this.currentContext) {
          await this._postSubscription(this.currentContext).catch(() => {})
        }
        await this.connect()
        this._metrics.reconnectCount++
      } catch {
        this._scheduleReconnect()
      } finally {
        this.reconnecting = false
      }
    }, delay + Math.random() * 500)
  }

  private _clearReconnect(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    this.reconnecting = false
  }

  // ==========================================================================
  // HTTP helpers
  // ==========================================================================

  private async _postSubscription(ctx: ClientContext): Promise<void> {
    // No state guard here — this is intentionally called BEFORE connect()
    // so state is still DISCONNECTED on first use. The HTTP request itself
    // will fail fast if Hypnotiz is unreachable.
    await this._fetch(`/subscribe?client_id=${this.cfg.clientId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewport: {
          min_lat: ctx.viewport.minLat,
          max_lat: ctx.viewport.maxLat,
          min_lon: ctx.viewport.minLng,
          max_lon: ctx.viewport.maxLng,
        },
        // BUG FIX: Go expects flat focus_lat/focus_lon, not a nested focus object
        focus_lat: ctx.center.lat,
        focus_lon: ctx.center.lng,
        preferences: {
          anomaly_priority: ctx.policy.includeAnomalies,
          include_clusters: true,
        },
        max_results: ctx.budget.total,
        region_id:   this.cfg.hypnotiz.regionId,
      }),
    })
  }

  private async _fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.cfg.hypnotiz.url}${path}`, {
      signal: AbortSignal.timeout(8_000),
      ...init,
      headers: {
        'X-Client-ID':  this.cfg.clientId,
        'X-Region-ID':  this.cfg.hypnotiz.regionId!,
        ...init?.headers,
      },
    })
    if (!res.ok) throw new Error(`Hypnotiz ${res.status}: ${await res.text()}`)
    return res.json() as Promise<T>
  }

  private _vpParams(v: BoundingBox): URLSearchParams {
    return new URLSearchParams({
      min_lat: String(v.minLat), max_lat: String(v.maxLat),
      min_lon: String(v.minLng), max_lon: String(v.maxLng),
    })
  }

  private _toVehicleEvents(items: AttentionItem[]): VehicleEvent[] {
    return items
      .filter(i => i.kind === 'vehicle')
      .map(i => ({ id: i.id, lat: i.lat, lng: i.lng, speed: i.speed ?? 0, heading: i.heading ?? 0, ts: Date.now() }))
  }
}

// ============================================================================
// Singleton
// ============================================================================

let _instance: VehicleTrafficController | null = null

export function getVehicleTrafficController(
  config?: Partial<ControllerConfig>,
): VehicleTrafficController {
  if (!_instance) _instance = new VehicleTrafficController(config)
  return _instance
}

// ============================================================================
// Util
// ============================================================================

function generateClientId(): string {
  return `map-svc-${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length
}

function rollingPush(arr: number[], val: number, max = 100): void {
  arr.push(val)
  if (arr.length > max) arr.shift()
}
