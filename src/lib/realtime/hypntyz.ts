/**
 * Sirtebasin Brain Layer v2 – Attention Kernel
 *
 * A pure real-time attention filter + ranking + packing engine.
 * No I/O, no persistence, no external dependencies.
 *
 * Core pipeline:
 *   1. getCandidates  → what could possibly matter (viewport + expansion)
 *   2. score          → deterministic importance (stateless, cacheable)
 *   3. allocate       → pack limited attention slots with items (vehicles/clusters)
 */

// ============================================================================
// 1. Core Types
// ============================================================================

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type VehicleEvent = {
  id: string;
  lat: number;
  lng: number;
  speed: number;   // km/h
  heading: number; // degrees 0-360
  ts: number;      // epoch ms
};

/**
 * Attention budget contract – deterministic packing limits.
 */
export type AttentionBudget = {
  total: number;           // max items (vehicles + clusters together)
  reserved: {
    anomalies: number;     // guaranteed slots for high-anomaly items
    clusters: number;      // guaranteed slots for cluster representatives
  };
};

export type ClientContext = {
  viewport: BoundingBox;
  center: { lat: number; lng: number };
  zoom: number;
  budget: AttentionBudget;
  policy: {
    includeAnomalies: boolean;
    includeHighSpeed: boolean;
    includeTypes?: string[];
  };
};

export type VehicleState = {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  velocityVector?: { vx: number; vy: number };
  anomalyScore: number;   // 0..1
  lastSeen: number;
};

// Internal union type for attention items (clusters + vehicles)
export type AttentionItem =
  | { kind: 'vehicle'; data: VehicleState; score: number }
  | { kind: 'cluster'; data: Cluster; score: number };

export type Cluster = {
  id: string;
  center: { lat: number; lng: number };
  count: number;
  avgSpeed: number;
  anomalyScore: number;   // max anomaly among members
  members: string[];
  bounds: BoundingBox;
};

export type SirtebasinResponse = {
  ts: number;
  items: Array<{
    kind: 'vehicle' | 'cluster';
    id: string;
    lat: number;
    lng: number;
    count?: number;       // for clusters
    speed?: number;       // for vehicles
    heading?: number;     // for vehicles
    score: number;
  }>;
};

// ============================================================================
// 2. Spatial Index Abstraction
// ============================================================================

export interface SpatialIndex {
  insert(id: string, lat: number, lng: number): void;
  update(id: string, lat: number, lng: number): void;
  query(bounds: BoundingBox): string[];
}

export class GridIndex implements SpatialIndex {
  private cellSize: number;
  private grid: Map<string, Set<string>> = new Map();
  private position: Map<string, { lat: number; lng: number }> = new Map();

  constructor(cellSizeDegrees: number = 0.01) {
    this.cellSize = cellSizeDegrees;
  }

  private key(lat: number, lng: number): string {
    const x = Math.floor(lng / this.cellSize);
    const y = Math.floor(lat / this.cellSize);
    return `${x},${y}`;
  }

  insert(id: string, lat: number, lng: number): void {
    const cellKey = this.key(lat, lng);
    if (!this.grid.has(cellKey)) this.grid.set(cellKey, new Set());
    this.grid.get(cellKey)!.add(id);
    this.position.set(id, { lat, lng });
  }

  update(id: string, lat: number, lng: number): void {
    const oldPos = this.position.get(id);
    if (oldPos) {
      const oldKey = this.key(oldPos.lat, oldPos.lng);
      const newKey = this.key(lat, lng);
      if (oldKey !== newKey) {
        this.grid.get(oldKey)?.delete(id);
        if (!this.grid.has(newKey)) this.grid.set(newKey, new Set());
        this.grid.get(newKey)!.add(id);
      }
    } else {
      this.insert(id, lat, lng);
    }
    this.position.set(id, { lat, lng });
  }

  query(bounds: BoundingBox): string[] {
    const minX = Math.floor(bounds.minLng / this.cellSize);
    const maxX = Math.floor(bounds.maxLng / this.cellSize);
    const minY = Math.floor(bounds.minLat / this.cellSize);
    const maxY = Math.floor(bounds.maxLat / this.cellSize);
    const result = new Set<string>();
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const cellKey = `${x},${y}`;
        const cell = this.grid.get(cellKey);
        if (cell) {
          for (const id of cell) result.add(id);
        }
      }
    }
    return Array.from(result);
  }
}

// ============================================================================
// 3. Clustering Helper (pure function)
// ============================================================================

