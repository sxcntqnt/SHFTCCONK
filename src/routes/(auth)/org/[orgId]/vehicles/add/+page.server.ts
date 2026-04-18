// src/routes/(auth)/org/[orgId]/vehicles/add/+page.server.ts
import type { PageServerLoad, Actions } from "./$types"
import { redirect, fail } from "@sveltejs/kit"
import { vehicleCreateSchema } from "$lib/security/vehicle.schema"

export const load: PageServerLoad = async ({ params, locals }) => {
  const { safeGetSession, supabase } = locals
  const { session } = await safeGetSession()
  if (!session) redirect(303, "/login")

  const orgId = params.orgId

  // Groups for the select dropdown
  const { data: groups } = await supabase
    .from("vehicle_groups")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name")

  // Unlinked devices available to assign (no vehicle_id yet)
  const { data: devices } = await supabase
    .from("devices")
    .select("id, identifier, api_url")
    .eq("organization_id", orgId)
    .is("vehicle_id", null)
    .order("identifier")

  return {
    orgId,
    groups: groups ?? [],
    availableDevices: devices ?? [],
  }
}

export const actions: Actions = {
  default: async ({ params, request, locals }) => {
    const { safeGetSession, supabase } = locals
    const { session } = await safeGetSession()
    if (!session) return fail(401, { message: "Unauthorised" })

    const orgId = params.orgId
    const form = await request.formData()

    const raw = {
      registration: form.get("registration")?.toString().trim() ?? "",
      name: form.get("name")?.toString().trim() ?? "",
      chassis: form.get("chassis")?.toString().trim() ?? "",
      vehicle_type: form.get("vehicle_type")?.toString().trim() ?? "",
      group_id: form.get("group_id")?.toString() || null,
      model: form.get("model")?.toString().trim() || null,
      engine: form.get("engine")?.toString().trim() || null,
      manufactured_by: form.get("manufactured_by")?.toString().trim() || null,
      color: form.get("color")?.toString().trim() || null,
      registration_expiry: form.get("registration_expiry")?.toString() || null,
      device_id: form.get("device_id")?.toString() || null,
      api_url: form.get("api_url")?.toString().trim() || null,
      api_username: form.get("api_username")?.toString().trim() || null,
      api_password: form.get("api_password")?.toString().trim() || null,
    }

    const parsed = vehicleCreateSchema.safeParse(raw)
    if (!parsed.success) {
      return fail(400, { errors: parsed.error.flatten().fieldErrors })
    }

    const {
      registration,
      name,
      chassis,
      vehicle_type: vehicleType,
      group_id: groupId,
      model,
      engine,
      manufactured_by: manufacturedBy,
      color,
      registration_expiry,
      device_id: existingDeviceId,
      api_url: apiUrl,
      api_username: apiUsername,
      api_password: apiPassword,
    } = parsed.data

    // ── Insert vehicle ─────────────────────────────────────────────────
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .insert({
        organization_id: orgId,
        name,
        registration,
        model,
        chassis,
        engine,
        manufactured_by: manufacturedBy,
        vehicle_type: vehicleType,
        color,
        registration_expiry: registrationExpiry || null,
        group_id: groupId,
        status: "Idle",
      })
      .select("id")
      .single()

    if (vehicleError) return fail(500, { message: vehicleError.message })

    const vehicleId = vehicle.id

    // ── Link device ────────────────────────────────────────────────────
    if (existingDeviceId) {
      // Link an existing unassigned device to this vehicle
      const { error: linkError } = await supabase
        .from("devices")
        .update({ vehicle_id: vehicleId })
        .eq("id", existingDeviceId)
        .eq("organization_id", orgId) // scope guard

      if (linkError)
        console.error("[add vehicle] device link error:", linkError)
    } else if (apiUrl) {
      // Create a new device record from the raw credentials
      const { error: deviceError } = await supabase.from("devices").insert({
        organization_id: orgId,
        vehicle_id: vehicleId,
        identifier: registration, // default identifier = reg plate
        api_url: apiUrl,
        api_username: apiUsername,
        api_password: apiPassword,
        status: "active",
      })

      if (deviceError)
        console.error("[add vehicle] device create error:", deviceError)
    }

    redirect(303, `/org/${orgId}/vehicles`)
  },
}
