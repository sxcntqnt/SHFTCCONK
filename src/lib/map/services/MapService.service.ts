// src/lib/map/services/map.service.ts
//
// Map Service — Server-side Orchestrator (v2)
//
// ARCHITECTURE BOUNDARY — READ BEFORE EDITING:
//   This service runs in Node.js / Cloudflare Workers (server-side).
//   DuckDB WASM is browser-only → DuckDBTileProvider.svelte.
//   This service must NOT import DuckDBWasmCore.
//
//   Server owns:
//     VehicleTrafficController → real-time telemetry via Hypnotiz (SSE + HTTP)
//     SSE                     → push updates to connected browser clients
//     Bootstrap               → build + broadcast CityBootstrapManifest
//
//   ClickHouse is NO LONGER ACCESSED DIRECTLY from this service.
//   All vehicle + traffic telemetry routes through the Projection Engine
//   (Hypnotiz) which owns the Sirtebasin query layer (Redis + ClickHouse).
//   The VehicleTrafficController is the only client of Hypnotiz in this process.
//
//   Browser owns:
//     DuckDB WASM  → static spatial tiles  (DuckDBTileProvider.svelte)
//     SW cache     → Parquet shard prefetch (service-worker.ts)
//
// LIFECYCLE (driven by mapServiceHandle in hooks.server.ts):
//   createMapService(config) → service.start() → event-driven stream begins
//   service.bootstrap(ctx, viewport, zoom) → manifest broadcast via SSE
//   service.stop() → graceful shutdown (controller + SSE)
//
// DATA FLOW:
//   Hypnotiz (Go)
//     → VehicleTrafficController.on('update')   [vehicles, clusters]
//         → sse.broadcastVehicles()             [→ browser clients]
//     → VehicleTrafficController.on('traffic:*') [nodes, edges — HTTP poll]
//         → sse.broadcastTraffic()              [→ browser clients]
//     → bootstrap()                             [manifest → SW prefetch]
//         → sse.broadcastBootstrap()

import type {
  BoundingBox as MapBoundingBox,
  TrafficNode,
  CorridorAnalytics,
  Vehicle,
  MapServiceConfig,
  VehicleStreamData,
  TrafficStreamData,
} from '../types/MapTypes'

import type { SSEStreamManager } from './SseStreamer.service'

import {
  VehicleTrafficController,
  ConnectionState,
  type ControllerConfig,
  type TrafficNode as ControllerTrafficNode,
  type TrafficEdge,
} from '$lib/realtime/vehicleTrafficController.server'

import type { AttentionItem, BoundingBox as ControllerBoundingBox, ClientContext } from '../realtime/hypntyz'

import {
  bootstrapManifestService,
  type CityBootstrapManifest,
} from './bootstrap-manifest.service'

import type { App } from '../../../app'
type RequestContext = NonNullable<App.Locals['requestContext']>

// ============================================================================
// Type adapters — bridge MapTypes ↔ controller types
// ============================================================================

/** MapTypes uses { northEast, southWest }; controller uses flat { min/max lat/lng }. */
function toControllerBounds(bounds: MapBoundingBox): ControllerBoundingBox {
  return {
    minLat: bounds.southWest.lat,
    maxLat: bounds.northEast.lat,
    minLng: bounds.southWest.lng,
    maxLng: bounds.northEast.lng,
  }
}

function toMapBounds(bounds: ControllerBoundingBox): MapBoundingBox {
  return {
    northEast: { lat: bounds.maxLat, lng: bounds.maxLng },
    southWest: { lat: bounds.minLat, lng: bounds.minLng },
  }
}

/** AttentionItem (vehicle kind) → MapTypes Vehicle */
function adaptToVehicle(item: AttentionItem): Vehicle {
  return {
    id: item.id,
    lat: item.lat,
    lng: item.lng,
    heading: item.heading ?? 0,
    speed: item.speed ?? 0,
    route_id: '',
    updated_at: new Date().toISOString(),
  }
}

