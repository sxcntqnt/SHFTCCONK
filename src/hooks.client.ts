// src/hooks.client.ts

import type { HandleClientError } from "@sveltejs/kit"
import { browser } from "$app/environment"
import { PUBLIC_POSTHOG_KEY } from "$env/static/public"

/* ============================================================
   LAZY SINGLETONS
============================================================ */

let posthogClient: any = null
let sentryReady = false

/* ============================================================
   POSTHOG LAZY INIT
============================================================ */

async function getPosthog() {
  if (!browser) return null
  if (posthogClient) return posthogClient

  try {
    const mod = await import("posthog-js")
    const posthog = mod.default

    posthog.init(PUBLIC_POSTHOG_KEY, {
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      defaults: "2026-01-30",
      capture_exceptions: false, // we'll handle manually
    })

    posthogClient = posthog
    return posthog
  } catch (err) {
    console.error("PostHog failed to load:", err)
    return null
  }
}

/* ============================================================
   SENTRY LAZY INIT
============================================================ */

async function initSentry() {
  if (!browser || sentryReady) return

  try {
    const Sentry = await import("@sentry/sveltekit")

    Sentry.init({
      dsn: "https://939d30ef131c9c0d5ead2c2364017ae0@o4510964210073600.ingest.de.sentry.io/4510964215054416",

      tracesSampleRate: 0.2, // reduce noise in prod
      enableLogs: true,

      // 🚫 no replay here (lazy later if needed)
      sendDefaultPii: false, // safer default
    })

    sentryReady = true
  } catch (err) {
    console.error("Sentry failed to init:", err)
  }
}

/* ============================================================
   EAGER BUT SAFE BOOTSTRAP (NON-BLOCKING)
============================================================ */

if (browser) {
  // Fire and forget — don't block app startup
  initSentry()
  getPosthog()
}

/* ============================================================
   UNIFIED ERROR HANDLER
============================================================ */

export const handleError: HandleClientError = async ({
  error,
  status,
  message,
}) => {
  // 🔹 Send to Sentry
  try {
    if (!sentryReady) await initSentry()
    const Sentry = await import("@sentry/sveltekit")
    Sentry.captureException(error)
  } catch (e) {
    console.error("Sentry capture failed:", e)
  }

  // 🔹 Send to PostHog
  try {
    const posthog = await getPosthog()
    posthog?.captureException?.(error)
  } catch (e) {
    console.error("PostHog capture failed:", e)
  }

  return {
    message:
      error instanceof Error
        ? error.message
        : (message ?? "Unexpected client error"),
    status,
  }
}


// ============================================
// Client-Side Hooks for Map Service
// React/Vue/Svelte compatible TypeScript hooks
// ============================================

import type {
  Coordinates,
  BoundingBox,
  TrafficNode,
  CorridorAnalytics,
  Vehicle,
  H3Cell,
  MapMarker,
  StreamEvent,
  VehicleStreamData,
  TrafficStreamData,
  GeoJSONFeatureCollection,
} from './types'

// ============================================
// Configuration
// ============================================

interface MapClientConfig {
  baseUrl: string
  sseUrl: string
  reconnectDelay?: number
  maxReconnectAttempts?: number
}

// ============================================
// SSE Connection Hook
// ============================================

type SSEStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseSSEStreamOptions {
  bounds?: BoundingBox
  onVehicleUpdate?: (data: VehicleStreamData) => void
  onTrafficUpdate?: (data: TrafficStreamData) => void
  onNodeSaturation?: (data: { nodeId: string; saturation: number }) => void
  onError?: (error: Event) => void
}

interface UseSSEStreamReturn {
  status: SSEStatus
  clientId: string | null
  connect: (options?: UseSSEStreamOptions) => void
  disconnect: () => void
  send: (event: StreamEvent) => void
}

