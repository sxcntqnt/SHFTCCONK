// src/lib/features/auth/contexts/org-chair.context.ts
//
// SACCO ORG_CHAIR context.
//
// LAZY ACTIVATION: Starts null.
// Call activateOrgChairContext(userState, orgId) in /org/[orgId]/+layout.ts.
//
// ROUTE: /org/[orgId]/*
//
// MIGRATION FROM sessionStore:
//   activateOrgChairContext() now accepts UserState + orgId instead of
//   reading sessionStore. sessionStore.update() calls removed.
//
// SINGLE ADMIN GUARANTEE:
//   Exactly one ORG_CHAIR per org (enforced by DB RPC admin_activate_org_member).
//   This context does not handle multiple chair actors for the same org.
//
// SECRETARY DELEGATION:
//   SECRETARY gets MEMBER_APPROVE via delegated_authority from the ORG_CHAIR.
//   hasDelegatedApproval = true when an active, unexpired, unrevoked
//   delegated_authority row exists where from_actor_id = this chair's actor.
//
// ⚠️  hasDelegatedApproval requires resolveUserState to fetch outbound
//     delegated_authority rows (from_actor_id = actorId, not to_actor_id).
//     Currently resolveUserState only fetches inbound grants (to_actor_id).
//     Until that fetch is added, hasDelegatedApproval will always be false.
//
//     To fix: add to resolveUserState parallel fetch:
//       supabase
//         .from('delegated_authority')
//         .select('from_actor_id, to_actor_id, permission_id, revoked, expires_at')
//         .in('from_actor_id', actorIds)
//         .eq('revoked', false)
//         .gt('expires_at', new Date().toISOString())
//     Then expose as actorCtx.outboundDelegations in ActorContext.

import { derived, get } from "svelte/store"
import type { Tables } from "../../../DatabaseDefinitions"
import type { UserState } from "$lib/features/auth/services/userState.server"
import {
  createContextStore,
  extractPermissions,
  extractJurisdictions,
  extractOrgMemberships,
  isAllowed,
  ACTOR_TYPES,
} from "$lib/features/auth/contexts/context.template"
import type {
  EffectivePermission,
  Jurisdiction,
} from "$lib/features/auth/contexts/context.template"
import { ACTIONS } from "$lib/features/auth/stores/permisions"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActorRow = Tables<"actors">

// ── Context shape ─────────────────────────────────────────────────────────────

export interface OrgChairContext {
  actor: ActorRow
  orgId: string
  orgName: string

  jurisdictions: Jurisdiction[]

  /**
   * Permissions scoped to this org.
   * Includes org-level and federal grants.
   * Used by _allows() and orgChairCan() for permission checks.
   */
  permissions: EffectivePermission[]

