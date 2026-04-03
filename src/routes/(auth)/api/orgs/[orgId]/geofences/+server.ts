// src/routes/api/geofences/+server.ts
//
// GET    /api/geofences   — list geofences (personal or org)
// POST   /api/geofences   — create a geofence
// DELETE /api/geofences   — delete a geofence
//
// TWO GEOFENCE SCOPES:
//
//   personal — created by a passenger for a specific vehicle they follow
//              "Alert me when KCA 123X enters Westlands"
//              owner = profile_id, vehicle_id required, org_id null
//              Tile38 key: personal-geofences:{profileId}:{fenceId}
//
//   org      — created by org staff for fleet management
//              "Restricted zone — no vehicles after 10pm"
//              owner = org_id, vehicle_id optional (applies to all vehicles)
//              Tile38 key: org-geofences:{orgId}:{fenceId}
//
// QUERY PARAMS:
//   GET ?scope=personal               — my personal geofences
//   GET ?scope=org&orgId=xxx          — org fleet geofences
//   GET ?vehicleId=xxx                — personal geofences for a specific vehicle
//
// POST body must include scope + relevant owner field (profileId or orgId)
// DELETE ?id=xxx&scope=personal  or  ?id=xxx&scope=org&orgId=xxx

import { json } from "@sveltejs/kit"
import type { RequestHandler } from "$lib/types"
import { geoClient } from "$lib/server/redis"

// ── Constants ─────────────────────────────────────────────────────────────────

const PERSONAL_COLLECTION = "personal-geofences"
const ORG_COLLECTION = "org-geofences"

type GeofenceScope = "personal" | "org"

// ── Helpers ───────────────────────────────────────────────────────────────────

function tile38Key(
  scope: GeofenceScope,
  ownerId: string,
  fenceId: string,
): string {
  return scope === "personal"
    ? `${ownerId}:${fenceId}` // personal-geofences:{profileId}:{fenceId}
    : `${ownerId}:${fenceId}` // org-geofences:{orgId}:{fenceId}
}

function collectionFor(scope: GeofenceScope): string {
  return scope === "personal" ? PERSONAL_COLLECTION : ORG_COLLECTION
}

function closeRing(coords: [number, number][]): [number, number][] {
  const first = coords[0]
  const last = coords[coords.length - 1]
  return first[0] === last[0] && first[1] === last[1]
    ? coords
    : [...coords, first]
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ url, locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  const supabase = locals.supabase
  const scope = (url.searchParams.get("scope") ?? "personal") as GeofenceScope
  const orgId = url.searchParams.get("orgId") ?? null
  const vehicleId = url.searchParams.get("vehicleId") ?? null

  // ── Build query ───────────────────────────────────────────────────────────
  let query = supabase
    .from("geofences")
    .select(
      "id, name, color, scope, profile_id, org_id, vehicle_id, active, metadata, created_at",
    )
    .order("created_at", { ascending: false })

  if (scope === "personal") {
    // Users can only see their own personal geofences
    query = query.eq("scope", "personal").eq("profile_id", session.user.id)

    if (vehicleId) query = query.eq("vehicle_id", vehicleId)
  } else {
    // Org geofences — verify membership first
    if (!orgId)
      return json({ error: "orgId required for org scope" }, { status: 400 })

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

    query = query.eq("scope", "org").eq("org_id", orgId)
    if (vehicleId) query = query.eq("vehicle_id", vehicleId)
  }

  const { data: rows, error } = await query
  if (error) {
    console.error("[geofences GET] Supabase error:", error)
    return json({ error: "Failed to fetch geofences" }, { status: 500 })
  }

  if (!rows?.length) return json({ geofences: [] })

  // ── Enrich with geometry from Tile38 ──────────────────────────────────────
  const collection = collectionFor(scope)
  const ownerId = scope === "personal" ? session.user.id : orgId!

  const withGeometry = await Promise.allSettled(
    rows.map(async (row) => {
      try {
        const geo = (await geoClient.call(
          "GET",
          collection,
          tile38Key(scope, ownerId, row.id),
          "WITHFIELDS",
        )) as { object?: { coordinates: unknown[][] } } | null

        return {
          ...row,
          coords: geo?.object?.coordinates?.[0] ?? [],
          geometryAvailable: !!geo?.object,
        }
      } catch {
        return { ...row, coords: [], geometryAvailable: false }
      }
    }),
  )

  const geofences = withGeometry
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean)

  return json({ geofences })
}

