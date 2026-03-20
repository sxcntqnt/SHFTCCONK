// src/routes/(app)/[orgId]/compliance/+page.server.ts
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params, locals }) => {
  const orgId = params.orgId

  // locals.supabase is injected by your SvelteKit hooks (standard pattern)
  // If your project uses a different name, swap it here.
  const supabase = locals.supabase

  try {
    // ── Vehicle count ──────────────────────────────────────────────────
    // Count distinct vehicles that have at least one GPS-tagged event
    const { count: vehicleCount, error: vehicleError } = await supabase
      .from("compliance_events")
      .select("vehicleId", { count: "exact", head: true })
      .eq("organizationId", orgId)
      .eq("resolved", false)

    if (vehicleError) {
      console.error("[compliance load] vehicle count error:", vehicleError)
    }

    // ── Alert count ────────────────────────────────────────────────────
    const { count: alertsCount, error: alertError } = await supabase
      .from("compliance_alerts")
      .select("*", { count: "exact", head: true })
      .eq("organizationId", orgId)
      .in("status", ["EXPIRED", "WARNING"])

    if (alertError) {
      console.error("[compliance load] alerts count error:", alertError)
    }

    // ── Parquet URL ────────────────────────────────────────────────────
    // The API route at this path:
    //   /api/orgs/[orgId]/compliance/vehicle-compliance/+server.ts
    // generates the parquet on demand (Stage 0) or returns a static/CDN
    // URL (Stage 2). The page doesn't care which — it just passes the URL
    // to DuckDBTileProvider.
    //
    // We only return a URL when there's actually data to display, so the
    // page can show a "no GPS data" fallback without making a wasted request.
    const parquetUrl =
      (vehicleCount ?? 0) > 0
        ? `/api/orgs/${orgId}/compliance/vehicle-compliance`
        : null

    return {
      orgId,
      parquetUrl,
      vehicleCount: vehicleCount ?? 0,
      alertsCount: alertsCount ?? 0,
    }
  } catch (error) {
    console.error("[compliance load] unexpected error:", error)
    return {
      orgId,
      parquetUrl: null,
      vehicleCount: 0,
      alertsCount: 0,
      error: "Failed to load compliance data",
    }
  }
}