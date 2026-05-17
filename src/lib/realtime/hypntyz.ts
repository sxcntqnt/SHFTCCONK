/**
 * hypntyz.ts — Sirtebasin Brain Layer v3
 *
 * Unified Attention Kernel for vehicle + cluster scoring.
 *
 * Core design:
 *   - Single scoring surface (vehicles + clusters share comparable scores)
 *   - Allocation consumes pre-scored items (no double evaluation)
 *   - Anomaly is a scoring feature, not a separate priority system
 *   - Pure packer allocation with zero domain logic leaking into scoring
 */

// ============================================================================
// 1. Core Types
// ============================================================================

export type BoundingBox = {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export type VehicleEvent = {
  id:      string
  lat:     number
  lng:     number
  speed:   number
  heading: number
  ts:      number
}

export type AttentionBudget = {
  total: number
  reserved: {
    anomalies: number
    clusters:  number
  }
}

export type ClientContext = {
  viewport: BoundingBox
  center:   { lat: number; lng: number }
  zoom:     number
  budget:   AttentionBudget
  policy: {
    includeAnomalies: boolean
    includeHighSpeed: boolean
  }
}

export type VehicleState = {
  id:              string
  lat:             number
  lng:             number
  speed:           number
  heading:         number
  velocityVector?: { vx: number; vy: number }
  anomalyScore:    number   // 0..1, computed during ingestion
  lastSeen:        number
}

export type Cluster = {
  id:           string
  center:       { lat: number; lng: number }
  count:        number
  avgSpeed:     number
  anomalyScore: number      // max anomaly among members
  members:      string[]
  bounds:       BoundingBox
}

export type AttentionItem = {
  kind:      'vehicle' | 'cluster'
  id:        string
  lat:       number
  lng:       number
  score:     number         // final comparable score (0..1)
  speed?:    number
  heading?:  number
  count?:    number
}

export type SirtebasinResponse = {
  ts:    number
  items: AttentionItem[]
}

// ============================================================================
// 2. Spatial Index
// ============================================================================

export interface SpatialIndex {
  insert(id: string, lat: number, lng: number): void
  update(id: string, lat: number, lng: number): void
  query(bounds: BoundingBox): string[]
}

/**
 * Grid-based spatial index.
 *
 * Divides space into cells of `cellSizeDegrees` × `cellSizeDegrees`.
 * Each vehicle maps to exactly one cell. Querying a bounding box
 * enumerates all overlapping cells in O(cells_in_bbox) time.
 *
 * Performance characteristics:
 *   insert / update: O(1)
 *   query:           O(cells_in_viewport + hits)
 *
 * At cellSizeDegrees = 0.01 (~1.1km at equator) a city viewport
 * typically covers 50–200 cells, each holding a handful of vehicles.
 */
export class GridIndex implements SpatialIndex {
  private readonly cellSize: number
  // cell key → set of vehicle ids
  private cells = new Map<string, Set<string>>()
  // vehicle id → current cell key (for fast remove on update)
  private vehicleCell = new Map<string, string>()

  constructor(cellSizeDegrees = 0.01) {
    this.cellSize = cellSizeDegrees
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private cellKey(lat: number, lng: number): string {
    const row = Math.floor(lat / this.cellSize)
    const col = Math.floor(lng / this.cellSize)
    return `${row},${col}`
  }

  private getOrCreate(key: string): Set<string> {
    let cell = this.cells.get(key)
    if (!cell) {
      cell = new Set()
      this.cells.set(key, cell)
    }
    return cell
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  insert(id: string, lat: number, lng: number): void {
    const key = this.cellKey(lat, lng)
    this.getOrCreate(key).add(id)
    this.vehicleCell.set(id, key)
  }

  update(id: string, lat: number, lng: number): void {
    const newKey = this.cellKey(lat, lng)
    const oldKey = this.vehicleCell.get(id)

    if (oldKey && oldKey !== newKey) {
      // Remove from old cell
      const oldCell = this.cells.get(oldKey)
      if (oldCell) {
        oldCell.delete(id)
        if (oldCell.size === 0) this.cells.delete(oldKey)
      }
    }

    this.getOrCreate(newKey).add(id)
    this.vehicleCell.set(id, newKey)
  }

  remove(id: string): void {
    const key = this.vehicleCell.get(id)
    if (!key) return
    const cell = this.cells.get(key)
    if (cell) {
      cell.delete(id)
      if (cell.size === 0) this.cells.delete(key)
    }
    this.vehicleCell.delete(id)
  }

  query(bounds: BoundingBox): string[] {
    // Enumerate all grid cells that overlap the bounding box
    const minRow = Math.floor(bounds.minLat / this.cellSize)
    const maxRow = Math.floor(bounds.maxLat / this.cellSize)
    const minCol = Math.floor(bounds.minLng / this.cellSize)
    const maxCol = Math.floor(bounds.maxLng / this.cellSize)

    const result: string[] = []

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cell = this.cells.get(`${row},${col}`)
        if (cell) {
          for (const id of cell) result.push(id)
        }
      }
    }

    return result
  }

  /** Total vehicles tracked. */
  get size(): number {
    return this.vehicleCell.size
  }
}

// ============================================================================
// 3. Clustering Helper (pure function)
// ============================================================================

export function clusterVehicles(
  vehicles: VehicleState[],
  cellSizeDegrees = 0.005,
): Cluster[] {
  const cells = new Map<string, VehicleState[]>()

  for (const v of vehicles) {
    const x   = Math.floor(v.lng / cellSizeDegrees)
    const y   = Math.floor(v.lat / cellSizeDegrees)
    const key = `${x},${y}`
    if (!cells.has(key)) cells.set(key, [])
    cells.get(key)!.push(v)
  }

  const clusters: Cluster[] = []

  for (const [key, members] of cells.entries()) {
    if (members.length < 2) continue   // only form clusters with ≥2 vehicles

    const lats = members.map(m => m.lat)
    const lngs = members.map(m => m.lng)

    const center = {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
    }

    clusters.push({
      id:           key,
      center,
      count:        members.length,
      avgSpeed:     members.reduce((sum, m) => sum + m.speed, 0) / members.length,
      anomalyScore: Math.max(...members.map(m => m.anomalyScore)),
      members:      members.map(m => m.id),
      bounds: {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs),
      },
    })
  }

  return clusters
}

