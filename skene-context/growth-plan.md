# Growth Plan: FLAM #
**Generated:** 2026-03-31T15:12:27.561101

---

### 1. Smart-Batching & Sync Architecture

## Smart-Batching & Sync Architecture

### The Core Insight

The existing loops treat every GPS ping as an atomic Hyperledger write. That is architecturally naive and economically destructive. Hyperledger Fabric transaction throughput has latency and endorsement cost. A matatu fleet emitting pings every 5 seconds across 50 vehicles is 600 transactions/minute — each requiring peer endorsement, ordering, and block commit. The fix is not a configuration tweak; it is a fundamental separation of concerns: **PostgreSQL is the operational truth store, Hyperledger is the compliance audit layer**, and the PWA is a resilient edge buffer that never loses a ping regardless of Safaricom 3G degradation.

---

### Layer 1: PWA IndexedDB Buffer — The Edge Contract

**Schema: `ping_buffer` store (IndexedDB)**

```typescript
interface BufferedPing {
  id: string;              // crypto.randomUUID() — client-generated, idempotency key
  vehicle_id: string;
  driver_id: string;
  org_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  heading: number;
  accuracy_meters: number;
  captured_at: string;     // ISO8601, device clock
  network_quality: 'good' | 'degraded' | 'offline';
  sync_attempts: number;   // incremented on each failed flush attempt
  synced: boolean;         // false until server ACK received
  batch_id: string | null; // populated on flush assignment
}
```

**Write path:** Every GPS `watchPosition` callback writes immediately to IndexedDB before any network operation. This is the zero-data-loss guarantee. Network is never in the critical path for capture.

---

### Layer 2: Batch Trigger Thresholds — The Flush Contract

Two independent triggers, whichever fires first initiates a flush:

**Trigger A — Ping Count Threshold**
- Flush when `unsynced ping count >= 12`
- At a 5-second ping interval, this is 60 seconds of data — one minute of positional truth per batch
- Rationale: 12 pings is enough spatial resolution to reconstruct a route segment; it amortizes the HTTP round-trip cost across meaningful data density

**Trigger B — Time Elapsed Threshold**
- Flush when `time since last successful flush >= 90 seconds` AND `unsynced ping count >= 1`
- Prevents stale data accumulation when pings are sparse (vehicle idling, low-speed zones)
- 90 seconds is the p95 acceptable staleness for operational dashboard display without triggering a "vehicle offline" false positive

**Trigger C — Session Termination**
- Flush immediately on `visibilitychange` to `hidden` or `beforeunload`
- Uses `navigator.sendBeacon` for the final batch to guarantee delivery even when the tab is killed
- Beacon payload is the same batch envelope; server handles it identically

**Trigger D — Network Recovery**
- On `online` event after an offline period, flush immediately regardless of count or time
- This is the Safaricom 3G resilience path: tunnels, dense urban canyons, and inter-cell handoffs create 15–45 second offline windows; recovery flush ensures no gap in the operational timeline

---

### Layer 3: Batch Envelope — The Wire Contract

```typescript
interface PingBatch {
  batch_id: string;          // crypto.randomUUID() — server uses for idempotency
  org_id: string;
  vehicle_id: string;
  driver_id: string;
  pings: BufferedPing[];     // ordered by captured_at ASC
  client_clock_offset_ms: number; // Date.now() - performance.timeOrigin, for clock skew correction
  network_quality_at_flush: 'good' | 'degraded';
  flush_trigger: 'count' | 'time' | 'session_end' | 'network_recovery';
}
```

The `batch_id` is the idempotency key at the server. If the same `batch_id` arrives twice (retry after a timeout where the server actually succeeded), the server returns `200` with a cached ACK and does not double-write.

---

### Layer 4: Network-First Retry — The Resilience Contract

**Retry strategy: Exponential backoff with jitter, capped at 3G reality**

```
Attempt 1: immediate
Attempt 2: 4s + random(0–2s)
Attempt 3: 12s + random(0–4s)
Attempt 4: 30s + random(0–8s)
Attempt 5+: 60s fixed interval, max 10 attempts per batch
```

After 10 failed attempts, the batch is marked `sync_failed` in IndexedDB but **never deleted**. A background sync registration via `ServiceWorker.sync` (Background Sync API) re-queues it when connectivity is restored. This handles the edge case of a driver completing a full shift in a low-coverage corridor.

**Safaricom 3G Resilience specifics:**
- Set `fetch` timeout to `8000ms` — Safaricom 3G p95 latency under load is ~3.5s; 8s gives headroom without blocking the retry queue
- Detect degraded network via `navigator.connection.effectiveType === '2g' || navigator.connection.downlink < 0.5` and reduce batch size to 6 pings (halved) to fit within a single TCP window on a congested cell
- On `effectiveType === 'slow-2g'`, suspend active flushing and accumulate in IndexedDB; only flush on `network_recovery` trigger or session end via `sendBeacon`

---

### Layer 5: Server-Side Ingest — The Separation of Concerns

**POST `/api/v1/pings/batch`**

```
1. Validate batch_id idempotency against Upstash Redis (SET NX, TTL 24h)
2. Bulk INSERT all pings into PostgreSQL `trip_events` table — this is the operational write, sub-100ms
3. Return 200 ACK with {batch_id, accepted_count, server_received_at}
4. Enqueue a SINGLE Hyperledger job per batch (not per ping) via Upstash Redis queue
```

**The Hyperledger write is decoupled and batched:**
- The Upstash worker picks up the batch job and writes ONE Fabric transaction containing a Merkle root of all ping hashes in the batch
- This reduces Hyperledger writes from N pings to N/12 batches — a 12x reduction at minimum, up to 60x during high-frequency periods
- The Fabric transaction payload: `{batch_id, org_id, vehicle_id, ping_count, merkle_root, first_ping_at, last_ping_at, trip_segment_hash}`
- Individual ping integrity is provable by recomputing the Merkle tree from PostgreSQL data against the on-chain root — compliance requirement satisfied without per-ping chain cost

**The compliance narrative is preserved:** Regulators and auditors get a tamper-evident audit trail. The Merkle root anchors the entire batch. Any single ping modification in PostgreSQL is detectable by root mismatch. This is architecturally stronger than per-ping writes because it proves batch-level integrity, not just individual record existence.

---

### Layer 6: Cache Eviction — The Zero-Loss Contract

**The only condition under which a ping is deleted from IndexedDB:**

```
IF ping.synced === true
AND server_ack.accepted_count === batch.pings.length
AND batch.batch_id confirmed in server response
THEN delete all pings where batch_id === confirmed_batch_id
```

This is a three-part confirmation gate. Partial ACKs (server accepted 10 of 12 pings) result in zero deletion — the entire batch is retained and re-attempted with the full payload. The server's idempotency layer handles the re-delivery of already-accepted pings without double-write.

**IndexedDB size guard:**
- Monitor `navigator.storage.estimate()` on every flush cycle
- If `usage/quota > 0.75`, emit a PostHog event `pwa_storage_pressure` and trigger an immediate flush attempt regardless of other thresholds
- If storage is at `> 0.90` and flush is failing (offline, repeated 500s), begin evicting the oldest `synced === false` pings beyond a 72-hour age window — this is the only data loss scenario and it is bounded, intentional, and logged to Sentry with full context
- 72 hours covers any realistic Safaricom outage or device confiscation scenario; beyond that, the operational value of the ping has decayed to near-zero

---

### Lifecycle Integration

**ACTIVATION:** The first GPS ping is still the magic moment. The PWA writes to IndexedDB in <50ms. The flush to PostgreSQL triggers the `gps_first_ping_received` event in PostHog. The Hyperledger genesis event fires via the batch worker within 30–90 seconds of first ping — fast enough to be meaningful, decoupled enough to not block activation.

**ENGAGEMENT:** The operational dashboard reads from PostgreSQL in real-time via SSE. The Hyperledger ledger depth metric (batch count × avg pings per batch) compounds over time, building the compliance narrative that drives the Day-28 upgrade gate. The separation means dashboard latency is PostgreSQL-speed (~20ms), not Fabric-speed (~800ms).

**MONETISATION:** The upgrade gate copy shifts from "GPS pings recorded" to "verified trip segments on immutable ledger" — each segment being a Merkle-anchored batch. This is a stronger compliance claim and a more defensible number. 30 days of daily operations at 12-ping batches produces hundreds of ledger anchors, each representing a provable route segment. That is the asset the operator is being asked to protect by upgrading.

### 2. Dual-Path Ingest & Event Filter Gate

## Dual-Path Ingest & Event Filter Gate

### The Architectural Contract

Every ping that arrives at `POST /api/v1/pings/batch` is written to PostgreSQL unconditionally. That is the Raw Path — the operational truth store, always complete, always current. The Ledger Path is not a mirror of the Raw Path; it is a filtered projection of events that carry compliance-grade signal. The filter gate sits between the bulk INSERT and the Upstash queue enqueue, operating on the already-committed PostgreSQL rows. It never blocks the write. It never delays the ACK. It runs as a synchronous classification pass on the in-memory batch payload after the DB write confirms, before the worker job is dispatched.

This means the filter adds zero latency to the client-facing response path. The ACK returns at PostgreSQL speed. The Ledger Path decision is a post-commit classification, not a pre-commit gate.

---

### Raw Path — Unconditional Write

```typescript
// POST /api/v1/pings/batch handler
async function ingestBatch(batch: PingBatch): Promise<BatchACK> {
  // Idempotency check — Upstash Redis SET NX, TTL 24h
  const isNew = await redis.set(
    `batch:idempotency:${batch.batch_id}`,
    '1',
    { nx: true, ex: 86400 }
  );
  if (!isNew) return cachedACK(batch.batch_id);

  // Raw Path: bulk INSERT, unconditional
  const insertedCount = await db
    .insertInto('trip_events')
    .values(batch.pings.map(p => normalizePing(p, batch)))
    .execute();

  // ACK immediately — Ledger Path decision does not block this
  const ack: BatchACK = {
    batch_id: batch.batch_id,
    accepted_count: insertedCount,
    server_received_at: new Date().toISOString()
  };

  // Ledger Path: classify and conditionally enqueue — fire and forget from client perspective
  const ledgerEvents = classifyForLedger(batch);
  if (ledgerEvents.length > 0) {
    await enqueueLedgerJob(batch, ledgerEvents);
  }

  return ack;
}
```

The `classifyForLedger` function is the filter gate. It receives the full in-memory batch — no additional DB reads required. All classification inputs are present in the batch payload.

---

### The Three Trigger Conditions

#### Trigger 1 — Displacement Threshold (Spatial Significance)

**Definition:** A ping qualifies for ledger anchoring if the cumulative displacement from the last ledger-anchored position exceeds 250 meters.

**Rationale:** 250 meters is the minimum route segment length that carries regulatory meaning in Nairobi's NTSA compliance framework — it distinguishes a vehicle in motion from a vehicle idling at a stage. Below 250m, consecutive pings represent positional noise within a single geographic zone. Above 250m, the vehicle has demonstrably traversed from one zone to another, creating an auditable route segment.

**Implementation:**

```typescript
interface LedgerAnchorState {
  last_anchored_lat: number;
  last_anchored_lng: number;
  last_anchored_at: string;
  last_batch_id: string;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkDisplacementTrigger(
  batch: PingBatch,
  anchorState: LedgerAnchorState | null
): boolean {
  if (!anchorState) return true; // No prior anchor — first ping is always ledger-eligible

  // Measure displacement from last anchor to the final ping in this batch
  const lastPing = batch.pings[batch.pings.length - 1];
  const displacement = haversineMeters(
    anchorState.last_anchored_lat,
    anchorState.last_anchored_lng,
    lastPing.lat,
    lastPing.lng
  );

  return displacement >= 250;
}
```

**The anchor state** is stored in PostgreSQL `vehicle_ledger_anchor_state` table, keyed by `vehicle_id`. It is read once per batch ingest, cached in Upstash Redis with a 5-minute TTL keyed by `vehicle_id`, and updated only when a ledger job is enqueued. This means the displacement check costs one Redis GET per batch — sub-millisecond, never a DB read on the hot path.