/** ControllerTrafficNode → MapTypes TrafficNode */
function adaptTrafficNode(n: ControllerTrafficNode): TrafficNode {
  return {
    id: n.id,
    lat: n.lat,
    lng: n.lng,
    type: n.type,
    saturation: n.saturation,
    passenger_throughput: n.passengerThroughput,
    average_dwell_time: n.averageDwellTime,
    updated_at: n.updatedAt,
  }
}

/** TrafficEdge → CorridorAnalytics */
function adaptEdgeToCorridor(e: TrafficEdge): CorridorAnalytics {
  return {
    corridor_id: e.corridorId,
    lat: e.lat,
    lng: e.lng,
    speed: e.speed,
    congestion: e.congestion,
    updated_at: e.updatedAt,
  }
}

// ============================================================================
// Regional subscription context
//
// The server-side controller connects to Hypnotiz as a privileged regional
// aggregator — not a per-user client. It requests a broad city-level view
// with a large budget so all vehicles flow through to be re-broadcast to
// browser clients. Per-user attention filtering happens in the browser
// (SirtebasinBrainV3 on the client) or in Hypnotiz per-connection.
// ============================================================================

function buildRegionalContext(manifest: CityBootstrapManifest): ClientContext {
  const bounds = toControllerBounds(manifest.boundingBox)
  const center = manifest.approxCenter ?? {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  }
  return {
    viewport: bounds,
    center,
    zoom: 11,   // city level — Hypnotiz resolves H3 res accordingly
    budget: {
      total: 5_000,          // server sees more than any single client
      reserved: {
        anomalies: 500,      // always get all anomalies server-side
        clusters: 200,
      },
    },
    policy: {
      includeAnomalies: true,
      includeHighSpeed: true,
    },
  }
}

// ============================================================================
// Upstream tile proxy (PBF / protomaps) — unchanged
// ============================================================================

class UpstreamMapClient {
  constructor(private config: MapServiceConfig['upstream']) {}

  async fetchTile(x: number, y: number, z: number): Promise<ArrayBuffer> {
    const res = await fetch(
      `${this.config.baseUrl}/tiles/${z}/${x}/${y}.pbf`,
      { signal: AbortSignal.timeout(this.config.timeout) },
    )
    return res.arrayBuffer()
  }
}

// ============================================================================
// MapService
// ============================================================================

export class MapService {
  private sse: SSEStreamManager
  private upstream: UpstreamMapClient
  private controller: VehicleTrafficController

  private isRunning = false
  private startPromise: Promise<void> | null = null

  private manifest: CityBootstrapManifest | null = null

  // Traffic poll timer (vehicles are event-driven; traffic is lower-frequency HTTP)
  private trafficPollTimer: ReturnType<typeof setInterval> | null = null
  private readonly TRAFFIC_POLL_MS = 30_000

  constructor(sse: SSEStreamManager, config: MapServiceConfig) {
    this.sse = sse
    this.upstream = new UpstreamMapClient(config.upstream)
    this.controller = new VehicleTrafficController({
      hypnotiz: {
        url: config.hypnotiz?.url ?? process.env.HYPNOTIZ_URL ?? 'http://localhost:8901',
        regionId: config.hypnotiz?.regionId ?? process.env.HYPNOTIZ_REGION ?? 'default',
        maxVehiclesPerClient: 5_000,
        enableBackpressure: true,
      },
      // Server-side: threshold is lower because we broadcast everything to clients
      // and let the browser brain do per-user filtering.
      localScoreThreshold: 0.2,
      clientId: `map-service-${process.env.REGION_ID ?? 'default'}`,
    })
  }

