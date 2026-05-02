/**
 * VehicleTrafficController
 *
 * Replaces the direct ClickHouse client.
 * Connects to Hypnotiz (Projection Engine) via SSE for real-time streams
 * and HTTP for batch queries. Uses SirtebasinBrainV3 locally for a
 * second-pass attention filter — reducing renderer load without re-querying.
 *
 * Architecture:
 *   Hypnotiz (SSE/HTTP)
 *     → VehicleTrafficController (THIS)
 *         → SirtebasinBrainV3 (local scoring pass)
 *             → MapLibre / UI layer
 */

import { SirtebasinBrainV3 } from './hypntyz'
import type {
  AttentionItem,
  BoundingBox,
  ClientContext,
  SirtebasinResponse,
  VehicleEvent,
  VehicleState,
  Cluster,
} from './hypntyz'

// ============================================================================
// Configuration
// ============================================================================

export interface HypnotizConfig {
  url: string
  tickRateHz?: number
  maxVehiclesPerClient?: number
  connectionTimeoutMs?: number
  reconnectDelayMs?: number
  maxReconnectDelayMs?: number
  enableBackpressure?: boolean
  regionId?: string
}

export interface ControllerConfig {
  hypnotiz: HypnotizConfig
  /** Local brain scoring threshold — items below this score are dropped before rendering */
  localScoreThreshold?: number
  /** How often (ms) to re-run brain.select() on the local cache */
  localRefreshIntervalMs?: number
  clientId?: string
}

function resolveConfig(partial: Partial<ControllerConfig>): ControllerConfig {
  return {
    hypnotiz: {
      url: partial.hypnotiz?.url ?? 'http://localhost:8080',
      tickRateHz: partial.hypnotiz?.tickRateHz ?? 20,
      maxVehiclesPerClient: partial.hypnotiz?.maxVehiclesPerClient ?? 500,
      connectionTimeoutMs: partial.hypnotiz?.connectionTimeoutMs ?? 10_000,
      reconnectDelayMs: partial.hypnotiz?.reconnectDelayMs ?? 2_000,
      maxReconnectDelayMs: partial.hypnotiz?.maxReconnectDelayMs ?? 30_000,
      enableBackpressure: partial.hypnotiz?.enableBackpressure ?? true,
      regionId: partial.hypnotiz?.regionId ?? 'default',
      ...partial.hypnotiz,
    },
    localScoreThreshold: partial.localScoreThreshold ?? 0.35,
    localRefreshIntervalMs: partial.localRefreshIntervalMs ?? 100,
    clientId: partial.clientId ?? generateClientId(),
  }
}

// ============================================================================
// Types
// ============================================================================

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
  hypnotizHealth?: HypnotizHealthResponse
}

interface HypnotizHealthResponse {
  status: string
  region?: string
  activeClients?: number
  vehicleCount?: number
}

// Hypnotiz SSE payload (from Projection Engine)
interface HypnotizStreamEvent {
  client_id: string
  timestamp: number
  items?: AttentionItem[]
  vehicles?: AttentionItem[]  // backwards compat alias
  mode?: 'realtime' | 'cluster' | 'degraded'
  backpressure?: boolean
}

// Hypnotiz subscribe payload
interface HypnotizSubscribePayload {
  viewport: {
    min_lat: number
    max_lat: number
    min_lon: number
    max_lon: number
  }
  focus: {
    lat: number
    lng: number
  }
  preferences: {
    vehicle_types?: string[]
    anomaly_priority: boolean
    include_clusters: boolean
  }
  max_results: number
  region_id?: string
}

// ============================================================================
// Connection State Machine (mirrors ClickHouseService FSM, adapted for SSE)
// ============================================================================

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  DEGRADED = 'DEGRADED',   // backpressure mode — still connected, reduced fidelity
}

type StateTransitionMap = Readonly<Record<ConnectionState, ConnectionState[]>>

