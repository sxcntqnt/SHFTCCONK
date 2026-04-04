/**
 * src/routes/(auth)/org/[orgId]/dashboard/+page.server.ts
 *
 * Merged load for the unified SACCO dashboard.
 * Combines:
 *   - Server-loaded KPI data (vehicles, revenue, compliance, members, activity)
 *   - orgId + supabase passed through for client-side realtime store init
 *     (fleet map, contracts, analytics)
 */

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params, locals }) => {
  const { supabase } = locals
  const { orgId } = params

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: activeVehicleCount },
    { count: totalVehicleCount },
    { count: pendingMemberRequests },
    { data: complianceAlerts },
    { data: recentActivity },
    { data: revenueRecords },
    { data: recentMembers },
  ] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "active"),
    supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("actor_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .filter("payload->>organization_id", "eq", orgId),
    supabase
      .from("reminders")
      .select("id, title, due_date, status")
      .eq("organization_id", orgId)
      .eq("status", "overdue")
      .order("due_date", { ascending: true })
      .limit(5),
    supabase
      .from("audit_logs")
      .select(
        `id, event_type, created_at, severity, performer:profiles!audit_logs_performed_by_fkey ( full_name )`,
      )
      .filter("details->>organization_id", "eq", orgId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("finance_records")
      .select("amount, created_at")
      .eq("organization_id", orgId)
      .eq("type", "income")
      .gte("created_at", sevenAgo)
      .order("created_at", { ascending: true }),
    supabase
      .from("organization_members")
      .select(
        `role, created_at, actors ( type, status, profiles ( full_name, avatar_url ) )`,
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  // Revenue today
  const revenueTodayTotal = (revenueRecords ?? [])
    .filter((r) => new Date(r.created_at) >= today)
    .reduce((sum, r) => sum + (r.amount ?? 0), 0)

  // 7-day sparkline
  const revenueByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d.getTime() + 86400000)
    return {
      label: d.toLocaleDateString("en-KE", { weekday: "short" }),
      amount: (revenueRecords ?? [])
        .filter((r) => {
          const t = new Date(r.created_at)
          return t >= d && t < next
        })
        .reduce((sum, r) => sum + (r.amount ?? 0), 0),
    }
  })

  return {
    orgId,
    // KPI data (server-rendered)
    activeVehicleCount: activeVehicleCount ?? 0,
    totalVehicleCount: totalVehicleCount ?? 0,
    pendingMemberRequests: pendingMemberRequests ?? 0,
    revenueTodayTotal,
    revenueByDay,
    complianceAlerts: complianceAlerts ?? [],
    recentActivity: recentActivity ?? [],
    recentMembers: recentMembers ?? [],
  }
}