// ============================================================================
// 4. Unified Scoring Model (pure, stateless)
// ============================================================================

function isInside(lat: number, lng: number, bbox: BoundingBox): boolean {
  return (
    lat >= bbox.minLat && lat <= bbox.maxLat &&
    lng >= bbox.minLng && lng <= bbox.maxLng
  )
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R  = 6_371_000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a  =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function contextualBoost(
  lat: number,
  lng: number,
  ctx: ClientContext,
): number {
  let boost = 0
  if (isInside(lat, lng, ctx.viewport)) boost += 0.35
  const dist = haversineDistance(lat, lng, ctx.center.lat, ctx.center.lng)
  if (dist < 500)       boost += 0.15
  else if (dist < 1500) boost += 0.075
  return boost
}

function scoreVehicle(v: VehicleState, ctx: ClientContext): number {
  const speedFactor   = v.speed > 60 ? 1.0 : v.speed > 30 ? 0.6 : 0.3
  const anomalyFactor = v.anomalyScore
  let   base          = 0.5 * speedFactor + 0.5 * anomalyFactor

  if (!ctx.policy.includeAnomalies && v.anomalyScore > 0.7) base *= 0.7
  if (!ctx.policy.includeHighSpeed && v.speed > 80)         base *= 0.5

  return Math.min(1.0, Math.max(0.0, base + contextualBoost(v.lat, v.lng, ctx)))
}

function scoreCluster(c: Cluster, ctx: ClientContext): number {
  let base = c.anomalyScore + 0.07 * Math.log(c.count + 1)
  base     = Math.min(0.9, base)   // cap so clusters don't always outrank vehicles

  if (!ctx.policy.includeAnomalies && c.anomalyScore > 0.7) base *= 0.7

  return Math.min(
    1.0,
    Math.max(0.0, base + contextualBoost(c.center.lat, c.center.lng, ctx)),
  )
}

// ============================================================================
// 5. Pure Attention Allocator
// ============================================================================

function allocateAttention(
  items:  AttentionItem[],
  budget: AttentionBudget,
): AttentionItem[] {
  if (items.length === 0) return []

  const anomalies = items.filter(i => i.score > 0.7)
  const clusters  = items.filter(i => i.kind === 'cluster' && i.score <= 0.7)
  const vehicles  = items.filter(i => i.kind === 'vehicle' && i.score <= 0.7)

  const result: AttentionItem[] = []

  // 1. Reserved anomaly slots
  const anomalyTake = Math.min(budget.reserved.anomalies, anomalies.length)
  result.push(
    ...anomalies.sort((a, b) => b.score - a.score).slice(0, anomalyTake),
  )

  // 2. Reserved cluster slots
  const clusterTake = Math.min(budget.reserved.clusters, clusters.length)
  result.push(
    ...clusters.sort((a, b) => b.score - a.score).slice(0, clusterTake),
  )

  // 3. Fill remaining with best of everything left
  const remaining = budget.total - result.length
  if (remaining > 0) {
    const leftovers = [
      ...vehicles,
      ...clusters.slice(clusterTake),
      ...anomalies.slice(anomalyTake),
    ]
    result.push(
      ...leftovers.sort((a, b) => b.score - a.score).slice(0, remaining),
    )
  }

  // Final deterministic sort: score desc, clusters before vehicles on ties, then id
  return result.sort((a, b) => {
    const scoreDiff = b.score - a.score
    if (Math.abs(scoreDiff) > 1e-6) return scoreDiff
    if (a.kind !== b.kind) return a.kind === 'cluster' ? -1 : 1
    return a.id.localeCompare(b.id)
  })
}

// ============================================================================
// 6. SirtebasinBrainV3
// ============================================================================

export class SirtebasinBrainV3 {
  private state:         Map<string, VehicleState> = new Map()
  private spatialIndex:  SpatialIndex

  constructor(spatialIndex?: SpatialIndex) {
    this.spatialIndex = spatialIndex ?? new GridIndex(0.01)
  }

  // --------------------------------------------------------------------------
  // Ingestion
  // --------------------------------------------------------------------------

  ingest(events: VehicleEvent[]): void {
    for (const e of events) {
      const prev    = this.state.get(e.id)
      const anomaly = this._computeAnomaly(e, prev)
      const velocity = this._computeVelocity(e, prev)

      const updated: VehicleState = {
        id:             e.id,
        lat:            e.lat,
        lng:            e.lng,
        speed:          e.speed,
        heading:        e.heading,
        anomalyScore:   anomaly,
        velocityVector: velocity,
        lastSeen:       e.ts,
      }

      this.state.set(e.id, updated)
      this.spatialIndex.update(e.id, e.lat, e.lng)
    }
  }

  private _computeAnomaly(current: VehicleEvent, prev?: VehicleState): number {
    if (!prev) return 0

    const dt = (current.ts - prev.lastSeen) / 1000
    if (dt <= 0) return 0

    const speedChange  = Math.abs(current.speed - prev.speed)
    const speedAnomaly = Math.min(1.0, speedChange / 30.0)

    let headingAnomaly = 0
    if (dt < 5) {
      let delta = Math.abs(current.heading - prev.heading)
      if (delta > 180) delta = 360 - delta
      headingAnomaly = Math.min(1.0, delta / 90.0)
    }

    return (speedAnomaly + headingAnomaly) / 2
  }

  private _computeVelocity(
    current: VehicleEvent,
    prev?: VehicleState,
  ): { vx: number; vy: number } | undefined {
    if (!prev) return undefined
    const dtHours = (current.ts - prev.lastSeen) / (1000 * 3600)
    if (dtHours <= 0) return undefined
    return {
      vx: (current.lng - prev.lng) / dtHours,
      vy: (current.lat - prev.lat) / dtHours,
    }
  }

  // --------------------------------------------------------------------------
  // Candidate selection — viewport + small expansion buffer
  // --------------------------------------------------------------------------

  private _getCandidates(ctx: ClientContext, expandDegrees = 0.02): VehicleState[] {
    const expanded: BoundingBox = {
      minLat: ctx.viewport.minLat - expandDegrees,
      maxLat: ctx.viewport.maxLat + expandDegrees,
      minLng: ctx.viewport.minLng - expandDegrees,
      maxLng: ctx.viewport.maxLng + expandDegrees,
    }

    const ids = this.spatialIndex.query(expanded)
    const vehicles: VehicleState[] = []

    for (const id of ids) {
      const v = this.state.get(id)
      if (v) vehicles.push(v)
    }

    return vehicles
  }

  // --------------------------------------------------------------------------
  // Main select — clean pipeline
  // --------------------------------------------------------------------------

  select(ctx: ClientContext): SirtebasinResponse {
    // 1. Spatial candidates
    const candidates = this._getCandidates(ctx)

    // 2. Score vehicles → AttentionItems (discard below threshold)
    const SCORE_THRESHOLD = 0.35
    const vehicleItems: AttentionItem[] = []

    for (const v of candidates) {
      const score = scoreVehicle(v, ctx)
      if (score > SCORE_THRESHOLD) {
        vehicleItems.push({
          kind:    'vehicle',
          id:      v.id,
          lat:     v.lat,
          lng:     v.lng,
          score,
          speed:   v.speed,
          heading: v.heading,
        })
      }
    }

    // 3. Cluster from candidates that passed the threshold
    const passedCandidates = candidates.filter(
      v => scoreVehicle(v, ctx) > SCORE_THRESHOLD,
    )
    const clusters = clusterVehicles(passedCandidates, 0.005)

    // 4. Score clusters → AttentionItems
    const clusterItems: AttentionItem[] = clusters.map(c => ({
      kind:  'cluster',
      id:    c.id,
      lat:   c.center.lat,
      lng:   c.center.lng,
      score: scoreCluster(c, ctx),
      count: c.count,
    }))

    // 5. Allocate
    const allocated = allocateAttention(
      [...vehicleItems, ...clusterItems],
      ctx.budget,
    )

    return { ts: Date.now(), items: allocated }
  }

  // --------------------------------------------------------------------------
  // Diagnostics
  // --------------------------------------------------------------------------

  getVehicleState(id: string): VehicleState | undefined {
    return this.state.get(id)
  }

  /** Total vehicles currently tracked in the brain. */
  get trackedCount(): number {
    return this.state.size
  }

  /** Evict vehicles not seen since `olderThanMs` ago. */
  evictStale(olderThanMs = 60_000): number {
    const cutoff = Date.now() - olderThanMs
    let evicted  = 0

    for (const [id, v] of this.state.entries()) {
      if (v.lastSeen < cutoff) {
        this.state.delete(id)
        ;(this.spatialIndex as GridIndex).remove?.(id)
        evicted++
      }
    }

    return evicted
  }

// ============================================================================
// 7. Example usage (same as before)
// ============================================================================
/*
import { SirtebasinBrainV3, ClientContext } from './sirtebasin-brain-v3';

const brain = new SirtebasinBrainV3();

brain.ingest([{ id: 'v1', lat: 32.1, lng: 20.2, speed: 75, heading: 90, ts: Date.now() }]);

const ctx: ClientContext = {
  viewport: { minLat: 32.0, maxLat: 32.5, minLng: 20.0, maxLng: 20.8 },
  center: { lat: 32.25, lng: 20.4 },
  zoom: 12,
  budget: { total: 50, reserved: { anomalies: 5, clusters: 10 } },
  policy: { includeAnomalies: true, includeHighSpeed: true }
};

const response = brain.select(ctx);
console.log(response.items);
*/