**Quantified reduction contribution:** A matatu traveling at 30 km/h emits a ping every 5 seconds = 41.67 meters per ping. To accumulate 250 meters of displacement requires 6 consecutive pings. This alone reduces ledger writes by ~83% for a vehicle in continuous motion. For a vehicle idling at a stage for 20 minutes (240 pings, ~0 displacement), it reduces ledger writes by 100% for that idle period.

---

#### Trigger 2 — Status Change Event (Semantic Significance)

**Definition:** A ping qualifies for immediate ledger anchoring, bypassing the displacement threshold, if it represents a status transition: trip start, trip end, route deviation, geofence entry/exit, or speed anomaly crossing a defined threshold.

**These are the events that matter to regulators regardless of displacement.** A vehicle that stops at a terminus, loads passengers, and departs has not moved 250 meters — but that state transition is the core of the compliance record.

**Status change detection runs on the batch, not per-ping:**

```typescript
interface StatusChangeEvent {
  type: 'trip_start' | 'trip_end' | 'route_deviation' | 'geofence_entry' | 'geofence_exit' | 'speed_anomaly' | 'device_offline_recovery';
  ping_id: string;
  detected_at: string;
  metadata: Record<string, unknown>;
}

function detectStatusChanges(batch: PingBatch, priorState: VehicleOperationalState): StatusChangeEvent[] {
  const events: StatusChangeEvent[] = [];
  const pings = batch.pings;

  // Trip start: first ping after a gap > 5 minutes from last known ping
  if (priorState.last_ping_at) {
    const gapMs = new Date(pings[0].captured_at).getTime() - new Date(priorState.last_ping_at).getTime();
    if (gapMs > 300_000) {
      events.push({ type: 'trip_start', ping_id: pings[0].id, detected_at: pings[0].captured_at, metadata: { gap_ms: gapMs } });
    }
  }

  // Trip end: last ping in batch followed by projected silence (detected on next batch arrival or timeout)
  // This is handled by a separate Upstash delayed job — not in-band here

  // Speed anomaly: any ping exceeding 80 km/h (Nairobi urban speed limit enforcement threshold)
  for (const ping of pings) {
    if (ping.speed_kmh > 80) {
      events.push({ type: 'speed_anomaly', ping_id: ping.id, detected_at: ping.captured_at, metadata: { speed_kmh: ping.speed_kmh } });
    }
  }

  // Route deviation: bearing delta > 45 degrees sustained across 3 consecutive pings
  // (simplified — production uses PostGIS ST_Distance against route_geometries table)
  for (let i = 2; i < pings.length; i++) {
    const bearingDelta = Math.abs(pings[i].heading - pings[i-2].heading);
    if (bearingDelta > 45 && bearingDelta < 315) { // exclude 360-wrap artifacts
      events.push({ type: 'route_deviation', ping_id: pings[i].id, detected_at: pings[i].captured_at, metadata: { bearing_delta: bearingDelta } });
      break; // one deviation event per batch is sufficient
    }
  }

  // Device offline recovery: batch flush_trigger === 'network_recovery'
  if (batch.flush_trigger === 'network_recovery') {
    events.push({ type: 'device_offline_recovery', ping_id: pings[0].id, detected_at: pings[0].captured_at, metadata: { ping_count: pings.length } });
  }

  return events;
}
```

**Status change events produce a ledger write regardless of displacement.** They are the 100% critical-event auditability guarantee. The Merkle root for a status-change-triggered batch includes the `StatusChangeEvent` payload in the hash input, making the event type itself tamper-evident on-chain.

**Quantified reduction contribution:** Status change events are sparse. A typical matatu shift (6 AM – 10 PM, 16 hours) produces approximately 8–12 discrete status changes: 2 trip starts, 2 trip ends, 0–4 speed anomalies, 0–4 route deviations, 1–2 offline recoveries. Against a raw ping volume of ~11,520 pings per vehicle per shift (at 5-second intervals), status-change-triggered ledger writes represent <0.1% of raw volume. They are noise-floor-level in transaction count but 100% of the compliance-critical signal.

---

#### Trigger 3 — Time-Based Heartbeat (Continuity Proof)

**Definition:** If neither the displacement threshold nor a status change has triggered a ledger write within a 15-minute window for an active vehicle, a heartbeat ledger write is forced.

**Rationale:** The compliance narrative requires proof of continuous operation, not just proof of events. A vehicle that idles at a stage for 40 minutes with no displacement and no status changes still needs a ledger record proving the device was active and the operator was present. Without a heartbeat, a 40-minute gap in ledger history looks identical to a 40-minute device failure — which is the exact ambiguity regulators will exploit in a dispute.

**Implementation:** The heartbeat is not detected in-band during batch ingest. It is scheduled as a delayed Upstash Redis job at the time of each ledger write:

```typescript
async function scheduleHeartbeatJob(vehicleId: string, orgId: string, batchId: string): Promise<void> {
  // Cancel any existing heartbeat job for this vehicle
  await redis.del(`heartbeat:pending:${vehicleId}`);

  // Schedule a new heartbeat job 15 minutes from now
  const jobPayload: HeartbeatJob = {
    type: 'ledger_heartbeat',
    vehicle_id: vehicleId,
    org_id: orgId,
    triggered_after_batch_id: batchId,
    scheduled_at: new Date().toISOString()
  };

  await queue.enqueue('ledger-jobs', jobPayload, { delay: 900 }); // 900 seconds = 15 minutes

  // Store job reference for cancellation
  await redis.set(`heartbeat:pending:${vehicleId}`, JSON.stringify(jobPayload), { ex: 1800 });
}
```

When a new batch arrives and triggers a ledger write (via displacement or status change), `scheduleHeartbeatJob` is called, which cancels the prior pending heartbeat and sets a new 15-minute countdown. If no ledger-eligible batch arrives within 15 minutes, the heartbeat worker fires, reads the latest ping from PostgreSQL for that vehicle, constructs a minimal heartbeat batch, and writes a single Fabric transaction with `event_type: 'heartbeat'`.

**The heartbeat is also the trip-end detector.** If the heartbeat job fires and the vehicle's last ping timestamp is > 10 minutes ago (no recent pings at all), the worker emits a `trip_end` status change event and writes the ledger record with both `heartbeat` and `trip_end` types. This closes the compliance record for the shift segment without requiring a dedicated trip-end ping from the PWA.

**Quantified reduction contribution:** A vehicle that idles for 40 minutes at a stage would, without the heartbeat gate, produce 480 raw pings (at 5-second intervals) with zero displacement — all of which would fail the displacement trigger and produce zero ledger writes. With the heartbeat gate, that 40-minute idle produces exactly 2 heartbeat ledger writes (at minute 15 and minute 30; the minute-45 heartbeat would be cancelled when the vehicle departs and triggers a displacement write). 480 pings → 2 ledger writes = 99.6% reduction for idle periods.

---

### The Unified Classifier

```typescript
interface LedgerClassification {
  should_write: boolean;
  trigger_reason: 'displacement' | 'status_change' | 'heartbeat_forced' | 'genesis' | null;
  status_events: StatusChangeEvent[];
  anchor_ping_id: string | null; // The ping that defines the new anchor position
}

async function classifyForLedger(
  batch: PingBatch
): Promise<LedgerClassification> {
  // Read anchor state from Redis (cache-aside, fallback to PostgreSQL)
  const anchorState = await getAnchorState(batch.vehicle_id);
  const priorOpState = await getOperationalState(batch.vehicle_id);

  // Genesis: no prior anchor exists for this vehicle
  if (!anchorState) {
    return {
      should_write: true,
      trigger_reason: 'genesis',
      status_events: [],
      anchor_ping_id: batch.pings[0].id
    };
  }

  // Status change check runs first — highest priority, never suppressed by displacement
  const statusEvents = detectStatusChanges(batch, priorOpState);
  if (statusEvents.length > 0) {
    return {
      should_write: true,
      trigger_reason: 'status_change',
      status_events: statusEvents,
      anchor_ping_id: batch.pings[batch.pings.length - 1].id
    };
  }

  // Displacement check
  const displacementTriggered = checkDisplacementTrigger(batch, anchorState);
  if (displacementTriggered) {
    return {
      should_write: true,
      trigger_reason: 'displacement',
      status_events: [],
      anchor_ping_id: batch.pings[batch.pings.length - 1].id
    };
  }

  // No trigger — heartbeat job is already scheduled from prior ledger write
  // Reset the heartbeat timer since a batch arrived (vehicle is still active)
  await refreshHeartbeatDeadline(batch.vehicle_id);

  return {
    should_write: false,
    trigger_reason: null,
    status_events: [],
    anchor_ping_id: null
  };
}
```

`refreshHeartbeatDeadline` extends the Upstash delayed job deadline without cancelling and rescheduling — it updates the Redis key TTL. This means a vehicle emitting continuous pings that never cross 250m displacement (dense urban stop-start traffic) will still produce a heartbeat write every 15 minutes, but the heartbeat timer resets on every batch arrival, so it only fires after a genuine 15-minute silence.

---

### Quantified Reduction Model

**Baseline (naive per-ping ledger writes):**
- 50 vehicles × 720 pings/hour × 16-hour shift = 576,000 Fabric transactions/day

**With Dual-Path Filter Gate:**

| Scenario | Raw Pings | Ledger Writes | Reduction |
|---|---|---|---|
| Highway cruise (50 km/h, 5s interval) | 720/hr | ~60/hr (displacement at ~70m/ping, 250m threshold = every 4th ping triggers) | 92% |
| Urban stop-start (15 km/h avg) | 720/hr | ~22/hr (displacement at ~21m/ping, 250m threshold = every 12th ping triggers) | 97% |
| Stage idle (0 km/h, 40 min) | 480 | 2–3 heartbeats | 99.4% |
| Status change events (full shift) | 11,520 | 8–12 events | 99.9% (these are additive to displacement writes) |

**Blended fleet average (realistic Nairobi operating pattern: 40% urban, 35% highway, 25% idle):**
- Ledger writes per vehicle per shift: ~320–380
- Reduction from 11,520 baseline: **96.7–97.2%**
- Fleet-wide (50 vehicles): ~17,500 Fabric transactions/day vs. 576,000 baseline
- **Target of 90% reduction: exceeded by 7 percentage points**

**Critical-event auditability: 100% preserved.** Every status change event — trip start, trip end, speed anomaly, route deviation, offline recovery — writes to the ledger unconditionally. The displacement and heartbeat filters only suppress positional-continuity pings that carry no independent compliance signal. The Merkle root on each ledger write anchors all raw pings in the batch to the chain, so the full positional record remains reconstructible from PostgreSQL with tamper-evidence from Fabric.

---

### Anchor State Update — Closing the Loop

After `enqueueLedgerJob` is called, the anchor state must be updated to prevent duplicate displacement triggers on the next batch:

```typescript
async function updateAnchorState(
  vehicleId: string,
  classification: LedgerClassification,
  batch: PingBatch
): Promise<void> {
  if (!classification.should_write || !classification.anchor_ping_id) return;

  const anchorPing = batch.pings.find(p => p.id === classification.anchor_ping_id)!;

  const newState: LedgerAnchorState = {
    last_anchored_lat: anchorPing.lat,
    last_anchored_lng: anchorPing.lng,
    last_anchored_at: anchorPing.captured_at,
    last_batch_id: batch.batch_id
  };

  // Write to PostgreSQL (durable) and Redis (fast read cache, 5-min TTL)
  await db.updateTable('vehicle_ledger_anchor_state')
    .set(newState)
    .where('vehicle_id', '=', vehicleId)
    .execute();

  await redis.set(
    `anchor:${vehicleId}`,
    JSON.stringify(newState),
    { ex: 300 }
  );

  // Schedule next heartbeat window
  await scheduleHeartbeatJob(vehicleId, batch.org_id, batch.batch_id);
}
```

