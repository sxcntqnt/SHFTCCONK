// src/lib/features/auth/contexts/org.context.ts
//
// General SACCO staff context.
//
// LAZY ACTIVATION: Starts null.
// Call activateOrgContext(userState, orgId) in /org/[orgId]/+layout.ts.
//
// ROUTE: /org/[orgId]/*
//
// MIGRATION FROM sessionStore:
//   activateOrgContext() now accepts UserState + orgId instead of
//   reading sessionStore. sessionStore.update() calls removed.
//   ROLES.* replaced with ACTOR_TYPES.* from context.template.
//
// COVERS ALL NON-CHAIR ORG ROLES:
//   GENERAL_MANAGER, FLEET_MANAGER, OPERATIONS_MANAGER, BRANCH_MANAGER,
//   SECRETARY, ACCOUNTANT, ACCOUNTS_CLERK, AUDITOR, COMPLIANCE_OFFICER,
//   ROUTE_SUPERVISOR, DISPATCHER, MECHANIC, FIELD_ATTENDANT, DATA_CLERK,
//   CUSTOMER_SUPPORT, SALES_MANAGER
//
// PERMISSION MODEL:
//   Permissions are org-scoped — a FLEET_MANAGER at Citi Hoppa cannot
//   see Super Metro data even if they are also in Super Metro.
//   extractPermissions() scopes to orgId and includes branch-level grants.
//
// MULTI-ROLE EDGE CASE:
//   If a user holds multiple staff roles across the same org (rare but valid),
//   STAFF_ROLE_PRIORITY picks the highest-authority actor.

import { derived, get } from 'svelte/store'
import type { Tables } from '../../../DatabaseDefinitions'
import type { UserState, ActorContext } from '$lib/features/auth/services/userState.server'
import {
  createContextStore,
  extractPermissions,
  extractJurisdictions,
  extractOrgMemberships,
  isAllowed,
  ACTOR_TYPES,
  ORG_STAFF_TYPES,
} from '$lib/features/auth/contexts/context.template'
import type {
  EffectivePermission,
  Jurisdiction,
} from '$lib/features/auth/contexts/context.template'
import { ACTIONS } from '$lib/features/auth/stores/permisions'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActorRow = Tables<'actors'>

// ── Staff role priority ───────────────────────────────────────────────────────
// Higher index = higher precedence.
// Used when a user holds multiple staff roles in the same org (edge case).
// Mirrors the old ROLES.* order — now sourced from ACTOR_TYPES.

const STAFF_ROLE_PRIORITY: string[] = [
  ACTOR_TYPES.DATA_CLERK,
  ACTOR_TYPES.FIELD_ATTENDANT,
  ACTOR_TYPES.MECHANIC,
  ACTOR_TYPES.ACCOUNTS_CLERK,
  ACTOR_TYPES.COMPLIANCE_OFFICER,
  ACTOR_TYPES.AUDITOR,
  ACTOR_TYPES.CUSTOMER_SUPPORT,
  ACTOR_TYPES.SALES_MANAGER,
  ACTOR_TYPES.SECRETARY,
  ACTOR_TYPES.ACCOUNTANT,
  ACTOR_TYPES.ROUTE_SUPERVISOR,
  ACTOR_TYPES.DISPATCHER,
  ACTOR_TYPES.BRANCH_MANAGER,
  ACTOR_TYPES.OPERATIONS_MANAGER,
  ACTOR_TYPES.FLEET_MANAGER,
  ACTOR_TYPES.GENERAL_MANAGER,
]

// ── Context shape ─────────────────────────────────────────────────────────────

export interface OrgContext {
  actor: ActorRow

  /** Actor type string — for UI labels ("Fleet Manager", nav conditionals) */
  roleType: string

  orgId:   string
  orgName: string

  jurisdictions: Jurisdiction[]

  /**
   * Permissions scoped to this org.
   * Includes org-level, federal, and branch-level grants.
   * Already filtered by extractPermissions — no re-scoping needed in _allows.
   */
  permissions: EffectivePermission[]

