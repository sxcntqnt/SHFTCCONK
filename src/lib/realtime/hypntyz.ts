/**
 * Sirtebasin Brain Layer v3 – Unified Attention Kernel
 *
 * Core improvements over v2:
 * - Single scoring surface (vehicles + clusters share comparable scores)
 * - Allocation consumes pre‑scored items (no double evaluation)
 * - Anomaly is a feature, not a separate priority system
 * - Pure packer allocation with zero domain logic
 */

// ============================================================================
// 1. Core Types (unchanged)
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
  speed: number;
  heading: number;
  ts: number;
};

export type AttentionBudget = {
  total: number;
  reserved: {
    anomalies: number;   // still useful as a policy knob, but treated as scoring boost
    clusters: number;
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
  };
};

export type VehicleState = {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  velocityVector?: { vx: number; vy: number };
  anomalyScore: number;      // 0..1, computed during ingestion
  lastSeen: number;
};

export type Cluster = {
  id: string;
  center: { lat: number; lng: number };
  count: number;
  avgSpeed: number;
  anomalyScore: number;      // max anomaly among members
  members: string[];
  bounds: BoundingBox;
};

// Unified attention item (pre‑scored)
export type AttentionItem = {
  kind: 'vehicle' | 'cluster';
  id: string;
  lat: number;
  lng: number;
  score: number;             // final comparable score (0..1)
  // extra fields for rendering (optional)
  speed?: number;
  heading?: number;
  count?: number;
};

export type SirtebasinResponse = {
  ts: number;
  items: AttentionItem[];
};

// ============================================================================
// 2. Spatial Index (same as before, omitted for brevity)
// ============================================================================

export interface SpatialIndex {
  insert(id: string, lat: number, lng: number): void;
  update(id: string, lat: number, lng: number): void;
  query(bounds: BoundingBox): string[];
}

export class GridIndex implements SpatialIndex { /* ... same implementation ... */ }

// ============================================================================
// 3. Clustering Helper (pure function)
// ============================================================================

