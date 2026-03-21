// src/routes/(app)/[orgId]/fleet/map/+page.server.ts
//
// Returns the parquet URL for the DuckDB historical tile layer,
// plus lightweight vehicle metadata for the realtime overlay.
// Mirrors the compliance map pattern — no DuckDB on the server.

import type { PageServerLoad } from "./$types"
import { redirect } from "@sveltejs/kit"

export const load: PageServerLoad = async ({ params, locals }) => {
  const { safeGetSession, supabase } = locals
  const { session } = await safeGetSession()

  if (!session) {
    redirect(303, "/login")
  }

  const { orgId } = params

  // ── Vehicle count (gate the parquet URL) ──────────────────────────
  const { count: vehicleCount } = await supabase
    .from("vehicles")
    .select("*", { count: "exact", head: true })
    .eq("organizationId", orgId)
    .eq("active", true)

  // ── Compliance summary for marker colour logic ────────────────────
  // Per-vehicle worst status so live markers can be coloured
  // without loading the full compliance store on mount.
  const { data: complianceSummary } = await supabase
    .from("compliance_alerts")
    .select("vehicleId, status")
    .eq("organizationId", orgId)
    .in("status", ["EXPIRED", "WARNING"])

  const nonCompliantIds = [
    ...new Set((complianceSummary ?? []).map((c) => c.vehicleId)),
  ]

  return {
    orgId,
    vehicleCount: vehicleCount ?? 0,
    nonCompliantIds,
    // DuckDB tile layer — same API route as compliance map
    // Stage 2: replace with static S3/R2 signed URL
    parquetUrl:
      (vehicleCount ?? 0) > 0
        ? `/api/orgs/${orgId}/compliance/vehicle-compliance`
        : null,
  }
}