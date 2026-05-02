// src/lib/map/services/map.service.ts
//
// Map Service — Server-side Orchestrator
//
// ARCHITECTURE BOUNDARY — READ BEFORE EDITING:
//   This service runs in Node.js / Cloudflare Workers (server-side).
//   DuckDB WASM is browser-only → DuckDBTileProvider.svelte.
//   This service must NOT import DuckDBWasmCore.
//
//   Server owns:
//     ClickHouse   → real-time telemetry + corridor analytics
//     SSE          → push updates to connected browser clients
//     Bootstrap    → build + broadcast CityBootstrapManifest
//
//   Browser owns:
//     DuckDB WASM  → static spatial tiles  (DuckDBTileProvider.svelte)
//     SW cache     → Parquet shard prefetch (service-worker.ts)
//
// LIFECYCLE (driven by mapServiceHandle in hooks.server.ts):
//   createMapService(config) → service.start() → polling begins
//   service.bootstrap(ctx, viewport, zoom) → manifest broadcast via SSE
//   service.stop() → clean shutdown

import type {
  BoundingBox,
  TrafficNode,
  CorridorAnalytics,
  Vehicle,
  MapServiceConfig,
  VehicleStreamData,
  TrafficStreamData,
} from '../types/MapTypes'

import type { SSEStreamManager } from './SseStreamer.service'
import {
  getClickHouseInstance,
  initializeClickHouseTables,
} from '$lib/realtime/ClickHouse.service'

import {
  bootstrapManifestService,
  type CityBootstrapManifest,
} from './bootstrap-manifest.service'

// App.RequestContext is the canonical type (defined in app.d.ts).
// bootstrap-manifest.service exports its own RequestContext which is
// structurally identical — they share the same fields.
// We use App.RequestContext here so the server pipeline stays type-consistent.
// The `as any` cast at the callsite is intentional and safe.
import type { App } from '../../../app'
type RequestContext = NonNullable<App.Locals['requestContext']>

// ============================================
// Upstream tile proxy (PBF / protomaps)
// ============================================
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

// ============================================
// MapService
// ============================================
export class MapService {
  private sse: SSEStreamManager
  private upstream: UpstreamMapClient

  private isRunning = false
  private startPromise: Promise<void> | null = null
  private clickhouseInitialized = false
  private intervals = new Map<string, ReturnType<typeof setInterval>>()

  private manifest: CityBootstrapManifest | null = null

  constructor(sse: SSEStreamManager, config: MapServiceConfig) {
    this.sse = sse
    this.upstream = new UpstreamMapClient(config.upstream)
  }

  // ============================================
  // BOOTSTRAP
  //
  // Builds a CityBootstrapManifest from the request's geo context
  // and broadcasts it to all connected SSE clients.
  // Each browser client forwards it to its service worker which
  // then prefetches the Parquet shards in the background.
  //
  // Call order:
  //   1. hooks.server.ts → mapServiceHandle → service.start()
  //   2. GET /api/map/bootstrap (initial load, no viewport)
  //   3. POST /api/map/bootstrap (after first render, with viewport)
  // ============================================
  async bootstrap(
    requestContext: RequestContext,
    viewport: BoundingBox,
    zoom: number,
  ): Promise<CityBootstrapManifest> {
    this.manifest = bootstrapManifestService.buildFromViewport(
      requestContext as any,
      viewport,
      zoom,
    )

    console.log('[MapService] Manifest built:', this.manifest.cityId)
    this.sse.broadcastBootstrap(this.manifest)

    return this.manifest
  }

  /** Build manifest from geo context only (no viewport known yet). */
  buildFallbackManifest(requestContext: RequestContext, zoom = 12): CityBootstrapManifest {
    this.manifest = bootstrapManifestService.build(requestContext as any, { zoom })
    return this.manifest
  }

  // ============================================
  // Lifecycle
  // ============================================
  async start(): Promise<void> {
    if (this.isRunning) return
    if (this.startPromise) return this.startPromise

    this.startPromise = this._doStart().catch((err) => {
      // Clear so next request retries rather than perpetually failing
      this.startPromise = null
      throw err
    })

    return this.startPromise
  }

