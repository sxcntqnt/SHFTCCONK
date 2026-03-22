// src/routes/api/gps/ingest/+server.ts
//
// POST /api/gps/ingest
//
// Device-facing GPS ingestion endpoint.
// Called by the MQTT Consumer service after parsing NE06M tracker messages.
// NOT called directly by browsers — the WebSocket gateway handles client updates.
//
// AUTH:
//   Devices authenticate via a pre-shared API key in the Authorization header:
//     Authorization: Bearer <INGEST_API_KEY>
//   The MQTT Consumer service holds this key server-side.
//   Individual GPS devices authenticate with the MQTT broker via X.509 certs —
//   by the time a message reaches this route, the consumer has already
//   validated the device identity from the MQTT topic (gps/{orgId}/{vehicleId}).
//
// HOT PATH:
//   streamClient.xadd → gps:realtime:{orgId}   (WebSocket gateway reads this)
//   geoClient.call    → SET fleet {vehicleId}   (Tile38 position + geofence eval)
//
// COLD PATH:
//   streamClient.xadd → gps:batch:{orgId}       (Batch Writer drains to TimescaleDB)
//
// MOVEMENT FILTER:
//   Skips hot path broadcast if vehicle moved < 20m AND < 5s since last update
//   AND no critical event is set. Cold path always receives every event.
//
// PAYLOAD (compact, matches architecture spec):
//   { v, id, t, la, lo, sp, hd, al, sa, fx, hdop, rn, ev }

import { json }             from "@sveltejs/kit"
import type { RequestHandler } from "$lib/types"
import { streamClient, geoClient } from "$lib/server/redis"
import { INGEST_API_KEY }   from "$env/static/private"

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_MOVE_METRES    = 20      // movement filter threshold
const MIN_BROADCAST_MS   = 5_000  // minimum time between broadcasts per vehicle
const LATEST_STATE_TTL   = 30     // seconds — Redis key TTL for vehicle state
const STREAM_MAXLEN      = 5_000  // max entries in realtime stream per org
const BATCH_MAXLEN       = 100_000 // max entries in batch stream per org

// Critical event types that bypass the movement filter
const CRITICAL_EVENTS = new Set([
  "GEOFENCE_ENTER", "GEOFENCE_EXIT",
  "OVERSPEED", "PANIC_BUTTON",
  "IGNITION_ON", "IGNITION_OFF",
  "GPS_SIGNAL_LOST",
  "HARSH_BRAKING", "HARSH_ACCELERATION",
])

// ── Types ─────────────────────────────────────────────────────────────────────

