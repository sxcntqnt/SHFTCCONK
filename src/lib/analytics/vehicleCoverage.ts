import { db } from "$lib/server/db"
import { redis } from "$lib/server/redis"
import { posthog } from "$lib/server/posthog"
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { PRIVATE_SUPABASE_SERVICE_ROLE } from '$env/static/private'
import { getPostHogClient } from '$lib/server/posthog'




export interface ShiftCoverageRecord {
  vehicle_id: string
  plate_number: string
  operator_id: string
  shift_window_start: string
  shift_window_end: string
  total_shift_minutes: number
  broadcasting_minutes: number
  coverage_ratio: number
  shift_honesty_band: "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "ABSENT"
  estimated_unverified_fare_kes: number | null
  last_ping_at: string | null
  trip_count_estimated: number | null
}

export interface FleetVTSnapshot {
  org_id: string
  snapshot_at: string
  shift_window: "MORNING" | "AFTERNOON" | "EVENING"
  total_enrolled_vehicles: number
  broadcasting_vehicles: number
  vt_ratio: number
  fleet_honesty_score: number
  vehicles: ShiftCoverageRecord[]
  unverified_revenue_exposure_kes: number
}

const SHIFT_WINDOWS = {
  MORNING: { start_hour: 5, end_hour: 13 },
  AFTERNOON: { start_hour: 13, end_hour: 20 },
  EVENING: { start_hour: 20, end_hour: 24 },
}

const AVERAGE_FARE_YIELD_PER_MINUTE_KES = 12

export async function computeFleetVTSnapshot(
  orgId: string,
  shiftWindow: keyof typeof SHIFT_WINDOWS,
): Promise<FleetVTSnapshot> {
  const now = new Date()
  const windowDef = SHIFT_WINDOWS[shiftWindow]
  const shiftStart = new Date(now)
  shiftStart.setHours(windowDef.start_hour, 0, 0, 0)
  const shiftEnd = new Date(now)
  shiftEnd.setHours(windowDef.end_hour, 0, 0, 0)
  const totalShiftMinutes = (shiftEnd.getTime() - shiftStart.getTime()) / 60000

  const enrolledVehicles = await db.driver_enrollments.findMany({
    where: { org_id: orgId },
    include: { vehicle: { select: { plate_number: true, operator_id: true } } },
  })

  const pingDensity = await db.$queryRaw`
    SELECT
      vehicle_id,
      COUNT(DISTINCT DATE_TRUNC('minute', recorded_at)) AS broadcasting_minutes,
      MAX(recorded_at) AS last_ping_at,
      COUNT(*) FILTER (
        WHERE recorded_at - LAG(recorded_at) OVER (PARTITION BY vehicle_id ORDER BY recorded_at) > INTERVAL '8 minutes'
      ) + 1 AS trip_count_estimated
    FROM trip_events
    WHERE
      org_id = ${orgId}
      AND recorded_at BETWEEN ${shiftStart.toISOString()} AND ${now.toISOString()}
      AND event_type IN ('GPS_PING', 'GENESIS_PING')
    GROUP BY vehicle_id
  `

  const pingMap = new Map(pingDensity.map((r: any) => [r.vehicle_id, r]))

  const vehicles: ShiftCoverageRecord[] = enrolledVehicles.map((enrollment: any) => {
    const pings = pingMap.get(enrollment.vehicle_id)
    const broadcastingMinutes = pings ? Number(pings.broadcasting_minutes) : 0
    const elapsedShiftMinutes = Math.min((now.getTime() - shiftStart.getTime()) / 60000, totalShiftMinutes)
    const coverageRatio =
      elapsedShiftMinutes > 0 ? Math.min(broadcastingMinutes / elapsedShiftMinutes, 1.0) : 0

    const unverifiedMinutes = Math.max(0, elapsedShiftMinutes - broadcastingMinutes)
    const estimatedUnverifiedFareKes = unverifiedMinutes > 0 ? Math.round(unverifiedMinutes * AVERAGE_FARE_YIELD_PER_MINUTE_KES) : 0

    return {
      vehicle_id: enrollment.vehicle_id,
      plate_number: enrollment.vehicle.plate_number,
      operator_id: enrollment.vehicle.operator_id,
      shift_window_start: shiftStart.toISOString(),
      shift_window_end: shiftEnd.toISOString(),
      total_shift_minutes: totalShiftMinutes,
      broadcasting_minutes: broadcastingMinutes,
      coverage_ratio: coverageRatio,
      shift_honesty_band: classifyShiftHonesty(coverageRatio),
      estimated_unverified_fare_kes: estimatedUnverifiedFareKes,
      last_ping_at: pings?.last_ping_at ?? null,
      trip_count_estimated: pings ? Number(pings.trip_count_estimated) : null,
    }
  })

  const broadcastingCount = vehicles.filter((v) => v.coverage_ratio > 0).length
  const vtRatio = enrolledVehicles.length > 0 ? broadcastingCount / enrolledVehicles.length : 0
  const totalUnverifiedExposure = vehicles.reduce((sum, v) => sum + (v.estimated_unverified_fare_kes ?? 0), 0)

  const fleetHonestyScore = vehicles.length > 0 ? vehicles.reduce((sum, v) => sum + v.coverage_ratio, 0) / vehicles.length : 0

  const snapshot: FleetVTSnapshot = {
    org_id: orgId,
    snapshot_at: now.toISOString(),
    shift_window: shiftWindow as any,
    total_enrolled_vehicles: enrolledVehicles.length,
    broadcasting_vehicles: broadcastingCount,
    vt_ratio: vtRatio,
    fleet_honesty_score: fleetHonestyScore,
    vehicles,
    unverified_revenue_exposure_kes: totalUnverifiedExposure,
  }

  await redis.set(`vt_snapshot:${orgId}:${shiftWindow}`, JSON.stringify(snapshot), { ex: 300 })

  await posthog.capture({
    distinctId: orgId,
    event: "fleet_vt_snapshot_computed",
    properties: {
      org_id: orgId,
      shift_window: shiftWindow,
      vt_ratio: vtRatio,
      fleet_honesty_score: fleetHonestyScore,
      total_enrolled: enrolledVehicles.length,
      broadcasting: broadcastingCount,
      unverified_exposure_kes: totalUnverifiedExposure,
    },
  })

  return snapshot
}

