/**
 * operator.context.ts — Cross-org OPERATOR context.
 *
 * LAZY ACTIVATION: Starts null.
 * Call activateOperatorContext() in /operator/+layout.ts.
 *
 * ROUTE: /operator/*
 *
 * WHAT IS AN OPERATOR?
 *   A special platform role approved directly by ORG_CHAIR (not platform admins).
 *   Think of a transport business owner or logistics coordinator who:
 *
 *   - Works ACROSS multiple SACCOs simultaneously (e.g. manages 3 orgs)
 *   - Manages a defined set of routes per org (e.g. 3 routes × 3 orgs)
 *   - Has a vehicle allocation per org (e.g. up to 10 vehicles per org)
 *   - Can organise trips, add fuel, and coordinate cross-SACCO movements
 *   - Has delegated fleet authority — NOT full org admin access
 *
 * HOW THEY'RE VERIFIED:
 *   1. User selects OPERATOR role during onboarding
 *   2. actor_request created with requested_type = 'OPERATOR'
 *   3. ORG_CHAIR at each desired org approves → creates actor + jurisdiction
 *   4. Jurisdiction is org-scoped with vehicle + route limits in metadata
 *
 * MULTI-ORG MODEL:
 *   An OPERATOR can hold jurisdictions over N orgs.
 *   Each OrgSlot describes their allocation for one org:
 *     - orgId, orgName
 *     - maxVehicles (e.g. 10)
 *     - assignedVehicleIds (current allocation)
 *     - routeIds (approved routes for this org)
 *
 *   The operator switches active org context via setActiveOperatorOrg(orgId).
 *
 * LIMITS vs ORG_CHAIR:
 *   OPERATOR cannot:
 *     - Approve members
 *     - Change org settings
 *     - View finance records of the org
 *     - Edit vehicle records (only view + use)
 *   OPERATOR can:
 *     - Organise and dispatch trips across their allocated vehicles
 *     - Log fuel for allocated vehicles
 *     - View live tracking for their vehicles
 *     - Create and edit bookings on their routes
 *     - View customers on their routes
 */

import { writable, derived, get } from 'svelte/store'
import { sessionStore } from '$lib/features/auth/stores/auth.store'
import { ROLES } from '$lib/features/auth/stores/roles'
import { ACTIONS } from '$lib/features/auth/stores/permissions'
import type { Actor, OrgMembership, EffectivePermission, Jurisdiction } from '$lib/features/auth/stores/auth.store'

// ── Org slot shape ────────────────────────────────────────────────────────────

export interface OperatorOrgSlot {
  orgId:              string
  orgName:            string

  /**
   * Maximum vehicles this operator may use in this org.
   * Stored in actor_jurisdictions metadata by the approving ORG_CHAIR.
   * Default: 10 (can be set per-approval).
   */
  maxVehicles:        number

  /**
   * Vehicle IDs currently allocated to this operator in this org.
   * Subset of the org's full fleet.
   */
  assignedVehicleIds: string[]

  /**
   * Route IDs (from stage_assignments or route definitions)
   * this operator is approved to dispatch on.
   */
  routeIds:           string[]

  /** Permissions specifically granted for this org */
  permissions:        EffectivePermission[]
}

// ── Context shape ─────────────────────────────────────────────────────────────

export interface OperatorContext {
  actor:     Actor

  /**
   * All orgs this operator has approved jurisdiction over.
   * Populated from jurisdictions + orgMemberships on activation.
   */
  orgSlots:  OperatorOrgSlot[]

  /**
   * The org the operator is currently "working in" — determines
   * which vehicles, routes and bookings are shown.
   * Defaults to the first slot. Operator can switch via setActiveOperatorOrg().
   */
  activeOrgId: string

  /** Convenience: the active slot data */
  activeSlot: OperatorOrgSlot

  /** All permissions across all orgs — for cross-org reports */
  allPermissions: EffectivePermission[]