  /**
   * Branch ID if this actor is branch-scoped (BRANCH_MANAGER etc.).
   * Null for org-wide actors.
   * Used to scope UI to a single branch — pages check this before
   * showing cross-branch data.
   */
  branchId: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

const { store, setContext, clearContext } = createContextStore<OrgContext>()
export const orgCtx = store

// ─────────────────────────────────────────────────────────────────────────────
// Activation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call from /org/[orgId]/+layout.ts load({ data, params }).
 * Returns false if user has no active staff actor for this org → redirect.
 *
 * ORG_CHAIR is NOT handled here — layout.ts should try activateOrgChairContext
 * first and only fall through to this if the user is not the chair.
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
export function activateOrgContext(
  userState: UserState,
  orgId: string,
): boolean {

  // ── Find all eligible staff ActorContexts for this org ─────────────────────
  // Eligible = active status, non-chair staff type, jurisdiction covers this org
  const candidates: ActorContext[] = userState.activeContexts.filter(ctx => {
    if (ctx.status !== 'active')               return false
    if (!ORG_STAFF_TYPES.includes(ctx.type))   return false

    return ctx.jurisdictions.some(j =>
      j.level === 'federal'
      || (j.level === 'org'    && j.scope_id === orgId)
      || (j.level === 'branch' && j.scope_id != null)
    )
  })

  if (candidates.length === 0) {
    clearContext()
    return false
  }

  // ── Pick highest-priority actor ─────────────────────────────────────────────
  // Sort descending by STAFF_ROLE_PRIORITY index.
  // Actors not in the priority list (index = -1) sort to the bottom.
  const bestCtx = candidates.sort((a, b) => {
    const ai = STAFF_ROLE_PRIORITY.indexOf(a.type)
    const bi = STAFF_ROLE_PRIORITY.indexOf(b.type)
    return bi - ai
  })[0]

  const actor = userState.actors.find(a => a.id === bestCtx.actorId)
  if (!actor) {
    clearContext()
    return false
  }

  // ── Jurisdiction + membership ───────────────────────────────────────────────
  const jurisdictions  = extractJurisdictions(userState, bestCtx.actorId)
  const orgMemberships = extractOrgMemberships(userState, bestCtx.actorId)
  const orgMembership  = orgMemberships.find(m => m.organization_id === orgId)

  // ── Branch scope ────────────────────────────────────────────────────────────
  // Branch-scoped actors (BRANCH_MANAGER, MECHANIC, etc.) have a branch-level
  // jurisdiction. Null for org-wide roles (GENERAL_MANAGER, FLEET_MANAGER etc.)
  const branchJurisdiction = jurisdictions.find(
    j => j.level === 'branch' && j.scope_id != null
  )
  const branchId = branchJurisdiction?.scope_id ?? null

  // ── Permissions ─────────────────────────────────────────────────────────────
  // Scoped to this org — extractPermissions includes federal + branch-level grants.
  // No further scope filtering needed in _allows or orgCan.
  const permissions = extractPermissions(userState, bestCtx.actorId, orgId)

  setContext({
    actor,
    roleType:      actor.type,
    orgId,
    orgName:       orgMembership?.org_name ?? 'Unknown SACCO',
    jurisdictions,
    permissions,
    branchId,
  })

  return true
}

export function deactivateOrgContext(): void {
  clearContext()
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
//
// Permissions are already org-scoped by extractPermissions() —
// isAllowed() here only checks action + effect, no re-scoping needed.
// ─────────────────────────────────────────────────────────────────────────────

const _allows = (ctx: OrgContext | null, action: string): boolean =>
  ctx ? isAllowed(ctx.permissions, action) : false

// ─────────────────────────────────────────────────────────────────────────────
// Permission stores
// All based on actual permission grants — not hardcoded role checks.
// The permission set was seeded from ROLE_PERMISSIONS on actor creation.
// ─────────────────────────────────────────────────────────────────────────────

export const canListVehicles       = derived(orgCtx, ($c) => _allows($c, ACTIONS.VEHICLE_LIST))
export const canViewVehicle        = derived(orgCtx, ($c) => _allows($c, ACTIONS.VEHICLE_VIEW))
export const canEditVehicle        = derived(orgCtx, ($c) => _allows($c, ACTIONS.VEHICLE_EDIT))
export const canAddVehicle         = derived(orgCtx, ($c) => _allows($c, ACTIONS.VEHICLE_ADD))
export const canListVehicleGroups  = derived(orgCtx, ($c) => _allows($c, ACTIONS.VEHICLE_GROUP_LIST))
export const canAddVehicleGroup    = derived(orgCtx, ($c) => _allows($c, ACTIONS.VEHICLE_GROUP_ADD))
export const canListDrivers        = derived(orgCtx, ($c) => _allows($c, ACTIONS.DRIVER_LIST))
export const canEditDriver         = derived(orgCtx, ($c) => _allows($c, ACTIONS.DRIVER_EDIT))
export const canAddDriver          = derived(orgCtx, ($c) => _allows($c, ACTIONS.DRIVER_ADD))
export const canListBookings       = derived(orgCtx, ($c) => _allows($c, ACTIONS.BOOKING_LIST))
export const canEditBooking        = derived(orgCtx, ($c) => _allows($c, ACTIONS.BOOKING_EDIT))
export const canAddBooking         = derived(orgCtx, ($c) => _allows($c, ACTIONS.BOOKING_ADD))
export const canTrackLive          = derived(orgCtx, ($c) => _allows($c, ACTIONS.TRACKING_LIVE))
export const canTrackHistory       = derived(orgCtx, ($c) => _allows($c, ACTIONS.TRACKING_HISTORY))
export const canListGeofences      = derived(orgCtx, ($c) => _allows($c, ACTIONS.GEOFENCE_LIST))
export const canViewGeofenceEvents = derived(orgCtx, ($c) => _allows($c, ACTIONS.GEOFENCE_EVENTS))
export const canViewFinance        = derived(orgCtx, ($c) => _allows($c, ACTIONS.FINANCE_LIST))
export const canEditFinance        = derived(orgCtx, ($c) => _allows($c, ACTIONS.FINANCE_EDIT))
export const canAddFinance         = derived(orgCtx, ($c) => _allows($c, ACTIONS.FINANCE_ADD))
export const canViewFuel           = derived(orgCtx, ($c) => _allows($c, ACTIONS.FUEL_LIST))
export const canEditFuel           = derived(orgCtx, ($c) => _allows($c, ACTIONS.FUEL_EDIT))
export const canViewMaintenance    = derived(orgCtx, ($c) => _allows($c, ACTIONS.MAINTENANCE_VIEW))
export const canLogMaintenance     = derived(orgCtx, ($c) => _allows($c, ACTIONS.MAINTENANCE_LOG))
export const canEditMaintenance    = derived(orgCtx, ($c) => _allows($c, ACTIONS.MAINTENANCE_EDIT))
export const canViewReports        = derived(orgCtx, ($c) => _allows($c, ACTIONS.REPORTS_VIEW))
export const canListCustomers      = derived(orgCtx, ($c) => _allows($c, ACTIONS.CUSTOMER_LIST))
export const canViewCustomer       = derived(orgCtx, ($c) => _allows($c, ACTIONS.CUSTOMER_VIEW))
export const canAddCustomer        = derived(orgCtx, ($c) => _allows($c, ACTIONS.CUSTOMER_ADD))
export const canViewReminders      = derived(orgCtx, ($c) => _allows($c, ACTIONS.REMINDER_LIST))

/**
 * SECRETARY gets this via delegated_authority from ORG_CHAIR.
 * The delegated permission flows through effective_permissions_raw view
 * and appears in their permissions array — no special handling needed.
 */
export const canApproveMembers     = derived(orgCtx, ($c) => _allows($c, ACTIONS.MEMBER_APPROVE))
export const canInviteMembers      = derived(orgCtx, ($c) => _allows($c, ACTIONS.MEMBER_INVITE))
export const canViewMemberRequests = derived(orgCtx, ($c) => _allows($c, ACTIONS.MEMBER_REQUESTS))
export const canManageOrg          = derived(orgCtx, ($c) => _allows($c, ACTIONS.ORG_MANAGE))
export const canChangeSettings     = derived(orgCtx, ($c) => _allows($c, ACTIONS.SETTINGS_ALL))

export const activeOrgId    = derived(orgCtx, ($c) => $c?.orgId      ?? null)
export const activeOrgName  = derived(orgCtx, ($c) => $c?.orgName    ?? '')
export const activeBranchId = derived(orgCtx, ($c) => $c?.branchId   ?? null)
export const activeRoleType = derived(orgCtx, ($c) => $c?.roleType   ?? null)

/** All allowed actions — for debug panel or dynamic nav generation */
export const orgAllowedActions = derived(
  orgCtx,
  ($c) => $c?.permissions.filter(p => p.effect === 'allow').map(p => p.action) ?? [],
)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const getOrgActorId      = () => get(orgCtx)?.actor.id  ?? null
export const getOrgContextOrgId = () => get(orgCtx)?.orgId      ?? null
export const isOrgContextActive = () => get(orgCtx) !== null

/**
 * Imperative permission check — use in load functions or event handlers.
 * Permissions are already org-scoped — no scope argument needed.
 *
 * @example
 *   if (!orgCan(ACTIONS.FINANCE_EDIT)) throw redirect(302, '/unauthorized')
 */
export function orgCan(action: string): boolean {
  const ctx = get(orgCtx)
  if (!ctx) return false
  return isAllowed(ctx.permissions, action)
}