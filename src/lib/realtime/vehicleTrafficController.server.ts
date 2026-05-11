/**
 * VehicleTrafficController  (SERVER-SIDE ONLY)
 *
 * No EventSource. No SSE. No browser globals.
 * Safe to import in hooks.server.ts, +page.server.ts, +server.ts.
 *
 * Responsibilities:
 *   - SirtebasinBrainV3 local scoring / select()
 *   - HTTP queries to Hypnotiz (vehicles, traffic nodes/edges, aggregations)
 *   - Health checks
 *   - Metrics
 *
 * NOT responsible for:
 *   - Opening an SSE connection   → VehicleTrafficClient (browser)
 *   - Maintaining live state      → brain is fed by client-side ingest
 *   - Reconnect loops             → browser handles that
 */

import { SirtebasinBrainV3 } from './hypntyz'
import type {
  AttentionItem,
  BoundingBox,
  ClientContext,
  SirtebasinResponse,
  VehicleState,
} from './hypntyz'

// ============================================================================
// Config
// ============================================================================

export interface HypnotizConfig {
  url: string
  regionId?: string
  maxVehiclesPerClient?: number
  requestTimeoutMs?: number
}

export interface ControllerConfig {
  hypnotiz: HypnotizConfig
  localScoreThreshold?: number
  clientId?: string
}

function resolveConfig(partial: Partial<ControllerConfig>): ControllerConfig {
  return {
    hypnotiz: {
      url:                  partial.hypnotiz?.url ?? 'http://localhost:8080',
      regionId:             partial.hypnotiz?.regionId ?? 'default',
      maxVehiclesPerClient: partial.hypnotiz?.maxVehiclesPerClient ?? 500,
      requestTimeoutMs:     partial.hypnotiz?.requestTimeoutMs ?? 8_000,
      ...partial.hypnotiz,
    },
    localScoreThreshold: partial.localScoreThreshold ?? 0.35,
    clientId:            partial.clientId ?? generateClientId(),
  }
}

// ============================================================================
// Types re-exported (convenience)
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
  totalQueriesExecuted: number
  averageQueryLatencyMs: number
  brainSelectCount: number
  averageBrainLatencyMs: number
}

export interface HealthStatus {
  healthy: boolean
  hypnotizReachable: boolean
  metrics: ControllerMetrics
  hypnotizHealth?: { status: string; region?: string; activeClients?: number }
}

// ============================================================================
// VehicleTrafficController — server-side pure HTTP + brain
// ============================================================================

export class VehicleTrafficController {
  private readonly config: ControllerConfig
  private readonly brain: SirtebasinBrainV3

  private metrics: ControllerMetrics = {
    totalQueriesExecuted: 0,
    averageQueryLatencyMs: 0,
    brainSelectCount: 0,
    averageBrainLatencyMs: 0,
  }
  private queryLatencies:  number[] = []
  private brainLatencies:  number[] = []

  constructor(config: Partial<ControllerConfig> = {}) {
    this.config = resolveConfig(config)
    this.brain  = new SirtebasinBrainV3()
  }

  // ==========================================================================
  // Brain — local scoring (called server-side for SSR snapshots, or by
  //         SvelteKit load functions to seed the initial render)
  // ==========================================================================

  /**
   * Run the brain's attention filter against a client context.
   * Stateless from the caller's perspective — feed it items first via ingestItems().
   */
  select(context: ClientContext): SirtebasinResponse {
    const t0 = performance.now()
    const result = this.brain.select(context)
    this._recordBrainLatency(performance.now() - t0)
    this.metrics.brainSelectCount++
    return result
  }

  /**
   * Feed the brain a batch of items (e.g. from an HTTP query result) so
   * select() has state to work with.
   */
  ingestItems(items: AttentionItem[]): void {
    const vehicleEvents = items
      .filter(i => i.kind === 'vehicle')
      .map(i => ({
        id:      i.id,
        lat:     i.lat,
        lng:     i.lng,
        speed:   i.speed ?? 0,
        heading: i.heading ?? 0,
        ts:      Date.now(),
      }))
    if (vehicleEvents.length > 0) {
      this.brain.ingest(vehicleEvents)
    }
  }

  getVehicleState(vehicleId: string): VehicleState | undefined {
    return this.brain.getVehicleState(vehicleId)
  }

  // ==========================================================================
  // HTTP queries → Hypnotiz
  // ==========================================================================

