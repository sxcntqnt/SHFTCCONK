// src/routes/(auth)/crew/+layout.ts
//
// Crew client layout — activates crew context store + patches with
// vehicle data fetched server-side.
//
// LAZY ACTIVATION PATTERN:
//   Server resolved userState in hooks.server.ts.
//   Server fetched vehicle assignment with org join in +layout.server.ts.
//   This layout activates crewCtx from userState, then patches it with
//   the richer vehicle data (plate, org name) from the server fetch.
//
// WHY PATCH:
//   activateCrewContext() resolves vehicle_id from driver_assignments
//   but NOT reg_number (that requires a vehicles join).
//   +layout.server.ts has the join result — we push it into the store here.
//
// SHIFT STATE:
//   Sourced from driver_assignments.shift_state via userState in
//   activateCrewContext(). The server fetch confirms active_trip_id
//   which may have changed since userState was resolved — we patch that too.

import type { LayoutLoad }          from './$types'
import { redirect }                 from '@sveltejs/kit'
import { get }                      from 'svelte/store'
import { activateCrewContext, crewCtx } from '$lib/features/auth/contexts/crew.context'

export const load: LayoutLoad = async ({ data }) => {
  if (!data.userState) throw redirect(303, '/login')

  // Activate the crew context store from server-resolved userState
  if (!activateCrewContext(data.userState)) {
    throw redirect(303, '/app/dashboard?denied=crew_not_active')
  }

  // ── Patch crewCtx with richer server data ──────────────────────────────────
  // activateCrewContext() sets activeVehiclePlate = null (the TODO).
  // +layout.server.ts joined vehicles to get reg_number + org name.
  // Push those into the store now so all child components get full data.
  if (data.crewSummary.plate || data.crewSummary.orgName) {
    crewCtx.update(ctx => {
      if (!ctx) return ctx
      return {
        ...ctx,
        activeVehicleId:    data.crewSummary.vehicleId   ?? ctx.activeVehicleId,
        activeVehiclePlate: data.crewSummary.plate        ?? ctx.activeVehiclePlate,
        activeTripId:       data.crewSummary.tripId       ?? ctx.activeTripId,
        orgName:            data.crewSummary.orgName      ?? ctx.orgName,
      }
    })
  }

  return {
    ...data,
    // Expose crew summary as a plain serialisable object for layout template.
    // Child pages use the reactive crewCtx store directly for dynamic state.
    crewSummary: data.crewSummary,
  }
}