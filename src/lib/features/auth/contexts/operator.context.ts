// src/lib/features/auth/contexts/operator.context.ts
//
// Cross-org OPERATOR context.
//
// LAZY ACTIVATION: Starts null.
// Call activateOperatorContext(userState) in /operator/+layout.ts.
//
// ROUTE: /operator/*
//
// MIGRATION FROM sessionStore:
//   activateOperatorContext() now accepts UserState instead of reading sessionStore.
//
// VEHICLE CAP:
//   maxVehicles sourced from actor_jurisdictions.max_vehicles (set by ORG_CHAIR).
//   assignedVehicleIds sourced from fleet_ownership rows for this actor + org.
//   isAtVehicleLimit = assignedVehicleIds.length >= maxVehicles.
//
// MULTI-ORG MODEL:
//   One OperatorOrgSlot per org-level jurisdiction.
//   Operator switches active org via setActiveOperatorOrg(orgId).

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

// ── Org slot ──────────────────────────────────────────────────────────────────

export interface OperatorOrgSlot {
  orgId: string
  orgName: string

  /**
   * Maximum vehicles this operator may manage in this org.
   * Set by ORG_CHAIR on the actor_jurisdictions row at approval time.
   * -1 means no limit was set (ORG_CHAIR omitted it — treat as unlimited,
   * UI should flag this as a data quality issue).
   */
  maxVehicles: number

  /**
   * Vehicle IDs currently managed by this operator in this org.
   * Sourced from fleet_ownership rows for this actor.
   */
  assignedVehicleIds: string[]

  /**
   * Stage IDs this operator is approved to dispatch on in this org.
   * Sourced from stage_assignments rows scoped to this org.
   */
  routeIds: string[]

  /**
   * Permissions scoped to this org.
   * Includes direct, policy_group, and delegated grants.
   */
  permissions: EffectivePermission[]
}

// ── Context shape ─────────────────────────────────────────────────────────────

export interface OperatorContext {
  actor: ActorRow

  /**
   * All orgs this operator has approved jurisdiction over.
   * One slot per org-level jurisdiction entry.
   */
  orgSlots: OperatorOrgSlot[]

  /**
   * The org the operator is currently working in.
   * Defaults to first slot on activation.
   * Switched via setActiveOperatorOrg(orgId).
   */
  activeOrgId: string

  /** The currently active slot — convenience accessor */
  activeSlot: OperatorOrgSlot

  /**
   * All permissions across all orgs — for cross-org aggregate views.
   * Not scoped — use activeSlot.permissions for scoped checks.
   */
  allPermissions: EffectivePermission[]

