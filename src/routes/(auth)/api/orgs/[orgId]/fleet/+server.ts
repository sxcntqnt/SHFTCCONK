// src/routes/api/fleet/+server.ts
//
// GET /api/fleet               — list vehicles for an org
// GET /api/fleet?id=xxx        — single vehicle by ID
//
// CHANGES FROM OLD VERSION:
//   - POST replaced with GET — reading fleet data is not a mutation
//   - get(fleet) removed — server-side store is always empty, was a silent bug
//   - requireVehicleAccess removed — doesn't exist in updated fleet.store.ts
//   - No auth — anyone could call it. Now requires session + org membership.
//   - Data now comes from Supabase directly (server route, no client store)
//   - orgId required — fleet is always org-scoped
//   - Status filter, search, and pagination added
//
// NOTE: The fleet.store.ts (client-side) is used in Svelte components via
//   initFleet(supabase, orgId). This server route is for API consumers and
//   server-side load functions that need fleet data without the reactive store.

import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import {
  type Vehicle,
  type VehicleStatus,
} from "$lib/features/fleet/stores/fleet"

// ── Row mapper — mirrors fleet.store.ts mapVehicle ────────────────────────────
// Kept in sync so API responses match the shape the client store produces.

function mapVehicle(row: Record<string, unknown>): Vehicle {
  const meta = (row.metadata as Record<string, unknown> | null) ?? {}

  const rawCompliance = (row.compliance_status ??
    row.complianceStatus ??
    meta.compliance ??
    null) as Record<string, boolean> | null

  return {
    id: String(row.id ?? ""),
    regNumber: String(row.reg_number ?? row.regNumber ?? ""),
    ownerId: String(row.owner_id ?? row.ownerId ?? ""),
    organizationId: String(row.organization_id ?? row.organizationId ?? ""),
    route: String(row.route ?? ""),
    routeId: row.route_id ? String(row.route_id) : undefined,
    gpsLat: Number(row.gps_lat ?? row.gpsLat ?? 0),
    gpsLng: Number(row.gps_lng ?? row.gpsLng ?? 0),
    status: (row.status as VehicleStatus) ?? "ACTIVE",
    active: Boolean(row.active ?? true),
    capacity: Number(row.capacity ?? 0),
    insuranceExpiry:
      String(row.insurance_expiry ?? meta.insurance_expiry ?? "") || undefined,
    lastMaintenance:
      String(row.last_maintenance ?? meta.last_maintenance ?? "") || undefined,
    complianceStatus: {
      insuranceValid:
        rawCompliance?.insuranceValid ??
        rawCompliance?.insurance_valid ??
        false,
      inspectionValid:
        rawCompliance?.inspectionValid ??
        rawCompliance?.inspection_valid ??
        false,
      licenseValid:
        rawCompliance?.licenseValid ?? rawCompliance?.license_valid ?? false,
    },
    metadata: row.metadata as Record<string, unknown> | undefined,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ url, locals }) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session } = await locals.safeGetSession()
  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  const supabase = locals.supabase

  // ── Query params ──────────────────────────────────────────────────────────
  const orgId = url.searchParams.get("orgId")
  const vehicleId = url.searchParams.get("id")
  const status = url.searchParams.get("status") as VehicleStatus | null
  const search = url.searchParams.get("search")?.trim() ?? null
  const activeOnly = url.searchParams.get("active") === "true"
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500)
  const offset = Number(url.searchParams.get("offset") ?? 0)

  if (!orgId) {
    return json({ error: "orgId is required" }, { status: 400 })
  }

  // ── Verify org access ─────────────────────────────────────────────────────
  const { data: membership } = await supabase
    .from("organization_members")
    .select("actor_id")
    .eq("organization_id", orgId)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return json(
      { error: "You do not have access to this organisation" },
      { status: 403 },
    )
  }

  // ── Single vehicle lookup ─────────────────────────────────────────────────
  if (vehicleId) {
    const { data: row, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .eq("organization_id", orgId) // enforce org scope — can't fetch another org's vehicle
      .maybeSingle()

    if (error) {
      console.error("[fleet API] single vehicle fetch error:", error)
      return json({ error: "Failed to fetch vehicle" }, { status: 500 })
    }

    if (!row) {
      return json({ error: "Vehicle not found" }, { status: 404 })
    }

    return json({ status: "OK", vehicle: mapVehicle(row) })
  }

  // ── Fleet list ────────────────────────────────────────────────────────────
  let query = supabase
    .from("vehicles")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("reg_number", { ascending: true })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq("status", status)
  if (activeOnly) query = query.eq("active", true)
  if (search)
    query = query.or(`reg_number.ilike.%${search}%,route.ilike.%${search}%`)

  const { data: rows, count, error } = await query

  if (error) {
    console.error("[fleet API] fleet fetch error:", error)
    return json({ error: "Failed to fetch fleet" }, { status: 500 })
  }

  const fleet = (rows ?? []).map(mapVehicle)

  // ── Summary counts ────────────────────────────────────────────────────────
  const summary = {
    total: count ?? 0,
    active: fleet.filter((v) => v.active && v.status === "ACTIVE").length,
    maintenance: fleet.filter((v) => v.status === "MAINTENANCE").length,
    nonCompliant: fleet.filter((v) => v.status === "NON_COMPLIANT").length,
    suspended: fleet.filter((v) => v.status === "SUSPENDED").length,
  }

  return json({
    status: "OK",
    fleet,
    summary,
    pagination: {
      total: count ?? 0,
      limit,
      offset,
      hasMore: offset + fleet.length < (count ?? 0),
    },
  })
}
