// ── Core geo primitives ──────────────────────────────────────────────────────

export interface Coordinates {
  lat: number
  lng: number
}

// ── Map viewport ──────────────────────────────────────────────────────────────

export interface MapState {
  center:          Coordinates
  zoom:            number
  layers:          MapLayer[]
  selectedMarker?: MapMarker
}

// ── Layer (legacy marker-group system) ────────────────────────────────────────

export interface MapLayer {
  id:      string
  name:    string
  visible: boolean
  markers: MapMarker[]
  /** Optional MapLibre layer type hint for rendering */
  type?:   "symbol" | "circle" | "fill" | "line"
}

// ── Geofence ──────────────────────────────────────────────────────────────────

export interface Geofence {
  id:     string
  name:   string
  /**
   * Single coord = point marker.
   * 3+ coords    = polygon (ring is auto-closed by the store's GeoJSON derived).
   */
  coords: Coordinates[]
}

// ── Route overlay ─────────────────────────────────────────────────────────────

export interface MapRoute {
  id:       string
  path:     Coordinates[]
  color?:   string
  /** Line weight in pixels. Default: 4 */
  weight?:  number
  /** 0–1. Default: 0.8 */
  opacity?: number
}

// ── Map marker (custom HTML icon) ─────────────────────────────────────────────

export interface MapMarker {
  id:          string
  coordinates: Coordinates
  iconUrl:     string
  label:       string
  /** Optional popup body text; falls back to label */
  popup?:      string
  /** Arbitrary metadata for filtering / tooltips */
  meta?:       Record<string, unknown>
}

// ── Draw tool ─────────────────────────────────────────────────────────────────

export type DrawShape = "polygon" | "rectangle" | "marker"

// ── DuckDB H3 tile layer config ───────────────────────────────────────────────

export interface DuckDBLayerConfig {
  /**
   * Full URL to the Parquet file served via nginx / CDN.
   * e.g. "https://data.example.com/nairobi_h3.parquet"
   */
  parquetUrl:     string
  sourceId?:      string  // Default: "duckdb-h3"
  fillLayerId?:   string  // Default: "h3-fill"
  strokeLayerId?: string  // Default: "h3-stroke"
  fillColor?:     string  // Default: "#f26522"
  fillOpacity?:   number  // Default: 0.25
  strokeColor?:   string  // Default: "#f26522"
}