  jurisdictions: Jurisdiction[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

const { store, setContext, clearContext } =
  createContextStore<OperatorContext>()
export const operatorCtx = store

// ─────────────────────────────────────────────────────────────────────────────
// Activation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call from /operator/+layout.ts load({ data }).
 * Returns false if user has no approved active OPERATOR actor → redirect.
 *
 * @example
 *   // /operator/+layout.ts
 *   export async function load({ data }) {
 *     if (!data.userState) throw redirect(302, '/login')
 *     if (!activateOperatorContext(data.userState)) throw redirect(302, '/app/dashboard')
 *   }
 */
export function activateOperatorContext(userState: UserState): boolean {
  const actorCtx =
    userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.OPERATOR && ctx.status === "active",
    ) ?? null

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
  const allPermissions = extractPermissions(userState, actorCtx.actorId)

  // ── Build org slots ─────────────────────────────────────────────────────────
  const orgSlots: OperatorOrgSlot[] = jurisdictions
    .filter((j) => j.level === "org" && j.scope_id != null)
    .map((j) => {
      const orgId = j.scope_id as string
      const orgMember = orgMemberships.find((m) => m.organization_id === orgId)

      // max_vehicles — set by ORG_CHAIR at approval time via actor_jurisdictions
      // -1 signals the column was not set (data quality issue — ORG_CHAIR should
      // always provide a cap when approving OPERATOR actor_requests)
      const maxVehicles = j.max_vehicles ?? -1

      // Vehicles this operator currently manages in this org
      const assignedVehicleIds = actorCtx.fleetOwnership
        .filter((f) => f.actor_id === actorCtx.actorId)
        .map((f) => f.vehicle_id)

      // Stages/routes approved for this org
      const routeIds = actorCtx.stageAssignments
        .filter((s) => s.organization_id === orgId)
        .map((s) => s.id)

      // Permissions scoped to this org (federal grants included)
      const permissions = extractPermissions(userState, actorCtx.actorId, orgId)

      return {
        orgId,
        orgName: orgMember?.org_name ?? "Unknown SACCO",
        maxVehicles,
        assignedVehicleIds,
        routeIds,
        permissions,
      }
    })

  // Approved actor but no org jurisdictions yet — rare edge case
  if (orgSlots.length === 0) {
    clearContext()
    return false
  }

  setContext({
    actor,
    orgSlots,
    activeOrgId: orgSlots[0].orgId,
    activeSlot: orgSlots[0],
    allPermissions,
    jurisdictions,
  })

  return true
}

/**
 * Switch the active org context for the operator.
 * Call when operator selects a different org from the org switcher UI.
 */
export function setActiveOperatorOrg(orgId: string): void {
  operatorCtx.update((ctx) => {
    if (!ctx) return ctx
    const slot = ctx.orgSlots.find((s) => s.orgId === orgId)
    if (!slot) return ctx
    return { ...ctx, activeOrgId: orgId, activeSlot: slot }
  })
}

export function deactivateOperatorContext(): void {
  clearContext()
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Permission check against the ACTIVE org slot only */
const _allows = (ctx: OperatorContext | null, action: string): boolean =>
  ctx ? isAllowed(ctx.activeSlot.permissions, action) : false

/** Permission check across ALL orgs — for cross-org aggregate views */
const _allowsGlobal = (ctx: OperatorContext | null, action: string): boolean =>
  ctx ? isAllowed(ctx.allPermissions, action) : false

// ─────────────────────────────────────────────────────────────────────────────
// Permission stores — scoped to active org slot
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core OPERATOR capability — gate all trip creation UI on this.
 * Requires booking.add AND booking.edit in the active org slot.
 */
export const canOrganiseTrips = derived(
  operatorCtx,
  ($c) => _allows($c, ACTIONS.BOOKING_ADD) && _allows($c, ACTIONS.BOOKING_EDIT),
)

export const canViewBookings = derived(operatorCtx, ($c) =>
  _allows($c, ACTIONS.BOOKING_LIST),
)
export const canEditBooking = derived(operatorCtx, ($c) =>
  _allows($c, ACTIONS.BOOKING_EDIT),
)
export const canViewVehicles = derived(operatorCtx, ($c) =>
  _allows($c, ACTIONS.VEHICLE_VIEW),
)
export const canListVehicles = derived(operatorCtx, ($c) =>
  _allows($c, ACTIONS.VEHICLE_LIST),
)
export const canLogFuel = derived(operatorCtx, ($c) =>
  _allows($c, ACTIONS.FUEL_ADD),
)
export const canViewFuel = derived(operatorCtx, ($c) =>
  _allows($c, ACTIONS.FUEL_LIST),
)
export const canTrackLive = derived(operatorCtx, ($c) =>
  _allows($c, ACTIONS.TRACKING_LIVE),
)
export const canTrackHistory = derived(operatorCtx, ($c) =>
  _allows($c, ACTIONS.TRACKING_HISTORY),
)
export const canListCustomers = derived(operatorCtx, ($c) =>
  _allows($c, ACTIONS.CUSTOMER_LIST),
)
export const canAddCustomer = derived(operatorCtx, ($c) =>
  _allows($c, ACTIONS.CUSTOMER_ADD),
)
export const canEditCustomer = derived(operatorCtx, ($c) =>
  _allows($c, ACTIONS.CUSTOMER_EDIT),
)
export const canViewReports = derived(operatorCtx, ($c) =>
  _allows($c, ACTIONS.REPORTS_VIEW),
)

// ── Cross-org stores ──────────────────────────────────────────────────────────

/**
 * True if operator has trip organisation permission across ALL their orgs.
 * Use to toggle the "All Orgs" aggregate view.
 */
export const canOrganiseTripsGlobally = derived(
  operatorCtx,
  ($c) =>
    _allowsGlobal($c, ACTIONS.BOOKING_ADD) &&
    _allowsGlobal($c, ACTIONS.BOOKING_EDIT),
)

export const operatorOrgSlots = derived(operatorCtx, ($c) => $c?.orgSlots ?? [])
export const operatorOrgCount = derived(
  operatorCtx,
  ($c) => $c?.orgSlots.length ?? 0,
)
export const activeOrgId = derived(operatorCtx, ($c) => $c?.activeOrgId ?? null)
export const activeOrgName = derived(
  operatorCtx,
  ($c) => $c?.activeSlot.orgName ?? "",
)
export const activeAssignedVehicleIds = derived(
  operatorCtx,
  ($c) => $c?.activeSlot.assignedVehicleIds ?? [],
)
export const activeMaxVehicles = derived(
  operatorCtx,
  ($c) => $c?.activeSlot.maxVehicles ?? -1,
)
export const activeRouteIds = derived(
  operatorCtx,
  ($c) => $c?.activeSlot.routeIds ?? [],
)

/**
 * Vehicle utilisation in the active org — 0.0 to 1.0.
 * Returns 0 if maxVehicles is -1 (no cap set — ORG_CHAIR data quality issue).
 */
export const vehicleUtilisation = derived(operatorCtx, ($c) => {
  if (!$c) return 0
  const { assignedVehicleIds, maxVehicles } = $c.activeSlot
  if (maxVehicles <= 0) return 0 // -1 = no cap set
  return assignedVehicleIds.length / maxVehicles
})

/**
 * True if operator has reached their ORG_CHAIR-approved vehicle cap.
 * False if maxVehicles is -1 (no cap set — treat as warning, not block).
 */
export const isAtVehicleLimit = derived(operatorCtx, ($c) => {
  if (!$c) return false
  const { assignedVehicleIds, maxVehicles } = $c.activeSlot
  if (maxVehicles <= 0) return false // -1 = no cap set
  return assignedVehicleIds.length >= maxVehicles
})

/** True if operator manages more than one org — show org switcher */
export const isMultiOrg = derived(
  operatorCtx,
  ($c) => ($c?.orgSlots.length ?? 0) > 1,
)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const getOperatorActorId = () => get(operatorCtx)?.actor.id ?? null
export const getOperatorActiveOrg = () => get(operatorCtx)?.activeOrgId ?? null
export const getOperatorOrgSlots = () => get(operatorCtx)?.orgSlots ?? []
export const isOperatorContextActive = () => get(operatorCtx) !== null

/**
 * Check if operator can use a specific vehicle in the active org.
 * Respects their fleet_ownership allocation, not the full org fleet.
 */
export function operatorOwnsVehicle(vehicleId: string): boolean {
  const ctx = get(operatorCtx)
  if (!ctx) return false
  return ctx.activeSlot.assignedVehicleIds.includes(vehicleId)
}

/**
 * Check if operator can dispatch on a specific route in the active org.
 */
export function operatorOwnsRoute(routeId: string): boolean {
  const ctx = get(operatorCtx)
  if (!ctx) return false
  return ctx.activeSlot.routeIds.includes(routeId)
}

/**
 * Imperative permission check against the active org slot.
 */
export function operatorCan(action: string): boolean {
  const ctx = get(operatorCtx)
  if (!ctx) return false
  return isAllowed(ctx.activeSlot.permissions, action)
}

/**
 * Check permission across ALL orgs this operator manages.
 */
export function operatorCanGlobally(action: string): boolean {
  const ctx = get(operatorCtx)
  if (!ctx) return false
  return isAllowed(ctx.allPermissions, action)
}
