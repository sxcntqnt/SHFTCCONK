// src/routes/api/analytics/+server.ts
//
// GET /api/analytics?orgId=xxx               — route analytics + revenue trend
// GET /api/analytics?orgId=xxx&route=xxx     — single route stats
// GET /api/analytics?orgId=xxx&type=revenue  — revenue trend only
// GET /api/analytics?orgId=xxx&type=routes   — route stats only
// GET /api/analytics?orgId=xxx&type=fleet    — fleet utilisation stats
//
// CHANGES FROM OLD VERSION:
//   - POST → GET (reading analytics is not a mutation)
//   - No auth — anyone could call it. Now requires session + org membership.
//   - getRevenueTrend(financeRecords) removed — imported from client store,
//     always empty on server. Revenue trend now computed from Supabase directly.
//   - financeRecords no longer sent in body — server fetches from DB.
//   - RouteStats shape matches analytics.store.ts so client store and API
//     responses are consistent.

import { json } from "@sveltejs/kit"
import type { RequestHandler } from "$lib/types"
import type { RouteStats } from "$lib/features/analytics/analytics"

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ url, locals }) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session } = await locals.safeGetSession()
  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  const supabase = locals.supabase

  // ── Query params ──────────────────────────────────────────────────────────
  const orgId = url.searchParams.get("orgId")
  const route = url.searchParams.get("route") ?? null
  const type = url.searchParams.get("type") ?? "all" // all | revenue | routes | fleet
  const from = url.searchParams.get("from") ?? null // ISO date — revenue trend start
  const to = url.searchParams.get("to") ?? null // ISO date — revenue trend end

  if (!orgId) {
    return json({ error: "orgId is required" }, { status: 400 })
  }

  // ── Verify org access ─────────────────────────────────────────────────────
  const { data: membership } = await supabase
    .from("organization_members")
    .select("actor_id")
    .eq("organization_id", orgId)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return json(
      { error: "You do not have access to this organisation" },
      { status: 403 },
    )
  }

  // ── Parallel data fetching ────────────────────────────────────────────────
  const fetchRoutes = type === "all" || type === "routes"
  const fetchRevenue = type === "all" || type === "revenue"
  const fetchFleet = type === "all" || type === "fleet"

  const [routeResult, revenueResult, fleetResult] = await Promise.allSettled([
    // ── Route analytics ───────────────────────────────────────────────────
    fetchRoutes
      ? supabase
          .from("route_analytics")
          .select("*")
          .eq("organization_id", orgId)
          .order("congestion_score", { ascending: false })
          .then(({ data, error }) => {
            if (error)
              throw new Error(`Route analytics fetch failed: ${error.message}`)
            return (data ?? []).map((row) =>
              mapRouteStats(row as Record<string, unknown>),
            )
          })
      : Promise.resolve(null),

    // ── Revenue trend from reconciliation_events ──────────────────────────
    // Groups by date, sums collected vs expected per day
    fetchRevenue
      ? supabase
          .from("reconciliation_events")
          .select(
            "total_collected, expected_amount, variance, status, created_at",
          )
          .eq("organization_id", orgId)
          .gte(
            "created_at",
            from ??
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          )
          .lte("created_at", to ?? new Date().toISOString())
          .order("created_at", { ascending: true })
          .then(({ data, error }) => {
            if (error)
              throw new Error(`Revenue trend fetch failed: ${error.message}`)
            return buildRevenueTrend(data ?? [])
          })
      : Promise.resolve(null),

    // ── Fleet utilisation ─────────────────────────────────────────────────
    fetchFleet
      ? supabase
          .from("vehicles")
          .select("id, status, active, capacity")
          .eq("organization_id", orgId)
          .then(({ data, error }) => {
            if (error)
              throw new Error(
                `Fleet utilisation fetch failed: ${error.message}`,
              )
            return buildFleetUtilisation(data ?? [])
          })
      : Promise.resolve(null),
  ])

  // ── Extract results ───────────────────────────────────────────────────────
  const routeStats =
    routeResult.status === "fulfilled" ? routeResult.value : null
  const revenueTrend =
    revenueResult.status === "fulfilled" ? revenueResult.value : null
  const fleetStats =
    fleetResult.status === "fulfilled" ? fleetResult.value : null

  // Log failures but don't hard-fail — return partial data
  if (routeResult.status === "rejected")
    console.error("[analytics] routes:", routeResult.reason)
  if (revenueResult.status === "rejected")
    console.error("[analytics] revenue:", revenueResult.reason)
  if (fleetResult.status === "rejected")
    console.error("[analytics] fleet:", fleetResult.reason)

  // ── Single route filter ───────────────────────────────────────────────────
  const filteredRoutes =
    route && routeStats
      ? routeStats.filter((r) => r.routeName === route)
      : routeStats

  // ── Build response ────────────────────────────────────────────────────────
  return json({
    status: "OK",
    orgId,
    ...(filteredRoutes !== null && { routes: filteredRoutes }),
    ...(revenueTrend !== null && { revenueTrend }),
    ...(fleetStats !== null && { fleet: fleetStats }),
  })
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapRouteStats(row: Record<string, unknown>): RouteStats {
  return {
    routeName: String(row.route_name ?? row.routeName ?? ""),
    avgSpeed: Number(row.avg_speed ?? row.avgSpeed ?? 0),
    activeVehicles: Number(row.active_vehicles ?? row.activeVehicles ?? 0),
    congestionScore: Number(row.congestion_score ?? row.congestionScore ?? 0),
    organizationId: String(row.organization_id ?? row.organizationId ?? ""),
    updated_at: row.updated_at as string | undefined,
  }
}