  /**
   * True if this chair has an active outbound delegation of MEMBER_APPROVE
   * to a SECRETARY actor in this org.
   *
   * ⚠️  Always false until resolveUserState exposes outboundDelegations
   *     in ActorContext. See file header for the required query.
   */
  hasDelegatedApproval: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

const { store, setContext, clearContext } =
  createContextStore<OrgChairContext>()
export const orgChairCtx = store

// ─────────────────────────────────────────────────────────────────────────────
// Activation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call from /org/[orgId]/+layout.ts load({ data, params }).
 * Returns false if user has no active ORG_CHAIR actor for this org → redirect.
 *
 * Accepts federal-jurisdiction chairs (platform admins acting as chair).
 *
 * @example
 *   // /org/[orgId]/+layout.ts
 *   export async function load({ data, params }) {
 *     if (!data.userState) throw redirect(302, '/login')
 *     const isChair = activateOrgChairContext(data.userState, params.orgId)
 *     if (!isChair) {
 *       const isStaff = activateOrgContext(data.userState, params.orgId)
 *       if (!isStaff) throw redirect(302, '/org/select')
 *     }
 *   }
 */
export function activateOrgChairContext(
  userState: UserState,
  orgId: string,
): boolean {
  // Find the ORG_CHAIR ActorContext with jurisdiction over this org.
  // Federal jurisdiction = chair over all orgs (platform admin edge case).
  const actorCtx =
    userState.activeContexts.find((ctx) => {
      if (ctx.type !== ACTOR_TYPES.ORG_CHAIR || ctx.status !== "active")
        return false
      return ctx.jurisdictions.some(
        (j) =>
          j.level === "federal" || (j.level === "org" && j.scope_id === orgId),
      )
    }) ?? null

  if (!actorCtx) {
    clearContext()
    return false
  }

  const actor = userState.actors.find((a) => a.id === actorCtx.actorId)
  if (!actor) {
    clearContext()
    return false
  }

  const jurisdictions = extractJurisdictions(userState, actorCtx.actorId)
  const orgMemberships = extractOrgMemberships(userState, actorCtx.actorId)
  const orgMembership = orgMemberships.find((m) => m.organization_id === orgId)

  // Permissions scoped to this specific org (org-level scope or federal)
  const permissions = extractPermissions(userState, actorCtx.actorId, orgId)

  // ── hasDelegatedApproval ────────────────────────────────────────────────────
  // Would be: actorCtx.outboundDelegations?.some(d =>
  //   d.permission_id === MEMBER_APPROVE_PERMISSION_ID && !d.revoked
  // )
  // Not yet available — resolveUserState needs outbound delegation fetch.
  // See file header for the required query addition.
  const hasDelegatedApproval = false

  setContext({
    actor,
    orgId,
    orgName: orgMembership?.org_name ?? "Unknown SACCO",
    jurisdictions,
    permissions,
    hasDelegatedApproval,
  })

  return true
}

export function deactivateOrgChairContext(): void {
  clearContext()
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
//
// Scopes the permission check to this org — org-level or federal grants only.
// Direct delegates (SECRETARY) are NOT visible here — they appear in their
// own context (org.context.ts) via their inbound delegated permissions.
// ─────────────────────────────────────────────────────────────────────────────

const _allows = (ctx: OrgChairContext | null, action: string): boolean =>
  ctx ? isAllowed(ctx.permissions, action, ctx.orgId) : false

// ─────────────────────────────────────────────────────────────────────────────
// Permission stores
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approve/reject passenger + crew join requests (member.approve).
 * Primary revenue action — approved passengers → ticket commissions.
 */
export const canApproveMembers = derived(orgChairCtx, ($c) =>
  _allows($c, ACTIONS.MEMBER_APPROVE),
)

/** Send invite tokens to new SACCO members (member.invite) */
export const canInviteMembers = derived(orgChairCtx, ($c) =>
  _allows($c, ACTIONS.MEMBER_INVITE),
)

/** View pending actor_requests for this org (member.requests) */
export const canViewMemberRequests = derived(orgChairCtx, ($c) =>
  _allows($c, ACTIONS.MEMBER_REQUESTS),
)

/** Manage org settings, branding, metadata (org.manage) */
export const canManageOrgSettings = derived(orgChairCtx, ($c) =>
  _allows($c, ACTIONS.ORG_MANAGE),
)

/**
 * Manage vehicles — requires vehicle.list OR vehicle.edit.
 * Chair may have one without the other depending on policy group.
 */
export const canManageVehicles = derived(
  orgChairCtx,
  ($c) =>
    _allows($c, ACTIONS.VEHICLE_LIST) || _allows($c, ACTIONS.VEHICLE_EDIT),
)

/** View finance records (finance.list) */
export const canViewFinance = derived(orgChairCtx, ($c) =>
  _allows($c, ACTIONS.FINANCE_LIST),
)

/** Live tracking (tracking.live) */
export const canTrackLive = derived(orgChairCtx, ($c) =>
  _allows($c, ACTIONS.TRACKING_LIVE),
)

/** Manage drivers (driver.list) */
export const canManageDrivers = derived(orgChairCtx, ($c) =>
  _allows($c, ACTIONS.DRIVER_LIST),
)

/** View maintenance records (maintenance.view) */
export const canViewMaintenance = derived(orgChairCtx, ($c) =>
  _allows($c, ACTIONS.MAINTENANCE_VIEW),
)

/** View org reports (reports.view) */
export const canViewOrgReports = derived(orgChairCtx, ($c) =>
  _allows($c, ACTIONS.REPORTS_VIEW),
)

/** Full settings access (settings.all) */
export const canChangeSettings = derived(orgChairCtx, ($c) =>
  _allows($c, ACTIONS.SETTINGS_ALL),
)

/** Active org ID — avoids $orgChairCtx?.orgId in every template */
export const activeOrgId = derived(orgChairCtx, ($c) => $c?.orgId ?? null)

/** Active org name — for page titles, nav breadcrumbs */
export const activeOrgName = derived(orgChairCtx, ($c) => $c?.orgName ?? "")

/** All allowed action strings for this chair in this org — for debug panel */
export const chairAllowedActions = derived(
  orgChairCtx,
  ($c) =>
    $c?.permissions.filter((p) => p.effect === "allow").map((p) => p.action) ??
    [],
)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const getOrgChairActorId = () => get(orgChairCtx)?.actor.id ?? null
export const getActiveOrgId = () => get(orgChairCtx)?.orgId ?? null
export const isOrgChairActive = () => get(orgChairCtx) !== null

/**
 * Imperative permission check scoped to this org.
 * Use in server load functions or event handlers.
 *
 * @example
 *   if (!orgChairCan(ACTIONS.MEMBER_APPROVE)) throw redirect(302, '/unauthorized')
 */
export function orgChairCan(action: string): boolean {
  const ctx = get(orgChairCtx)
  if (!ctx) return false
  return isAllowed(ctx.permissions, action, ctx.orgId)
}
