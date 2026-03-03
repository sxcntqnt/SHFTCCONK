// src/routes/crew/+layout.ts
//
// Crew section: for drivers and conductors.
// Auto-switches to the operational actor, loads assignment data.

import { redirect } from "@sveltejs/kit"
import { get } from "svelte/store"
import {
  sessionStore,
  activeActor,
  switchActor,
  ROLES,
} from "$lib/stores/auth.store"
import type { LayoutLoad } from "./$types"

const CREW_TYPES = [ROLES.DRIVER, ROLES.CONDUCTOR] as string[]

export const load: LayoutLoad = async ({ parent, url }) => {
  const { supabase, session, user } = await parent()

  // ─── Auth guard ───────────────────────────────────────────
  if (!session || !user) {
    redirect(303, `/login/sign_in?next=${encodeURIComponent(url.pathname)}`)
  }

  const s = get(sessionStore)

  // ─── Crew actor guard ─────────────────────────────────────
  const crewActor = s.actors.find(
    (a) => CREW_TYPES.includes(a.type) && a.status === "active",
  )

  if (!crewActor) {
    redirect(303, "/dashboard?reason=not_crew")
  }

  // Auto-switch to crew actor
  const current = get(activeActor)
  if (!current || !CREW_TYPES.includes(current.type)) {
    switchActor(crewActor.id)
  }

  // ─── Load crew-specific data ──────────────────────────────
  const activeCrewActorId = crewActor.id

  // Load assignment based on actor type
  const isDriver = crewActor.type === ROLES.DRIVER
  const assignmentTable = isDriver ? "driver_assignments" : "conductor_assignments"

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
    .eq("actor_id", activeCrewActorId)
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