export function useSSEStream(config: MapClientConfig): UseSSEStreamReturn {
  let eventSource: EventSource | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  let currentOptions: UseSSEStreamOptions | null = null

  const state: { status: SSEStatus; clientId: string | null } = {
    status: 'disconnected',
    clientId: null,
  }

  function buildUrl(options?: UseSSEStreamOptions): string {
    const params = new URLSearchParams()
    
    if (state.clientId) {
      params.set('clientId', state.clientId)
    }
    
    if (options?.bounds) {
      params.set(
        'bounds',
        `${options.bounds.southWest.lat},${options.bounds.southWest.lng},${options.bounds.northEast.lat},${options.bounds.northEast.lng}`,
      )
    }

    return `${config.sseUrl}?${params.toString()}`
  }

  function connect(options?: UseSSEStreamOptions): void {
    if (eventSource) {
      eventSource.close()
    }

    currentOptions = options || null
    state.status = 'connecting'

    const url = buildUrl(options)
    eventSource = new EventSource(url)

    eventSource.onopen = () => {
      state.status = 'connected'
      reconnectAttempts = 0
    }

    eventSource.onerror = (error) => {
      state.status = 'error'
      options?.onError?.(error)

      // Auto-reconnect with exponential backoff
      if (reconnectAttempts < (config.maxReconnectAttempts || 10)) {
        const delay = config.reconnectDelay || 2000
        reconnectTimeout = setTimeout(() => {
          reconnectAttempts++
          connect(currentOptions || undefined)
        }, delay * Math.pow(2, reconnectAttempts))
      }
    }

    // Handle specific event types
    eventSource.addEventListener('connected', (event) => {
      try {
        const data = JSON.parse(event.data)
        state.clientId = data.clientId
      } catch {
        // Ignore parse errors
      }
    })

    eventSource.addEventListener('vehicle_update', (event) => {
      try {
        const data = JSON.parse(event.data)
        options?.onVehicleUpdate?.(data.data)
      } catch {
        // Ignore parse errors
      }
    })

    eventSource.addEventListener('traffic_update', (event) => {
      try {
        const data = JSON.parse(event.data)
        options?.onTrafficUpdate?.(data.data)
      } catch {
        // Ignore parse errors
      }
    })

    eventSource.addEventListener('node_saturation', (event) => {
      try {
        const data = JSON.parse(event.data)
        options?.onNodeSaturation?.(data.data)
      } catch {
        // Ignore parse errors
      }
    })

    eventSource.addEventListener('heartbeat', () => {
      // Heartbeat received - connection is alive
    })
  }

  function disconnect(): void {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    if (eventSource) {
      eventSource.close()
      eventSource = null
    }

    state.status = 'disconnected'
    state.clientId = null
  }

  function send(_event: StreamEvent): void {
    // SSE is unidirectional, so we can't send events to the server
    // Use the REST API instead
    console.warn('SSE does not support sending events. Use the REST API.')
  }

  return {
    get status() {
      return state.status
    },
    get clientId() {
      return state.clientId
    },
    connect,
    disconnect,
    send,
  }
}

// ============================================
// REST API Client
// ============================================

class MapAPIClient {
  private baseUrl: string

