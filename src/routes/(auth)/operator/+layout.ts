// src/routes/(auth)/operator/+layout.ts
//
// Operator client layout — activates operator context store.
//
// LAZY ACTIVATION PATTERN:
//   Server resolved userState in hooks.server.ts.
//   Server fetched stage assignments with org join in +layout.server.ts.
//   This layout activates operatorCtx from userState.
//
// MULTI-ORG:
//   activateOperatorContext() builds orgSlots from actor_jurisdictions.
//   Each slot carries max_vehicles, assignedVehicleIds, routeIds, permissions.
//   The active org defaults to the first slot — operator switches via
//   setActiveOperatorOrg() from the org switcher UI component.
//
// NO STORE PATCH NEEDED:
//   Unlike crew, operator context derives all its data from userState
//   (fleet_ownership + stage_assignments already in actorCtx).
//   The server stage fetch is for the layout shell template only —
//   operatorCtx already has stage IDs via actorCtx.stageAssignments.

import type { LayoutLoad } from "./$types"
import { redirect } from "@sveltejs/kit"
import { activateOperatorContext } from "$lib/features/auth/contexts/operator.context"

export const load: LayoutLoad = async ({ data }) => {
  if (!data.userState) throw redirect(303, "/login")

  // activateOperatorContext returns false if:
  //   - No active OPERATOR actor (double-checked after server gate)
  //   - Actor exists but has zero org jurisdiction slots
  //     (approved but ORG_CHAIR hasn't set jurisdiction yet)
  if (!activateOperatorContext(data.userState)) {
    throw redirect(303, "/app/dashboard?denied=operator_no_jurisdiction")
  }

  return {
    ...data,
  }
}