const ALLOWED_TRANSITIONS: StateTransitionMap = {
  [ConnectionState.DISCONNECTED]: [ConnectionState.CONNECTING],
  [ConnectionState.CONNECTING]: [ConnectionState.CONNECTED, ConnectionState.DISCONNECTED],
  [ConnectionState.CONNECTED]: [ConnectionState.DISCONNECTED, ConnectionState.RECONNECTING, ConnectionState.DEGRADED],
  [ConnectionState.RECONNECTING]: [ConnectionState.CONNECTING, ConnectionState.DISCONNECTED],
  [ConnectionState.DEGRADED]: [ConnectionState.CONNECTED, ConnectionState.DISCONNECTED, ConnectionState.RECONNECTING],
}

class ConnectionFsm {
  private _state: ConnectionState = ConnectionState.DISCONNECTED
  private waitPromise: Promise<void> | null = null
  private resolveWait: (() => void) | null = null
  private rejectWait: ((err: Error) => void) | null = null

  get state(): ConnectionState { return this._state }

  isConnected(): boolean {
    return this._state === ConnectionState.CONNECTED || this._state === ConnectionState.DEGRADED
  }

  transition(next: ConnectionState): void {
    const allowed = ALLOWED_TRANSITIONS[this._state]
    if (!allowed.includes(next)) {
      throw new Error(`Invalid FSM transition: ${this._state} → ${next}`)
    }
    this._state = next
    if (next === ConnectionState.DISCONNECTED) {
      this._rejectWaiters(new Error('Controller disconnected'))
    }
  }

  waitForConnection(timeoutMs: number): Promise<void> {
    if (this.isConnected()) return Promise.resolve()
    if (!this.waitPromise) {
      this.waitPromise = new Promise<void>((res, rej) => {
        this.resolveWait = res
        this.rejectWait = rej
      })
    }
    return Promise.race([
      this.waitPromise,
      new Promise<void>((_, rej) =>
        setTimeout(() => rej(new Error('Timed out waiting for Hypnotiz connection')), timeoutMs)
      ),
    ])
  }

  notifyConnected(): void {
    this.resolveWait?.()
    this._clearWaiters()
  }

  notifyConnecting(): void {
    this._rejectWaiters(new Error('New connection attempt started'))
    this._clearWaiters()
  }

  private _rejectWaiters(err: Error): void {
    this.rejectWait?.(err)
    this._clearWaiters()
  }

  private _clearWaiters(): void {
    this.waitPromise = null
    this.resolveWait = null
    this.rejectWait = null
  }
}

// ============================================================================
// Event Emitter (typed, minimal, no deps)
// ============================================================================

type ControllerEventMap = {
  'update': SirtebasinResponse          // Brain-filtered output, ready for renderer
  'raw': HypnotizStreamEvent            // Raw Hypnotiz payload (pre-brain)
  'vehicle': AttentionItem              // Individual vehicle update
  'cluster': AttentionItem              // Cluster update
  'anomaly': AttentionItem              // High-score anomaly vehicle
  'traffic:nodes': TrafficNode[]        // Traffic node batch
  'traffic:edges': TrafficEdge[]        // Traffic edge batch
  'state:change': ConnectionState       // FSM transition
  'backpressure': boolean               // Hypnotiz signalled pressure
  'error': Error
  'disconnect': void
}

type EventHandler<T> = (payload: T) => void

class TypedEventEmitter {
  private handlers = new Map<string, Set<EventHandler<any>>>()

  on<K extends keyof ControllerEventMap>(event: K, handler: EventHandler<ControllerEventMap[K]>): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
  }

  off<K extends keyof ControllerEventMap>(event: K, handler: EventHandler<ControllerEventMap[K]>): void {
    this.handlers.get(event)?.delete(handler)
  }

  once<K extends keyof ControllerEventMap>(event: K, handler: EventHandler<ControllerEventMap[K]>): void {
    const wrapper: EventHandler<ControllerEventMap[K]> = (payload) => {
      handler(payload)
      this.off(event, wrapper)
    }
    this.on(event, wrapper)
  }

  emit<K extends keyof ControllerEventMap>(event: K, payload: ControllerEventMap[K]): void {
    this.handlers.get(event)?.forEach(h => {
      try { h(payload) } catch (err) {
        console.error(`[VehicleTrafficController] Handler error on "${event}":`, err)
      }
    })
  }

  removeAllListeners(event?: keyof ControllerEventMap): void {
    if (event) {
      this.handlers.delete(event)
    } else {
      this.handlers.clear()
    }
  }
}