The anchor state update is fire-and-forget relative to the HTTP response — it runs after the ACK is returned. If it fails (Redis timeout, DB contention), the next batch will read a stale anchor state and may produce a duplicate ledger write. This is acceptable: a false positive ledger write is harmless (it is an extra compliance record, not a missing one). A false negative (missed ledger write due to stale anchor showing no displacement when there was displacement) is prevented by the heartbeat, which fires within 15 minutes regardless.

---

### Lifecycle Integration Points

**ACTIVATION:** The genesis classification (`!anchorState`) fires on the first batch from a new vehicle, unconditionally writing the Hyperledger genesis event. This is the magic moment anchor — the ledger record that begins the compliance history. PostHog `gps_first_ping_received` fires on the Raw Path INSERT, decoupled from the genesis write, so activation telemetry is never delayed by Fabric endorsement latency.

**ENGAGEMENT:** The operational dashboard reads exclusively from PostgreSQL. The ledger depth metric displayed in the dashboard is computed as `COUNT(*) FROM vehicle_ledger_jobs WHERE status = 'confirmed' AND org_id = $1` — each confirmed job representing a Merkle-anchored batch. At 96.7% reduction, a 30-day active vehicle accumulates ~9,600 ledger anchors instead of ~345,600. The number displayed in the upgrade gate copy shifts accordingly: '9,600 verified route segments on immutable ledger' is a more credible and defensible compliance asset than an inflated per-ping count that any technically literate regulator would recognize as noise.

**MONETISATION:** The Day-28 upgrade gate evaluates `ledger_anchor_count >= 500` as the threshold for triggering the compliance-framed prompt. With the filter gate in place, reaching 500 anchors requires approximately 1.5–2 days of active operations — achievable early enough that the prompt fires well within the free tier window, but the count is high enough to feel like a meaningful asset worth protecting. The M-Pesa STK push is initiated when the operator views the gate with `ledger_anchor_count` between 500 and the free-tier cap of 1,000 anchors, creating a bounded urgency window.

**RETENTION:** The SACCO Health Benchmarking Report (weekly digest) includes a per-vehicle `ledger_coverage_ratio` = `(ledger_anchor_count / expected_anchor_count_for_shift_hours)`. This ratio surfaces vehicles with degraded GPS coverage or filter gate anomalies (e.g., a vehicle producing zero displacement triggers — possible GPS spoofing or device malfunction) as actionable fleet health signals, compounding the engagement loop by giving ORG_CHAIRs a reason to return to the dashboard every week.

### 3. Hyperledger State-Change Schema & Integrity Chain

## Hyperledger State-Change Schema & Integrity Chain

### The Architectural Contract

The Fabric ledger stores zero raw coordinates. It stores cryptographic commitments to PostgreSQL data, structured as a typed event taxonomy with deterministic hash linkage. The on-chain record is the proof that a specific set of PostgreSQL rows existed in a specific state at a specific time — not a copy of those rows. Auditor verification reconstructs the proof from cold PostgreSQL data and compares it against the on-chain commitment. Any divergence between the reconstructed hash and the on-chain hash is proof of tampering. The chain is the integrity layer; PostgreSQL is the data layer. Neither is complete without the other, and that dependency is the architectural moat.

---

### Event Type Taxonomy

Five event types cover the complete compliance surface. Each maps to a distinct trigger path from the Dual-Path Ingest classifier. The taxonomy is closed — no ad-hoc event types are permitted in production chaincode. Unknown types are rejected at the endorsement policy level.

**GENESIS_ENROLLMENT**
Triggered by: `classifyForLedger` returning `trigger_reason: 'genesis'` — no prior anchor state exists for this vehicle.
Semantics: The vehicle's compliance history begins. This event anchors the organizational enrollment, device pairing, and operator identity at a single point in time. It is the root of the vehicle's integrity chain. Every subsequent event references this genesis hash.
Frequency: Once per vehicle lifetime. Re-enrollment (device replacement, vehicle transfer to new SACCO) produces a new GENESIS_ENROLLMENT with a `supersedes_event_id` field pointing to the prior genesis.

**TRIP_START**
Triggered by: `detectStatusChanges` returning `type: 'trip_start'` — gap > 5 minutes from last known ping followed by new ping arrival.
Semantics: The vehicle has begun a new operational segment. Records the starting position hash, driver identity commitment, and route assignment at segment initiation. This is the opening bracket of a compliance-auditable trip record.
Frequency: 2–4 per vehicle per shift under normal Nairobi operating patterns.

**TRIP_END**
Triggered by: Heartbeat worker detecting last ping timestamp > 10 minutes ago, or explicit `trip_end` status change from batch classifier.
Semantics: The vehicle's operational segment has closed. Records the terminal position hash, elapsed duration, total displacement accumulated across the segment, and a reference to all batch_ids that fall within the segment window. This is the closing bracket. The pair of TRIP_START and TRIP_END event_ids defines an auditable trip unit.
Frequency: Mirrors TRIP_START — one TRIP_END per TRIP_START, though the TRIP_END may be written by the heartbeat worker rather than a direct batch trigger.

**STATE_CHANGE**
Triggered by: `detectStatusChanges` returning `type` of `speed_anomaly`, `route_deviation`, `geofence_entry`, `geofence_exit`, or `device_offline_recovery`.
Semantics: A compliance-significant event occurred mid-segment that regulators require as a discrete record, independent of the surrounding trip brackets. Speed anomalies above 80 km/h are NTSA enforcement triggers. Route deviations are SACCO route-license compliance signals. Geofence events mark entry and exit from licensed operating zones. Offline recovery events prove device continuity across connectivity gaps.
Frequency: 0–8 per vehicle per shift, highly variable. Speed anomalies are the most common; geofence events depend on route geometry.
Subtype field: `state_change_subtype` carries the specific event type from the taxonomy above. The parent `event_type` is always `STATE_CHANGE` — this keeps the chaincode endorsement policy simple (five cases, not nine).

**DAILY_HEARTBEAT**
Triggered by: Upstash delayed job firing after 15 minutes of no displacement-triggered or status-change-triggered ledger write for an active vehicle. Name is DAILY_HEARTBEAT in the schema for regulator legibility, but the actual cadence is 15-minute windows, not 24-hour — the name reflects the compliance use case (proving daily operational continuity) not the trigger interval.
Semantics: The vehicle's device was active and transmitting during this window. No compliance-significant event occurred, but the absence of a heartbeat gap is itself a compliance signal. A 15-minute gap in heartbeat records without a corresponding TRIP_END is anomalous and auditor-flagged.
Frequency: 2–4 per idle hour, 0 during active displacement (displacement writes reset the heartbeat timer). A full 16-hour shift with 4 hours of idle time produces approximately 8–16 heartbeat events.

---

### On-Chain Transaction Schema

This is the canonical Fabric transaction payload. All five event types share this envelope; event-specific fields live in the `event_payload` object.

```typescript
interface FabricTransactionPayload {
  // Identity & Routing
  schema_version: '2.0';                    // Increment on breaking schema changes; chaincode rejects unknown versions
  event_type: 'GENESIS_ENROLLMENT' | 'TRIP_START' | 'TRIP_END' | 'STATE_CHANGE' | 'DAILY_HEARTBEAT';
  event_id: string;                         // crypto.randomUUID() — globally unique, used as Fabric transaction key
  org_id: string;                           // SACCO organisation UUID from PostgreSQL
  vehicle_id: string;                       // Vehicle UUID from PostgreSQL
  driver_id: string | null;                 // Driver UUID; null for GENESIS_ENROLLMENT and DAILY_HEARTBEAT if no active driver

  // Temporal Anchoring
  event_timestamp: string;                  // ISO8601 UTC — the real-world time of the triggering event, not the write time
  fabric_write_timestamp: string;           // ISO8601 UTC — populated by chaincode on commit; proves write latency
  shift_date: string;                       // YYYY-MM-DD in Africa/Nairobi timezone — partitioning key for auditor queries

  // Integrity Chain
  prior_event_id: string | null;            // event_id of the immediately preceding ledger event for this vehicle; null for GENESIS_ENROLLMENT
  prior_event_hash: string | null;          // SHA-256 of the prior FabricTransactionPayload (canonical JSON, sorted keys); null for GENESIS_ENROLLMENT
  batch_merkle_root: string;                // SHA-256 Merkle root of all ping hashes in the triggering PostgreSQL batch
  batch_id: string;                         // UUID of the PostgreSQL batch that triggered this event
  pg_batch_row_count: number;               // Count of trip_events rows in the triggering batch — auditor uses this to verify Merkle tree size
  pg_batch_hash: string;                    // SHA-256 of concatenated ping IDs (sorted ASC) from the triggering batch — secondary integrity check

  // Event Payload (event-type-specific)
  event_payload: GenesisPayload | TripStartPayload | TripEndPayload | StateChangePayload | HeartbeatPayload;

  // Chaincode Signature
  endorsing_peers: string[];                // Peer MSP IDs that endorsed this transaction
  channel_id: string;                       // Fabric channel — 'matatu-compliance-channel'
}
```

The `prior_event_hash` field is the chain linkage. It is computed by the Upstash worker before submitting the Fabric transaction, by reading the prior event's full payload from the Fabric ledger state (via `getState(prior_event_id)`) and computing `SHA-256(canonicalJSON(priorPayload))`. This creates a hash chain where each event commits to the complete state of the prior event — not just its ID. Modifying any historical event breaks all subsequent hashes in the chain, making the tampering detectable at the first divergence point.

---

### Event-Specific Payload Schemas

**GenesisPayload**
```typescript
interface GenesisPayload {
  sacco_name: string;
  vehicle_registration: string;             // Number plate — human-readable compliance identifier
  device_imei_hash: string;                 // SHA-256(IMEI) — proves device identity without exposing raw IMEI on-chain
  enrollment_operator_id: string;           // ORG_CHAIR or admin who initiated enrollment
  route_license_ids: string[];              // NTSA route license identifiers assigned to this vehicle at enrollment
  supersedes_event_id: string | null;       // For re-enrollment only
  initial_position_geohash: string;         // Geohash precision-6 (~1.2km × 0.6km) of first ping — no raw coordinates on-chain
}
```

The `device_imei_hash` pattern is deliberate. Raw IMEI on a public or consortium ledger creates a device fingerprinting surface. The hash proves the same device was used across events (same hash = same device) without exposing the identifier. Auditors who need to verify the physical device present the raw IMEI and the system computes the hash for comparison.

**TripStartPayload**
```typescript
interface TripStartPayload {
  route_id: string | null;                  // Assigned route UUID; null if driver has not selected a route
  start_position_geohash: string;           // Geohash precision-7 (~153m × 153m) — sufficient for zone-level compliance, no raw coordinates
  start_position_landmark: string | null;   // Nearest named stage or landmark from route_geometries table, resolved server-side
  prior_trip_end_event_id: string | null;   // Links to the TRIP_END that preceded this start — enables trip sequence reconstruction
  gap_duration_seconds: number;             // Duration of the inter-trip gap; auditor uses this to verify rest period compliance
}
```

**TripEndPayload**
```typescript
interface TripEndPayload {
  trip_start_event_id: string;              // Closes the bracket opened by TRIP_START
  end_position_geohash: string;             // Geohash precision-7 of terminal position
  end_position_landmark: string | null;
  trip_duration_seconds: number;            // Elapsed time from TRIP_START event_timestamp to this event_timestamp
  total_displacement_meters: number;        // Cumulative haversine displacement across all batches in this trip segment
  batch_ids_in_segment: string[];           // All PostgreSQL batch_ids that fall between TRIP_START and TRIP_END
  batch_count: number;                      // batch_ids_in_segment.length — auditor verifies this matches PostgreSQL query result
  anomaly_event_ids: string[];              // STATE_CHANGE event_ids that occurred during this trip segment
}
```

The `batch_ids_in_segment` array is the critical audit linkage. An auditor reconstructing a specific trip queries PostgreSQL for all `trip_events` rows where `batch_id IN (batch_ids_in_segment)` and recomputes the Merkle root for each batch. If every recomputed root matches the `batch_merkle_root` stored in the corresponding ledger event, the trip record is proven intact.