  constructor(config: MapClientConfig) {
    this.baseUrl = config.baseUrl
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error ${response.status}: ${error}`)
    }

    return response.json()
  }

  // Traffic Nodes
  async getNodes(bounds: BoundingBox): Promise<TrafficNode[]> {
    const response = await this.request<{ data: TrafficNode[] }>(
      `/nodes?bounds=${boundsToString(bounds)}`,
    )
    return response.data
  }

  async getNodeById(id: string): Promise<TrafficNode> {
    return this.request<TrafficNode>(`/nodes/${id}`)
  }

  async getNodeSaturation(
    nodeId: string,
  ): Promise<{ saturation: number; throughput: number }> {
    return this.request(`/nodes/${nodeId}/saturation`)
  }

  // Corridors
  async getCorridors(bounds: BoundingBox): Promise<CorridorAnalytics[]> {
    const response = await this.request<{ data: CorridorAnalytics[] }>(
      `/corridors?bounds=${boundsToString(bounds)}`,
    )
    return response.data
  }

  // Vehicles
  async getVehicles(bounds?: BoundingBox): Promise<Vehicle[]> {
    const url = bounds
      ? `/vehicles?bounds=${boundsToString(bounds)}`
      : '/vehicles'
    const response = await this.request<{ data: Vehicle[] }>(url)
    return response.data
  }

  async getNearestVehicles(
    point: Coordinates,
    options?: { limit?: number; maxDistance?: number },
  ): Promise<(Vehicle & { distance: number; distanceFormatted: string })[]> {
    const params = new URLSearchParams({
      lat: point.lat.toString(),
      lng: point.lng.toString(),
    })
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.maxDistance)
      params.set('maxDistance', options.maxDistance.toString())

    const response = await this.request<{
      data: (Vehicle & { distance: number; distanceFormatted: string })[]
    }>(`/vehicles/nearest?${params.toString()}`)
    return response.data
  }

  // H3 Grid
  async getH3Cells(
    bounds: BoundingBox,
    resolution?: number,
  ): Promise<H3Cell[]> {
    const params = new URLSearchParams({
      bounds: boundsToString(bounds),
    })
    if (resolution) params.set('resolution', resolution.toString())

    const response = await this.request<{ data: H3Cell[] }>(
      `/h3?${params.toString()}`,
    )
    return response.data
  }

  // Markers
  async getMarkers(bounds?: BoundingBox): Promise<MapMarker[]> {
    const url = bounds
      ? `/markers?bounds=${boundsToString(bounds)}`
      : '/markers'
    const response = await this.request<{ data: MapMarker[] }>(url)
    return response.data
  }

  async getNearbyMarkers(
    point: Coordinates,
    radius?: number,
  ): Promise<(MapMarker & { distance: number; distanceFormatted: string })[]> {
    const params = new URLSearchParams({
      lat: point.lat.toString(),
      lng: point.lng.toString(),
    })
    if (radius) params.set('radius', radius.toString())

    const response = await this.request<{
      data: (MapMarker & { distance: number; distanceFormatted: string })[]
    }>(`/markers/nearby?${params.toString()}`)
    return response.data
  }

  // GeoJSON Export
  async exportGeoJSON(bounds?: BoundingBox): Promise<GeoJSONFeatureCollection> {
    const url = bounds
      ? `/export/geojson?bounds=${boundsToString(bounds)}`
      : '/export/geojson'
    return this.request<GeoJSONFeatureCollection>(url)
  }

  async exportH3GeoJSON(
    bounds?: BoundingBox,
  ): Promise<GeoJSONFeatureCollection> {
    const url = bounds
      ? `/export/h3?bounds=${boundsToString(bounds)}`
      : '/export/h3'
    return this.request<GeoJSONFeatureCollection>(url)
  }

  // Site Simulation
  async simulateSiteImpact(
    point: Coordinates,
    radius?: number,
  ): Promise<{
    dailyCommuters: number
    peakHourVolume: number
    vehiclePassThrough: number
    saturationLevel: number
    recommendations: string[]
  }> {
    return this.request('/simulate/site-impact', {
      method: 'POST',
      body: JSON.stringify({ lat: point.lat, lng: point.lng, radius }),
    })
  }

  // Health
  async getHealth(): Promise<{
    healthy: boolean
    postgis: boolean
    sse: { clients: number }
    uptime: number
  }> {
    return this.request('/health')
  }
}

// ============================================
// Client Factory
// ============================================

let apiClient: MapAPIClient | null = null
let sseStreamHook: ReturnType<typeof useSSEStream> | null = null

export function createMapClient(config: MapClientConfig): {
  api: MapAPIClient
  sse: ReturnType<typeof useSSEStream>
} {
  apiClient = new MapAPIClient(config)
  sseStreamHook = useSSEStream(config)

  return {
    api: apiClient,
    sse: sseStreamHook,
  }
}

export function getMapClient(): MapAPIClient | null {
  return apiClient
}

// ============================================
// Helper Functions
// ============================================

function boundsToString(bounds: BoundingBox): string {
  return `${bounds.southWest.lat},${bounds.southWest.lng},${bounds.northEast.lat},${bounds.northEast.lng}`
}

// ============================================
// React Hooks (if using React)
// ============================================

export interface UseMapDataOptions {
  bounds?: BoundingBox
  autoRefresh?: boolean
  refreshInterval?: number
}

export interface UseMapDataReturn {
  nodes: TrafficNode[]
  vehicles: Vehicle[]
  corridors: CorridorAnalytics[]
  markers: MapMarker[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useMapData(
  api: MapAPIClient,
  options?: UseMapDataOptions,
): UseMapDataReturn {
  const [nodes, setNodes] = useState<TrafficNode[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [corridors, setCorridors] = useState<CorridorAnalytics[]>([])
  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!options?.bounds) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [nodesData, vehiclesData, corridorsData, markersData] =
        await Promise.all([
          api.getNodes(options.bounds),
          api.getVehicles(options.bounds),
          api.getCorridors(options.bounds),
          api.getMarkers(options.bounds),
        ])

      setNodes(nodesData)
      setVehicles(vehiclesData)
      setCorridors(corridorsData)
      setMarkers(markersData)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [api, options?.bounds])

  useEffect(() => {
    fetchData()

    if (options?.autoRefresh) {
      const interval = setInterval(
        fetchData,
        options.refreshInterval || 30000,
      )
      return () => clearInterval(interval)
    }
  }, [fetchData, options?.autoRefresh, options?.refreshInterval])

  return {
    nodes,
    vehicles,
    corridors,
    markers,
    loading,
    error,
    refetch: fetchData,
  }
}

// ============================================
// Re-export utilities
// ============================================

export { distanceBetween, createBoundingBox, sortMarkersByDistance } from './utils/distance'

// ============================================
// Placeholder imports (replace with actual React imports)
// ============================================

function useState<T>(initial: T): [T, (value: T) => void] {
  let value = initial
  const setValue = (_value: T) => {
    value = _value
  }
  return [value, setValue]
}

function useEffect(_callback: () => void | (() => void), _deps?: unknown[]): void {
  // This is a placeholder - in real React, you'd use the actual useEffect
}

function useCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  _deps: unknown[],
): T {
  return callback
}
