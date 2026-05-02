// ── Core geo primitives ──────────────────────────────────────────────────────

export interface Coordinates {
  lat: number
  lng: number
}

// ── Map viewport ──────────────────────────────────────────────────────────────

export interface MapState {
  center: Coordinates
  zoom: number
  layers: MapLayer[]
  selectedMarker?: MapMarker
}

// ── Layer (legacy marker-group system) ────────────────────────────────────────

export interface MapLayer {
  id: string
  name: string
  visible: boolean
  markers: MapMarker[]
  /** Optional MapLibre layer type hint for rendering */
  type?: "symbol" | "circle" | "fill" | "line"
}

// ── Geofence ──────────────────────────────────────────────────────────────────

export interface Geofence {
  id: string
  name: string
  /**
   * Single coord = point marker.
   * 3+ coords    = polygon (ring is auto-closed by the store's GeoJSON derived).
   */
  coords: Coordinates[]
}

// ── Route overlay ─────────────────────────────────────────────────────────────

export interface MapRoute {
  id: string
  path: Coordinates[]
  color?: string
  /** Line weight in pixels. Default: 4 */
  weight?: number
  /** 0–1. Default: 0.8 */
  opacity?: number
}

// ── Map marker (custom HTML icon) ─────────────────────────────────────────────

export interface MapMarker {
  id: string
  coordinates: Coordinates
  iconUrl: string
  label: string
  /** Optional popup body text; falls back to label */
  popup?: string
  /** Arbitrary metadata for filtering / tooltips */
  meta?: Record<string, unknown>
}

// ── Draw tool ─────────────────────────────────────────────────────────────────

export type DrawShape = "polygon" | "rectangle" | "marker"

// ── DuckDB H3 tile layer config ───────────────────────────────────────────────

export interface DuckDBLayerConfig {
  /**
   * Full URL to the Parquet file served via nginx / CDN.
   * e.g. "https://data.example.com/nairobi_h3.parquet"
   */
  parquetUrl: string
  sourceId?: string // Default: "duckdb-h3"
  fillLayerId?: string // Default: "h3-fill"
  strokeLayerId?: string // Default: "h3-stroke"
  fillColor?: string // Default: "#f26522"
  fillOpacity?: number // Default: 0.25
  strokeColor?: string // Default: "#f26522"
}

// ============================================
// Core Coordinate & Geometry Types
// ============================================
// in MapTypes.ts
export interface MapServiceConfig {
  upstream: { baseUrl: string; timeout: number }
  hypnotiz?: { url?: string; regionId?: string }   // ← add this
}

export interface CityBootstrapManifestMessage {
  type: "BOOTSTRAP_MANIFEST";
  manifest: CityBootstrapManifest;
}

export interface Coordinates {
  lat: number
  lng: number
}

export interface BoundingBox {
  northEast: Coordinates
  southWest: Coordinates
}

// ============================================
// Map Marker Types
// ============================================

export interface MapMarker {
  id: string
  position: Coordinates
  label?: string
  color?: string
  icon?: string
  metadata?: Record<string, unknown>
  createdAt?: Date
  updatedAt?: Date
}

export interface MarkerCluster {
  id: string
  center: Coordinates
  bounds: BoundingBox
  count: number
  markers: MapMarker[]
}

// ============================================
// H3 Grid Types (from Uber's H3 library)
// ============================================

export interface H3Cell {
  cellId: string
  resolution: number
  boundary: Coordinates[]
  center: Coordinates
  properties?: Record<string, unknown>
}

export interface H3Metrics {
  cellId: string
  commuterThroughput: number
  averageDwellTime: number // seconds
  transferVelocity: number // passengers per minute
  walkingToWaitingRatio: number
  nodeSaturation: number // 0-1 scale
}

// ============================================
// Traffic Data Types
// ============================================

export interface TrafficNode {
  id: string
  name: string
  position: Coordinates
  type: 'terminus' | 'interchange' | 'staging_point'
  metrics: {
    passengerThroughput: number
    averageDwellTime: number
    peakHour: string // "HH:MM"
    saturationLevel: number // 0-1
  }
  connectedRoutes: string[]
}

export interface CorridorAnalytics {
  id: string
  name: string
  startNode: string
  endNode: string
  geometry: Coordinates[]
  metrics: {
    fuelBurnRate: number // liters per km
    idlingHotspotScore: number // 0-100
    vehicleStressIndex: number // 0-100
    averageSpeed: number // km/h
    peakFlowTime: string
  }
}

export interface RouteSegment {
  id: string
  routeId: string
  startPoint: Coordinates
  endPoint: Coordinates
  distance: number // meters
  duration: number // seconds
  geometry: Coordinates[]
}

// ============================================
// Fleet & Reservation Types
// ============================================

export interface Vehicle {
  id: string
  saccoId: string
  saccoName: string
  plateNumber: string
  capacity: number
  currentPosition: Coordinates
  heading: number // degrees
  speed: number // km/h
  status: 'active' | 'idle' | 'maintenance' | 'reserved'
  lastUpdated: Date
}

export interface FleetReservation {
  id: string
  organizationId: string
  organizationName: string
  routeId: string
  routeName: string
  vehicleId: string
  vehiclePlate: string
  scheduledStart: Date
  scheduledEnd: Date
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  passengerCount: number
  pickupPoint: Coordinates
  dropoffPoint: Coordinates
  createdAt: Date
}

export interface SeatBlock {
  id: string
  reservationId: string
  seatCount: number
  routeId: string
  validFrom: Date
  validTo: Date
  assignedEmployees: string[]
}

// ============================================
// Event Types for SSE Streaming
// ============================================

export type StreamEventType =
  | 'vehicle_update'
  | 'traffic_update'
  | 'reservation_update'
  | 'node_saturation'
  | 'corridor_alert'
  | 'heartbeat'
  | 'error'
  | 'connected'

export interface StreamEvent<T = unknown> {
  type: StreamEventType
  timestamp: string
  data: T
  metadata?: {
    source?: string
    requestId?: string
    retry?: number
  }
}

export interface VehicleStreamData {
  vehicles: Vehicle[]
  bounds: BoundingBox
}

export interface TrafficStreamData {
  nodes: TrafficNode[]
  corridors: CorridorAnalytics[]
  updatedAt: string
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon'
    coordinates: number[] | number[][] | number[][][]
  }
  properties: Record<string, unknown>
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

// ============================================
// Filter & Query Types
// ============================================

export interface MapQueryFilters {
  bounds?: BoundingBox
  center?: Coordinates
  radius?: number // meters
  nodeTypes?: TrafficNode['type'][]
  minSaturation?: number
  maxSaturation?: number
  routeIds?: string[]
  saccoIds?: string[]
  includeMetrics?: boolean
}

export interface H3QueryFilters extends MapQueryFilters {
  resolution?: number // 0-15, default 7 for neighborhood level
  metrics?: H3Metrics['cellId'][]
}

// ============================================
// Configuration Types
// ============================================

export interface MapServiceConfig {
  postgis: {
    host: string
    port: number
    database: string
    user: string
    password: string
    poolSize: number
  }
  sse: {
    heartbeatInterval: number // ms
    reconnectDelay: number // ms
    maxConnections: number
  }
  upstream: {
    baseUrl: string
    timeout: number // ms
    retryAttempts: number
  }
  h3: {
    defaultResolution: number
  }
}