  // ==========================================================================
  // BOOTSTRAP
  //
  // Builds a CityBootstrapManifest from the request's geo context and
  // broadcasts it to SSE clients. Each browser client forwards to its
  // service worker which then prefetches Parquet shards in the background.
  //
  // Also updates the controller's regional subscription — new manifest
  // means new city bounds → new viewport for Hypnotiz.
  //
  // Call order:
  //   1. hooks.server.ts → mapServiceHandle → service.start()
  //   2. GET /api/map/bootstrap (initial load, no viewport)
  //   3. POST /api/map/bootstrap (after first render, with viewport)
  // ==========================================================================
  async bootstrap(
    requestContext: RequestContext,
    viewport: MapBoundingBox,
    zoom: number,
  ): Promise<CityBootstrapManifest> {
    this.manifest = bootstrapManifestService.buildFromViewport(
      requestContext as any,
      viewport,
      zoom,
    )

    console.log('[MapService] Manifest built:', this.manifest.cityId)
    this.sse.broadcastBootstrap(this.manifest)

    // Update controller subscription to match new city context.
    // Fire-and-forget — controller queues the update internally.
    if (this.controller.state !== ConnectionState.DISCONNECTED) {
      const ctx = buildRegionalContext(this.manifest)
      this.controller.subscribe(ctx).catch(err =>
        console.warn('[MapService] Bootstrap subscription update failed:', err)
      )
    }

    return this.manifest
  }

