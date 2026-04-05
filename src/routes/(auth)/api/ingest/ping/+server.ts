import type { RequestEvent } from '@sveltejs/kit'
import { z } from 'zod'
import { getPostHogClient } from '$lib/server/posthog'
import { cancelNudgeJobs } from '$lib/features/jobs/gpsActivationNudge'

/*
  POST /api/gps/ping
  - Validates device_token
  - Inserts into trip_events
  - Cancels activation nudges on first ping for the org
  - Enqueues a filtered Fabric write job (insert into fabric_queue) instead of
    directly calling Fabric for every ping (reduces Fabric load)

  Assumptions (verify):
  - devices table: (id, device_token, org_id, vehicle_id)
  - trip_events table: has columns (id, org_id, vehicle_id, latitude, longitude, accuracy, cell_tower_fallback, created_at)
  - fabric_queue table: (id, trip_event_id, payload jsonb, status text, created_at)
*/

const PingBody = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
  timestamp: z.string(),
  device_token: z.string().optional(),
  vehicle_id: z.string().optional(),
  cell_tower_fallback: z.boolean().optional(),
})

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)
  const h = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const POST = async ({ request, locals }: RequestEvent) => {
  const authHeader = request.headers.get('authorization') ?? ''
  const tokenFromHeader = authHeader.replace(/^Bearer\s+/i, '')
  const bodyJson = await request.json().catch(() => ({}))
  const parsed = PingBody.safeParse(bodyJson)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid payload' }), { status: 400 })
  }
  const body = parsed.data
  const device_token = tokenFromHeader || body.device_token
  if (!device_token) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

  // Validate device_token against devices table using service-role client
  const { data: deviceData, error: deviceErr } = await locals.supabaseServiceRole
    .from('devices')
    .select('id,org_id,vehicle_id')
    .eq('device_token', device_token)
    .limit(1)

  if (deviceErr || !deviceData || deviceData.length === 0) {
    return new Response(JSON.stringify({ error: 'invalid_device_token' }), { status: 401 })
  }

  const device = deviceData[0] as any
  const org_id = device.org_id as string
  const vehicle_id = body.vehicle_id ?? device.vehicle_id ?? null

  // Persist ping to trip_events (RLS bypass via service role)
  const insertPayload = {
    org_id,
    vehicle_id,
    latitude: body.latitude,
    longitude: body.longitude,
    accuracy: body.accuracy,
    cell_tower_fallback: !!body.cell_tower_fallback,
    created_at: body.timestamp,
    device_id: device.id,
  }

  const { data: insertData, error: insertErr } = await locals.supabaseServiceRole
    .from('trip_events')
    .insert(insertPayload)
    .select('id')

  if (insertErr || !insertData) {
    console.error('[gps/ping] trip_events insert failed', insertErr)
    return new Response(JSON.stringify({ error: 'db_insert_failed' }), { status: 500 })
  }

  const trip_event_id = (insertData as any)[0].id as string

  // Is this the first ping for the org? Query a single row to check existence.
  const { data: prevForOrg } = await locals.supabaseServiceRole
    .from('trip_events')
    .select('id')
    .eq('org_id', org_id)
    .limit(1)

  const isFirstPing = (!prevForOrg || prevForOrg.length === 1) && prevForOrg[0]?.id === trip_event_id

  if (isFirstPing) {
    // Cancel pending activation nudges
    try { await cancelNudgeJobs(org_id) } catch (e) { console.warn('cancelNudgeJobs failed', e) }
    // Emit PostHog first_gps_ping_received
    try { getPostHogClient().capture({ distinctId: org_id, event: 'first_gps_ping_received', properties: { org_id } }) } catch (e) {}
  }

  // Decision: only enqueue important pings to Fabric to reduce write volume.
  // Criteria: accuracy < 50m OR first ping for org OR significant movement (>200m)
  let shouldEnqueueToFabric = body.accuracy < 50 || isFirstPing

  if (!shouldEnqueueToFabric && vehicle_id) {
    // Fetch most recent ping for this vehicle to compute distance
    const { data: last } = await locals.supabaseServiceRole
      .from('trip_events')
      .select('latitude,longitude')
      .eq('vehicle_id', vehicle_id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (last && last.length > 0) {
      const prev = last[0] as any
      const distKm = haversineKm({ lat: prev.latitude, lon: prev.longitude }, { lat: body.latitude, lon: body.longitude })
      shouldEnqueueToFabric = distKm >= 0.2 // 200m
    }
  }

  if (shouldEnqueueToFabric) {
    // Insert a job into fabric_queue for later processing by a worker.
    try {
      await locals.supabaseServiceRole.from('fabric_queue').insert({
        trip_event_id,
        payload: { ...insertPayload },
        status: 'pending',
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      // Don't fail the ping on queue insertion failure — return success to device.
      console.error('[gps/ping] enqueue fabric_queue failed', e)
    }
  }

  return new Response(JSON.stringify({ success: true, trip_event_id }), { status: 200 })
}