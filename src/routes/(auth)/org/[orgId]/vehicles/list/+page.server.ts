// src/routes/(auth)/org/[orgId]/vehicles/+page.server.ts
import type { PageServerLoad } from "./$types"
import { redirect } from "@sveltejs/kit"

export const load: PageServerLoad = async ({ params, locals }) => {
  const { safeGetSession, supabase } = locals
  const { session } = await safeGetSession()
  if (!session) redirect(303, "/login")

  const orgId = params.orgId

  // ── Vehicles with their group name ───────────────────────────────────
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select(
      `
      id,
      name,
      registration,
      model,
      chassis,
      status,
      vehicle_groups ( name )
    `,
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })

  if (error) console.error("[vehicles load]", error)

  return {
    orgId,
    vehicles: (vehicles ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      reg: v.registration,
      model: v.model ?? "",
      chassis: v.chassis ?? "",
      group: (v.vehicle_groups as any)?.name ?? "—",
      status: v.status ?? "Idle",
    })),
  }
}
