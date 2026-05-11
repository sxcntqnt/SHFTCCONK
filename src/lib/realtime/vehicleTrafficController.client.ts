/**
 * VehicleTrafficClient
 *
 * Browser-only SSE transport layer.
 * Owns the EventSource connection to Hypnotiz.
 * Never imported server-side — safe for SvelteKit SSR.
 *
 * Responsibilities:
 *   - Open / maintain SSE stream
 *   - Exponential backoff reconnect (client-managed)
 *   - Forward raw events to whoever is listening
 *   - POST /subscribe on viewport change
 *
 * NOT responsible for:
 *   - Brain scoring (stays server or separate client module)
 *   - State persistence
 *   - HTTP queries (use VehicleTrafficController server-side API)
 */

import type {
  AttentionItem,
  ClientContext,
  SirtebasinResponse,
} from './hypntyz'

// ============================================================================
// Types
// ============================================================================

export interface SSEClientConfig {
  /** Hypnotiz base URL */
  url: string
  clientId?: string
  regionId?: string
  reconnectDelayMs?: number
  maxReconnectDelayMs?: number
  connectionTimeoutMs?: number
}

export type SSEClientEvent =
  | { type: 'update';      payload: SirtebasinResponse }
  | { type: 'raw';         payload: HypnotizStreamEvent }
  | { type: 'backpressure'; payload: boolean }
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'error';       payload: Error }

export type SSEClientListener = (event: SSEClientEvent) => void

interface HypnotizStreamEvent {
  client_id: string
  timestamp: number
  items?: AttentionItem[]
  vehicles?: AttentionItem[]   // backwards-compat alias
  backpressure?: boolean
  mode?: 'realtime' | 'cluster' | 'degraded'
}

// ============================================================================
// Guard: enforce browser-only usage
// ============================================================================

function assertBrowser(caller: string): void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    throw new Error(
      `[VehicleTrafficClient] ${caller}() must be called in the browser. ` +
      `Do not import this module in server-side code or hooks.server.ts.`
    )
  }
}

// ============================================================================
// VehicleTrafficClient
// ============================================================================

export class VehicleTrafficClient {
  private readonly url: string
  private readonly clientId: string
  private readonly regionId: string
  private readonly reconnectDelayBase: number
  private readonly maxReconnectDelay: number
  private readonly connectionTimeoutMs: number

  private sse: EventSource | null = null
  private listeners = new Set<SSEClientListener>()

  private reconnectDelay: number
  private reconnecting = false
  private destroyed = false

  constructor(config: SSEClientConfig) {
    this.url              = config.url.replace(/\/$/, '')
    this.clientId         = config.clientId        ?? generateClientId()
    this.regionId         = config.regionId        ?? 'default'
    this.reconnectDelayBase = config.reconnectDelayMs    ?? 2_000
    this.maxReconnectDelay  = config.maxReconnectDelayMs ?? 30_000
    this.connectionTimeoutMs = config.connectionTimeoutMs ?? 10_000
    this.reconnectDelay   = this.reconnectDelayBase
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Open the SSE stream. Safe to call on component mount.
   * Returns once the connection is open (or throws on timeout).
   */
  connect(): Promise<void> {
    assertBrowser('connect')
    if (this.sse?.readyState === EventSource.OPEN) return Promise.resolve()

    return new Promise<void>((resolve, reject) => {
      const streamUrl = `${this.url}/stream?client_id=${this.clientId}&region_id=${this.regionId}`

      const timeout = setTimeout(() => {
        this.sse?.close()
        reject(new Error('[VehicleTrafficClient] Connection timeout'))
      }, this.connectionTimeoutMs)

      this.sse = new EventSource(streamUrl)

      this.sse.onopen = () => {
        clearTimeout(timeout)
        this.reconnectDelay = this.reconnectDelayBase
        this._emit({ type: 'connected' })
        resolve()
      }

      this.sse.onmessage = (ev) => {
        this._handleMessage(ev.data)
      }

      this.sse.onerror = () => {
        clearTimeout(timeout)
        this._emit({ type: 'error', payload: new Error('SSE connection lost') })
        if (!this.destroyed) this._scheduleReconnect()
        // reject only if we never opened
        if (this.sse?.readyState !== EventSource.OPEN) {
          reject(new Error('[VehicleTrafficClient] SSE failed to connect'))
        }
      }
    })
  }

  /**
   * POST /subscribe — call after connect() and on every viewport change.
   */
  async subscribe(context: ClientContext): Promise<void> {
    assertBrowser('subscribe')
    await fetch(
      `${this.url}/subscribe?client_id=${this.clientId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': this.clientId,
          'X-Region-ID': this.regionId,
        },
        body: JSON.stringify({
          viewport: {
            min_lat: context.viewport.minLat,
            max_lat: context.viewport.maxLat,
            min_lon: context.viewport.minLng,
            max_lon: context.viewport.maxLng,
          },
          focus:       context.center,
          preferences: {
            anomaly_priority:  context.policy.includeAnomalies,
            include_clusters:  true,
          },
          max_results: context.budget.total,
          region_id:   this.regionId,
        }),
      }
    )
  }

  /**
   * Register a listener. Returns an unsubscribe function.
   */
  on(listener: SSEClientListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Close the SSE stream and stop reconnecting.
   * Call on component destroy.
   */
  destroy(): void {
    this.destroyed = true
    this.sse?.close()
    this.sse = null
    this.listeners.clear()
    this._emit({ type: 'disconnected' })
  }

  get id(): string { return this.clientId }

  // ==========================================================================
  // Internals
  // ==========================================================================

  private _handleMessage(raw: string): void {
    let event: HypnotizStreamEvent
    try {
      event = JSON.parse(raw)
    } catch {
      console.warn('[VehicleTrafficClient] Unparseable SSE message')
      return
    }

    this._emit({ type: 'raw', payload: event })

    if (event.backpressure !== undefined) {
      this._emit({ type: 'backpressure', payload: !!event.backpressure })
    }

    const items: AttentionItem[] = event.items ?? event.vehicles ?? []
    if (items.length === 0) return

    const response: SirtebasinResponse = {
      ts:    event.timestamp,
      items,
    }
    this._emit({ type: 'update', payload: response })
  }

  private _emit(event: SSEClientEvent): void {
    this.listeners.forEach(fn => {
      try { fn(event) } catch (err) {
        console.error('[VehicleTrafficClient] Listener error:', err)
      }
    })
  }

  private _scheduleReconnect(): void {
    if (this.reconnecting || this.destroyed) return
    this.reconnecting = true

    const delay = this.reconnectDelay + Math.random() * 500
    console.warn(`[VehicleTrafficClient] Reconnecting in ${Math.round(delay)}ms`)

    setTimeout(async () => {
      if (this.destroyed) return
      try {
        this.sse?.close()
        this.sse = null
        await this.connect()
        this.reconnectDelay = this.reconnectDelayBase
      } catch {
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          this.maxReconnectDelay
        )
      } finally {
        this.reconnecting = false
      }
    }, delay)
  }
}

// ============================================================================
// Singleton (optional — one per app)
// ============================================================================

let _instance: VehicleTrafficClient | null = null

export function getVehicleTrafficClient(config?: SSEClientConfig): VehicleTrafficClient {
  if (!_instance) {
    if (!config) throw new Error('[VehicleTrafficClient] Config required for first call')
    _instance = new VehicleTrafficClient(config)
  }
  return _instance
}

export function destroyVehicleTrafficClient(): void {
  _instance?.destroy()
  _instance = null
}

// ============================================================================
// Util
// ============================================================================

function generateClientId(): string {
  return `vc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
}