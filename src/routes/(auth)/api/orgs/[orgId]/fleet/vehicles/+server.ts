// src/routes/(auth)/org/[orgId]/vehicles/+server.ts
//
// Shared JSON API for all vehicle-related pages.
// Consumed by: list, add, group pages when they need
// programmatic access (e.g. optimistic UI, mobile clients).
//
// ENDPOINTS:
//
//   GET    /org/[orgId]/vehicles          → list vehicles + groups
//   POST   /org/[orgId]/vehicles          → create vehicle (+ optional device link)
//
//   GET    /org/[orgId]/vehicles?type=groups          → groups only
//   GET    /org/[orgId]/vehicles?type=devices         → unlinked devices only
//
//   POST   /org/[orgId]/vehicles  { _action: 'createGroup' }  → create group
//   POST   /org/[orgId]/vehicles  { _action: 'deleteGroup' }  → delete group
//   POST   /org/[orgId]/vehicles  { _action: 'linkDevice'  }  → link device to vehicle
//   POST   /org/[orgId]/vehicles  { _action: 'unlinkDevice'}  → unlink device from vehicle

import { json, error } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ params, url, locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session) error(401, "Unauthorised")

  const { supabase } = locals
  const orgId = params.orgId
  const type = url.searchParams.get("type") // 'groups' | 'devices' | null (all)

  // ── Groups only ────────────────────────────────────────────────────────────
  if (type === "groups") {
    const { data, error: err } = await supabase
      .from("vehicle_groups")
      .select("id, name, description, vehicles(count)")
      .eq("organization_id", orgId)
      .order("name")

    if (err) error(500, err.message)

    return json(
      (data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description ?? "",
        vehicles: (g.vehicles as any)?.[0]?.count ?? 0,
      })),
    )
  }

  // ── Unlinked devices only ──────────────────────────────────────────────────
  if (type === "devices") {
    const { data, error: err } = await supabase
      .from("devices")
      .select("id, identifier, api_url")
      .eq("organization_id", orgId)
      .is("vehicle_id", null)
      .order("identifier")

    if (err) error(500, err.message)
    return json(data ?? [])
  }

  // ── Full fleet list (default) ──────────────────────────────────────────────
  const [vehiclesResult, groupsResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select(
        "id, name, registration, model, chassis, status, vehicle_groups(name)",
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),

    supabase
      .from("vehicle_groups")
      .select("id, name")
      .eq("organization_id", orgId)
      .order("name"),
  ])

  if (vehiclesResult.error) error(500, vehiclesResult.error.message)
  if (groupsResult.error) error(500, groupsResult.error.message)

  return json({
    vehicles: (vehiclesResult.data ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      reg: v.registration,
      model: v.model ?? "",
      chassis: v.chassis ?? "",
      group: (v.vehicle_groups as any)?.name ?? "—",
      status: v.status ?? "Idle",
    })),
    groups: groupsResult.data ?? [],
  })
}

// ── POST ──────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ params, request, locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session) error(401, "Unauthorised")

  const { supabase } = locals
  const orgId = params.orgId

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    error(400, "Invalid JSON body")
  }

  const action = body._action as string | undefined

  // ── Create group ───────────────────────────────────────────────────────────
  if (action === "createGroup") {
    const name = body.name?.toString().trim()
    const description = body.description?.toString().trim() ?? ""

    if (!name) error(400, "Group name is required")

    const { data, error: err } = await supabase
      .from("vehicle_groups")
      .insert({ organization_id: orgId, name, description })
      .select("id, name, description")
      .single()

    if (err) error(500, err.message)
    return json({ group: { ...data, vehicles: 0 } }, { status: 201 })
  }

  // ── Delete group ───────────────────────────────────────────────────────────
  if (action === "deleteGroup") {
    const id = body.id?.toString()
    if (!id) error(400, "Missing group id")

    const { error: err } = await supabase
      .from("vehicle_groups")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId) // scope guard

    if (err) error(500, err.message)
    return json({ success: true })
  }

  // ── Link device to vehicle ─────────────────────────────────────────────────
  if (action === "linkDevice") {
    const { vehicleId, deviceId } = body
    if (!vehicleId || !deviceId)
      error(400, "vehicleId and deviceId are required")

    const { error: err } = await supabase
      .from("devices")
      .update({ vehicle_id: vehicleId })
      .eq("id", deviceId)
      .eq("organization_id", orgId) // scope guard
      .is("vehicle_id", null) // only link if currently unlinked

    if (err) error(500, err.message)
    return json({ success: true })
  }

  // ── Unlink device from vehicle ─────────────────────────────────────────────
  if (action === "unlinkDevice") {
    const { deviceId } = body
    if (!deviceId) error(400, "deviceId is required")

    const { error: err } = await supabase
      .from("devices")
      .update({ vehicle_id: null })
      .eq("id", deviceId)
      .eq("organization_id", orgId) // scope guard

    if (err) error(500, err.message)
    return json({ success: true })
  }

  // ── Create vehicle (default POST) ──────────────────────────────────────────
  const {
    registration,
    name,
    model,
    chassis,
    engine,
    manufactured_by,
    vehicle_type,
    color,
    registration_expiry,
    group_id,
    // device linking
    device_id,
    api_url,
    api_username,
    api_password,
  } = body

  if (!registration || !name || !chassis || !vehicle_type) {
    error(400, "registration, name, chassis and vehicle_type are required")
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .insert({
      organization_id: orgId,
      name,
      registration,
      model: model || null,
      chassis,
      engine: engine || null,
      manufactured_by: manufactured_by || null,
      vehicle_type,
      color: color || null,
      registration_expiry: registration_expiry || null,
      group_id: group_id || null,
      status: "Idle",
    })
    .select(
      "id, name, registration, model, chassis, status, vehicle_groups(name)",
    )
    .single()

  if (vehicleError) error(500, vehicleError.message)

  const vehicleId = vehicle.id

  // Link existing device
  if (device_id) {
    const { error: linkErr } = await supabase
      .from("devices")
      .update({ vehicle_id: vehicleId })
      .eq("id", device_id)
      .eq("organization_id", orgId)
      .is("vehicle_id", null)

    if (linkErr) console.error("[vehicles +server] device link error:", linkErr)
  }
  // Or create a new device from raw credentials
  else if (api_url) {
    const { error: deviceErr } = await supabase.from("devices").insert({
      organization_id: orgId,
      vehicle_id: vehicleId,
      identifier: registration,
      api_url,
      api_username: api_username || null,
      api_password: api_password || null,
      status: "active",
    })

    if (deviceErr)
      console.error("[vehicles +server] device create error:", deviceErr)
  }

  return json(
    {
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        reg: vehicle.registration,
        model: vehicle.model ?? "",
        chassis: vehicle.chassis ?? "",
        group: (vehicle.vehicle_groups as any)?.name ?? "—",
        status: vehicle.status ?? "Idle",
      },
    },
    { status: 201 },
  )
}