**StateChangePayload**
```typescript
interface StateChangePayload {
  state_change_subtype: 'speed_anomaly' | 'route_deviation' | 'geofence_entry' | 'geofence_exit' | 'device_offline_recovery';
  position_geohash: string;                 // Geohash precision-7 of the event location
  position_landmark: string | null;
  containing_trip_start_event_id: string;   // The TRIP_START event this anomaly falls within
  // Subtype-specific fields
  speed_kmh: number | null;                 // Populated for speed_anomaly only
  deviation_bearing_delta_degrees: number | null; // Populated for route_deviation only
  geofence_id: string | null;               // Populated for geofence_entry / geofence_exit only
  offline_gap_seconds: number | null;       // Populated for device_offline_recovery only
  offline_ping_count_recovered: number | null; // Pings recovered from IndexedDB after reconnection
}
```

**HeartbeatPayload**
```typescript
interface HeartbeatPayload {
  heartbeat_window_start: string;           // ISO8601 — timestamp of the prior ledger write that started this window
  heartbeat_window_end: string;             // ISO8601 — timestamp of this heartbeat write
  window_duration_seconds: number;          // Should be 900 ± jitter; auditor flags if > 1200 (missed heartbeat)
  ping_count_in_window: number;             // Count of trip_events rows in PostgreSQL for this vehicle during the window
  position_geohash: string;                 // Geohash precision-6 of latest known position — coarser than trip events, idle position is low-sensitivity
  containing_trip_start_event_id: string | null; // Null if vehicle is not in an active trip segment
}
```

---

### Merkle Tree Construction

The `batch_merkle_root` is the cryptographic link between the on-chain event and the off-chain PostgreSQL rows. The construction is deterministic and auditor-reproducible.

**Leaf node definition:** Each ping in the batch produces one leaf. The leaf hash is:

```
leaf_hash(ping) = SHA-256(
  ping.id
  + '|' + ping.vehicle_id
  + '|' + ping.captured_at          // ISO8601, millisecond precision
  + '|' + ping.lat.toFixed(6)       // 6 decimal places = ~11cm precision; fixed precision prevents float serialization divergence
  + '|' + ping.lng.toFixed(6)
  + '|' + ping.speed_kmh.toFixed(1)
  + '|' + ping.heading.toFixed(0)
  + '|' + ping.accuracy_meters.toFixed(1)
)
```

The concatenation format uses `|` as a delimiter. Field order is fixed by this specification. Any deviation in field order, decimal precision, or delimiter produces a different hash — this is intentional, as it means the specification itself is part of the integrity contract.

**Tree construction:** Leaves are sorted by `captured_at` ASC before tree construction. If leaf count is odd, the last leaf is duplicated (standard Merkle padding). Parent nodes are `SHA-256(left_child_hash + right_child_hash)`. The root of the tree is `batch_merkle_root`.

**Reference implementation (TypeScript, runs in both Node.js worker and auditor CLI):**

```typescript
import { createHash } from 'crypto';

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function pingLeafHash(ping: NormalizedPing): string {
  return sha256(
    `${ping.id}|${ping.vehicle_id}|${ping.captured_at}|` +
    `${ping.lat.toFixed(6)}|${ping.lng.toFixed(6)}|` +
    `${ping.speed_kmh.toFixed(1)}|${ping.heading.toFixed(0)}|${ping.accuracy_meters.toFixed(1)}`
  );
}

function buildMerkleRoot(pings: NormalizedPing[]): string {
  if (pings.length === 0) throw new Error('Cannot build Merkle root from empty ping set');

  const sorted = [...pings].sort((a, b) =>
    new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
  );

  let layer: string[] = sorted.map(pingLeafHash);

  while (layer.length > 1) {
    if (layer.length % 2 !== 0) layer.push(layer[layer.length - 1]); // duplicate last leaf
    const nextLayer: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      nextLayer.push(sha256(layer[i] + layer[i + 1]));
    }
    layer = nextLayer;
  }

  return layer[0];
}
```

This function is the single source of truth for Merkle root computation. It is published as a standalone npm package `@flam/merkle-verifier` so auditors can install it independently without access to the FLAM codebase.

---

### Hash Chain Linkage — The Integrity Chain

Each Fabric transaction commits to the hash of the prior transaction for the same vehicle. This is not Fabric's built-in block hash — it is an application-level chain computed over the event payload, independent of block structure. The application-level chain is necessary because Fabric's block hash covers all transactions in a block across all channels and organizations; the application chain proves the vehicle-specific event sequence without requiring access to the full ledger.

**Chain construction (Upstash worker, pre-submission):**

```typescript
async function buildChainedPayload(
  eventType: FabricEventType,
  eventPayload: EventPayload,
  batch: PingBatch,
  vehicleId: string
): Promise<FabricTransactionPayload> {
  // Read prior event from Fabric ledger state
  const priorEventId = await fabricClient.getState(`vehicle:latest_event:${vehicleId}`);
  let priorEventHash: string | null = null;

  if (priorEventId) {
    const priorPayload = await fabricClient.getState(`event:${priorEventId}`);
    if (!priorPayload) throw new Error(`Prior event ${priorEventId} not found in ledger state — integrity chain broken`);
    priorEventHash = sha256(canonicalJSON(JSON.parse(priorPayload)));
  }

  const merkleRoot = buildMerkleRoot(batch.pings);
  const pgBatchHash = sha256(batch.pings.map(p => p.id).sort().join(','));

  const payload: FabricTransactionPayload = {
    schema_version: '2.0',
    event_type: eventType,
    event_id: crypto.randomUUID(),
    org_id: batch.org_id,
    vehicle_id: vehicleId,
    driver_id: batch.driver_id,
    event_timestamp: batch.pings[batch.pings.length - 1].captured_at,
    fabric_write_timestamp: '',             // Populated by chaincode on commit
    shift_date: toNairobiDate(batch.pings[0].captured_at),
    prior_event_id: priorEventId ?? null,
    prior_event_hash: priorEventHash,
    batch_merkle_root: merkleRoot,
    batch_id: batch.batch_id,
    pg_batch_row_count: batch.pings.length,
    pg_batch_hash: pgBatchHash,
    event_payload: eventPayload,
    endorsing_peers: [],                    // Populated by Fabric SDK post-endorsement
    channel_id: 'matatu-compliance-channel'
  };

  return payload;
}
```

`canonicalJSON` is a deterministic JSON serializer that sorts object keys alphabetically at all nesting levels. This is required because `JSON.stringify` does not guarantee key order across JavaScript engines or versions. The `@flam/merkle-verifier` package exports `canonicalJSON` alongside `buildMerkleRoot`.

**Chaincode state updates on commit:**

```go
// chaincode/events.go — simplified
func (c *EventContract) RecordEvent(ctx contractapi.TransactionContextInterface, payloadJSON string) error {
    var payload FabricTransactionPayload
    if err := json.Unmarshal([]byte(payloadJSON), &payload); err != nil {
        return fmt.Errorf("invalid payload: %w", err)
    }

    // Validate schema version
    if payload.SchemaVersion != "2.0" {
        return fmt.Errorf("unsupported schema version: %s", payload.SchemaVersion)
    }

    // Validate event type is in closed taxonomy
    validTypes := map[string]bool{"GENESIS_ENROLLMENT": true, "TRIP_START": true, "TRIP_END": true, "STATE_CHANGE": true, "DAILY_HEARTBEAT": true}
    if !validTypes[payload.EventType] {
        return fmt.Errorf("unknown event type: %s", payload.EventType)
    }

    // Validate prior event hash if chain exists
    if payload.PriorEventID != "" {
        priorBytes, err := ctx.GetStub().GetState("event:" + payload.PriorEventID)
        if err != nil || priorBytes == nil {
            return fmt.Errorf("prior event not found: %s", payload.PriorEventID)
        }
        expectedHash := sha256Hex(canonicalJSON(priorBytes))
        if expectedHash != payload.PriorEventHash {
            return fmt.Errorf("prior event hash mismatch: integrity chain broken at %s", payload.PriorEventID)
        }
    }

    // Stamp fabric_write_timestamp
    txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
    payload.FabricWriteTimestamp = time.Unix(txTimestamp.Seconds, 0).UTC().Format(time.RFC3339)

    // Write event to ledger state
    payloadBytes, _ := json.Marshal(payload)
    if err := ctx.GetStub().PutState("event:"+payload.EventID, payloadBytes); err != nil {
        return err
    }

    // Update vehicle's latest event pointer
    if err := ctx.GetStub().PutState("vehicle:latest_event:"+payload.VehicleID, []byte(payload.EventID)); err != nil {
        return err
    }

    // Emit Fabric event for downstream consumers (PostHog bridge, regulator webhook)
    ctx.GetStub().SetEvent("FLAMEvent", payloadBytes)

    return nil
}
```

The chaincode validates the `prior_event_hash` at commit time. An attempt to insert a fabricated event with a forged `prior_event_hash` will fail endorsement because the endorsing peers independently recompute the hash from ledger state. This means the integrity chain is enforced by the endorsement policy, not just by application logic.

---

### Auditor Verification Workflow

The auditor workflow proves cold-storage integrity: given a vehicle ID, a date range, and access to the PostgreSQL read replica and the Fabric ledger, an auditor can independently verify that the PostgreSQL data has not been modified since it was anchored on-chain.

**Step 1 — Enumerate ledger events for the vehicle and date range**

```bash
# Using @flam/audit-cli (published separately from the main FLAM codebase)
flam-audit events \
  --vehicle-id <uuid> \
  --date-from 2026-03-01 \
  --date-to 2026-03-31 \
  --channel matatu-compliance-channel \
  --output events.json
```

This queries Fabric's rich query interface (CouchDB state database) for all events matching `vehicle_id` and `shift_date` range. Output is a JSON array of `FabricTransactionPayload` objects, sorted by `event_timestamp` ASC.

**Step 2 — Verify the hash chain**

```bash
flam-audit verify-chain --events events.json
```

For each event in the array (starting from index 1), the CLI:
1. Reads `prior_event_id` from the current event
2. Finds the prior event in the array by `event_id`
3. Computes `SHA-256(canonicalJSON(priorEvent))` using the published `@flam/merkle-verifier` implementation
4. Compares against `prior_event_hash` in the current event
5. Reports PASS or FAIL with the divergence point

A full PASS on the chain verification proves that no event has been modified or deleted since it was written — modification of any event would break its hash in all subsequent events.

**Step 3 — Verify batch integrity against PostgreSQL**

```bash
flam-audit verify-batches \
  --events events.json \
  --pg-connection-string <read-replica-dsn> \
  --output batch-verification.json
```

For each event in `events.json`, the CLI:
1. Reads `batch_id` and `pg_batch_row_count` from the event
2. Queries PostgreSQL: `SELECT * FROM trip_events WHERE batch_id = $1 ORDER BY captured_at ASC`
3. Verifies that `COUNT(result) === pg_batch_row_count` — if not, rows have been deleted or inserted
4. Reconstructs the Merkle root from the query result using `buildMerkleRoot(result)`
5. Compares against `batch_merkle_root` from the ledger event
6. Reports PASS or FAIL per batch, with the specific ping IDs that produce the divergence if FAIL

**Step 4 — Verify trip segment completeness (for TRIP_END events)**

```bash
flam-audit verify-trip-segments \
  --events events.json \
  --pg-connection-string <read-replica-dsn>
```

For each TRIP_END event, the CLI:
1. Reads `batch_ids_in_segment` from `event_payload`
2. Queries PostgreSQL for all `trip_events` rows where `batch_id IN (batch_ids_in_segment)`
3. Verifies that the count matches the sum of `pg_batch_row_count` across all events referencing those batch_ids
4. Verifies that the temporal range of the rows falls within `[trip_start_event.event_timestamp, trip_end_event.event_timestamp]`
5. Recomputes `total_displacement_meters` using the haversine function across all rows and compares against the on-chain value (tolerance: ±1 meter for floating-point accumulation)

**Step 5 — Generate compliance report**