export function classifyShiftHonesty(coverageRatio: number) {
  if (coverageRatio >= 0.85) return "VERIFIED"
  if (coverageRatio >= 0.5) return "PARTIAL"
  if (coverageRatio > 0.0) return "UNVERIFIED"
  return "ABSENT"
}

/*
  computeVTRatio(vehicle_id, date, org_id)
  - Loads trip_events for the vehicle/date and counts distinct hourly windows observed
  - Loads expected_trip_windows for expected number of windows
  - Emits a PostHog event 'vehicle_vt_ratio_updated'

  Notes / assumptions:
  - trip_events.created_at is a timestamp
  - expected_trip_windows table has rows for vehicle/date with expected_windows integer
  - For efficiency in large datasets, a dedicated DuckDB or SQL aggregate should be used
    server-side; this implementation favors clarity and correctness.
*/

export async function computeVTRatio(vehicle_id: string, date: string, org_id: string) {
  if (!vehicle_id || !date) throw new Error('vehicle_id and date required')

  const supabase = createClient(PUBLIC_SUPABASE_URL, PRIVATE_SUPABASE_SERVICE_ROLE)

  // 1) Fetch trip_events.created_at for the vehicle on the date
  const { data: events, error: evErr } = await supabase
    .from('trip_events')
    .select('created_at')
    .eq('vehicle_id', vehicle_id)
    .gte('created_at', `${date}T00:00:00Z`)
    .lte('created_at', `${date}T23:59:59Z`)

  if (evErr) throw evErr

  const hoursSeen = new Set<string>()
  for (const row of events ?? []) {
    const ts = (row as any).created_at
    if (!ts) continue
    const hour = new Date(ts).toISOString().slice(0, 13) // YYYY-MM-DDTHH
    hoursSeen.add(hour)
  }

  const trip_count = hoursSeen.size

  // 2) Fetch expected windows
  const { data: expectedRows, error: expErr } = await supabase
    .from('expected_trip_windows')
    .select('expected_windows')
    .eq('vehicle_id', vehicle_id)
    .eq('date', date)
    .limit(1)

  if (expErr) throw expErr
  const expected_windows = expectedRows && expectedRows.length > 0 ? (expectedRows[0] as any).expected_windows : 0

  // 3) Compute vt_ratio
  let vt_ratio: number | null = null
  if (expected_windows === 0) {
    vt_ratio = null
    console.warn('[computeVTRatio] expected_windows = 0 for vehicle', vehicle_id, 'date', date)
  } else {
    vt_ratio = Math.min(1, trip_count / expected_windows)
  }

  // 4) Emit PostHog event
  try {
    const posthog = getPostHogClient()
    const props: any = { vehicle_id, org_id, date, vt_ratio, trip_count, expected_windows }
    if (vt_ratio !== null && vt_ratio < 0.5) props.below_threshold = true
    posthog.capture({ distinctId: vehicle_id, event: 'vehicle_vt_ratio_updated', properties: props })
  } catch (e) {
    console.warn('[computeVTRatio] posthog capture failed', e)
  }

  return { vehicle_id, date, vt_ratio, trip_count, expected_windows }
}

export default { computeVTRatio }