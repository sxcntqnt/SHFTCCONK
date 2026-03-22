// src/routes/(auth)/admin/dlq/[orgId]/+page.server.ts
//
// GET /admin/dlq/[orgId]
//
// Fetches dead letter queue events for a specific org.
// Read-only — mutations live in separate API routes:
//   POST   /admin/dlq/[orgId]/replay        → replay/+server.ts
//   DELETE /admin/dlq/[orgId]/[eventId]     → [eventId]/+server.ts

import type { PageServerLoad } from "./$types"
import { requireAdminAccess }  from "$lib/security/authGuard"

export interface DLQEvent {
  id:            string
  vehicleId:     string
  orgId:         string
  lat:           number
  lng:           number
  speed:         number | null
  heading:       number | null
  fixStatus:     number | null
  timestamp:     string
  error:         string
  attempts:      number
  failedAt:      string
  originalEvent: string
}

export interface DLQSummary {
  totalEvents:    number
  oldestEvent:    string | null
  newestEvent:    string | null
  errorBreakdown: { error: string; count: number }[]
}

export const load: PageServerLoad = async (event) => {
  await requireAdminAccess(event)

  const { params, url, locals } = event
  const { orgId } = params
  const supabase  = locals.supabase

  const page     = Math.max(1, Number(url.searchParams.get("page")  ?? 1))
  const perPage  = 50
  const offset   = (page - 1) * perPage
  const filterError = url.searchParams.get("error") ?? null

  // ── Org name ──────────────────────────────────────────────────────────────
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle()

  // ── DLQ events ────────────────────────────────────────────────────────────
  let query = supabase
    .from("dlq_events")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .order("failed_at", { ascending: false })
    .range(offset, offset + perPage - 1)

  if (filterError) query = query.ilike("error", `%${filterError}%`)

  const { data: rows, count, error: fetchError } = await query

  if (fetchError) console.error("[DLQ admin] fetch error:", fetchError)

  const events: DLQEvent[] = (rows ?? []).map((r) => ({
    id:            r.stream_id ?? r.id,
    vehicleId:     r.vehicle_id,
    orgId:         r.org_id,
    lat:           Number(r.lat  ?? 0),
    lng:           Number(r.lng  ?? 0),
    speed:         r.speed   != null ? Number(r.speed)   : null,
    heading:       r.heading != null ? Number(r.heading) : null,
    fixStatus:     r.fix_status != null ? Number(r.fix_status) : null,
    timestamp:     r.device_timestamp ?? r.recorded_at,
    error:         r.error ?? "Unknown error",
    attempts:      Number(r.attempts ?? 1),
    failedAt:      r.failed_at,
    originalEvent: typeof r.original_event === "string"
      ? r.original_event
      : JSON.stringify(r.original_event ?? {}),
  }))

  // ── Summary ───────────────────────────────────────────────────────────────
  const errorCounts = events.reduce<Record<string, number>>((acc, e) => {
    const key = e.error.split(":")[0].trim()
    acc[key]  = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const summary: DLQSummary = {
    totalEvents: count ?? 0,
    oldestEvent: events.length ? events[events.length - 1].failedAt : null,
    newestEvent: events.length ? events[0].failedAt : null,
    errorBreakdown: Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count),
  }

  return {
    orgId,
    orgName:    org?.name ?? orgId,
    events,
    summary,
    page,
    perPage,
    totalPages: Math.ceil((count ?? 0) / perPage),
    filterError,
  }
}