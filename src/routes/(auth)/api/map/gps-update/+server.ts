// src/routes/(auth)/api/map/gps-update/+server.ts
//
// Receives GPS position updates from:
//   1. gps.client.ts  — direct online POST
//   2. Service worker  — background sync flush from outbox
//
// Writes to the Redis GPS stream so the SSE endpoint
// and any other consumers pick it up.
//
// POST /api/map/gps-update
//   Body: GpsUpdate | GpsUpdate[]   (single or batch from outbox)
//   Returns: { success: true, written: number }

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getStreamClient } from '$lib/server/redis'

interface GpsUpdate {
  vehicleId:  string
  lat:        number
  lng:        number
  speed?:     number
  heading?:   number
  accuracy?:  number
  timestamp:  string
  orgId:      string
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session) error(401, 'Unauthorised')

  let body: GpsUpdate | GpsUpdate[]
  try {
    body = await request.json()
  } catch {
    error(400, 'Invalid JSON body')
  }

  // Accept both single update and batched outbox flush
  const updates = Array.isArray(body) ? body : [body]

  if (updates.length === 0) return json({ success: true, written: 0 })

  const redis  = getStreamClient()
  let written  = 0

  for (const update of updates) {
    const { vehicleId, lat, lng, speed, heading, accuracy, timestamp, orgId } = update

    if (!vehicleId || lat == null || lng == null || !orgId) {
      console.warn('[gps-update] Skipping invalid update:', update)
      continue
    }

    const streamKey = `gps:realtime:${orgId}`

    // Build flat field array for XADD
    // Keep field names short — these entries are high-volume
    const fields: string[] = [
      'vid', vehicleId,
      'la',  String(lat),
      'lo',  String(lng),
      'ts',  timestamp ?? new Date().toISOString(),
    ]

    if (speed    != null) fields.push('sp', String(speed))
    if (heading  != null) fields.push('hd', String(heading))
    if (accuracy != null) fields.push('ac', String(accuracy))

    try {
      // XADD with MAXLEN to cap stream size per org (~10k entries)
      // '*' = auto-generate stream ID
      await redis.xadd(streamKey, 'MAXLEN', '~', '10000', '*', ...fields)

      // Also update the vehicle state hash for instant reads
      // (used by the map on initial load before SSE connects)
      await redis.hset(`vehicle:${orgId}:${vehicleId}`, {
        lat:       String(lat),
        lng:       String(lng),
        speed:     String(speed   ?? 0),
        heading:   String(heading ?? 0),
        updatedAt: timestamp ?? new Date().toISOString(),
      })

      written++
    } catch (err) {
      console.error('[gps-update] Redis write error:', err)
    }
  }

  return json({ success: true, written })
}

// ── GET — current positions snapshot ──────────────────────────────────────────
// Returns last-known positions for all vehicles in an org.
// Used by the map on initial load as a faster alternative to
// waiting for the first SSE event.

export const GET: RequestHandler = async ({ url, locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session) error(401, 'Unauthorised')

  const orgId = url.searchParams.get('orgId')
  if (!orgId) error(400, 'orgId is required')

  const redis = getStreamClient()

  // Find all vehicle state keys for this org
  const keys = await redis.keys(`vehicle:${orgId}:*`)

  if (!keys.length) return json({ vehicles: [] })

  const pipeline = redis.pipeline()
  for (const key of keys) pipeline.hgetall(key)

  const results = await pipeline.exec()

  const vehicles = (results ?? [])
    .map((result, i) => {
      const data = result?.[1] as Record<string, string> | null
      if (!data) return null
      const vehicleId = keys[i].split(':')[2]
      return {
        vehicleId,
        orgId,
        lat:       parseFloat(data.lat     ?? '0'),
        lng:       parseFloat(data.lng     ?? '0'),
        speed:     parseFloat(data.speed   ?? '0'),
        heading:   parseFloat(data.heading ?? '0'),
        timestamp: data.updatedAt ?? '',
      }
    })
    .filter(Boolean)

  return json({ vehicles })
}