// ── POST ──────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  const supabase = locals.supabase

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { id, name, color, coords, scope, orgId, vehicleId, metadata } =
    body as {
      id?: string
      name?: string
      color?: string
      coords?: [number, number][]
      scope?: GeofenceScope
      orgId?: string
      vehicleId?: string
      metadata?: Record<string, unknown>
    }

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!id || !name || !scope) {
    return json({ error: "id, name, and scope are required" }, { status: 400 })
  }

  if (scope !== "personal" && scope !== "org") {
    return json({ error: "scope must be 'personal' or 'org'" }, { status: 400 })
  }

  if (!Array.isArray(coords) || coords.length < 3) {
    return json(
      { error: "coords must be an array of at least 3 [lng, lat] pairs" },
      { status: 400 },
    )
  }

  // Personal geofences must be tied to a specific vehicle
  if (scope === "personal" && !vehicleId) {
    return json(
      {
        error:
          "Personal geofences require a vehicleId — which vehicle are you tracking?",
      },
      { status: 400 },
    )
  }

  // Org geofences require orgId
  if (scope === "org" && !orgId) {
    return json({ error: "Org geofences require orgId" }, { status: 400 })
  }

  const closedCoords = closeRing(coords)

  // ── Verify org access for org-scope ──────────────────────────────────────
  if (scope === "org") {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("actor_id")
      .eq("organization_id", orgId!)
      .limit(1)
      .maybeSingle()

    if (!membership) {
      return json(
        { error: "You do not have access to this organisation" },
        { status: 403 },
      )
    }
  }

  // ── For personal geofences: verify the vehicle exists ────────────────────
  if (scope === "personal" && vehicleId) {
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .maybeSingle()

    if (!vehicle) {
      return json({ error: "Vehicle not found" }, { status: 404 })
    }
  }

  // ── 1. Insert metadata into Supabase ──────────────────────────────────────
  const { error: insertError } = await supabase.from("geofences").insert({
    id,
    name,
    color: color ?? "#00b09b",
    scope,
    profile_id: session.user.id, // always stamped — who created it
    org_id: scope === "org" ? orgId : null,
    vehicle_id: vehicleId ?? null,
    active: true,
    metadata: metadata ?? null,
  })

  if (insertError) {
    if (insertError.code === "23505") {
      return json(
        { error: "A geofence with this ID already exists" },
        { status: 409 },
      )
    }
    console.error("[geofences POST] Supabase insert error:", insertError)
    return json({ error: "Failed to create geofence" }, { status: 500 })
  }

  // ── 2. Store geometry in Tile38 ───────────────────────────────────────────
  const collection = collectionFor(scope)
  const ownerId = scope === "personal" ? session.user.id : orgId!
  const tileKey = tile38Key(scope, ownerId, id)

  try {
    await geoClient.call(
      "SET",
      collection,
      tileKey,
      "OBJECT",
      JSON.stringify({
        type: "Polygon",
        coordinates: [closedCoords],
      }),
    )
  } catch (tileError) {
    console.error("[geofences POST] Tile38 SET error:", tileError)

    // Rollback Supabase
    await supabase
      .from("geofences")
      .delete()
      .eq("id", id)
      .eq("profile_id", session.user.id)

    return json(
      { error: "Geofence geometry could not be stored. Creation rolled back." },
      { status: 500 },
    )
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  await supabase.from("audit_logs").insert({
    event_type:
      scope === "personal"
        ? "personal_geofence_created"
        : "org_geofence_created",
    performed_by: session.user.id,
    target_table: "geofences",
    details: {
      fence_id: id,
      scope,
      org_id: orgId ?? null,
      vehicle_id: vehicleId ?? null,
      name,
      coord_count: closedCoords.length,
    },
  })

  return json({ success: true, id, scope }, { status: 201 })
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ url, locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  const supabase = locals.supabase
  const id = url.searchParams.get("id")
  const scope = (url.searchParams.get("scope") ?? "personal") as GeofenceScope
  const orgId = url.searchParams.get("orgId") ?? null

  if (!id) return json({ error: "id is required" }, { status: 400 })

  if (scope === "org" && !orgId) {
    return json({ error: "orgId required for org scope" }, { status: 400 })
  }

  // ── Verify ownership ──────────────────────────────────────────────────────
  // Personal: must be created by this user
  // Org: user must be a member of the org
  let fenceQuery = supabase
    .from("geofences")
    .select("id, name, scope, org_id")
    .eq("id", id)
    .eq("scope", scope)

  if (scope === "personal") {
    fenceQuery = fenceQuery.eq("profile_id", session.user.id)
  } else {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("actor_id")
      .eq("organization_id", orgId!)
      .limit(1)
      .maybeSingle()

    if (!membership) {
      return json(
        { error: "You do not have access to this organisation" },
        { status: 403 },
      )
    }

    fenceQuery = fenceQuery.eq("org_id", orgId!)
  }

  const { data: fence } = await fenceQuery.maybeSingle()

  if (!fence) {
    return json(
      {
        error: "Geofence not found or you do not have permission to delete it",
      },
      { status: 404 },
    )
  }

  // ── 1. Remove from Tile38 first (fence goes inactive immediately) ─────────
  const collection = collectionFor(scope)
  const ownerId = scope === "personal" ? session.user.id : orgId!

  try {
    await geoClient.call("DEL", collection, tile38Key(scope, ownerId, id))
  } catch (tileError) {
    console.error("[geofences DELETE] Tile38 DEL error:", tileError)
    return json(
      { error: "Failed to remove geofence geometry. Metadata preserved." },
      { status: 500 },
    )
  }

  // ── 2. Delete metadata from Supabase ──────────────────────────────────────
  const { error: deleteError } = await supabase
    .from("geofences")
    .delete()
    .eq("id", id)

  if (deleteError) {
    console.error("[geofences DELETE] Supabase delete error:", deleteError)
    return json({
      success: true,
      warning:
        "Geometry removed but metadata delete failed. Will be cleaned up.",
    })
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  await supabase.from("audit_logs").insert({
    event_type:
      scope === "personal"
        ? "personal_geofence_deleted"
        : "org_geofence_deleted",
    performed_by: session.user.id,
    target_table: "geofences",
    details: { fence_id: id, scope, org_id: orgId ?? null, name: fence.name },
  })

  return json({ success: true })
}