```bash
flam-audit report \
  --vehicle-id <uuid> \
  --date-from 2026-03-01 \
  --date-to 2026-03-31 \
  --chain-results chain-verification.json \
  --batch-results batch-verification.json \
  --output compliance-report.pdf
```

The report output includes: event count by type, chain integrity status (PASS/FAIL with first divergence point if FAIL), batch integrity pass rate (e.g., 847/847 batches verified), trip segment count and total displacement, anomaly events with timestamps and positions (geohash decoded to nearest landmark), and a signed attestation block containing the auditor's public key hash and the report generation timestamp.

---

### PostgreSQL Schema Additions Required

Two tables support the integrity chain that do not exist in the current schema:

```sql
-- Stores the anchor state for displacement trigger evaluation
CREATE TABLE vehicle_ledger_anchor_state (
  vehicle_id        UUID PRIMARY KEY REFERENCES vehicles(id),
  last_anchored_lat DOUBLE PRECISION NOT NULL,
  last_anchored_lng DOUBLE PRECISION NOT NULL,
  last_anchored_at  TIMESTAMPTZ NOT NULL,
  last_batch_id     UUID NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracks every Hyperledger write job: enqueued, submitted, confirmed, or failed
CREATE TABLE vehicle_ledger_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  vehicle_id        UUID NOT NULL REFERENCES vehicles(id),
  batch_id          UUID NOT NULL,
  event_type        TEXT NOT NULL CHECK (event_type IN ('GENESIS_ENROLLMENT','TRIP_START','TRIP_END','STATE_CHANGE','DAILY_HEARTBEAT')),
  trigger_reason    TEXT NOT NULL,
  fabric_event_id   UUID,                   -- Populated on confirmed write
  fabric_tx_id      TEXT,                   -- Fabric transaction ID, populated on submission
  status            TEXT NOT NULL DEFAULT 'enqueued' CHECK (status IN ('enqueued','submitted','confirmed','failed')),
  enqueued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at      TIMESTAMPTZ,
  confirmed_at      TIMESTAMPTZ,
  failed_at         TIMESTAMPTZ,
  failure_reason    TEXT,
  retry_count       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_vlj_org_status ON vehicle_ledger_jobs (org_id, status);
CREATE INDEX idx_vlj_vehicle_confirmed ON vehicle_ledger_jobs (vehicle_id, confirmed_at DESC) WHERE status = 'confirmed';
```

The `vehicle_ledger_jobs` table is what the ENGAGEMENT dashboard queries for `ledger_anchor_count`. It is the PostgreSQL mirror of ledger state, maintained by the Upstash worker on job confirmation. It is not the source of truth — the Fabric ledger is — but it is the low-latency read path for dashboard display and upgrade gate evaluation.

---

### Failure Modes & Recovery

**Fabric endorsement failure:** The Upstash worker retries with exponential backoff (3 attempts, 30s / 90s / 270s intervals). After 3 failures, the job is marked `failed` in `vehicle_ledger_jobs` and a Sentry alert fires with `vehicle_id`, `batch_id`, and `failure_reason`. The PostgreSQL data is intact; only the ledger anchor is missing. The recovery path is a manual re-enqueue via admin CLI: `flam-admin requeue-ledger-job --job-id <uuid>`. This is acceptable because the data loss window is bounded to the failed batch, the raw data is safe in PostgreSQL, and the heartbeat mechanism means the chain continues from the next successful write.

**Hash chain break on recovery:** If a ledger job fails and a subsequent job succeeds, the `prior_event_id` of the successful job points to the last successful event, skipping the failed one. The chain is intact across the gap. The auditor verification workflow will surface the gap as a missing batch in the `batch_ids_in_segment` check for any TRIP_END that spans the failure window. This is documented in the compliance report as a `LEDGER_GAP` annotation, not a FAIL — the distinction is that the raw PostgreSQL data for the missing batch is present and verifiable; only the on-chain anchor is absent.

**Clock skew correction:** The `client_clock_offset_ms` field in the batch envelope is used server-side to correct `captured_at` timestamps before Merkle tree construction. If a device clock is skewed by more than 60 seconds (detectable by comparing `captured_at` of the first ping against `server_received_at`), the server applies the offset and logs a `clock_skew_corrected` flag in the `trip_events` row. The Merkle root is computed from the corrected timestamps. The auditor CLI applies the same correction logic when reconstructing the root from PostgreSQL data, ensuring the verification produces a match despite the original skew.

### 4. Analytics, Automation & Compliance UI

## Analytics, Automation & Compliance UI

### The Architectural Contract

Three systems operate in sequence on every batch ingest cycle. DuckDB runs V/T ratio computation as an analytical projection over PostgreSQL trip_events — it is a fraud detection surface, not a ledger dependency. The Genesis Event automation is a sub-2-second side-effect of the first valid ping: it cancels the Upstash SMS nudge job, fires the GENESIS_ENROLLMENT Fabric inscription, and emits the PostHog activation event atomically from the same worker invocation. The compliance UI surfaces the distinction between on-chain verified events and raw pings as a loss-aversion instrument — the Day 28 upgrade gate is framed around legal proof expiry, not feature gating. These three layers compound: V/T ratio anomalies surface fraud, genesis automation converts activated operators before the SMS nudge fires, and the compliance UI converts operators who have accumulated ledger depth before the free-tier cap.

---

### Layer 1: DuckDB V/T Ratio Computation

#### The Core Signal

V/T ratio (Vehicles Transmitting / Total Enrolled Vehicles) is the primary fleet coverage health metric. Computed independently of the Hyperledger ledger, it surfaces missing-ping anomalies as a fraud signal — a vehicle enrolled but not transmitting is either offline, GPS-spoofed, or operating outside the licensed route without device activation. The ledger cannot surface this signal because the ledger only records events that arrive; it has no representation of absence. DuckDB queries PostgreSQL directly via the postgres_scanner extension, running analytical aggregations that would be expensive on the OLTP path.

#### DuckDB Query Architecture

DuckDB is not a persistent service in this stack — it runs as an embedded analytical engine within the Node.js worker process, instantiated per-query with a connection to the PostgreSQL read replica via `postgres_scanner`. This avoids maintaining a separate DuckDB server and keeps the analytical path stateless.

```typescript
import { Database } from 'duckdb-async';

interface VTRatioResult {
  org_id: string;
  shift_date: string;
  total_enrolled_vehicles: number;
  vehicles_with_pings: number;
  vehicles_missing: number;
  vt_ratio: number;                    // vehicles_with_pings / total_enrolled_vehicles
  missing_vehicle_ids: string[];       // Enrolled vehicles with zero pings in the window
  anomalous_vehicle_ids: string[];     // Vehicles with ping gaps > 15 minutes mid-shift
  median_ping_interval_seconds: number;
  p95_ping_interval_seconds: number;
}

async function computeVTRatio(
  orgId: string,
  windowStart: string,  // ISO8601
  windowEnd: string
): Promise<VTRatioResult> {
  const db = await Database.create(':memory:');
  const conn = await db.connect();

  // Attach PostgreSQL read replica
  await conn.run(`
    INSTALL postgres_scanner;
    LOAD postgres_scanner;
    ATTACH '${process.env.PG_READ_REPLICA_DSN}' AS pg (TYPE POSTGRES, READ_ONLY);
  `);

  // Step 1: Enrolled vehicles for this org
  // Step 2: Vehicles that transmitted in the window
  // Step 3: Ping interval distribution for anomaly detection
  const result = await conn.all(`
    WITH enrolled AS (
      SELECT id AS vehicle_id
      FROM pg.vehicles
      WHERE org_id = '${orgId}'
        AND status = 'active'
    ),
    transmitting AS (
      SELECT
        vehicle_id,
        COUNT(*) AS ping_count,
        MIN(captured_at) AS first_ping,
        MAX(captured_at) AS last_ping
      FROM pg.trip_events
      WHERE org_id = '${orgId}'
        AND captured_at BETWEEN '${windowStart}' AND '${windowEnd}'
      GROUP BY vehicle_id
    ),
    ping_intervals AS (
      SELECT
        vehicle_id,
        captured_at,
        LAG(captured_at) OVER (PARTITION BY vehicle_id ORDER BY captured_at) AS prior_ping_at,
        EPOCH(captured_at - LAG(captured_at) OVER (PARTITION BY vehicle_id ORDER BY captured_at)) AS gap_seconds
      FROM pg.trip_events
      WHERE org_id = '${orgId}'
        AND captured_at BETWEEN '${windowStart}' AND '${windowEnd}'
    ),
    anomalous AS (
      SELECT DISTINCT vehicle_id
      FROM ping_intervals
      WHERE gap_seconds > 900  -- 15-minute gap mid-shift is anomalous
        AND prior_ping_at IS NOT NULL
    )
    SELECT
      COUNT(DISTINCT e.vehicle_id)                                    AS total_enrolled,
      COUNT(DISTINCT t.vehicle_id)                                    AS vehicles_transmitting,
      COUNT(DISTINCT e.vehicle_id) - COUNT(DISTINCT t.vehicle_id)    AS vehicles_missing,
      ROUND(
        COUNT(DISTINCT t.vehicle_id)::DOUBLE / NULLIF(COUNT(DISTINCT e.vehicle_id), 0),
        4
      )                                                               AS vt_ratio,
      LIST(CASE WHEN t.vehicle_id IS NULL THEN e.vehicle_id END
           IGNORE NULLS)                                              AS missing_vehicle_ids,
      LIST(DISTINCT a.vehicle_id IGNORE NULLS)                        AS anomalous_vehicle_ids,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pi2.gap_seconds)   AS median_gap_seconds,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pi2.gap_seconds)  AS p95_gap_seconds
    FROM enrolled e
    LEFT JOIN transmitting t ON e.vehicle_id = t.vehicle_id
    LEFT JOIN anomalous a ON e.vehicle_id = a.vehicle_id
    LEFT JOIN ping_intervals pi2 ON e.vehicle_id = pi2.vehicle_id
      AND pi2.prior_ping_at IS NOT NULL
  `);

  await conn.close();
  await db.close();

  const row = result[0];
  return {
    org_id: orgId,
    shift_date: windowStart.slice(0, 10),
    total_enrolled_vehicles: Number(row.total_enrolled),
    vehicles_with_pings: Number(row.vehicles_transmitting),
    vehicles_missing: Number(row.vehicles_missing),
    vt_ratio: Number(row.vt_ratio),
    missing_vehicle_ids: row.missing_vehicle_ids ?? [],
    anomalous_vehicle_ids: row.anomalous_vehicle_ids ?? [],
    median_ping_interval_seconds: Number(row.median_gap_seconds),
    p95_ping_interval_seconds: Number(row.p95_gap_seconds)
  };
}
```

#### Missing-Ping Detection as Fraud Signal

The fraud signal is not the absence of a ledger event — it is the absence of raw pings in PostgreSQL for an enrolled, supposedly active vehicle. Three patterns are distinct:

**Pattern A — Complete Absence:** `vehicles_missing` count > 0. A vehicle enrolled with `status = 'active'` has zero pings in the shift window. This is either device failure, deliberate non-activation (vehicle operating off-platform to avoid revenue tracking), or GPS hardware fault. PostHog event: `vt_ratio_vehicle_absent` with `vehicle_id` and `org_id`.

**Pattern B — Mid-Shift Gap:** `anomalous_vehicle_ids` contains vehicles with a ping gap > 900 seconds (15 minutes) that is not a trip end (i.e., pings resume after the gap). A trip end followed by a trip start is a legitimate gap; a gap mid-route is anomalous. The distinction is made by checking whether a TRIP_END ledger event exists bracketing the gap — if no TRIP_END exists, the gap is unaccounted and flagged. PostHog event: `vt_ratio_mid_shift_gap` with `vehicle_id`, `gap_start`, `gap_end`, `gap_seconds`.

**Pattern C — Ping Interval Inflation:** `p95_ping_interval_seconds` significantly exceeds the expected 5-second interval. A p95 of 45 seconds on a vehicle that should be pinging every 5 seconds indicates either network degradation (legitimate, correlates with `network_quality: 'degraded'` in the batch envelope) or deliberate throttling (fraud signal, no correlation with network quality). The DuckDB query surfaces this at the org level; the per-vehicle breakdown is a drill-down query.