export function clusterVehicles(
  vehicles: VehicleState[],
  cellSizeDegrees: number = 0.005
): Cluster[] {
  // ... same as before ...
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
    if (members.length < 2) continue; // only form clusters with >=2 vehicles
    const lats = members.map(m => m.lat);
    const lngs = members.map(m => m.lng);
    const center = {
      lat: lats.reduce((a,b) => a+b,0) / lats.length,
      lng: lngs.reduce((a,b) => a+b,0) / lngs.length,
    };
    const avgSpeed = members.reduce((sum,m) => sum + m.speed,0) / members.length;
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
// 4. Unified Scoring Model (pure, stateless)
// ============================================================================

// ----- Geometric helpers (same as before) -----
function isInside(lat: number, lng: number, bbox: BoundingBox): boolean {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;
}
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Compute final score for a vehicle.
 * Base importance (speed + anomaly) + contextual boosts (viewport, distance) + policy adjustments.
 */
function scoreVehicle(v: VehicleState, ctx: ClientContext): number {
  // ---- Base score (intrinsic) ----
  const speedFactor = v.speed > 60 ? 1.0 : v.speed > 30 ? 0.6 : 0.3;
  const anomalyFactor = v.anomalyScore;
  let base = 0.5 * speedFactor + 0.5 * anomalyFactor;
  // ---- Contextual boosts ----
  const inside = isInside(v.lat, v.lng, ctx.viewport);
  let boost = 0;
  if (inside) boost += 0.35;
  const dist = haversineDistance(v.lat, v.lng, ctx.center.lat, ctx.center.lng);
  if (dist < 500) boost += 0.15;
  else if (dist < 1500) boost += 0.075;
  // ---- Policy penalties ----
  if (!ctx.policy.includeAnomalies && v.anomalyScore > 0.7) base *= 0.7;
  if (!ctx.policy.includeHighSpeed && v.speed > 80) base *= 0.5;
  const score = base + boost;
  return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Score a cluster.
 * Uses: anomalyScore (max) + small density bonus, plus contextual boosts based on cluster center.
 */
function scoreCluster(c: Cluster, ctx: ClientContext): number {
  // Base: anomaly dominates, count gives diminishing returns
  let base = c.anomalyScore + 0.07 * Math.log(c.count + 1);
  base = Math.min(0.9, base); // cap so clusters don't always outrank vehicles
  
  // Contextual boosts (same as vehicle, but applied to cluster center)
  let boost = 0;
  const inside = isInside(c.center.lat, c.center.lng, ctx.viewport);
  if (inside) boost += 0.35;
  const dist = haversineDistance(c.center.lat, c.center.lng, ctx.center.lat, ctx.center.lng);
  if (dist < 500) boost += 0.15;
  else if (dist < 1500) boost += 0.075;
  
  // Policy: if anomalies disabled, reduce cluster score if it contains anomalies
  if (!ctx.policy.includeAnomalies && c.anomalyScore > 0.7) base *= 0.7;
  
  return Math.min(1.0, Math.max(0.0, base + boost));
}

// ============================================================================
// 5. Pure Attention Allocator (no scoring inside)
// ============================================================================

/**
 * Allocate attention slots from a list of pre-scored items.
 * Respects reserved budgets for anomalies and clusters.
 * Returns items sorted by score (descending).
 */
function allocateAttention(
  items: AttentionItem[],
  budget: AttentionBudget
): AttentionItem[] {
  if (items.length === 0) return [];
  
  // Separate into categories
  const anomalies = items.filter(i => i.score > 0.7);
  const clusters = items.filter(i => i.kind === 'cluster' && i.score <= 0.7);
  const vehicles = items.filter(i => i.kind === 'vehicle' && i.score <= 0.7);
  
  const result: AttentionItem[] = [];
  
  // 1. Reserved anomalies (take highest score)
  const anomalyTake = Math.min(budget.reserved.anomalies, anomalies.length);
  result.push(...anomalies.sort((a,b) => b.score - a.score).slice(0, anomalyTake));
  
  // 2. Reserved clusters (from non-anomaly clusters)
  const clusterTake = Math.min(budget.reserved.clusters, clusters.length);
  result.push(...clusters.sort((a,b) => b.score - a.score).slice(0, clusterTake));
  
  // 3. Fill remaining with best of the rest (vehicles + leftover clusters + leftover anomalies)
  const remainingBudget = budget.total - result.length;
  if (remainingBudget > 0) {
    const leftovers = [
      ...vehicles,
      ...clusters.slice(clusterTake),
      ...anomalies.slice(anomalyTake)
    ];
    const fill = leftovers.sort((a,b) => b.score - a.score).slice(0, remainingBudget);
    result.push(...fill);
  }
  
  // Final stable sort (by score descending, then kind for determinism)
  return result.sort((a,b) => {
    if (Math.abs(b.score - a.score) > 1e-6) return b.score - a.score;
    // tie-breaker: clusters before vehicles (optional)
    if (a.kind !== b.kind) return a.kind === 'cluster' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

// ============================================================================
// 6. Main Brain Class (optimized)
// ============================================================================

export class SirtebasinBrainV3 {
  private state: Map<string, VehicleState> = new Map();
  private spatialIndex: SpatialIndex;
  private baseScoreCache = new Map<string, number>(); // only base score (without context)
  private readonly CACHE_TTL = 500; // ms, but we just store base; expire on ingest

  constructor(spatialIndex?: SpatialIndex) {
    this.spatialIndex = spatialIndex ?? new GridIndex(0.01);
  }

  // --------------------------------------------------------------------------
  // Ingestion (unchanged logic)
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
      this.baseScoreCache.delete(e.id);
    }
  }

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
  // Candidate selection (viewport + expansion)
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
  // Score with limited caching (base only, context applied fresh)
  // --------------------------------------------------------------------------
  private scoreVehicleWithCache(v: VehicleState, ctx: ClientContext): number {
    // We don't cache the final score because context varies per request.
    // But we could cache base part if needed. Here we compute directly for simplicity.
    // Since scoreVehicle is pure and fast, caching is optional.
    return scoreVehicle(v, ctx);
  }

  // --------------------------------------------------------------------------
  // Main select method – clean pipeline
  // --------------------------------------------------------------------------
  select(ctx: ClientContext): SirtebasinResponse {
    // 1. Candidates (vehicles)
    const candidates = this.getCandidates(ctx);
    
    // 2. Score vehicles and build AttentionItems
    const vehicleItems: AttentionItem[] = [];
    for (const v of candidates) {
      const score = this.scoreVehicleWithCache(v, ctx);
      if (score > 0.35) { // discard irrelevant
        vehicleItems.push({
          kind: 'vehicle',
          id: v.id,
          lat: v.lat,
          lng: v.lng,
          score,
          speed: v.speed,
          heading: v.heading,
        });
      }
    }
    
    // 3. Cluster from ALL scored vehicles (use the vehicle states directly)
    const clusters = clusterVehicles(candidates.filter(v => {
      const s = this.scoreVehicleWithCache(v, ctx);
      return s > 0.35; // only cluster vehicles that pass threshold
    }), 0.005);
    
    // 4. Score clusters and convert to AttentionItems
    const clusterItems: AttentionItem[] = clusters.map(c => ({
      kind: 'cluster',
      id: c.id,
      lat: c.center.lat,
      lng: c.center.lng,
      score: scoreCluster(c, ctx),
      count: c.count,
    }));
    
    // 5. Combine and allocate
    const allItems = [...vehicleItems, ...clusterItems];
    const allocated = allocateAttention(allItems, ctx.budget);
    
    // 6. Return response
    return {
      ts: Date.now(),
      items: allocated,
    };
  }
  
  // Diagnostic
  getVehicleState(id: string): VehicleState | undefined {
    return this.state.get(id);
  }
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