// src/routes/(auth)/crew/+layout.ts
//
// Crew section layout (DRIVER + CONDUCTOR).
//
// Guard:   requireCrewAccess  → activates crewCtx internally.
//          No second activate() call needed — the guard IS the activation.
//
// Layout-level data: vehicle assignment is loaded here because the
// crew sidebar/topbar shows plate + org + shift state across ALL crew
// pages (dashboard, incidents, tipjar, requests).

import type { LayoutLoad } from "./$types"
import { get } from "svelte/store"
import { redirect } from "@sveltejs/kit"
import { requireCrewAccess } from "$lib/security/authGuard"
import { crewCtx } from "$lib/features/auth/contexts"

export const load: LayoutLoad = async (event) => {
  // ── Guard + context activation ────────────────────────────────────────────
  // requireCrewAccess calls activateCrewContext() internally.
  // crewCtx is guaranteed populated after this line.
  await requireCrewAccess(event)

  const { supabase, session, user } = await event.parent()

  // ── Read context — no second activation needed ────────────────────────────
  const crew = get(crewCtx)
  if (!crew) redirect(302, "/app/dashboard")  // type narrowing safety net

  const { actor, crewType, orgId, shiftState } = crew
  const isDriver = crewType === "DRIVER"

  // ── Load vehicle assignment ───────────────────────────────────────────────
  // driver_assignments and conductor_assignments share the same shape.
  // We join vehicles + organizations so the sidebar has plate + SACCO name
  // without any per-page fetches.
  const { data: assignment, error } = await supabase
    .from(isDriver ? "driver_assignments" : "conductor_assignments")
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
    .eq("actor_id", actor.id)
    .maybeSingle()

  if (error) {
    console.error("[crew layout] vehicle assignment fetch failed:", error)
  }

  // ── Patch crewCtx with richer live data ──────────────────────────────────
  // activateCrewContext reads vehicle info from actor.metadata (bootstrap RPC).
  // The DB join above gives us the full record including org name —
  // patch the store so all child components get the most complete data.
  if (assignment?.vehicles) {
    const v = assignment.vehicles as {
      id: string
      reg_number: string
      capacity: number
      active: boolean
      organization_id: string
      organizations: { id: string; name: string } | null
    }

    crewCtx.update((c) => {
      if (!c) return c
      return {
        ...c,
        activeVehicleId:    v.id,
        activeVehiclePlate: v.reg_number,
        activeTripId:       assignment.active_trip_id ?? null,
        orgName:            v.organizations?.name ?? c.orgName,
      }
    })
  }

  // ── Return layout data ────────────────────────────────────────────────────
  // crewSummary is a plain serialisable object for the layout template.
  // Child pages use the reactive crewCtx store directly for anything dynamic.
  return {
    supabase,
    session,
    user,
    isDriver,
    assignment: assignment ?? null,
    crewSummary: {
      actorId:    actor.id,
      crewType,
      orgId,
      orgName:    get(crewCtx)?.orgName ?? "",
      plate:      (assignment?.vehicles as { reg_number: string } | null)?.reg_number ?? null,
      shiftState,
      hasVehicle: assignment !== null,
    },
  }
}