#### V/T Ratio Scheduling

The DuckDB computation runs on two schedules:

**Real-time window (every 10 minutes during shift hours, 05:00–23:00 EAT):** Upstash Redis cron job triggers the computation for all active orgs. Results are written to `org_vt_snapshots` PostgreSQL table with `computed_at` timestamp. The dashboard SSE stream reads the latest snapshot, not the live computation — dashboard latency is snapshot-age (max 10 minutes), not DuckDB query time.

**Daily shift summary (00:30 EAT):** Full-day V/T ratio computation for the prior shift date, written to `org_daily_health_metrics`. This is the source for the weekly SACCO Health Benchmarking Report digest.

```sql
CREATE TABLE org_vt_snapshots (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID NOT NULL REFERENCES organizations(id),
  window_start                TIMESTAMPTZ NOT NULL,
  window_end                  TIMESTAMPTZ NOT NULL,
  total_enrolled_vehicles     INTEGER NOT NULL,
  vehicles_transmitting       INTEGER NOT NULL,
  vehicles_missing            INTEGER NOT NULL,
  vt_ratio                    NUMERIC(5,4) NOT NULL,
  missing_vehicle_ids         UUID[] NOT NULL DEFAULT '{}',
  anomalous_vehicle_ids       UUID[] NOT NULL DEFAULT '{}',
  median_ping_interval_sec    NUMERIC(8,2),
  p95_ping_interval_sec       NUMERIC(8,2),
  computed_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vt_org_computed ON org_vt_snapshots (org_id, computed_at DESC);
```

---

### Layer 2: Genesis Event Automation

#### The Sub-2-Second SLA Contract

The genesis automation is a side-effect chain triggered by the first valid ping from a vehicle. 'First valid ping' is defined as: the first batch from `vehicle_id` where `classifyForLedger` returns `trigger_reason: 'genesis'` — meaning no `vehicle_ledger_anchor_state` row exists for this vehicle. The chain has four steps that must complete within 2 seconds of the batch ACK:

1. Cancel the Upstash Redis SMS nudge job for this vehicle's operator
2. Emit `gps_first_ping_received` to PostHog
3. Enqueue the GENESIS_ENROLLMENT Fabric inscription job
4. Write the initial `vehicle_ledger_anchor_state` row

Steps 1, 2, and 4 are synchronous within the batch ingest handler, completing before the ACK is returned. Step 3 is an async enqueue — the Fabric inscription itself is not synchronous (Fabric endorsement takes 800ms–2s), but the job enqueue is sub-10ms. The 2-second SLA applies to steps 1–4 collectively, not to Fabric confirmation.

#### SMS Nudge Cancellation

The Hour-4 and Hour-24 SMS nudge jobs are scheduled in Upstash Redis at the time of vehicle enrollment, keyed by `vehicle_id`. The cancellation path:

```typescript
interface SMSNudgeJobRef {
  hour4_job_id: string | null;
  hour24_job_id: string | null;
  scheduled_at: string;
  cancelled_at: string | null;
}

async function cancelSMSNudgeJobs(vehicleId: string): Promise<void> {
  const refKey = `sms:nudge:refs:${vehicleId}`;
  const refRaw = await redis.get(refKey);

  if (!refRaw) {
    // No nudge jobs scheduled — vehicle may have been enrolled without the nudge flow
    // This is not an error; log and continue
    await posthog.capture('sms_nudge_cancel_no_ref', { vehicle_id: vehicleId });
    return;
  }

  const ref: SMSNudgeJobRef = JSON.parse(refRaw);

  // Cancel both jobs — Upstash Queue cancel is idempotent; already-fired jobs return success
  const cancellations = await Promise.allSettled([
    ref.hour4_job_id ? queue.cancel(ref.hour4_job_id) : Promise.resolve(),
    ref.hour24_job_id ? queue.cancel(ref.hour24_job_id) : Promise.resolve()
  ]);

  // Log cancellation failures to Sentry — they are not fatal but indicate timing edge cases
  cancellations.forEach((result, i) => {
    if (result.status === 'rejected') {
      Sentry.captureMessage('SMS nudge cancellation failed', {
        extra: { vehicle_id: vehicleId, job_index: i, reason: result.reason }
      });
    }
  });

  // Update the ref record to mark cancellation
  const updatedRef: SMSNudgeJobRef = {
    ...ref,
    cancelled_at: new Date().toISOString()
  };
  await redis.set(refKey, JSON.stringify(updatedRef), { ex: 86400 }); // retain for 24h for audit
}
```

The `Promise.allSettled` pattern is critical: if the Hour-4 job has already fired (the operator received the SMS before activating GPS), the cancel call returns success from Upstash's idempotent cancel endpoint. The Hour-24 job is still cancelled, preventing a redundant SMS to an operator who has already activated. The failure case — Upstash cancel returning a non-2xx — is logged to Sentry but does not block the genesis chain. A duplicate SMS is a UX friction cost, not a data integrity risk.

#### Genesis Automation Orchestrator

This function runs inside the `ingestBatch` handler, after the Raw Path INSERT and idempotency check, gated on the genesis classification:

```typescript
async function runGenesisAutomation(
  batch: PingBatch,
  classification: LedgerClassification
): Promise<void> {
  if (classification.trigger_reason !== 'genesis') return;

  // Idempotency guard: genesis automation must run exactly once per vehicle
  const genesisLockKey = `genesis:lock:${batch.vehicle_id}`;
  const acquired = await redis.set(genesisLockKey, '1', { nx: true, ex: 3600 });
  if (!acquired) {
    // Another concurrent batch for the same vehicle already triggered genesis
    // This is a race condition on the first two batches arriving simultaneously
    // The lock holder completes genesis; this invocation exits cleanly
    return;
  }

  // Step 1: Cancel SMS nudge jobs — sub-50ms Redis operations
  await cancelSMSNudgeJobs(batch.vehicle_id);

  // Step 2: Emit PostHog activation event
  // This fires before Fabric confirmation — activation telemetry must not wait on Fabric
  await posthog.capture('gps_first_ping_received', {
    distinct_id: batch.driver_id ?? batch.org_id,
    properties: {
      org_id: batch.org_id,
      vehicle_id: batch.vehicle_id,
      driver_id: batch.driver_id,
      batch_id: batch.batch_id,
      ping_count: batch.pings.length,
      flush_trigger: batch.flush_trigger,
      network_quality: batch.network_quality_at_flush,
      first_ping_captured_at: batch.pings[0].captured_at,
      $set: { activated_at: new Date().toISOString() }
    }
  });

  // Step 3: Write initial anchor state — this enables displacement tracking from ping 1
  const firstPing = batch.pings[0];
  await db.insertInto('vehicle_ledger_anchor_state').values({
    vehicle_id: batch.vehicle_id,
    last_anchored_lat: firstPing.lat,
    last_anchored_lng: firstPing.lng,
    last_anchored_at: firstPing.captured_at,
    last_batch_id: batch.batch_id,
    updated_at: new Date().toISOString()
  }).execute();

  // Also write to Redis cache immediately — next batch ingest must read the anchor state
  await redis.set(
    `anchor:${batch.vehicle_id}`,
    JSON.stringify({
      last_anchored_lat: firstPing.lat,
      last_anchored_lng: firstPing.lng,
      last_anchored_at: firstPing.captured_at,
      last_batch_id: batch.batch_id
    }),
    { ex: 300 }
  );

  // Step 4: Enqueue GENESIS_ENROLLMENT Fabric inscription
  // The classification object carries trigger_reason: 'genesis' — the worker reads this
  // to construct the GenesisPayload with route_license_ids fetched from PostgreSQL
  await queue.enqueue('ledger-jobs', {
    type: 'ledger_inscription',
    event_type: 'GENESIS_ENROLLMENT',
    batch_id: batch.batch_id,
    vehicle_id: batch.vehicle_id,
    org_id: batch.org_id,
    trigger_reason: 'genesis',
    enqueued_at: new Date().toISOString()
  });

  // Step 5: Schedule the first heartbeat window
  // Without this, the vehicle has no heartbeat timer until the first non-genesis ledger write
  await scheduleHeartbeatJob(batch.vehicle_id, batch.org_id, batch.batch_id);
}
```

#### GENESIS_ENROLLMENT Fabric Worker

The Upstash worker that processes `GENESIS_ENROLLMENT` jobs fetches the route license IDs and device IMEI from PostgreSQL, constructs the `GenesisPayload`, and submits the Fabric transaction. The `prior_event_id` is null for genesis events — the chaincode accepts this as the chain root.

```typescript
async function processGenesisEnrollmentJob(job: LedgerJob): Promise<void> {
  // Fetch vehicle enrollment data from PostgreSQL
  const vehicle = await db
    .selectFrom('vehicles')
    .leftJoin('vehicle_route_assignments', 'vehicles.id', 'vehicle_route_assignments.vehicle_id')
    .leftJoin('vehicle_devices', 'vehicles.id', 'vehicle_devices.vehicle_id')
    .select([
      'vehicles.id',
      'vehicles.registration_number',
      'vehicles.org_id',
      'vehicle_devices.imei',
      'vehicles.enrolled_by_operator_id',
      db.fn.agg<string[]>('array_agg', ['vehicle_route_assignments.route_license_id']).as('route_license_ids')
    ])
    .where('vehicles.id', '=', job.vehicle_id)
    .groupBy(['vehicles.id', 'vehicle_devices.imei'])
    .executeTakeFirstOrThrow();

  // Fetch the triggering batch's first ping for initial position
  const firstPing = await db
    .selectFrom('trip_events')
    .select(['lat', 'lng', 'captured_at'])
    .where('batch_id', '=', job.batch_id)
    .orderBy('captured_at', 'asc')
    .limit(1)
    .executeTakeFirstOrThrow();

  // Construct GenesisPayload
  const genesisPayload: GenesisPayload = {
    sacco_name: await getOrgName(vehicle.org_id),
    vehicle_registration: vehicle.registration_number,
    device_imei_hash: sha256(vehicle.imei),
    enrollment_operator_id: vehicle.enrolled_by_operator_id,
    route_license_ids: vehicle.route_license_ids.filter(Boolean),
    supersedes_event_id: null,
    initial_position_geohash: encodeGeohash(firstPing.lat, firstPing.lng, 6)
  };

  // Build the full Fabric transaction payload
  // prior_event_id is null for genesis — buildChainedPayload handles this case
  const fabricPayload = await buildChainedPayload(
    'GENESIS_ENROLLMENT',
    genesisPayload,
    await reconstructBatchFromDB(job.batch_id),
    job.vehicle_id
  );

  // Submit to Fabric
  await submitFabricTransaction(fabricPayload, job);
}
```

#### Genesis Timing Guarantee

The 2-second SLA is enforced by the structure of the handler: Steps 1–4 of the genesis automation run before `ingestBatch` returns the ACK. The critical path is:

- Redis SET NX (genesis lock): ~2ms
- Upstash cancel × 2: ~15ms each = 30ms
- PostHog capture (async, non-blocking after fire): ~5ms to enqueue
- PostgreSQL INSERT (anchor state): ~20ms
- Redis SET (anchor cache): ~2ms
- Upstash enqueue (ledger job): ~8ms
- Upstash enqueue (heartbeat job): ~8ms

Total synchronous path: ~75ms added to the batch ingest handler. The ACK returns at ~75ms + PostgreSQL bulk INSERT time (~60ms for 12 pings) = ~135ms. Well within the 2-second SLA. The PostHog capture is fire-and-forget after the initial enqueue — it does not block the response.

---

### Layer 3: Loss-Aversion Compliance UI

#### The Distinction That Drives Conversion

The compliance UI surfaces two numbers that most fleet operators conflate: **Raw Pings** and **On-Chain Verified Events**. The distinction is not technical pedantry — it is the legal argument. Raw pings in PostgreSQL are mutable records on a server the operator does not control. On-chain verified events are cryptographically anchored records on a distributed ledger that no single party can alter. In a NTSA dispute, a route license revocation hearing, or an insurance claim, only the second category is admissible as tamper-evident evidence. The UI makes this distinction visceral, not abstract.