export function clusterVehicles(
  vehicles: VehicleState[],
  cellSizeDegrees: number = 0.005 // ~500m
): Cluster[] {
  const cells = new Map<string, VehicleState[]>();
  for (const v of vehicles) {
    const x = Math.floor(v.lng / cellSizeDegrees);
    const y = Math.floor(v.lat / cellSizeDegrees);
    const key = `${x},${y}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(v);
  }

  const clusters: Cluster[] = [];
  for (const [key, members] of cells.entries()) {
    if (members.length === 0) continue;
    const lats = members.map(m => m.lat);
    const lngs = members.map(m => m.lng);
    const center = {
      lat: lats.reduce((a,b) => a+b, 0) / lats.length,
      lng: lngs.reduce((a,b) => a+b, 0) / lngs.length,
    };
    const avgSpeed = members.reduce((sum, m) => sum + m.speed, 0) / members.length;
    const anomalyScore = Math.max(...members.map(m => m.anomalyScore));
    clusters.push({
      id: key,
      center,
      count: members.length,
      avgSpeed,
      anomalyScore,
      members: members.map(m => m.id),
      bounds: {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs),
      },
    });
  }
  return clusters;
}

// ============================================================================
// 4. Pure Scoring Functions (stateless, cacheable)
// ============================================================================

/**
 * Base score: independent of viewport/center – only vehicle intrinsic properties.
 * This can be cached aggressively.
 */
function baseScore(v: VehicleState): number {
  // Speed factor: 0..1
  const speedFactor = v.speed > 60 ? 1.0 : v.speed > 30 ? 0.6 : 0.3;
  // Anomaly factor (already 0..1)
  const anomalyFactor = v.anomalyScore;
  // Combine: speed and anomaly are important everywhere
  return 0.5 * speedFactor + 0.5 * anomalyFactor;
}

/**
 * Contextual adjustment: depends on viewport, center, zoom, policy.
 * Not cached (or cached with spatial key).
 */
function contextualAdjustment(v: VehicleState, ctx: ClientContext): number {
  let adjustment = 0;

  // Viewport boost (NOT a penalty) – if inside viewport, get a boost; outside → no boost.
  const inside = isInside(v, ctx.viewport);
  if (inside) adjustment += 0.35;

  // Distance to center (focus)
  const distance = haversineDistance(v, ctx.center);
  if (distance < 500) adjustment += 0.15;
  else if (distance < 1500) adjustment += 0.075;

  // Policy overrides (negative adjustments)
  if (!ctx.policy.includeAnomalies && v.anomalyScore > 0.7) {
    adjustment -= 0.2;
  }
  if (!ctx.policy.includeHighSpeed && v.speed > 80) {
    adjustment -= 0.2;
  }

  return Math.max(0, adjustment);
}

function isInside(v: VehicleState, bbox: BoundingBox): boolean {
  return (
    v.lat >= bbox.minLat && v.lat <= bbox.maxLat &&
    v.lng >= bbox.minLng && v.lng <= bbox.maxLng
  );
}

function haversineDistance(v: VehicleState, center: { lat: number; lng: number }): number {
  const R = 6371000;
  const φ1 = (v.lat * Math.PI) / 180;
  const φ2 = (center.lat * Math.PI) / 180;
  const Δφ = ((center.lat - v.lat) * Math.PI) / 180;
  const Δλ = ((center.lng - v.lng) * Math.PI) / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Final score composition
function scoreVehicle(v: VehicleState, ctx: ClientContext): number {
  let score = baseScore(v) + contextualAdjustment(v, ctx);
  return Math.min(1.0, Math.max(0.0, score));
}

// ============================================================================
// 5. Attention Allocator (deterministic packing)
// ============================================================================

/**
 * Allocate attention slots among items (vehicles and clusters) respecting:
 * - reserved anomaly slots
 * - reserved cluster slots
 * - total budget
 * - cluster priority (anomaly-based)
 */
function allocateAttention(
  vehicles: VehicleState[],
  clusters: Cluster[],
  ctx: ClientContext
): AttentionItem[] {
  const budget = ctx.budget;
  const result: AttentionItem[] = [];

  // Score all vehicles and clusters (clusters use max anomaly + average speed proxy)
  const scoredVehicles: AttentionItem[] = vehicles.map(v => ({
    kind: 'vehicle',
    data: v,
    score: scoreVehicle(v, ctx),
  }));
  const scoredClusters: AttentionItem[] = clusters.map(c => ({
    kind: 'cluster',
    data: c,
    // Cluster score: anomaly dominates, count gives slight bonus
    score: Math.min(1.0, c.anomalyScore + 0.1 * Math.log(c.count + 1)),
  }));

  // Separate anomalies (score > 0.7 or anomalyScore > 0.7)
  const isAnomalyVehicle = (item: AttentionItem) =>
    item.kind === 'vehicle' && (item.score > 0.7 || (item.data as VehicleState).anomalyScore > 0.7);
  const isAnomalyCluster = (item: AttentionItem) =>
    item.kind === 'cluster' && (item.score > 0.7 || (item.data as Cluster).anomalyScore > 0.7);
  const isAnomaly = (item: AttentionItem) => isAnomalyVehicle(item) || isAnomalyCluster(item);

  const anomalies = scoredVehicles.filter(isAnomaly).concat(scoredClusters.filter(isAnomaly));
  const normalVehicles = scoredVehicles.filter(i => !isAnomaly(i));
  const normalClusters = scoredClusters.filter(i => !isAnomaly(i));

  // 1. Reserve anomaly slots (take highest-scoring anomalies)
  const anomalyTake = Math.min(budget.reserved.anomalies, anomalies.length);
  const takenAnomalies = anomalies.sort((a,b) => b.score - a.score).slice(0, anomalyTake);
  result.push(...takenAnomalies);

  // 2. Reserve cluster slots (from remaining clusters, normal or anomaly not taken)
  const remainingClusters = [...normalClusters];
  const clusterTake = Math.min(budget.reserved.clusters, remainingClusters.length);
  const takenClusters = remainingClusters.sort((a,b) => b.score - a.score).slice(0, clusterTake);
  result.push(...takenClusters);

  // 3. Fill remaining budget with highest-scoring leftovers (vehicles + clusters)
  const remainingBudget = budget.total - result.length;
  if (remainingBudget > 0) {
    const leftovers = [
      ...normalVehicles,
      ...normalClusters.filter(c => !takenClusters.includes(c)),
      ...anomalies.filter(a => !takenAnomalies.includes(a)),
    ];
    const fill = leftovers.sort((a,b) => b.score - a.score).slice(0, remainingBudget);
    result.push(...fill);
  }

  // Return in score order (descending) for stable output
  return result.sort((a,b) => b.score - a.score);
}

// ============================================================================
// 6. Main Brain Class (Refactored)
// ============================================================================

export class SirtebasinBrainV2 {
  private state: Map<string, VehicleState> = new Map();
  private spatialIndex: SpatialIndex;
  private baseScoreCache = new Map<string, { score: number; ts: number }>();
  private readonly BASE_CACHE_TTL = 500; // ms

  constructor(spatialIndex?: SpatialIndex) {
    this.spatialIndex = spatialIndex ?? new GridIndex(0.01);
  }

  // --------------------------------------------------------------------------
  // Ingestion
  // --------------------------------------------------------------------------
  ingest(events: VehicleEvent[]): void {
    for (const e of events) {
      const prev = this.state.get(e.id);
      const anomaly = this.computeAnomaly(e, prev);
      const velocity = this.computeVelocity(e, prev);
      const updated: VehicleState = {
        id: e.id,
        lat: e.lat,
        lng: e.lng,
        speed: e.speed,
        heading: e.heading,
        anomalyScore: anomaly,
        velocityVector: velocity,
        lastSeen: e.ts,
      };
      this.state.set(e.id, updated);
      this.spatialIndex.update(e.id, e.lat, e.lng);
      // Invalidate base score cache for this vehicle
      this.baseScoreCache.delete(e.id);
    }
  }

  // --------------------------------------------------------------------------
  // Anomaly & velocity helpers (unchanged, simplified)
  // --------------------------------------------------------------------------
  private computeAnomaly(current: VehicleEvent, prev?: VehicleState): number {
    if (!prev) return 0;
    const dt = (current.ts - prev.lastSeen) / 1000;
    if (dt <= 0) return 0;
    const speedChange = Math.abs(current.speed - prev.speed);
    const speedAnomaly = Math.min(1.0, speedChange / 30.0);
    let headingAnomaly = 0;
    if (dt < 5) {
      let headingDelta = Math.abs(current.heading - prev.heading);
      if (headingDelta > 180) headingDelta = 360 - headingDelta;
      headingAnomaly = Math.min(1.0, headingDelta / 90.0);
    }
    return (speedAnomaly + headingAnomaly) / 2;
  }

  private computeVelocity(current: VehicleEvent, prev?: VehicleState): { vx: number; vy: number } | undefined {
    if (!prev) return undefined;
    const dtHours = (current.ts - prev.lastSeen) / (1000 * 3600);
    if (dtHours <= 0) return undefined;
    return {
      vx: (current.lng - prev.lng) / dtHours,
      vy: (current.lat - prev.lat) / dtHours,
    };
  }

  // --------------------------------------------------------------------------
  // Candidate selection (viewport + optional expansion)
  // --------------------------------------------------------------------------
  private getCandidates(ctx: ClientContext, expandDegrees: number = 0.02): VehicleState[] {
    const expanded: BoundingBox = {
      minLat: ctx.viewport.minLat - expandDegrees,
      maxLat: ctx.viewport.maxLat + expandDegrees,
      minLng: ctx.viewport.minLng - expandDegrees,
      maxLng: ctx.viewport.maxLng + expandDegrees,
    };
    const ids = this.spatialIndex.query(expanded);
    const vehicles: VehicleState[] = [];
    for (const id of ids) {
      const v = this.state.get(id);
      if (v) vehicles.push(v);
    }
    return vehicles;
  }

  // --------------------------------------------------------------------------
  // Score with caching for baseScore only
  // --------------------------------------------------------------------------
  private getBaseScore(v: VehicleState): number {
    const now = Date.now();
    const cached = this.baseScoreCache.get(v.id);
    if (cached && now - cached.ts < this.BASE_CACHE_TTL) {
      return cached.score;
    }
    const score = baseScore(v);
    this.baseScoreCache.set(v.id, { score, ts: now });
    return score;
  }

  private scoreVehicleWithCache(v: VehicleState, ctx: ClientContext): number {
    const base = this.getBaseScore(v);
    const adj = contextualAdjustment(v, ctx);
    return Math.min(1.0, Math.max(0.0, base + adj));
  }

  // --------------------------------------------------------------------------
  // Main select method – clean pipeline
  // --------------------------------------------------------------------------
  select(ctx: ClientContext): SirtebasinResponse {
    // Step 1: Candidates
    const candidates = this.getCandidates(ctx);

    // Step 2: Score all candidates (vehicles only at this stage)
    const scoredVehicles = candidates.map(v => ({
      v,
      score: this.scoreVehicleWithCache(v, ctx),
    })).filter(item => item.score > 0.35); // discard irrelevant

    // Step 3: Cluster from ALL scored vehicles (before allocation)
    const rawClusters = clusterVehicles(scoredVehicles.map(item => item.v), 0.005);
    const highAnomalyClusters = rawClusters.filter(c => c.anomalyScore > 0.7);
    const normalClusters = rawClusters.filter(c => c.anomalyScore <= 0.7);
    // Merge clusters: prioritize high anomaly clusters, then normal
    const clusters = [...highAnomalyClusters, ...normalClusters];

    // Step 4: Allocate attention (vehicles + clusters)
    const allocated = allocateAttention(
      scoredVehicles.map(item => item.v),
      clusters,
      ctx
    );

    // Step 5: Format response
    return {
      ts: Date.now(),
      items: allocated.map(item => {
        if (item.kind === 'vehicle') {
          const v = item.data as VehicleState;
          return {
            kind: 'vehicle',
            id: v.id,
            lat: v.lat,
            lng: v.lng,
            speed: v.speed,
            heading: v.heading,
            score: item.score,
          };
        } else {
          const c = item.data as Cluster;
          return {
            kind: 'cluster',
            id: c.id,
            lat: c.center.lat,
            lng: c.center.lng,
            count: c.count,
            score: item.score,
          };
        }
      }),
    };
  }

  // Optional: direct vehicle state access for diagnostics
  getVehicleState(id: string): VehicleState | undefined {
    return this.state.get(id);
  }
}

// ============================================================================
// 7. Example usage (MapService)
// ============================================================================
/*
import { SirtebasinBrainV2, ClientContext } from './sirtebasin-brain-v2';

const brain = new SirtebasinBrainV2();

// Ingest MQTT events
brain.ingest([
  { id: 'v1', lat: 32.1, lng: 20.2, speed: 75, heading: 90, ts: Date.now() },
]);

// Client context with proper budget contract
const ctx: ClientContext = {
  viewport: { minLat: 32.0, maxLat: 32.5, minLng: 20.0, maxLng: 20.8 },
  center: { lat: 32.25, lng: 20.4 },
  zoom: 12,
  budget: {
    total: 50,
    reserved: { anomalies: 5, clusters: 10 }
  },
  policy: { includeAnomalies: true, includeHighSpeed: true }
};

const response = brain.select(ctx);
// SSE send: response.items
*/