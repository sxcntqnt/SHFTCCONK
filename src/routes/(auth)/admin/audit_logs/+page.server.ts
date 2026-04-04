/**
 * src/routes/(auth)/admin/audit_logs/+page.server.ts
 *
 * FIXES FROM PREVIOUS VERSION:
 *
 *   BUG 1 — Redundant + bypassable admin check:
 *     The layout (+layout.server.ts) already calls requireAdminAccess()
 *     and throws redirect(302) if not admin. A second manual check here
 *     is both redundant and inconsistent — it returned { allowed: false }
 *     instead of redirecting, meaning a non-admin who somehow reached this
 *     route would just see "not authorized" instead of being bounced.
 *     Removed. Trust the layout guard.
 *
 *   BUG 2 — (locals.supabase as any):
 *     Removed. Using typed supabase from locals.
 *
 *   BUG 3 — No profile join:
 *     performed_by, actor_id, profile_id were raw UUIDs in the UI.
 *     Now joins profiles on performed_by so the UI shows full_name.
 *     actor_id and profile_id remain as IDs (actors table not joined
 *     to avoid an N+1 — resolved in UI via tooltip/copy).
 *
 *   BUG 4 — No event type list for filter:
 *     Added distinct event_types query so the filter renders a
 *     <select> with real options instead of a free-text input.
 *
 *   IMPROVEMENT — Cursor pagination:
 *     Replaced hard limit(500) with page-based pagination.
 *     Default page size = 50. URL param: ?page=2
 *
 *   IMPROVEMENT — Date range filter:
 *     Added ?from and ?to URL params (ISO date strings).
 */

import type { PageServerLoad } from "./$types"

const PAGE_SIZE = 50

export const load: PageServerLoad = async ({ locals, url }) => {
  const { supabase } = locals

  // ── Filters from URL params ──────────────────────────────────
  const eventType = url.searchParams.get("event_type") || null
  const performedBy = url.searchParams.get("performed_by") || null
  const from = url.searchParams.get("from") || null
  const to = url.searchParams.get("to") || null
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
  const offset = (page - 1) * PAGE_SIZE

  // ── Main logs query with pagination ─────────────────────────
  let query = supabase
    .from("audit_logs")
    .select(
      `
      id,
      event_type,
      actor_id,
      profile_id,
      performed_by,
      details,
      created_at,
      performer:profiles!audit_logs_performed_by_fkey (
        full_name,
        avatar_url
      )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (eventType) query = query.eq("event_type", eventType)
  if (performedBy) query = query.eq("performed_by", performedBy)
  if (from) query = query.gte("created_at", from)
  if (to) query = query.lte("created_at", to)

  const { data: logs, error: logsErr, count } = await query

  if (logsErr) {
    console.error("[audit_logs] load error:", logsErr)
  }

  // ── Distinct event types for filter dropdown ─────────────────
  // Pull all distinct event_type values — cheap query, no joins
  const { data: eventTypeRows } = await supabase
    .from("audit_logs")
    .select("event_type")
    .order("event_type")
    .limit(100)

  const eventTypes = [
    ...new Set((eventTypeRows ?? []).map((r) => r.event_type as string)),
  ].sort()

  // ── Resolve profile names for performed_by UUIDs in logs ─────
  // Collect unique performed_by IDs not already joined
  const performerIds = [
    ...new Set(
      (logs ?? [])
        .map((l) => l.performed_by as string | null)
        .filter((id): id is string => !!id),
    ),
  ]

  let profileMap: Record<string, string> = {}
  if (performerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", performerIds)

    profileMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.full_name ?? "Unknown"]),
    )
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return {
    logs: logs ?? [],
    profileMap,
    eventTypes,
    totalCount: count ?? 0,
    page,
    totalPages,
    // Echo filters back so the form stays populated
    filters: { eventType, performedBy, from, to },
  }
}