#### Dashboard Component Architecture

The compliance panel lives in the Operations Dashboard, visible to ORG_CHAIRs and fleet owners. It is not a separate page — it is a persistent panel in the dashboard sidebar that updates in real-time via SSE. The panel has three states: Pre-Genesis (no ledger events yet), Active (accumulating ledger depth), and Gate (approaching or at the free-tier cap).

```svelte
<!-- src/routes/(dashboard)/operations/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CompliancePanel from '$lib/components/CompliancePanel.svelte';
  import type { CompliancePanelData } from '$lib/types/compliance';

  let complianceData: CompliancePanelData | null = null;
  let eventSource: EventSource | null = null;

  onMount(() => {
    eventSource = new EventSource('/api/v1/dashboard/compliance-stream');
    eventSource.addEventListener('compliance_update', (e) => {
      complianceData = JSON.parse(e.data);
    });
  });

  onDestroy(() => eventSource?.close());
</script>

{#if complianceData}
  <CompliancePanel data={complianceData} />
{/if}
```

```svelte
<!-- src/lib/components/CompliancePanel.svelte -->
<script lang="ts">
  import type { CompliancePanelData } from '$lib/types/compliance';
  import UpgradeGate from './UpgradeGate.svelte';

  export let data: CompliancePanelData;

  // Derived display values
  $: verifiedEvents = data.ledger_anchor_count;
  $: rawPings = data.raw_ping_count;
  $: freeTierCap = data.free_tier_cap;           // 1000 anchors
  $: daysRemaining = data.days_until_cap;        // Computed server-side
  $: usagePercent = Math.min((verifiedEvents / freeTierCap) * 100, 100);
  $: isApproachingCap = verifiedEvents >= freeTierCap * 0.8;
  $: isAtCap = verifiedEvents >= freeTierCap;
  $: showGate = verifiedEvents >= 500;           // Gate visible from 500 anchors onward
</script>

<div class="compliance-panel" class:approaching-cap={isApproachingCap} class:at-cap={isAtCap}>
  <!-- Header -->
  <div class="panel-header">
    <span class="panel-title">Compliance Record</span>
    <span class="panel-subtitle">Hyperledger Fabric · {data.channel_id}</span>
  </div>

  <!-- The Core Distinction -->
  <div class="metric-pair">
    <div class="metric verified">
      <span class="metric-value">{verifiedEvents.toLocaleString()}</span>
      <span class="metric-label">On-Chain Verified Events</span>
      <span class="metric-sub">Tamper-evident · Court-admissible</span>
    </div>
    <div class="metric raw">
      <span class="metric-value">{rawPings.toLocaleString()}</span>
      <span class="metric-label">Raw GPS Pings</span>
      <span class="metric-sub">Operational data · Not ledger-anchored</span>
    </div>
  </div>

  <!-- Chain Integrity Indicator -->
  <div class="chain-status" class:healthy={data.chain_integrity === 'verified'}>
    <span class="chain-icon">{data.chain_integrity === 'verified' ? '⬡' : '⚠'}</span>
    <span class="chain-label">
      {#if data.chain_integrity === 'verified'}
        Hash chain intact · Last verified {data.last_verified_at_relative}
      {:else}
        Chain verification pending · {data.pending_jobs} jobs in queue
      {/if}
    </span>
  </div>

  <!-- Usage Bar -->
  <div class="usage-track">
    <div class="usage-bar" style="width: {usagePercent}%" />
    <span class="usage-label">
      {verifiedEvents.toLocaleString()} / {freeTierCap.toLocaleString()} free-tier events
    </span>
  </div>

  <!-- Upgrade Gate (visible from 500 anchors) -->
  {#if showGate}
    <UpgradeGate
      {verifiedEvents}
      {freeTierCap}
      {daysRemaining}
      {isAtCap}
      orgId={data.org_id}
    />
  {/if}

  <!-- Recent Ledger Events Feed -->
  <div class="recent-events">
    <span class="events-header">Recent Ledger Events</span>
    {#each data.recent_events as event}
      <div class="event-row" class:anomaly={event.event_type === 'STATE_CHANGE'}>
        <span class="event-type">{event.event_type}</span>
        <span class="event-vehicle">{event.vehicle_registration}</span>
        <span class="event-time">{event.event_timestamp_relative}</span>
        <span class="event-hash" title={event.fabric_event_id}>
          {event.fabric_event_id.slice(0, 8)}…
        </span>
      </div>
    {/each}
  </div>
</div>
```

#### The Upgrade Gate Component — Day 28 Loss-Aversion Frame

The gate is not a paywall. It is a legal proof expiry notice. The copy is engineered around three loss-aversion anchors: the asset being lost (verified compliance records), the consequence of loss (inability to defend against NTSA enforcement actions), and the irreversibility of the loss (deleted ledger anchors cannot be reconstructed).

```svelte
<!-- src/lib/components/UpgradeGate.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';

  export let verifiedEvents: number;
  export let freeTierCap: number;
  export let daysRemaining: number | null;  // null if cap reached
  export let isAtCap: boolean;
  export let orgId: string;

  let initiatingPayment = false;

  async function initiateUpgrade() {
    initiatingPayment = true;
    // Trigger M-Pesa STK push via server action
    const response = await fetch('/api/v1/billing/initiate-upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, plan: 'starter' })
    });
    const { checkout_request_id } = await response.json();
    // Navigate to payment confirmation page
    await goto(`/billing/confirm?ref=${checkout_request_id}`);
  }

  // Urgency copy varies by proximity to cap
  $: urgencyLevel = isAtCap ? 'expired' : daysRemaining !== null && daysRemaining <= 3 ? 'critical' : 'warning';

  $: headlineCopy = {
    expired: 'Your compliance record has stopped updating.',
    critical: `Your compliance record stops updating in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
    warning: `Your compliance record is ${Math.round((verifiedEvents / freeTierCap) * 100)}% full.`
  }[urgencyLevel];

  $: bodyCopy = {
    expired: `You have ${verifiedEvents.toLocaleString()} verified events on the Hyperledger Fabric ledger. No new events are being anchored. In an NTSA enforcement action, unanchored GPS data is not tamper-evident and cannot be used as legal proof of route compliance. Your existing ${verifiedEvents.toLocaleString()} events are at risk of being pruned from the free tier within 30 days.`,
    critical: `You have ${verifiedEvents.toLocaleString()} verified events on the Hyperledger Fabric ledger. When the free tier limit is reached, new GPS activity will no longer be anchored to the immutable ledger. Your vehicles will continue transmitting location data, but that data will not be court-admissible as tamper-evident evidence.`,
    warning: `You have ${verifiedEvents.toLocaleString()} verified events on the Hyperledger Fabric ledger. Each event is a cryptographically signed proof of your vehicle's position, speed, and route compliance at a specific moment in time. This record is your legal defence against route license disputes and NTSA enforcement actions.`
  }[urgencyLevel];
</script>

