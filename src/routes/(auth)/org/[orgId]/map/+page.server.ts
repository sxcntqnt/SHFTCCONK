// src/routes/(auth)/org/[orgId]/map/+page.server.ts
//
// Map page data load — vehicle counts and non-compliant IDs only.
// Finance and reconciliation data is NOT loaded here — it belongs
// on /finance and /compliance pages respectively.

import type { PageServerLoad } from "./$types"
import { requireOrgMemberAccess } from "$lib/security/authGuard"

export const load: PageServerLoad = async (event) => {
  await requireOrgMemberAccess(event, event.params.orgId)

  const { params, locals } = event
  const { orgId }          = params
  const supabase           = locals.supabase

  const [orgRes, vehicleRes, nonCompliantRes] = await Promise.allSettled([
    supabase
      .from("organizations")
      .select("name, metadata")
      .eq("id", orgId)
      .maybeSingle(),

    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),

    // Non-compliant vehicle IDs for marker colour coding
    supabase
      .from("vehicles")
      .select("id")
      .eq("organization_id", orgId)
      .eq("status", "NON_COMPLIANT"),
  ])

  const org              = orgRes.status             === "fulfilled" ? orgRes.value.data             : null
  const vehicleCount     = vehicleRes.status         === "fulfilled" ? (vehicleRes.value.count ?? 0) : 0
  const nonCompliantRows = nonCompliantRes.status     === "fulfilled" ? (nonCompliantRes.value.data ?? []) : []

  // parquetUrl is optional — stored in org metadata when a DuckDB export is available
  const parquetUrl   = (org?.metadata as Record<string, unknown> | null)?.parquet_url as string | null ?? null
  const protomapsKey = process.env.PROTOMAPS_API_KEY ?? ""

  return {
    supabase,          // passed to page for realtime channel setup
    orgId,
    orgName:         org?.name ?? orgId,
    vehicleCount,
    nonCompliantIds: nonCompliantRows.map((r: { id: string }) => r.id),
    parquetUrl,
    protomapsKey,
  }
}