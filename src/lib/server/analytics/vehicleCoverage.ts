import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { PRIVATE_SUPABASE_SERVICE_ROLE } from '$env/static/private'
import { getPostHogClient } from '$lib/server/posthog'

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
