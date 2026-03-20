// src/routes/(app)/[orgId]/vehicle/[vehicleId]/+page.server.ts
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params, locals }) => {
  const { orgId, vehicleId } = params
  const supabase = locals.supabase

  try {
    // ── Vehicle row ────────────────────────────────────────────────────
    // Scoped to orgId to prevent cross-tenant access.
    // requireVehicleAccess() in the old page used a client store for this —
    // server-side .eq("organizationId") is the correct enforcement point.
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select(
        "id, registration, route, status, ownerId, gpsLat, gpsLng, active, organizationId",
      )
      .eq("id", vehicleId)
      .eq("organizationId", orgId)
      .single()

    if (vehicleError || !vehicle) {
      console.error("[vehicle load] not found:", vehicleError)
      return { vehicle: null, error: "Vehicle not found" }
    }

    return { vehicle }
  } catch (err) {
    console.error("[vehicle load] unexpected error:", err)
    return { vehicle: null, error: "Failed to load vehicle data" }
  }
}