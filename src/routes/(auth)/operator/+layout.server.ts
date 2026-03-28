// src/routes/(auth)/operator/+layout.server.ts
//
// Operator route server layout — gates + fetches stage assignments.
//
// MIGRATION FROM sessionStore:
//   requireOperatorAccess() + sessionStore.activeActorId removed.
//   getActorOrgIds() removed — org IDs now come from actorCtx.orgMemberships.
//   Stage assignments previously fetched in +layout.ts (client-side DB call).
//   Moved here — DB calls belong on the server.
//
// GATE:
//   Must have an active OPERATOR actor.
//   Operators without org jurisdictions (approved actor but no slots yet)
//   are caught by activateOperatorContext() in +layout.ts — server gate
//   only checks actor existence.
//
// STAGE ASSIGNMENTS:
//   Fetched here with org name join so the operator sidebar has
//   stage name + SACCO name without per-page fetches.
//   Multi-org operators will have stages across multiple orgs —
//   all returned, client layout groups them by org slot.
//
// RESPONSIBILITY:
//   1. Gate — redirect if no active OPERATOR actor in userState
//   2. Fetch — stage assignments with org name join
//   3. Return — operator summary + stages for layout shell

import type { LayoutServerLoad } from './$types'
import { redirect }              from '@sveltejs/kit'
import { ACTOR_TYPES }           from '$lib/features/auth/contexts/context.template'

type OrgJoin = {
  id:   string
  name: string
} | null

type StageRow = {
  id:              string
  stage_name:      string
  organization_id: string | null
  route:           unknown      // Json in schema — pages narrow as needed
  organizations:   OrgJoin
}

export const load: LayoutServerLoad = async ({ locals }) => {
  const { userState, activeContext, supabase } = locals

  // ── Gate ───────────────────────────────────────────────────────────────────
  if (!userState) {
    throw redirect(303, '/login')
  }

  const operatorActorCtx = userState.activeContexts.find(
    ctx => ctx.type === ACTOR_TYPES.OPERATOR && ctx.status === 'active'
  ) ?? null

  if (!operatorActorCtx) {
    throw redirect(303, '/app/dashboard?denied=operator_not_active')
  }

  // ── Stage assignments fetch ─────────────────────────────────────────────────
  // Join organizations so the sidebar has stage name + SACCO name.
  // Multi-org operators have stages across multiple orgs — return all,
  // operatorCtx.orgSlots in the client store groups them by active org.
  const { data: stages, error } = await supabase
    .from('stage_assignments')
    .select(`
      id,
      stage_name,
      organization_id,
      route,
      organizations (
        id,
        name
      )
    `)
    .eq('operator_id', operatorActorCtx.actorId)
    .order('stage_name')

  if (error) {
    // Non-fatal — operator can still access the dashboard without stages.
    // The "no stages assigned" UI handles this state.
    console.error('[operator layout] stage assignments fetch failed:', error)
  }

  const stageRows = (stages ?? []) as unknown as StageRow[]

  // ── Org slots summary ───────────────────────────────────────────────────────
  // Build a minimal org summary from stage data + actorCtx.orgMemberships.
  // operatorCtx.orgSlots (built in activateOperatorContext) is the full version —
  // this is just for the server-side layout shell to know which orgs exist.
  const orgIds = [
    ...new Set(
      stageRows
        .map(s => s.organization_id)
        .filter((id): id is string => id != null)
    )
  ]

  const primaryOrgId = operatorActorCtx.orgMemberships[0]?.organization_id ?? null

  // ── Operator summary ────────────────────────────────────────────────────────
  // Plain serialisable object for the layout shell template.
  // Child pages use the reactive operatorCtx store for dynamic state.
  const operatorSummary = {
    actorId:      operatorActorCtx.actorId,
    primaryOrgId,
    orgIds,
    stageCount:   stageRows.length,
    isMultiOrg:   orgIds.length > 1,
  } as const

  return {
    userState,
    activeContext,
    stages:          stageRows,
    operatorSummary,
  }
}