<div class="upgrade-gate" class:gate-expired={isAtCap} class:gate-critical={urgencyLevel === 'critical'}>
  <div class="gate-icon">
    {#if isAtCap}
      <svg><!-- lock icon --></svg>
    {:else}
      <svg><!-- shield-warning icon --></svg>
    {/if}
  </div>

  <div class="gate-copy">
    <p class="gate-headline">{headlineCopy}</p>
    <p class="gate-body">{bodyCopy}</p>
  </div>

  <div class="gate-action">
    <button
      class="upgrade-button"
      on:click={initiateUpgrade}
      disabled={initiatingPayment}
    >
      {#if initiatingPayment}
        Sending M-Pesa request…
      {:else}
        Protect My Compliance Record — Upgrade via M-Pesa
      {/if}
    </button>
    <span class="gate-pricing">From KES 2,500/month · Cancel anytime</span>
  </div>

  {#if isAtCap}
    <div class="gate-countdown">
      <span class="countdown-label">Free-tier pruning begins in</span>
      <span class="countdown-value">{data.days_until_pruning} days</span>
      <span class="countdown-sub">Existing verified events will be removed from the ledger after this date if no subscription is active.</span>
    </div>
  {/if}
</div>
```

#### SSE Stream — Compliance Panel Data Feed

The SSE endpoint serves the compliance panel data. It reads from PostgreSQL (via Supabase Realtime subscriptions on `vehicle_ledger_jobs`) and the `org_vt_snapshots` table. The stream emits on every confirmed ledger job for the org — typically every 30–90 seconds during active operations.

```typescript
// src/routes/api/v1/dashboard/compliance-stream/+server.ts
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { redis } from '$lib/server/redis';

export const GET: RequestHandler = async ({ locals }) => {
  const { session, org } = locals;
  if (!session || !org) return new Response(null, { status: 401 });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendUpdate = async () => {
        const data = await buildCompliancePanelData(org.id);
        controller.enqueue(encoder.encode(
          `event: compliance_update\ndata: ${JSON.stringify(data)}\n\n`
        ));
      };

      // Initial payload
      await sendUpdate();

      // Subscribe to ledger job confirmations via Supabase Realtime
      const subscription = supabase
        .channel(`compliance:${org.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'vehicle_ledger_jobs',
          filter: `org_id=eq.${org.id}`
        }, async (payload) => {
          if (payload.new.status === 'confirmed') {
            await sendUpdate();
          }
        })
        .subscribe();

      // Heartbeat every 30s to keep connection alive
      const heartbeatInterval = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30_000);

      return () => {
        subscription.unsubscribe();
        clearInterval(heartbeatInterval);
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
};

async function buildCompliancePanelData(orgId: string): Promise<CompliancePanelData> {
  const [ledgerStats, rawPingCount, recentEvents, vtSnapshot] = await Promise.all([
    db.selectFrom('vehicle_ledger_jobs')
      .select([
        db.fn.count('id').filterWhere('status', '=', 'confirmed').as('anchor_count'),
        db.fn.count('id').filterWhere('status', '=', 'enqueued').as('pending_jobs')
      ])
      .where('org_id', '=', orgId)
      .executeTakeFirstOrThrow(),

    db.selectFrom('trip_events')
      .select(db.fn.count('id').as('total_pings'))
      .where('org_id', '=', orgId)
      .executeTakeFirstOrThrow(),

    db.selectFrom('vehicle_ledger_jobs')
      .innerJoin('vehicles', 'vehicle_ledger_jobs.vehicle_id', 'vehicles.id')
      .select([
        'vehicle_ledger_jobs.event_type',
        'vehicle_ledger_jobs.fabric_event_id',
        'vehicle_ledger_jobs.confirmed_at',
        'vehicles.registration_number as vehicle_registration'
      ])
      .where('vehicle_ledger_jobs.org_id', '=', orgId)
      .where('vehicle_ledger_jobs.status', '=', 'confirmed')
      .orderBy('vehicle_ledger_jobs.confirmed_at', 'desc')
      .limit(8)
      .execute(),

    db.selectFrom('org_vt_snapshots')
      .selectAll()
      .where('org_id', '=', orgId)
      .orderBy('computed_at', 'desc')
      .limit(1)
      .executeTakeFirst()
  ]);

  const anchorCount = Number(ledgerStats.anchor_count);
  const freeTierCap = 1000;
  const daysUntilCap = anchorCount < freeTierCap
    ? estimateDaysUntilCap(anchorCount, freeTierCap, orgId)
    : null;

  return {
    org_id: orgId,
    ledger_anchor_count: anchorCount,
    raw_ping_count: Number(rawPingCount.total_pings),
    free_tier_cap: freeTierCap,
    days_until_cap: daysUntilCap,
    days_until_pruning: anchorCount >= freeTierCap ? 30 : null,
    chain_integrity: Number(ledgerStats.pending_jobs) === 0 ? 'verified' : 'pending',
    pending_jobs: Number(ledgerStats.pending_jobs),
    last_verified_at_relative: recentEvents[0]?.confirmed_at
      ? relativeTime(recentEvents[0].confirmed_at)
      : 'never',
    recent_events: recentEvents.map(e => ({
      event_type: e.event_type,
      fabric_event_id: e.fabric_event_id ?? '',
      vehicle_registration: e.vehicle_registration,
      event_timestamp_relative: relativeTime(e.confirmed_at)
    })),
    vt_ratio: vtSnapshot?.vt_ratio ?? null,
    missing_vehicles: vtSnapshot?.missing_vehicle_ids ?? [],
    channel_id: 'matatu-compliance-channel'
  };
}
```

#### Day 28 Gate Trigger — Server-Side Evaluation

The Day 28 gate is not calendar-based — it is anchor-count-based with a day-28 floor. The gate activates when `ledger_anchor_count >= 500` AND `days_since_first_ping >= 28`. This prevents the gate from firing on orgs that have accumulated 500 anchors in 3 days due to large fleets — those orgs have not yet experienced the full compliance value of the ledger and are not psychologically ready for the loss-aversion frame. Day 28 is the minimum maturation period.

```typescript
async function evaluateUpgradeGate(orgId: string): Promise<UpgradeGateState> {
  const [anchorCount, firstPingDate, subscriptionStatus] = await Promise.all([
    getAnchorCount(orgId),
    getFirstPingDate(orgId),
    getSubscriptionStatus(orgId)
  ]);

  if (subscriptionStatus === 'active') {
    return { show_gate: false, reason: 'active_subscriber' };
  }

  const daysSinceFirstPing = firstPingDate
    ? Math.floor((Date.now() - new Date(firstPingDate).getTime()) / 86_400_000)
    : 0;

  const freeTierCap = 1000;
  const gateThreshold = 500;
  const maturationPeriod = 28;

  if (anchorCount < gateThreshold || daysSinceFirstPing < maturationPeriod) {
    return { show_gate: false, reason: 'below_threshold' };
  }

  return {
    show_gate: true,
    anchor_count: anchorCount,
    free_tier_cap: freeTierCap,
    days_since_first_ping: daysSinceFirstPing,
    urgency: anchorCount >= freeTierCap ? 'expired' : anchorCount >= freeTierCap * 0.9 ? 'critical' : 'warning'
  };
}
```

#### M-Pesa STK Push Integration

The upgrade button triggers `POST /api/v1/billing/initiate-upgrade`, which calls the Safaricom Daraja STK Push API. The operator receives an M-Pesa prompt on their phone — no card details, no bank transfer, no friction outside the Kenyan payment norm.

```typescript
// src/routes/api/v1/billing/initiate-upgrade/+server.ts
export const POST: RequestHandler = async ({ request, locals }) => {
  const { org } = locals;
  const { plan } = await request.json();

  const planPricing = { starter: 250000, pro: 500000, business: 900000 }; // KES in cents
  const amount = planPricing[plan as keyof typeof planPricing];
  if (!amount) return new Response(null, { status: 400 });

  // Fetch operator's M-Pesa phone number
  const operator = await db
    .selectFrom('organization_members')
    .innerJoin('profiles', 'organization_members.user_id', 'profiles.id')
    .select(['profiles.phone_number'])
    .where('organization_members.org_id', '=', org.id)
    .where('organization_members.role', '=', 'ORG_CHAIR')
    .executeTakeFirstOrThrow();

  // Initiate STK Push via Daraja API
  const stkResponse = await initiateMpesaSTKPush({
    phone_number: operator.phone_number,
    amount: amount / 100, // Daraja expects KES, not cents
    account_reference: `FLAM-${org.id.slice(0, 8).toUpperCase()}`,
    transaction_desc: `FLAM ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Subscription`,
    callback_url: `${process.env.PUBLIC_BASE_URL}/api/v1/billing/mpesa-callback`
  });

  // Store pending payment record
  await db.insertInto('pending_payments').values({
    org_id: org.id,
    plan,
    amount_kes: amount / 100,
    checkout_request_id: stkResponse.CheckoutRequestID,
    merchant_request_id: stkResponse.MerchantRequestID,
    status: 'pending',
    initiated_at: new Date().toISOString()
  }).execute();

  // PostHog: upgrade flow initiated
  await posthog.capture('upgrade_stk_push_initiated', {
    distinct_id: org.id,
    properties: { org_id: org.id, plan, amount_kes: amount / 100 }
  });

  return new Response(
    JSON.stringify({ checkout_request_id: stkResponse.CheckoutRequestID }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
```

---

### Lifecycle Integration

**ACTIVATION:** The genesis automation fires within 135ms of the first valid ping batch — SMS nudge cancelled, PostHog event captured, anchor state written, Fabric inscription enqueued. The PWA driver sees no change; the magic moment is silent from the driver's perspective and loud from the operator's dashboard perspective. The compliance panel transitions from its pre-genesis empty state to the Active state on the next SSE push, typically within 30–90 seconds of the first ping (Fabric confirmation latency).

**ENGAGEMENT:** The compliance panel is a persistent dashboard fixture. Every shift, the ORG_CHAIR sees the verified event count increment in real-time. The V/T ratio widget surfaces missing vehicles as named entries ('KBZ 123X has not transmitted today'), converting abstract fleet health into actionable operator accountability. The distinction between on-chain verified events and raw pings is visible on every dashboard session — the cognitive anchor that makes the upgrade gate copy land with full force on Day 28.

**MONETISATION:** The upgrade gate fires at 500 verified anchors AND Day 28. The M-Pesa STK push is the only conversion action — no redirect, no form, no card number. The operator taps their phone to approve. The compliance panel transitions to a paid-tier state on payment confirmation, the free-tier cap disappears, and the ledger continues accumulating without interruption. The loss-aversion copy is retired; the panel copy shifts to 'Compliance record active · Unlimited anchoring'.

**RETENTION:** The V/T ratio daily computation feeds the weekly SACCO Health Benchmarking Report. Missing-vehicle anomalies and mid-shift gap detections are surfaced in the report as named vehicles with timestamps — the ORG_CHAIR has a specific action to take (investigate KBZ 123X, replace the GPS device on KCA 456Y) that requires returning to the dashboard. The compliance panel's chain integrity indicator gives a reason to return even when no anomalies exist: watching the verified event count grow is the behavioral reinforcement loop that makes the compliance narrative feel real before the upgrade gate fires.

### 5. Technical Execution

**Overview**
Building a smart-batching GPS ingest pipeline with a dual-path filter gate that separates PostgreSQL as the operational truth store from Hyperledger Fabric as the compliance audit layer — reducing Fabric writes by 96%+ while preserving 100% critical-event auditability. Confidence: 92%.

**What We're Building**
1. PWA IndexedDB ping buffer with four flush triggers (count, time, session-end, network-recovery) and exponential backoff retry
2. Batch ingest endpoint with idempotency, bulk PostgreSQL INSERT, and post-commit ledger classifier
3. Dual-path filter gate: displacement threshold (250m), status-change detector, and 15-minute heartbeat scheduler
4. Upstash worker that builds Merkle-rooted Fabric transactions from classified batches, maintaining a vehicle-level hash chain
5. Compliance panel SSE stream surfacing verified anchor count vs raw pings with loss-aversion upgrade gate at 500 anchors + Day 28

**Technical Tasks**
1. Create PWA buffer + flush logic — apps/driver-pwa/src/lib/gps/buffer.ts
2. Create batch ingest endpoint with idempotency + bulk INSERT — src/routes/api/v1/pings/batch/+server.ts
3. Implement classifyForLedger with displacement check, status-change detector, and heartbeat scheduler — src/lib/server/ledger/classifier.ts
4. Add vehicle_ledger_anchor_state and vehicle_ledger_jobs tables — supabase/migrations/YYYYMMDD_ledger_schema.sql
5. Implement Upstash ledger worker: Merkle root construction, hash chain linkage, Fabric transaction submission — src/lib/server/workers/ledger-inscription.ts
6. Build compliance panel SSE endpoint reading vehicle_ledger_jobs + org_vt_snapshots — src/routes/api/v1/dashboard/compliance-stream/+server.ts
7. Wire genesis automation (nudge cancel + PostHog + anchor seed + GENESIS_ENROLLMENT enqueue) into batch ingest handler — src/lib/server/ledger/genesis.ts

**Data Triggers**
- PWA flush: unsynced ping count >= 12 OR 90s elapsed OR visibilitychange/beforeunload OR navigator.online after offline
- Ledger write: haversine displacement >= 250m from last anchor OR status-change event detected in batch OR 15-minute heartbeat job fires with no prior write
- Genesis automation: classifyForLedger returns trigger_reason === 'genesis' (no vehicle_ledger_anchor_state row exists)
- Upgrade gate render: ledger_anchor_count >= 500 AND days_since_first_ping >= 28 AND subscription status !== 'active'

**Success Metrics**
- Fabric transaction volume reduced >= 90% vs naive per-ping baseline (target: 96.7% blended fleet)
- Zero GPS ping data loss: all unsynced pings survive tab kill, offline periods up to 72h
- Genesis automation completes within 2s of first batch ACK (Steps 1-4 synchronous in handler)
- 100% of status-change events (trip_start, trip_end, speed_anomaly, route_deviation, offline_recovery) produce a ledger write unconditionally
- Upgrade gate M-Pesa STK push initiation rate >= 25% of orgs that reach the 500-anchor + Day-28 threshold

## Todo

- [ ] Create PWA IndexedDB ping buffer, four flush triggers (count/time/session-end/network-recovery), exponential backoff retry, and `sendBeacon` session-end path — `apps/driver-pwa/src/lib/gps/buffer.ts`
- [ ] Add `vehicle_ledger_anchor_state` and `vehicle_ledger_jobs` tables, plus `org_vt_snapshots` — `supabase/migrations/YYYYMMDD_ledger_schema.sql`
- [ ] Create batch ingest endpoint: Upstash Redis idempotency check, bulk PostgreSQL INSERT, then invoke `classifyForLedger` (haversine displacement ≥250m, status-change detector, heartbeat scheduler) and `runGenesisAutomation` (nudge cancel, PostHog capture, anchor seed, GENESIS_ENROLLMENT enqueue) post-commit — `src/routes/api/v1/pings/batch/+server.ts`, `src/lib/server/ledger/classifier.ts`, `src/lib/server/ledger/genesis.ts`
- [ ] Implement Upstash ledger worker: Merkle root construction, prior-event hash-chain linkage, typed `FabricTransactionPayload` assembly, Fabric transaction submission, and `vehicle_ledger_jobs` status updates (enqueued → confirmed/failed); include heartbeat delayed-job scheduling and DuckDB V/T ratio computation writing to `org_vt_snapshots` — `src/lib/server/workers/ledger-inscription.ts`
- [ ] Build compliance panel SSE endpoint aggregating `vehicle_ledger_jobs` anchor count, raw ping count, pending jobs, and latest V/T snapshot; wire `CompliancePanel.svelte` and `UpgradeGate.svelte` with loss-aversion copy and M-Pesa STK push action; add Day-28 + 500-anchor gate evaluation and `/api/v1/billing/initiate-upgrade` endpoint — `src/routes/api/v1/dashboard/compliance-stream/+server.ts`, `src/lib/components/CompliancePanel.svelte`, `src/lib/components/UpgradeGate.svelte`, `src/routes/api/v1/billing/initiate-upgrade/+server.ts`
- [ ] Manual end-to-end test: activate a new vehicle and confirm genesis automation completes within 2s (SMS nudge cancelled, PostHog `gps_first_ping_received` fired, anchor state written, GENESIS_ENROLLMENT job enqueued); drive 250m+ of simulated displacement and verify exactly one Fabric transaction is written per batch threshold crossing; idle a vehicle for 40 minutes and confirm exactly 2–3 heartbeat ledger writes; trigger a speed anomaly (>80 km/h ping) and confirm an unconditional STATE_CHANGE ledger write; verify Fabric transaction volume is ≥90% below naive per-ping baseline across a 50-vehicle simulated shift; confirm the upgrade gate renders at 500 anchors + Day 28 and the M-Pesa STK push initiates successfully.