  async queryVehicles(
    viewport: BoundingBox,
    options?: {
      maxResults?: number
      includeAnomalies?: boolean
      vehicleTypes?: string[]
    }
  ): Promise<AttentionItem[]> {
    const params = new URLSearchParams({
      min_lat:          String(viewport.minLat),
      max_lat:          String(viewport.maxLat),
      min_lon:          String(viewport.minLng),
      max_lon:          String(viewport.maxLng),
      max_results:      String(options?.maxResults ?? this.config.hypnotiz.maxVehiclesPerClient!),
      include_anomalies: String(options?.includeAnomalies ?? true),
    })
    if (options?.vehicleTypes?.length) {
      params.set('vehicle_types', options.vehicleTypes.join(','))
    }
    const data = await this._fetch<{ items: AttentionItem[] }>(`/api/vehicles?${params}`)
    return data.items ?? []
  }

  async queryTrafficNodes(viewport: BoundingBox): Promise<TrafficNode[]> {
    const data = await this._fetch<{ nodes: TrafficNode[] }>(
      `/api/traffic/nodes?${this._viewportParams(viewport)}`
    )
    return data.nodes ?? []
  }

  async queryTrafficEdges(viewport: BoundingBox): Promise<TrafficEdge[]> {
    const data = await this._fetch<{ edges: TrafficEdge[] }>(
      `/api/traffic/edges?${this._viewportParams(viewport)}`
    )
    return data.edges ?? []
  }

  async queryTrafficAggregations(
    nodeId: string,
    windowMinutes = 60
  ): Promise<TrafficAggregation[]> {
    const data = await this._fetch<{ aggregations: TrafficAggregation[] }>(
      `/api/traffic/aggregations?node_id=${encodeURIComponent(nodeId)}&window=${windowMinutes}`
    )
    return data.aggregations ?? []
  }

  // ==========================================================================
  // Health & Observability
  // ==========================================================================

  async healthCheck(): Promise<HealthStatus> {
    let hypnotizHealth: HealthStatus['hypnotizHealth']
    let hypnotizReachable = false
    try {
      hypnotizHealth    = await this._fetch('/health')
      hypnotizReachable = hypnotizHealth?.status === 'ok'
    } catch { /* unreachable */ }

    return {
      healthy:          hypnotizReachable,
      hypnotizReachable,
      metrics:          this.getMetrics(),
      hypnotizHealth,
    }
  }

  getMetrics(): ControllerMetrics {
    return {
      ...this.metrics,
      averageQueryLatencyMs: avg(this.queryLatencies),
      averageBrainLatencyMs: avg(this.brainLatencies),
    }
  }

  get clientId(): string { return this.config.clientId! }

  // ==========================================================================
  // HTTP helper
  // ==========================================================================

  private async _fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.config.hypnotiz.url}${path}`
    const t0  = performance.now()

    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.config.hypnotiz.requestTimeoutMs!),
      ...init,
      headers: {
        'X-Client-ID':  this.config.clientId!,
        'X-Region-ID':  this.config.hypnotiz.regionId!,
        ...init?.headers,
      },
    })

    this._recordQueryLatency(performance.now() - t0)
    this.metrics.totalQueriesExecuted++

    if (!response.ok) {
      throw new Error(`Hypnotiz ${response.status}: ${await response.text()}`)
    }
    return response.json() as Promise<T>
  }

  private _viewportParams(v: BoundingBox): URLSearchParams {
    return new URLSearchParams({
      min_lat: String(v.minLat),
      max_lat: String(v.maxLat),
      min_lon: String(v.minLng),
      max_lon: String(v.maxLng),
    })
  }

  private _recordQueryLatency(ms: number): void {
    rollingPush(this.queryLatencies, ms)
  }
  private _recordBrainLatency(ms: number): void {
    rollingPush(this.brainLatencies, ms)
  }
}

// ============================================================================
// Singleton (server-side)
// ============================================================================

let _instance: VehicleTrafficController | null = null

export function getVehicleTrafficController(
  config?: Partial<ControllerConfig>
): VehicleTrafficController {
  if (!_instance) {
    _instance = new VehicleTrafficController(config)
  }
  return _instance
}

// ============================================================================
// Util
// ============================================================================

function generateClientId(): string {
  return `vc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length
}

function rollingPush(arr: number[], val: number, max = 100): void {
  arr.push(val)
  if (arr.length > max) arr.shift()
}