// ── Revenue trend builder ─────────────────────────────────────────────────────

interface RevenueTrendPoint {
  date: string // YYYY-MM-DD
  collected: number // KES
  expected: number // KES
  variance: number // KES (positive = overage)
  matched: number // count of MATCHED vehicles
  shortfall: number // count of SHORTFALL vehicles
  overage: number // count of OVERAGE vehicles
}

function buildRevenueTrend(
  rows: {
    total_collected: number
    expected_amount: number
    variance: number
    status: string
    created_at: string
  }[],
): RevenueTrendPoint[] {
  // Group by date (YYYY-MM-DD)
  const byDate = new Map<string, RevenueTrendPoint>()

  for (const row of rows) {
    const date = row.created_at.slice(0, 10)

    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        collected: 0,
        expected: 0,
        variance: 0,
        matched: 0,
        shortfall: 0,
        overage: 0,
      })
    }

    const point = byDate.get(date)!
    point.collected += Number(row.total_collected)
    point.expected += Number(row.expected_amount)
    point.variance += Number(row.variance)

    if (row.status === "MATCHED") point.matched++
    if (row.status === "SHORTFALL") point.shortfall++
    if (row.status === "OVERAGE") point.overage++
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

// ── Fleet utilisation builder ─────────────────────────────────────────────────

interface FleetUtilisation {
  total: number
  active: number
  maintenance: number
  nonCompliant: number
  suspended: number
  utilisationPct: number // active / total × 100
  totalCapacity: number // sum of capacity across active vehicles
}

function buildFleetUtilisation(
  rows: { id: string; status: string; active: boolean; capacity: number }[],
): FleetUtilisation {
  const total = rows.length
  const active = rows.filter((v) => v.active && v.status === "ACTIVE").length
  const maintenance = rows.filter((v) => v.status === "MAINTENANCE").length
  const nonCompliant = rows.filter((v) => v.status === "NON_COMPLIANT").length
  const suspended = rows.filter((v) => v.status === "SUSPENDED").length
  const totalCapacity = rows
    .filter((v) => v.active && v.status === "ACTIVE")
    .reduce((sum, v) => sum + Number(v.capacity ?? 0), 0)

  return {
    total,
    active,
    maintenance,
    nonCompliant,
    suspended,
    utilisationPct: total > 0 ? Math.round((active / total) * 100) : 0,
    totalCapacity,
  }
}