// ============================================================================
// Main Controller
// ============================================================================

export class VehicleTrafficController {
  private readonly config: ControllerConfig
  private readonly brain: SirtebasinBrainV3
  private readonly fsm = new ConnectionFsm()
  private readonly emitter = new TypedEventEmitter()

  // SSE connection
  private sse: EventSource | null = null
  private reconnectPromise: Promise<void> | null = null
  private reconnectDelay: number

  // Current subscription context (sent to Hypnotiz)
  private currentContext: ClientContext | null = null

  // Local brain refresh
  private localRefreshTimer: ReturnType<typeof setInterval> | null = null

  // Metrics
  private metrics: ControllerMetrics = {
    totalMessagesReceived: 0,
    totalItemsRendered: 0,
    totalItemsDropped: 0,
    averageItemsPerTick: 0,
    lastTickAt: null,
    connectionUptime: 0,
    reconnectCount: 0,
    backpressureEvents: 0,
    brainSelectCount: 0,
    averageBrainLatencyMs: 0,
  }
  private connectedAt: number | null = null
  private brainLatencies: number[] = []

  constructor(config: Partial<ControllerConfig> = {}) {
    this.config = resolveConfig(config)
    this.brain = new SirtebasinBrainV3()
    this.reconnectDelay = this.config.hypnotiz.reconnectDelayMs!
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Establish SSE connection to Hypnotiz and begin streaming.
   * Idempotent — safe to call multiple times.
   */
  async connect(): Promise<void> {
    if (this.fsm.isConnected()) return

    this.fsm.transition(ConnectionState.CONNECTING)
    this.fsm.notifyConnecting()
    this.emitter.emit('state:change', ConnectionState.CONNECTING)

    const streamUrl = this._buildStreamUrl()
    console.log(`[VehicleTrafficController] Connecting to Hypnotiz at ${streamUrl}`)

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.sse?.close()
        this.fsm.transition(ConnectionState.DISCONNECTED)
        reject(new Error('Hypnotiz connection timeout'))
      }, this.config.hypnotiz.connectionTimeoutMs!)

      this.sse = new EventSource(streamUrl)

      this.sse.onopen = () => {
        clearTimeout(timeout)
        this.fsm.transition(ConnectionState.CONNECTED)
        this.fsm.notifyConnected()
        this.connectedAt = Date.now()
        this.reconnectDelay = this.config.hypnotiz.reconnectDelayMs!
        this.emitter.emit('state:change', ConnectionState.CONNECTED)
        console.log(`[VehicleTrafficController] Connected to Hypnotiz`)
        this._startLocalRefresh()
        resolve()
      }

      this.sse.onmessage = (event) => {
        this._handleStreamEvent(event.data)
      }