  jurisdictions: Jurisdiction[]
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const operatorCtx = writable<OperatorContext | null>(null)

// ── Activation ────────────────────────────────────────────────────────────────

/**
 * Call from /operator/+layout.ts load().
 * Returns false if user has no approved OPERATOR actor → redirect.
 *
 * @example
 *   export async function load() {
 *     if (!activateOperatorContext()) throw redirect(302, '/app/dashboard')
 *   }
 */
export function activateOperatorContext(): boolean {
  const s = get(sessionStore)

  const actor = s.actors.find(
    (a) => a.type === ROLES.OPERATOR && a.status === 'active',
  ) ?? null

  if (!actor) {
    operatorCtx.set(null)
    return false
  }

  sessionStore.update((st) => ({ ...st, activeActorId: actor.id }))

  const actorJurisdictions = s.jurisdictions.filter((j) => j.actor_id === actor.id)
  const actorPermissions   = s.permissions.filter((p) => p.actor_id === actor.id)

  // Build org slots from org-level jurisdictions
  // Each jurisdiction's metadata holds maxVehicles, assignedVehicleIds, routeIds
  const orgSlots: OperatorOrgSlot[] = actorJurisdictions
    .filter((j) => j.level === 'org' && j.scope_id)
    .map((j) => {
      const orgId     = j.scope_id as string
      const meta      = (j.metadata as Record<string, unknown>) ?? {}
      const orgMember = s.orgMemberships.find((m) => m.organization_id === orgId)

      return {
        orgId,
        orgName:            orgMember?.org_name ?? 'Unknown SACCO',
        maxVehicles:        (meta.max_vehicles        as number)   ?? 10,
        assignedVehicleIds: (meta.assigned_vehicle_ids as string[]) ?? [],
        routeIds:           (meta.route_ids           as string[]) ?? [],
        permissions: actorPermissions.filter(
          (p) => p.scope_id === orgId || p.level === 'federal',
        ),
      }
    })

  if (orgSlots.length === 0) {
    // Approved actor but no org jurisdictions yet — rare edge case
    operatorCtx.set(null)
    return false
  }

  const activeOrgId = orgSlots[0].orgId
  const activeSlot  = orgSlots[0]

  operatorCtx.set({
    actor,
    orgSlots,
    activeOrgId,
    activeSlot,
    allPermissions: actorPermissions,
    jurisdictions:  actorJurisdictions,
  })

  return true
}

/**
 * Switch the active org context for the operator.
 * Call when operator selects a different org from the org switcher.
 *
 * @example
 *   setActiveOperatorOrg('org-uuid-for-super-metro')
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
  operatorCtx.set(null)
}

// ── Internal helper ───────────────────────────────────────────────────────────

/**
 * Check permission against the ACTIVE org slot only.
 * Use _allowsGlobal for cross-org permission checks.
 */
const _allows = (ctx: OperatorContext | null, action: string) =>
  ctx?.activeSlot.permissions.some(
    (p) => p.action === action && p.effect === 'allow',
  ) ?? false

const _allowsGlobal = (ctx: OperatorContext | null, action: string) =>
  ctx?.allPermissions.some(
    (p) => p.action === action && p.effect === 'allow',
  ) ?? false

// ── Permission stores (scoped to active org) ──────────────────────────────────

/**
 * Organise and dispatch trips on allocated routes (booking.add + booking.edit).
 * Core OPERATOR capability — gate all trip creation UI on this.
 */
export const canOrganiseTrips = derived(
  operatorCtx,
  ($c) => _allows($c, ACTIONS.BOOKING_ADD) && _allows($c, ACTIONS.BOOKING_EDIT),
)

/** View bookings / passenger lists for their routes (booking.list) */
export const canViewBookings = derived(operatorCtx, ($c) => _allows($c, ACTIONS.BOOKING_LIST))

/** Edit an existing booking / cancellation (booking.edit) */
export const canEditBooking = derived(operatorCtx, ($c) => _allows($c, ACTIONS.BOOKING_EDIT))

/** View allocated vehicles (vehicle.view) */
export const canViewVehicles = derived(operatorCtx, ($c) => _allows($c, ACTIONS.VEHICLE_VIEW))

/** List allocated vehicles (vehicle.list) */
export const canListVehicles = derived(operatorCtx, ($c) => _allows($c, ACTIONS.VEHICLE_LIST))

/**
 * Log fuel for allocated vehicles (fuel.add).
 * Operators can add fuel entries for any vehicle in their assignedVehicleIds.
 */
export const canLogFuel = derived(operatorCtx, ($c) => _allows($c, ACTIONS.FUEL_ADD))

/** View fuel history for their vehicles (fuel.list) */
export const canViewFuel = derived(operatorCtx, ($c) => _allows($c, ACTIONS.FUEL_LIST))

/** Live tracking for allocated vehicles (tracking.live) */
export const canTrackLive = derived(operatorCtx, ($c) => _allows($c, ACTIONS.TRACKING_LIVE))

/** Historical trip playback (tracking.history) */
export const canTrackHistory = derived(operatorCtx, ($c) => _allows($c, ACTIONS.TRACKING_HISTORY))

/** View + manage customers on their routes (customer.list) */
export const canListCustomers = derived(operatorCtx, ($c) => _allows($c, ACTIONS.CUSTOMER_LIST))

/** Add new customers / passengers (customer.add) */
export const canAddCustomer = derived(operatorCtx, ($c) => _allows($c, ACTIONS.CUSTOMER_ADD))

/** Edit customer records (customer.edit) */
export const canEditCustomer = derived(operatorCtx, ($c) => _allows($c, ACTIONS.CUSTOMER_EDIT))

/** View reports for their routes (reports.view) */
export const canViewReports = derived(operatorCtx, ($c) => _allows($c, ACTIONS.REPORTS_VIEW))

// ── Cross-org stores ──────────────────────────────────────────────────────────

/**
 * True if operator has cross-org trip organisation permission globally.
 * Use for the "All Orgs" view vs per-org view toggle.
 */
export const canOrganiseTripsGlobally = derived(
  operatorCtx,
  ($c) => _allowsGlobal($c, ACTIONS.BOOKING_ADD) && _allowsGlobal($c, ACTIONS.BOOKING_EDIT),
)

/** All org slots — for the org switcher UI */
export const operatorOrgSlots = derived(operatorCtx, ($c) => $c?.orgSlots ?? [])

/** Number of orgs this operator manages — shows multi-org badge if > 1 */
export const operatorOrgCount = derived(operatorCtx, ($c) => $c?.orgSlots.length ?? 0)

/** Active org ID */
export const activeOrgId = derived(operatorCtx, ($c) => $c?.activeOrgId ?? null)

/** Active org name — for topbar / breadcrumb */
export const activeOrgName = derived(operatorCtx, ($c) => $c?.activeSlot.orgName ?? '')

/** Vehicles allocated to the operator in the active org */
export const activeAssignedVehicleIds = derived(
  operatorCtx,
  ($c) => $c?.activeSlot.assignedVehicleIds ?? [],
)

/** Max vehicles allowed in the active org */
export const activeMaxVehicles = derived(
  operatorCtx,
  ($c) => $c?.activeSlot.maxVehicles ?? 10,
)

/** Routes the operator is approved to use in the active org */
export const activeRouteIds = derived(
  operatorCtx,
  ($c) => $c?.activeSlot.routeIds ?? [],
)

/**
 * Vehicle capacity utilisation in the active org.
 * 0.0 – 1.0. Use for a progress bar in the fleet dashboard.
 */
export const vehicleUtilisation = derived(
  operatorCtx,
  ($c) => {
    if (!$c) return 0
    const { assignedVehicleIds, maxVehicles } = $c.activeSlot
    return maxVehicles > 0 ? assignedVehicleIds.length / maxVehicles : 0
  },
)

/** True if operator has reached their vehicle allocation limit in the active org */
export const isAtVehicleLimit = derived(
  operatorCtx,
  ($c) => {
    if (!$c) return false
    const { assignedVehicleIds, maxVehicles } = $c.activeSlot
    return assignedVehicleIds.length >= maxVehicles
  },
)

/** True if operator manages more than one org — shows org switcher */
export const isMultiOrg = derived(operatorCtx, ($c) => ($c?.orgSlots.length ?? 0) > 1)

// ── Helpers ───────────────────────────────────────────────────────────────────

export const getOperatorActorId    = () => get(operatorCtx)?.actor.id ?? null
export const getOperatorActiveOrg  = () => get(operatorCtx)?.activeOrgId ?? null
export const getOperatorOrgSlots   = () => get(operatorCtx)?.orgSlots ?? []
export const isOperatorContextActive = () => get(operatorCtx) !== null

/**
 * Check if operator can use a specific vehicle in the active org.
 * Respects their assigned vehicle allocation, not the full org fleet.
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
 * @example
 *   if (!operatorCan(ACTIONS.BOOKING_ADD)) return showError('Not authorised')
 */
export function operatorCan(action: string): boolean {
  const ctx = get(operatorCtx)
  if (!ctx) return false
  return ctx.activeSlot.permissions.some(
    (p) => p.action === action && p.effect === 'allow',
  )
}

/**
 * Check permission across ALL orgs this operator manages.
 * Use when building the "All Orgs" aggregate view.
 */
export function operatorCanGlobally(action: string): boolean {
  const ctx = get(operatorCtx)
  if (!ctx) return false
  return ctx.allPermissions.some(
    (p) => p.action === action && p.effect === 'allow',
  )
}