  private async _doStart(): Promise<void> {
    console.log('[MapService] Starting...')

    await this.initClickHouse()

    // Seed a Nairobi fallback manifest so broadcastBootstrap has
    // something to send when the first SSE client connects before
    // any viewport event has been received.
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

    this.startPolling()
    this.isRunning = true
    console.log('[MapService] Online')
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    for (const i of this.intervals.values()) clearInterval(i)
    this.intervals.clear()

    await this.sse.shutdown()

    this.isRunning = false
    this.startPromise = null
    console.log('[MapService] Stopped')
  }

  // ============================================
  // ClickHouse
  // ============================================
  private async initClickHouse(): Promise<void> {
    const ch = getClickHouseInstance({
      host:     process.env.CLICKHOUSE_HOST     ?? 'localhost',
      port:     Number(process.env.CLICKHOUSE_PORT ?? 8123),
      database: process.env.CLICKHOUSE_DATABASE ?? 'traffic_db',
    })

    await ch.connect()
    await initializeClickHouseTables(ch)
    this.clickhouseInitialized = true
    console.log('[MapService] ClickHouse connected')
  }

  private ensureCH(): void {
    if (!this.clickhouseInitialized) {
      throw new Error('[MapService] ClickHouse not initialized — call start() first')
    }
  }

  // ============================================
  // Query API (consumed by +server.ts route handlers)
  // ============================================
  async getTrafficNodes(
    bounds: BoundingBox,
    options?: { nodeTypes?: string[]; minSaturation?: number },
  ): Promise<TrafficNode[]> {
    this.ensureCH()
    return getClickHouseInstance().getTrafficNodes(bounds, options)
  }

  async getNodeById(id: string): Promise<TrafficNode | null> {
    this.ensureCH()
    return getClickHouseInstance().getNodeById(id)
  }

  async getVehicles(bounds: BoundingBox): Promise<Vehicle[]> {
    this.ensureCH()
    return getClickHouseInstance().getVehicles(bounds)
  }

  async getCorridorAnalytics(bounds: BoundingBox): Promise<CorridorAnalytics[]> {
    this.ensureCH()
    return getClickHouseInstance().getTrafficCorridors(bounds)
  }

  getManifest(): CityBootstrapManifest | null {
    return this.manifest
  }

  // ============================================
  // Polling → SSE push
  // ============================================
  private startPolling(): void {
    this.intervals.set('vehicles', setInterval(() => this.pushVehicles(), 5_000))
    this.intervals.set('traffic',  setInterval(() => this.pushTraffic(),  30_000))
  }

  private currentBounds(): BoundingBox {
    return this.manifest?.boundingBox ?? {
      northEast: { lat: -1.15, lng: 36.95 },
      southWest: { lat: -1.45, lng: 36.65 },
    }
  }

  private async pushVehicles(): Promise<void> {
    if (!this.clickhouseInitialized) return
    try {
      const vehicles = await this.getVehicles(this.currentBounds())
      this.sse.broadcastVehicles({ vehicles, bounds: this.currentBounds() })
    } catch (err) {
      console.warn('[MapService] Vehicle push failed:', err)
    }
  }

  private async pushTraffic(): Promise<void> {
    if (!this.clickhouseInitialized) return
    try {
      const [nodes, corridors] = await Promise.all([
        this.getTrafficNodes(this.currentBounds()),
        this.getCorridorAnalytics(this.currentBounds()),
      ])
      this.sse.broadcastTraffic({ nodes, corridors, updatedAt: new Date().toISOString() })
    } catch (err) {
      console.warn('[MapService] Traffic push failed:', err)
    }
  }

  // ============================================
  // Health
  // ============================================
  async getHealth() {
    let chHealthy = false
    try {
      chHealthy = (await getClickHouseInstance().healthCheck()).healthy
    } catch {}

    return {
      healthy:    chHealthy,
      clickhouse: chHealthy,
      sse:        { clients: this.sse.getClientCount() },
      bootstrap:  !!this.manifest,
      cityId:     this.manifest?.cityId ?? null,
    }
  }
}

// ============================================
// Singleton — one instance per process lifetime
// ============================================
let instance: MapService | null = null

export async function createMapService(config: MapServiceConfig): Promise<MapService> {
  const { sseStreamManager } = await import('./SseStreamer.service')
  instance = new MapService(sseStreamManager, config)
  return instance
}

export function getMapService(): MapService | null {
  return instance
}