      this.sse.onerror = (err) => {
        clearTimeout(timeout)
        console.warn('[VehicleTrafficController] SSE error, triggering reconnect')
        this.emitter.emit('error', new Error('SSE connection lost'))
        this._triggerReconnect()
        reject(err)
      }
    })
  }

  /**
   * Subscribe Hypnotiz to a specific client context (viewport, preferences).
   * Call this whenever the user pans/zooms or preferences change.
   */
  async subscribe(context: ClientContext): Promise<void> {
    this.currentContext = context
    await this._postSubscription(context)
  }

  /**
   * Update viewport only (common on map pan/zoom).
   */
  async updateViewport(viewport: BoundingBox, center: { lat: number; lng: number }, zoom: number): Promise<void> {
    if (!this.currentContext) {
      throw new Error('Cannot update viewport before calling subscribe()')
    }
    this.currentContext = { ...this.currentContext, viewport, center, zoom }
    await this._postSubscription(this.currentContext)
  }

  /**
   * Gracefully disconnect.
   */
  async disconnect(): Promise<void> {
    this._stopLocalRefresh()
    this.sse?.close()
    this.sse = null
    this.connectedAt = null

    if (this.fsm.isConnected()) {
      this.fsm.transition(ConnectionState.DISCONNECTED)
    }

    this.emitter.emit('state:change', ConnectionState.DISCONNECTED)
    this.emitter.emit('disconnect', undefined as any)
    this.emitter.removeAllListeners()
    console.log('[VehicleTrafficController] Disconnected')
  }

  /**
   * Wait until connected (useful in initialisation flows).
   */
  async waitUntilReady(timeoutMs = 10_000): Promise<void> {
    if (this.fsm.isConnected()) return
    await this.fsm.waitForConnection(timeoutMs)
  }

  // ==========================================================================
  // Event subscription
  // ==========================================================================

  on<K extends keyof ControllerEventMap>(event: K, handler: EventHandler<ControllerEventMap[K]>): this {
    this.emitter.on(event, handler)
    return this
  }

  off<K extends keyof ControllerEventMap>(event: K, handler: EventHandler<ControllerEventMap[K]>): this {
    this.emitter.off(event, handler)
    return this
  }

  once<K extends keyof ControllerEventMap>(event: K, handler: EventHandler<ControllerEventMap[K]>): this {
    this.emitter.once(event, handler)
    return this
  }

  // ==========================================================================
  // Vehicle Queries
  // ==========================================================================

  /**
   * Brain-filtered local query. Returns the current best view for the context.
   * Does NOT hit the network — runs purely against the brain's local state.
   * Call this when you need a synchronous snapshot (e.g., on map move before
   * the next Hypnotiz tick arrives).
   */
  selectLocal(context?: ClientContext): SirtebasinResponse {
    const ctx = context ?? this.currentContext
    if (!ctx) {
      return { ts: Date.now(), items: [] }
    }
    const t0 = performance.now()
    const result = this.brain.select(ctx)
    this._recordBrainLatency(performance.now() - t0)
    return result
  }

  /**
   * HTTP query for vehicles in a bounding box.
   * Goes to Hypnotiz → Sirtebasin → ClickHouse/Redis.
   * Use for initial load or large-area queries outside the SSE stream.
   */
  async queryVehicles(viewport: BoundingBox, options?: {
    maxResults?: number
    includeAnomalies?: boolean
    vehicleTypes?: string[]
  }): Promise<AttentionItem[]> {
    await this.waitUntilReady()
    const params = new URLSearchParams({
      min_lat: String(viewport.minLat),
      max_lat: String(viewport.maxLat),
      min_lon: String(viewport.minLng),
      max_lon: String(viewport.maxLng),
      max_results: String(options?.maxResults ?? this.config.hypnotiz.maxVehiclesPerClient!),
      include_anomalies: String(options?.includeAnomalies ?? true),
    })
    if (options?.vehicleTypes?.length) {
      params.set('vehicle_types', options.vehicleTypes.join(','))
    }
    const data = await this._fetch<{ items: AttentionItem[] }>(
      `/api/vehicles?${params.toString()}`
    )
    return data.items ?? []
  }

  /**
   * Get a single vehicle's current state.
   */
  getVehicleState(vehicleId: string): VehicleState | undefined {
    return this.brain.getVehicleState(vehicleId)
  }

  // ==========================================================================
  // Traffic Queries (proxied through Hypnotiz → Sirtebasin → ClickHouse)
  // ==========================================================================

  /**
   * Fetch traffic nodes in viewport from Hypnotiz.
   */
  async queryTrafficNodes(viewport: BoundingBox): Promise<TrafficNode[]> {
    await this.waitUntilReady()
    const params = this._viewportParams(viewport)
    const data = await this._fetch<{ nodes: TrafficNode[] }>(
      `/api/traffic/nodes?${params}`
    )
    const nodes = data.nodes ?? []
    this.emitter.emit('traffic:nodes', nodes)
    return nodes
  }

  /**
   * Fetch traffic edges (corridors) in viewport from Hypnotiz.
   */
  async queryTrafficEdges(viewport: BoundingBox): Promise<TrafficEdge[]> {
    await this.waitUntilReady()
    const params = this._viewportParams(viewport)
    const data = await this._fetch<{ edges: TrafficEdge[] }>(
      `/api/traffic/edges?${params}`
    )
    const edges = data.edges ?? []
    this.emitter.emit('traffic:edges', edges)
    return edges
  }

  /**
   * Fetch 5-minute aggregations for a node.
   */
  async queryTrafficAggregations(nodeId: string, windowMinutes = 60): Promise<TrafficAggregation[]> {
    await this.waitUntilReady()
    const data = await this._fetch<{ aggregations: TrafficAggregation[] }>(
      `/api/traffic/aggregations?node_id=${encodeURIComponent(nodeId)}&window=${windowMinutes}`
    )
    return data.aggregations ?? []
  }

  // ==========================================================================
  // Health & Observability
  // ==========================================================================

  async healthCheck(): Promise<HealthStatus> {
    let hypnotizHealth: HypnotizHealthResponse | undefined
    let hypnotizReachable = false

    try {
      hypnotizHealth = await this._fetch<HypnotizHealthResponse>('/health')
      hypnotizReachable = hypnotizHealth?.status === 'ok'
    } catch {
      hypnotizReachable = false
    }

    return {
      healthy: this.fsm.isConnected() && hypnotizReachable,
      connected: this.fsm.isConnected(),
      hypnotizReachable,
      currentState: this.fsm.state,
      metrics: this.getMetrics(),
      hypnotizHealth,
    }
  }

  getMetrics(): ControllerMetrics {
    return {
      ...this.metrics,
      connectionUptime: this.connectedAt ? Date.now() - this.connectedAt : 0,
      averageBrainLatencyMs:
        this.brainLatencies.length > 0
          ? this.brainLatencies.reduce((a, b) => a + b, 0) / this.brainLatencies.length
          : 0,
    }
  }

  get state(): ConnectionState { return this.fsm.state }
  get clientId(): string { return this.config.clientId! }

  // ==========================================================================
  // Stream Event Handling (private)
  // ==========================================================================

  private _handleStreamEvent(raw: string): void {
    let event: HypnotizStreamEvent
    try {
      event = JSON.parse(raw)
    } catch {
      console.warn('[VehicleTrafficController] Failed to parse stream event')
      return
    }

    this.metrics.totalMessagesReceived++
    this.metrics.lastTickAt = new Date()

    // Normalise field (Hypnotiz uses 'items', old format used 'vehicles')
    const rawItems: AttentionItem[] = event.items ?? event.vehicles ?? []

    // Handle backpressure signals
    if (event.backpressure) {
      this.metrics.backpressureEvents++
      this.emitter.emit('backpressure', true)
      if (this.fsm.state === ConnectionState.CONNECTED) {
        this.fsm.transition(ConnectionState.DEGRADED)
        this.emitter.emit('state:change', ConnectionState.DEGRADED)
      }
    } else if (this.fsm.state === ConnectionState.DEGRADED) {
      this.fsm.transition(ConnectionState.CONNECTED)
      this.emitter.emit('state:change', ConnectionState.CONNECTED)
      this.emitter.emit('backpressure', false)
    }

    this.emitter.emit('raw', event)

    if (rawItems.length === 0) return

    // Feed vehicle items back into the local brain for state tracking
    const vehicleEvents = this._toVehicleEvents(rawItems)
    if (vehicleEvents.length > 0) {
      this.brain.ingest(vehicleEvents)
    }

    // Brain second-pass filter
    const filtered = this._applyLocalBrainFilter(rawItems)

    const dropped = rawItems.length - filtered.length
    this.metrics.totalItemsRendered += filtered.length
    this.metrics.totalItemsDropped += dropped
    this.metrics.averageItemsPerTick =
      this.metrics.totalItemsRendered / this.metrics.totalMessagesReceived

    // Emit typed events per item kind
    for (const item of filtered) {
      if (item.kind === 'cluster') {
        this.emitter.emit('cluster', item)
      } else {
        this.emitter.emit('vehicle', item)
        if (item.score > 0.85) {
          this.emitter.emit('anomaly', item)
        }
      }
    }

    // Emit the full filtered response
    const response: SirtebasinResponse = { ts: event.timestamp, items: filtered }
    this.emitter.emit('update', response)
  }

  // ==========================================================================
  // Local brain filter
  // ==========================================================================

  /**
   * Apply the local brain's select() against current context for a second-pass
   * attention filter on items just received from Hypnotiz.
   * This eliminates redundant renders without any extra network call.
   */
  private _applyLocalBrainFilter(items: AttentionItem[]): AttentionItem[] {
    if (!this.currentContext) {
      // No context yet — pass everything above threshold
      return items.filter(i => i.score >= this.config.localScoreThreshold!)
    }
    const t0 = performance.now()

    // Brain already has updated state from ingest above.
    // Run select against current context to get locally ranked items.
    const brainResult = this.brain.select(this.currentContext)
    this.metrics.brainSelectCount++
    this._recordBrainLatency(performance.now() - t0)

    // Build a set of IDs the brain approves
    const brainApproved = new Set(brainResult.items.map(i => i.id))

    // Keep Hypnotiz items that either pass local threshold OR brain approved them.
    // Hypnotiz score is authoritative for server-side ranking; brain refines locally.
    return items.filter(item =>
      item.score >= this.config.localScoreThreshold! || brainApproved.has(item.id)
    )
  }

  // ==========================================================================
  // Local brain refresh (periodic, for idle re-scoring)
  // ==========================================================================

  private _startLocalRefresh(): void {
    if (this.localRefreshTimer) return
    this.localRefreshTimer = setInterval(() => {
      if (!this.currentContext || !this.fsm.isConnected()) return
      const result = this.selectLocal()
      // Re-emit if brain produces a meaningful output (e.g. state changed locally)
      if (result.items.length > 0) {
        this.emitter.emit('update', result)
      }
    }, this.config.localRefreshIntervalMs!)
  }

  private _stopLocalRefresh(): void {
    if (this.localRefreshTimer) {
      clearInterval(this.localRefreshTimer)
      this.localRefreshTimer = null
    }
  }

  // ==========================================================================
  // Reconnection (single-flight, exponential backoff + jitter)
  // ==========================================================================

  private _triggerReconnect(): void {
    if (this.reconnectPromise) return
    if (this.fsm.state === ConnectionState.DISCONNECTED) return

    if (this.fsm.isConnected()) {
      this.fsm.transition(ConnectionState.RECONNECTING)
      this.emitter.emit('state:change', ConnectionState.RECONNECTING)
    }

    this.reconnectPromise = (async () => {
      while (true) {
        const jitter = Math.random() * 500
        await sleep(this.reconnectDelay + jitter)

        try {
          this.sse?.close()
          this.sse = null
          await this.connect()

          // Restore subscription if we had one
          if (this.currentContext) {
            await this._postSubscription(this.currentContext).catch(() => {})
          }

          this.reconnectDelay = this.config.hypnotiz.reconnectDelayMs!
          this.metrics.reconnectCount++
          console.log('[VehicleTrafficController] Reconnected to Hypnotiz')
          return
        } catch {
          this.reconnectDelay = Math.min(
            this.reconnectDelay * 2,
            this.config.hypnotiz.maxReconnectDelayMs!
          )
          console.warn(`[VehicleTrafficController] Reconnect failed, retrying in ${this.reconnectDelay}ms`)
        }
      }
    })()

    this.reconnectPromise.finally(() => { this.reconnectPromise = null })
  }

  // ==========================================================================
  // HTTP helpers (Hypnotiz REST API)
  // ==========================================================================

  private async _postSubscription(context: ClientContext): Promise<void> {
    if (!this.fsm.isConnected()) return

    const payload: HypnotizSubscribePayload = {
      viewport: {
        min_lat: context.viewport.minLat,
        max_lat: context.viewport.maxLat,
        min_lon: context.viewport.minLng,
        max_lon: context.viewport.maxLng,
      },
      focus: context.center,
      preferences: {
        anomaly_priority: context.policy.includeAnomalies,
        include_clusters: true,
        vehicle_types: undefined,
      },
      max_results: context.budget.total,
      region_id: this.config.hypnotiz.regionId,
    }

    await this._fetch(`/subscribe?client_id=${this.config.clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  private async _fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.config.hypnotiz.url}${path}`
    const response = await fetch(url, {
      ...init,
      headers: {
        'X-Client-ID': this.config.clientId!,
        'X-Region-ID': this.config.hypnotiz.regionId!,
        ...init?.headers,
      },
    })
    if (!response.ok) {
      throw new Error(`Hypnotiz HTTP ${response.status}: ${await response.text()}`)
    }
    return response.json() as Promise<T>
  }

  private _buildStreamUrl(): string {
    return `${this.config.hypnotiz.url}/stream?client_id=${this.config.clientId}`
  }

  private _viewportParams(viewport: BoundingBox): URLSearchParams {
    return new URLSearchParams({
      min_lat: String(viewport.minLat),
      max_lat: String(viewport.maxLat),
      min_lon: String(viewport.minLng),
      max_lon: String(viewport.maxLng),
    })
  }

  // ==========================================================================
  // Brain helpers
  // ==========================================================================

  /**
   * Convert AttentionItems from Hypnotiz back into VehicleEvents for brain ingestion.
   * Clusters are skipped — the brain works on individual vehicle states.
   */
  private _toVehicleEvents(items: AttentionItem[]): VehicleEvent[] {
    return items
      .filter(item => item.kind === 'vehicle')
      .map(item => ({
        id: item.id,
        lat: item.lat,
        lng: item.lng,
        speed: item.speed ?? 0,
        heading: item.heading ?? 0,
        ts: Date.now(),
      }))
  }

  private _recordBrainLatency(ms: number): void {
    this.brainLatencies.push(ms)
    // Keep rolling window of last 100 samples
    if (this.brainLatencies.length > 100) {
      this.brainLatencies.shift()
    }
  }
}

