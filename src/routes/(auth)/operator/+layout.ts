// src/routes/(auth)/operator/+layout.ts
//
// Operator section layout (stage operators).
// Guard: requireOperatorAccess → STAGE_OPERATOR actor, auto-switches.
//
// Stage operators manage fuel, trips, and notifications for their
// assigned stages/routes. They always have an org context (via
// organization_members), so we resolve the org for scoping.

import type { LayoutLoad } from "./$types"
import { get } from "svelte/store"
import { requireOperatorAccess } from "$lib/security/authGuard"
import {
  sessionStore,
  getActorOrgIds,
} from "$lib/features/auth/stores/auth"

export const load: LayoutLoad = async (event) => {
  await requireOperatorAccess(event)

  const { supabase, session, user } = await event.parent()
  const s = get(sessionStore)

  // After requireOperatorAccess, active actor is STAGE_OPERATOR.
  // Resolve their org context for scoping queries in child pages.
  const operatorActorId = s.activeActorId!
  const orgIds = getActorOrgIds(operatorActorId)
  const primaryOrgId = orgIds[0] ?? null

  // Load the operator's stage assignments for nav/sidebar
  const { data: stages } = await supabase
    .from("stage_assignments")
    .select("id, stage_name, organization_id, route")
    .eq("operator_id", operatorActorId)
    .order("stage_name")

  return {
    supabase,
    session,
    user,
    operatorActorId,
    primaryOrgId,
    stages: stages ?? [],
  }
}