interface IngestPayload {
  v?:    number   // schema version
  id:    string   // vehicleId
  org:   string   // organizationId — stamped by MQTT consumer from topic
  t:     number   // unix ms timestamp
  la:    number   // latitude
  lo:    number   // longitude
  sp?:   number   // speed km/h
  hd?:   number   // heading degrees
  al?:   number   // altitude metres
  sa?:   number   // satellites
  fx?:   number   // fix status: 0=NO_FIX 2=2D 3=3D
  hdop?: number   // horizontal dilution of precision
  rn?:   boolean | number  // rain sensor
  ev?:   string | null     // critical event type
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request }) => {
  // ── Device auth ───────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization") ?? ""
  const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!token || token !== INGEST_API_KEY) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  // ── Parse ─────────────────────────────────────────────────────────────────
  let payload: IngestPayload
  try {
    payload = await request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // ── Validate required fields ──────────────────────────────────────────────
  if (!payload.id || !payload.org || !payload.t || payload.la == null || payload.lo == null) {
    return json(
      { error: "Required: id, org, t, la, lo" },
      { status: 400 },
    )
  }

  // Basic coordinate sanity
  if (payload.la < -90 || payload.la > 90 || payload.lo < -180 || payload.lo > 180) {
    return json({ error: "Invalid coordinates" }, { status: 400 })
  }

  const { id: vehicleId, org: orgId, t: ts, la: lat, lo: lng } = payload
  const isCritical = payload.ev ? CRITICAL_EVENTS.has(payload.ev) : false

  // ── Build stream fields ───────────────────────────────────────────────────
  // Redis streams require string values for all fields
  const streamFields: string[] = [
    "vid",  vehicleId,
    "org",  orgId,
    "la",   String(lat),
    "lo",   String(lng),
    "ts",   String(ts),
  ]

  if (payload.sp   != null) streamFields.push("sp",   String(payload.sp))
  if (payload.hd   != null) streamFields.push("hd",   String(payload.hd))
  if (payload.al   != null) streamFields.push("al",   String(payload.al))
  if (payload.sa   != null) streamFields.push("sa",   String(payload.sa))
  if (payload.fx   != null) streamFields.push("fx",   String(payload.fx))
  if (payload.hdop != null) streamFields.push("hdop", String(payload.hdop))
  if (payload.rn   != null) streamFields.push("rn",   String(payload.rn))
  if (payload.ev)           streamFields.push("ev",   payload.ev)

  // ── Movement filter ───────────────────────────────────────────────────────
  // Read last broadcast state from Redis to decide if hot path fires
  let shouldBroadcast = isCritical  // always broadcast critical events

  if (!shouldBroadcast) {
    try {
      const lastState = await streamClient.hgetall(`vehicle:${orgId}:${vehicleId}`)

      if (!lastState || !lastState.la) {
        // First update for this vehicle — always broadcast
        shouldBroadcast = true
      } else {
        const lastLat   = Number(lastState.la)
        const lastLng   = Number(lastState.lo)
        const lastTs    = Number(lastState.ts)
        const distMetres = haversineMetres(lastLat, lastLng, lat, lng)
        const elapsedMs  = ts - lastTs

        shouldBroadcast = distMetres > MIN_MOVE_METRES || elapsedMs > MIN_BROADCAST_MS
      }
    } catch (err) {
      // Redis read failure — fail open (broadcast anyway)
      console.warn("[gps-ingest] Movement filter read failed, broadcasting:", err)
      shouldBroadcast = true
    }
  }

  // ── Parallel writes ───────────────────────────────────────────────────────
  const writes: Promise<unknown>[] = []

  // 1. Update latest vehicle state (always — cold and hot consumers read this)
  writes.push(
    streamClient.hset(
      `vehicle:${orgId}:${vehicleId}`,
      "la",     String(lat),
      "lo",     String(lng),
      "sp",     String(payload.sp   ?? 0),
      "hd",     String(payload.hd   ?? 0),
      "fx",     String(payload.fx   ?? 0),
      "ts",     String(ts),
      "rn",     String(payload.rn   ?? 0),
      "org",    orgId,
    ).then(() =>
      // Reset TTL on every update — vehicle goes "offline" after 30s silence
      streamClient.expire(`vehicle:${orgId}:${vehicleId}`, LATEST_STATE_TTL),
    ),
  )

  // 2. Hot path — realtime stream for WebSocket gateway (only if movement filter passes)
  if (shouldBroadcast) {
    writes.push(
      streamClient.xadd(
        `gps:realtime:${orgId}`,
        "MAXLEN", "~", String(STREAM_MAXLEN),
        "*",
        ...streamFields,
      ),
    )
  }

  // 3. Cold path — batch stream for TimescaleDB writer (always)
  writes.push(
    streamClient.xadd(
      `gps:batch:${orgId}`,
      "MAXLEN", "~", String(BATCH_MAXLEN),
      "*",
      ...streamFields,
    ),
  )

  // 4. Tile38 position update — enables geofence evaluation
  writes.push(
    geoClient.call(
      "SET", "fleet", vehicleId,
      "EX", String(LATEST_STATE_TTL),   // auto-expire stale positions
      "POINT", lat, lng,
    ),
  )

  // Execute all writes in parallel — don't let one failure block the others
  const results = await Promise.allSettled(writes)

  // Log any failures but don't fail the request — device should not retry
  // based on downstream write errors (it would cause duplicate cold path events)
  for (const [i, result] of results.entries()) {
    if (result.status === "rejected") {
      const labels = ["latest-state", "hot-stream", "cold-stream", "tile38"]
      console.error(`[gps-ingest] Write ${labels[i] ?? i} failed:`, result.reason)
    }
  }

  return json({ status: "OK", vehicleId, broadcast: shouldBroadcast })
}

// ── Haversine distance ────────────────────────────────────────────────────────
// Approximate metres between two lat/lng points.
// Fast enough for movement filter — no need for full geodesy.

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6_371_000  // Earth radius in metres
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}