// ============================================================================
// Singleton lifecycle
// ============================================================================

let controllerInstance: VehicleTrafficController | null = null

export function getVehicleTrafficController(
  config?: Partial<ControllerConfig>
): VehicleTrafficController {
  if (!controllerInstance) {
    controllerInstance = new VehicleTrafficController(config)
  }
  return controllerInstance
}

export async function destroyVehicleTrafficController(): Promise<void> {
  if (controllerInstance) {
    await controllerInstance.disconnect()
    controllerInstance = null
  }
}

/**
 * Initialise and connect the controller, with exponential backoff.
 * Fire-and-forget — suitable for module-level init.
 */
export function initVehicleTrafficController(config?: Partial<ControllerConfig>): VehicleTrafficController {
  const controller = getVehicleTrafficController(config)
  let delay = config?.hypnotiz?.reconnectDelayMs ?? 2_000

  ;(async () => {
    while (true) {
      try {
        await controller.connect()
        console.log('[VehicleTrafficController] Init successful')
        return
      } catch (err) {
        console.error('[VehicleTrafficController] Init failed, retrying...', err)
        const jitter = Math.random() * 500
        await sleep(delay + jitter)
        delay = Math.min(delay * 2, config?.hypnotiz?.maxReconnectDelayMs ?? 30_000)
      }
    }
  })()

  return controller
}

// ============================================================================
// Utilities
// ============================================================================

function generateClientId(): string {
  return `vc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}