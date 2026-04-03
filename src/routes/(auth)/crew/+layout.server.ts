// src/routes/(auth)/crew/+layout.server.ts
//
// Crew route server layout — gates + fetches vehicle assignment data.
//
// MIGRATION FROM sessionStore:
//   requireCrewAccess() removed — replaced by userState actor check.
//   Vehicle assignment previously fetched in +layout.ts (client-side DB call).
//   Moved here — DB calls belong on the server, not the client layout.
//
// GATE:
//   Must have an active DRIVER or CONDUCTOR actor.
//   Actor must have status = 'active' (org-assigned, not just requested).
//
// VEHICLE JOIN:
//   driver_assignments and conductor_assignments both have vehicle_id.
//   We join vehicles + organizations here so the crew sidebar has
//   plate + SACCO name without per-page fetches.
//   This resolves the activeVehiclePlate TODO in crew.context.ts.
//
// RESPONSIBILITY:
//   1. Gate — redirect if no active crew actor in userState
//   2. Fetch — vehicle assignment with org name join
//   3. Return — crew summary + assignment for layout shell + store patch

import type { LayoutServerLoad } from "./$types"
import { redirect } from "@sveltejs/kit"
import { ACTOR_TYPES } from "$lib/features/auth/contexts/context.template"

// Shared vehicle join shape for driver + conductor tables
type VehicleJoin = {
  id: string
  reg_number: string
  capacity: number | null
  active: boolean | null
  organization_id: string | null
  organizations: { id: string; name: string } | null
}

type AssignmentRow = {
  actor_id: string
  vehicle_id: string
  active_trip_id: string | null
  vehicles: VehicleJoin | null
}

export const load: LayoutServerLoad = async ({ locals }) => {
  const { userState, activeContext, supabase } = locals

  // ── Gate ───────────────────────────────────────────────────────────────────
  if (!userState) {
    throw redirect(303, "/login")
  }

  // Find the active crew actor — DRIVER preferred over CONDUCTOR
  const crewActorCtx =
    userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.DRIVER && ctx.status === "active",
    ) ??
    userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.CONDUCTOR && ctx.status === "active",
    ) ??
    null

  if (!crewActorCtx) {
    throw redirect(303, "/app/dashboard?denied=crew_not_active")
  }

  const isDriver = crewActorCtx.type === ACTOR_TYPES.DRIVER

  // ── Vehicle assignment fetch ────────────────────────────────────────────────
  // Join vehicles + organizations so the sidebar has plate + SACCO name
  // without any per-page fetches.
  // driver_assignments has shift_state; conductor_assignments does not.
  // Both have vehicle_id and active_trip_id.
  const assignmentTable = isDriver
    ? "driver_assignments"
    : "conductor_assignments"

  const { data: assignment, error } = await supabase
    .from(assignmentTable)
    .select(
      `
      actor_id,
      vehicle_id,
      active_trip_id,
      vehicles (
        id,
        reg_number,
        capacity,
        active,
        organization_id,
        organizations ( id, name )
      )
    `,
    )
    .eq("actor_id", crewActorCtx.actorId)
    .maybeSingle()

  if (error) {
    // Non-fatal — crew can still access the dashboard without an assignment.
    // The "waiting for assignment" UI handles this state.
    console.error("[crew layout] vehicle assignment fetch failed:", error)
  }

  const vehicle = assignment?.vehicles as VehicleJoin | null

  // ── Crew summary ───────────────────────────────────────────────────────────
  // Plain serialisable object for the layout shell template.
  // Also used by +layout.ts to patch crewCtx with the richer vehicle data
  // that resolveUserState couldn't provide (reg_number + org name join).
  const crewSummary = {
    actorId: crewActorCtx.actorId,
    crewType: isDriver ? "DRIVER" : "CONDUCTOR",
    isDriver,
    plate: vehicle?.reg_number ?? null,
    vehicleId: vehicle?.id ?? null,
    tripId: assignment?.active_trip_id ?? null,
    orgName: vehicle?.organizations?.name ?? null,
    hasVehicle: assignment !== null && vehicle !== null,
  } as const

  return {
    userState,
    activeContext,
    isDriver,
    assignment: assignment ?? null,
    crewSummary,
  }
}
