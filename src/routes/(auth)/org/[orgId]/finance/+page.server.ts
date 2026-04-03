// src/routes/(app)/[orgId]/finance/payments/+page.server.ts

import type { PageServerLoad } from "./$types"
import { redirect } from "@sveltejs/kit"

const PAGE_SIZE = 25

export const load: PageServerLoad = async ({ params, url, locals }) => {
  const { safeGetSession, supabase } = locals
  const { session } = await safeGetSession()

  if (!session) {
    redirect(303, "/login")
  }

  const orgId = params.orgId

  // ── Pagination + filter ──────────────────────────────────────────────
  const page = Math.max(0, Number(url.searchParams.get("page") ?? 0))
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const statusFilter = url.searchParams.get("status") ?? "all"
  const validStatuses = ["pending", "completed", "failed"]

  // ── Payments (paginated) ─────────────────────────────────────────────
  let paymentsQuery = supabase
    .from("payments")
    .select(
      "transaction_id, user_id, amount, phone, status, result_desc, metadata, created_at, updated_at",
      { count: "exact" },
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (validStatuses.includes(statusFilter)) {
    paymentsQuery = paymentsQuery.eq("status", statusFilter)
  }

  const {
    data: payments,
    count: totalPayments,
    error: paymentsError,
  } = await paymentsQuery

  if (paymentsError) {
    console.error("[payments load] payments error:", paymentsError)
  }

  // ── Status counts (parallel, unfiltered) ────────────────────────────
  const [
    { count: completedCount },
    { count: pendingCount },
    { count: failedCount },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "completed"),
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "pending"),
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "failed"),
  ])

  // ── Reconciliation rows (for table + totals) ─────────────────────────
  const { data: reconciliation, error: recError } = await supabase
    .from("reconciliation_events")
    .select(
      "vehicleId, totalCollected, expectedAmount, variance, status, created_at",
    )
    .eq("organizationId", orgId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (recError) {
    console.error("[payments load] reconciliation error:", recError)
  }

  const recRows = reconciliation ?? []
  const totalCollected = recRows.reduce(
    (s, r) => s + (r.totalCollected ?? 0),
    0,
  )
  const totalExpected = recRows.reduce((s, r) => s + (r.expectedAmount ?? 0), 0)

  // ── Vehicle revenue joined with route (single query, not N+1) ────────
  const { data: vehicleRevenue, error: vrError } = await supabase
    .from("reconciliation_events")
    .select(
      `
      vehicleId,
      totalCollected,
      expectedAmount,
      variance,
      vehicles ( route, registration )
    `,
    )
    .eq("organizationId", orgId)
    .order("created_at", { ascending: false })

  if (vrError) {
    console.error("[payments load] vehicle revenue error:", vrError)
  }

  // ── Per-vehicle summary (latest entry per vehicle) ───────────────────
  const vehicleMap: Record<
    string,
    {
      vehicleId: string
      registration: string
      route: string
      collected: number
      target: number
      variance: number
    }
  > = {}

  for (const row of vehicleRevenue ?? []) {
    if (!vehicleMap[row.vehicleId]) {
      vehicleMap[row.vehicleId] = {
        vehicleId: row.vehicleId,
        registration: (row.vehicles as any)?.registration ?? row.vehicleId,
        route: (row.vehicles as any)?.route ?? "Unknown",
        collected: row.totalCollected ?? 0,
        target: row.expectedAmount ?? 0,
        variance: row.variance ?? 0,
      }
    }
  }

  const vehicleSummaries = Object.values(vehicleMap).sort(
    (a, b) => b.collected - a.collected,
  )

  // ── Route intelligence (aggregate by route) ──────────────────────────
  // Computed server-side so the page receives ready-to-render numbers.
  // The client finance stores can still provide live updates on top of this.
  const routeMap: Record<
    string,
    {
      route: string
      collected: number
      target: number
      variance: number
      vehicleCount: number
    }
  > = {}

  for (const v of vehicleSummaries) {
    const r = v.route
    if (!routeMap[r]) {
      routeMap[r] = {
        route: r,
        collected: 0,
        target: 0,
        variance: 0,
        vehicleCount: 0,
      }
    }
    routeMap[r].collected += v.collected
    routeMap[r].target += v.target
    routeMap[r].variance += v.variance
    routeMap[r].vehicleCount += 1
  }

  const routeSummaries = Object.values(routeMap).sort(
    (a, b) => b.collected - a.collected,
  )

  return {
    orgId,

    // payments table
    payments: payments ?? [],
    totalPayments: totalPayments ?? 0,
    page,
    pageSize: PAGE_SIZE,
    statusFilter,

    // stat cards
    counts: {
      completed: completedCount ?? 0,
      pending: pendingCount ?? 0,
      failed: failedCount ?? 0,
    },

    // summary totals
    totalCollected,
    totalExpected,
    totalVariance: totalCollected - totalExpected,

    // reconciliation table
    reconciliationRows: recRows,

    // finance + route intelligence
    vehicleSummaries,
    routeSummaries,
  }
}