  /** Build manifest from geo context only (no viewport known yet). */
  buildFallbackManifest(requestContext: RequestContext, zoom = 12): CityBootstrapManifest {
    this.manifest = bootstrapManifestService.build(requestContext as any, { zoom })
    return this.manifest
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  async start(): Promise<void> {
    if (this.isRunning) return
    if (this.startPromise) return this.startPromise

    this.startPromise = this._doStart().catch((err) => {
      this.startPromise = null
      throw err
    })

    return this.startPromise
  }

  private async _doStart(): Promise<void> {
    console.log('[MapService] Starting...')

    // Seed fallback manifest immediately (Nairobi) so the SSE broadcast
    // has something to send before the first viewport event arrives.
    if (!this.manifest) {
      this.manifest = bootstrapManifestService.build(
        {
          country: 'KE',
          city: 'Nairobi',
          ip: null,
          regionKey: 'KE:Nairobi',
          approxCenter: { lat: -1.2921, lng: 36.8219 },
          h3SeedResolution: 7,
        },
        { zoom: 12 },
      )
    }

    // Wire controller events → SSE broadcasts BEFORE connecting so we
    // don't miss the first tick.
    this._wireControllerEvents()

    // Connect to Hypnotiz and subscribe with the regional context.
    await this.controller.subscribe(buildRegionalContext(this.manifest))
    await this.controller.connect()

    // Traffic node / edge data arrives via periodic HTTP queries (lower freq).
    this._startTrafficPoll()

    this.isRunning = true
    console.log('[MapService] Online — listening to Hypnotiz')
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    this._stopTrafficPoll()

    // Disconnect controller (closes SSE to Hypnotiz, removes all listeners)
    await this.controller.disconnect()

    await this.sse.shutdown()

    this.isRunning = false
    this.startPromise = null
    console.log('[MapService] Stopped')
  }

  // ==========================================================================
  // Controller → SSE wiring
  //
  // The controller is the single source of real-time truth.
  // Each event maps to an SSE broadcast. No polling for vehicles.
  // ==========================================================================

  private _wireControllerEvents(): void {
    // Vehicle + cluster updates (20Hz from Hypnotiz, brain-filtered by controller)
    this.controller.on('update', (response) => {
      const vehicles = response.items
        .filter(item => item.kind === 'vehicle')
        .map(adaptToVehicle)

      if (vehicles.length === 0) return

      this.sse.broadcastVehicles({
        vehicles,
        bounds: this.currentBounds(),
      } satisfies VehicleStreamData)
    })

    // Anomalies get a dedicated broadcast so the browser can render
    // highlights immediately, without waiting for the next full update.
    this.controller.on('anomaly', (item) => {
      this.sse.broadcastAnomaly({
        vehicleId: item.id,
        lat: item.lat,
        lng: item.lng,
        score: item.score,
        speed: item.speed ?? 0,
        detectedAt: new Date().toISOString(),
      })
    })

    // Backpressure signal — forward to browser clients so MapLibre can
    // switch to cluster rendering and reduce re-render cost.
    this.controller.on('backpressure', (active) => {
      this.sse.broadcastSystemEvent({ type: 'backpressure', active })
    })

    // Log state transitions for observability.
    this.controller.on('state:change', (state) => {
      console.log(`[MapService] Controller state → ${state}`)
      if (state === ConnectionState.RECONNECTING) {
        this.sse.broadcastSystemEvent({ type: 'controller_reconnecting' })
      }
      if (state === ConnectionState.CONNECTED) {
        this.sse.broadcastSystemEvent({ type: 'controller_ready' })
      }
    })

    this.controller.on('error', (err) => {
      console.error('[MapService] Controller error:', err)
    })
  }

  // ==========================================================================
  // Traffic polling (HTTP through controller → Hypnotiz → Sirtebasin)
  //
  // Traffic topology changes slowly; 30-second HTTP queries are sufficient.
  // Vehicles arrive event-driven at Hypnotiz's tick rate (20Hz).
  // ==========================================================================

  private _startTrafficPoll(): void {
    if (this.trafficPollTimer) return
    this.trafficPollTimer = setInterval(() => this._pushTraffic(), this.TRAFFIC_POLL_MS)
    // Also push immediately on start
    this._pushTraffic()
  }

  private _stopTrafficPoll(): void {
    if (this.trafficPollTimer) {
      clearInterval(this.trafficPollTimer)
      this.trafficPollTimer = null
    }
  }

  private async _pushTraffic(): Promise<void> {
  if (this.controller.state === ConnectionState.DISCONNECTED) return

  // Traffic endpoints are not yet confirmed with Hypnotiz.
  // Set HYPNOTIZ_TRAFFIC_ENABLED=true in .env once the real paths are known.
  if (process.env.HYPNOTIZ_TRAFFIC_ENABLED !== 'true') return

  const bounds = toControllerBounds(this.currentBounds())

  try {
    const [rawNodes, rawEdges] = await Promise.all([
      this.controller.queryTrafficNodes(bounds),
      this.controller.queryTrafficEdges(bounds),
    ])

    const nodes: TrafficNode[]           = rawNodes.map(adaptTrafficNode)
    const corridors: CorridorAnalytics[] = rawEdges.map(adaptEdgeToCorridor)

    this.sse.broadcastTraffic({
      nodes,
      corridors,
      updatedAt: new Date().toISOString(),
    } satisfies TrafficStreamData)
  } catch (err) {
    // Log once at warn level — do not rethrow, poll must survive individual failures
    console.warn('[MapService] Traffic poll failed:', err instanceof Error ? err.message : err)
  }
}

  // ==========================================================================
  // Query API (consumed by +server.ts route handlers)
  //
  // These delegate to the controller which routes through Hypnotiz.
  // No SQL in this file — ClickHouse is owned by Sirtebasin → Hypnotiz.
  // ==========================================================================

  async getTrafficNodes(
    bounds: MapBoundingBox,
    options?: { nodeTypes?: string[]; minSaturation?: number },
  ): Promise<TrafficNode[]> {
    this._ensureRunning()
    const raw = await this.controller.queryTrafficNodes(toControllerBounds(bounds))
    const nodes = raw.map(adaptTrafficNode)
    return options?.minSaturation
      ? nodes.filter(n => n.saturation >= options.minSaturation!)
      : nodes
  }

  async getNodeById(id: string): Promise<TrafficNode | null> {
    this._ensureRunning()
    // Single-node query: use the aggregations endpoint (most specific proxy)
    const aggs = await this.controller.queryTrafficAggregations(id, 5)
    if (aggs.length === 0) return null
    // Reconstruct a minimal node from the latest aggregation
    const latest = aggs[aggs.length - 1]
    return {
      id,
      lat: 0,         // caller should enrich from cached node list
      lng: 0,
      type: 'unknown',
      saturation: latest.avgSaturation,
      passenger_throughput: latest.totalThroughput,
      average_dwell_time: 0,
      updated_at: latest.lastUpdate,
    }
  }

  async getVehicles(bounds: MapBoundingBox): Promise<Vehicle[]> {
    this._ensureRunning()
    // Prefer the brain's local snapshot (zero latency) for viewport queries.
    // Falls back to HTTP if no local state exists yet.
    const localCtx = this._buildQueryContext(bounds)
    const localResult = this.controller.selectLocal(localCtx)
    if (localResult.items.length > 0) {
      return localResult.items
        .filter(i => i.kind === 'vehicle')
        .map(adaptToVehicle)
    }
    // No local state — fetch from Hypnotiz via HTTP
    const items = await this.controller.queryVehicles(toControllerBounds(bounds))
    return items.filter(i => i.kind === 'vehicle').map(adaptToVehicle)
  }

  async getCorridorAnalytics(bounds: MapBoundingBox): Promise<CorridorAnalytics[]> {
    this._ensureRunning()
    const edges = await this.controller.queryTrafficEdges(toControllerBounds(bounds))
    return edges.map(adaptEdgeToCorridor)
  }

  getManifest(): CityBootstrapManifest | null {
    return this.manifest
  }

  // ==========================================================================
  // Health
  // ==========================================================================

  async getHealth() {
    const controllerHealth = await this.controller.healthCheck()
    const controllerMetrics = this.controller.getMetrics()

    return {
      healthy:    controllerHealth.healthy,
      hypnotiz:   {
        reachable: controllerHealth.hypnotizReachable,
        state:     controllerHealth.currentState,
        uptime:    controllerMetrics.connectionUptime,
        reconnects: controllerMetrics.reconnectCount,
        backpressureEvents: controllerMetrics.backpressureEvents,
        avgBrainLatencyMs: controllerMetrics.averageBrainLatencyMs,
        itemsPerTick: controllerMetrics.averageItemsPerTick,
      },
      sse:        { clients: this.sse.getClientCount() },
      bootstrap:  !!this.manifest,
      cityId:     this.manifest?.cityId ?? null,
    }
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  private _ensureRunning(): void {
    if (!this.isRunning) {
      throw new Error('[MapService] Not started — call start() first')
    }
  }

  private currentBounds(): MapBoundingBox {
    return this.manifest?.boundingBox ?? {
      northEast: { lat: -1.15, lng: 36.95 },
      southWest: { lat: -1.45, lng: 36.65 },
    }
  }

  /**
   * Build a minimal ClientContext for a bounds-based query.
   * Used when the caller doesn't have a full context (e.g. route handlers).
   */
  private _buildQueryContext(bounds: MapBoundingBox): ClientContext {
    const cb = toControllerBounds(bounds)
    return {
      viewport: cb,
      center: {
        lat: (cb.minLat + cb.maxLat) / 2,
        lng: (cb.minLng + cb.maxLng) / 2,
      },
      zoom: 13,
      budget: { total: 1_000, reserved: { anomalies: 50, clusters: 50 } },
      policy: { includeAnomalies: true, includeHighSpeed: true },
    }
  }
}

// ============================================================================
// Singleton — one instance per process lifetime
// ============================================================================

let instance: MapService | null = null

export async function createMapService(config: MapServiceConfig): Promise<MapService> {
  const { sseStreamManager } = await import('./SseStreamer.service')
  instance = new MapService(sseStreamManager, config)
  return instance
}

export function getMapService(): MapService | null {
  return instance
}