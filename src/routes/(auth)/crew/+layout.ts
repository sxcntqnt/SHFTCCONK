// src/routes/(auth)/crew/+layout.ts
//
// Crew section layout (drivers + conductors).
// Guard: requireCrewAccess → DRIVER or CONDUCTOR actor, auto-switches.
//
// Data: loads the active crew member's vehicle assignment.
// This IS layout-level data (not page-level) because the crew
// sidebar/header shows the assigned vehicle across all crew pages
// (dashboard, incidents, etc.)

import type { LayoutLoad } from "./$types"
import { get } from "svelte/store"
import { requireCrewAccess } from "$lib/guards/auth.guard"
import { sessionStore, ROLES } from "$lib/features/auth/stores/auth"

export const load: LayoutLoad = async (event) => {
  await requireCrewAccess(event)

  const { supabase, session, user } = await event.parent()
  const s = get(sessionStore)

  // After requireCrewAccess, the active actor is guaranteed to be
  // DRIVER or CONDUCTOR (guard auto-switched if needed).
  const crewActorId = s.activeActorId!
  const crewActor = s.actors.find((a) => a.id === crewActorId)!
  const isDriver = crewActor.type === ROLES.DRIVER

  // ─── Load vehicle assignment ──────────────────────────────
  // driver_assignments and conductor_assignments have the same
  // shape (actor_id, vehicle_id, active_trip_id) but different tables.
  const assignmentTable = isDriver
    ? "driver_assignments"
    : "conductor_assignments"

  const { data: assignment } = await supabase
    .from(assignmentTable)
    .select(`
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
    `)
    .eq("actor_id", crewActorId)
    .maybeSingle()

  return {
    supabase,
    session,
    user,
    crewActor,
    assignment,
    isDriver,
  }
}