// src/lib/features/auth/contexts/crew.context.ts
//
// DRIVER and CONDUCTOR context.
//
// LAZY ACTIVATION: Starts null.
// Call activateCrewContext(userState) in /crew/+layout.ts.
//
// ROUTE: /crew/*  (dashboard, incidents, tipjar, requests)
//
// MIGRATION FROM sessionStore:
//   activateCrewContext() now accepts UserState instead of reading sessionStore.
//   Vehicle/trip data comes from driverAssignment / conductorAssignment in
//   ActorContext — NOT from actor.metadata (bootstrap_session pattern removed).
//
// ⚠️  VEHICLE PLATE NOTE:
//   activeVehiclePlate is always null until resolveUserState joins vehicles
//   on driver_assignments. vehicle_id IS available — plate requires a
//   vehicles select added to the parallel fetch in userState.server.ts.
//
// TWO CREW TYPES:
//
//   DRIVER:
//     - Assigned via driver_assignments (vehicle_id, shift_state, active_trip_id)
//     - Can view vehicle telemetry, log fuel, manage their shift
//     - Sees their earnings and active trip
//
//   CONDUCTOR:
//     - Assigned via conductor_assignments (vehicle_id, active_trip_id)
//     - Can manage fares, boarding, tip jar, reservations
//     - Has finance.add permission for fare collection
//
//   Both types:
//     - Must be assigned to a vehicle (activeVehicleId)
//     - Must belong to at least one org (verified)
//     - Can report incidents, view live tracking

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
  OrgMembership,
} from "$lib/features/auth/contexts/context.template"
import { ACTIONS } from "$lib/features/auth/stores/permisions"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActorRow = Tables<"actors">

// ── Context shape ─────────────────────────────────────────────────────────────

export interface CrewContext {
  actor: ActorRow

  /** DRIVER or CONDUCTOR */
  crewType: "DRIVER" | "CONDUCTOR"

  /** Org this crew member belongs to (primary — most crew are in one org) */
  orgId: string
  orgName: string

  /**
   * Vehicle currently assigned to this crew member.
   * Sourced from driver_assignments.vehicle_id / conductor_assignments.vehicle_id.
   * Null if not yet assigned — show "waiting for assignment" UI.
   */
  activeVehicleId: string | null

  /**
   * Vehicle registration plate for topbar display.
   * ⚠️  Always null until resolveUserState joins vehicles on driver_assignments.
   *     vehicle_id is available — add a vehicles select to the parallel fetch.
   */
  activeVehiclePlate: string | null

  /**
   * Active trip ID if currently on shift.
   * Sourced from driver_assignments.active_trip_id / conductor_assignments.active_trip_id.
   * Null if off duty or between trips.
   */
  activeTripId: string | null

  /**
   * Current shift state.
   * Sourced from driver_assignments.shift_state.
   * Conductors have no shift_state column — defaults to 'off_duty'.
   */
  shiftState: "on_duty" | "off_duty" | "on_break"

  jurisdictions: Jurisdiction[]
  permissions: EffectivePermission[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

const { store, setContext, clearContext } = createContextStore<CrewContext>()
export const crewCtx = store

// ─────────────────────────────────────────────────────────────────────────────
// Activation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call from /crew/+layout.ts load({ data }).
 * Returns false if user has no active DRIVER or CONDUCTOR actor → redirect.
 *
 * Prefers DRIVER over CONDUCTOR when user holds both (edge case —
 * DRIVER has more write access: shift management, fuel logging).
 *
 * @example
 *   // /crew/+layout.ts
 *   export async function load({ data }) {
 *     if (!data.userState) throw redirect(302, '/login')
 *     if (!activateCrewContext(data.userState)) throw redirect(302, '/app/dashboard')
 *   }
 */
export function activateCrewContext(userState: UserState): boolean {
  // Find the best matching crew ActorContext — DRIVER preferred over CONDUCTOR
  const actorCtx =
    userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.DRIVER && ctx.status === "active",
    ) ??
    userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.CONDUCTOR && ctx.status === "active",
    ) ??
    null

  if (!actorCtx) {
    clearContext()
    return false
  }

  // Find the raw actor row — needed for actor.metadata and actor.id
  const actor = userState.actors.find((a) => a.id === actorCtx.actorId)
  if (!actor) {
    clearContext()
    return false
  }

  const crewType: CrewContext["crewType"] =
    actor.type === ACTOR_TYPES.DRIVER ? "DRIVER" : "CONDUCTOR"

  // ── Org resolution ──────────────────────────────────────────────────────────
  // Find the org via jurisdictions — crew belong to exactly one org
  const jurisdictions = extractJurisdictions(userState, actorCtx.actorId)
  const orgJurisdiction = jurisdictions.find(
    (j) => j.level === "org" && j.scope_id != null,
  )
  const orgId = orgJurisdiction?.scope_id ?? ""

  const orgMemberships = extractOrgMemberships(userState, actorCtx.actorId)
  const orgMembership = orgMemberships.find((m) => m.organization_id === orgId)
  const orgName = orgMembership?.org_name ?? "Unknown SACCO"

  // ── Assignment resolution ───────────────────────────────────────────────────
  // Vehicle and trip data from the resolved assignment rows.
  // driver_assignments has shift_state; conductor_assignments does not.
  let activeVehicleId: string | null = null
  let activeTripId: string | null = null
  let shiftState: CrewContext["shiftState"] = "off_duty"

  if (crewType === "DRIVER" && actorCtx.driverAssignment) {
    const da = actorCtx.driverAssignment
    activeVehicleId = da.vehicle_id
    activeTripId = da.active_trip_id ?? null
    shiftState = (da.shift_state as CrewContext["shiftState"]) ?? "off_duty"
  } else if (crewType === "CONDUCTOR" && actorCtx.conductorAssignment) {
    const ca = actorCtx.conductorAssignment
    activeVehicleId = ca.vehicle_id
    activeTripId = ca.active_trip_id ?? null
    // Conductors have no shift_state — treated as on_duty when assigned
    shiftState = activeVehicleId ? "on_duty" : "off_duty"
  }

  // ── Permissions ─────────────────────────────────────────────────────────────
  // Scoped to this actor's org — includes direct + delegated
  const permissions = extractPermissions(userState, actorCtx.actorId, orgId)

  setContext({
    actor,
    crewType,
    orgId,
    orgName,
    activeVehicleId,
    activeVehiclePlate: null, // TODO: add vehicles join to resolveUserState
    activeTripId,
    shiftState,
    jurisdictions,
    permissions,
  })

  return true
}

export function deactivateCrewContext(): void {
  clearContext()
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────────────────────────

const _allows = (ctx: CrewContext | null, action: string): boolean =>
  ctx ? isAllowed(ctx.permissions, action) : false

// ─────────────────────────────────────────────────────────────────────────────
// Permission stores
// ─────────────────────────────────────────────────────────────────────────────

/** View the vehicle they're assigned to (vehicle.view) */
export const canViewVehicle = derived(crewCtx, ($c) =>
  _allows($c, ACTIONS.VEHICLE_VIEW),
)

/** Live tracking — both crew types (tracking.live) */
export const canTrackLive = derived(crewCtx, ($c) =>
  _allows($c, ACTIONS.TRACKING_LIVE),
)

/** Log fuel entries — DRIVER primary (fuel.add) */
export const canLogFuel = derived(crewCtx, ($c) =>
  _allows($c, ACTIONS.FUEL_ADD),
)

/** View fuel history (fuel.list) */
export const canViewFuel = derived(crewCtx, ($c) =>
  _allows($c, ACTIONS.FUEL_LIST),
)

/** Add a booking / accept a reservation — CONDUCTOR primary (booking.add) */
export const canAddBooking = derived(crewCtx, ($c) =>
  _allows($c, ACTIONS.BOOKING_ADD),
)

/** View bookings / passenger manifest (booking.list) */
export const canViewBookings = derived(crewCtx, ($c) =>
  _allows($c, ACTIONS.BOOKING_LIST),
)

/** Record a fare / cash collection (finance.add) — CONDUCTOR */
export const canRecordFare = derived(crewCtx, ($c) =>
  _allows($c, ACTIONS.FINANCE_ADD),
)

/** View reminders — service due, licence expiry, etc. (reminder.list) */
export const canViewReminders = derived(crewCtx, ($c) =>
  _allows($c, ACTIONS.REMINDER_LIST),
)

/**
 * True if crew member is currently on an active shift.
 * Use to show/hide shift-sensitive actions (boarding, fare collection).
 */
export const isOnDuty = derived(crewCtx, ($c) => $c?.shiftState === "on_duty")

/** True if a vehicle is assigned — false shows "waiting for assignment" UI */
export const hasVehicleAssignment = derived(
  crewCtx,
  ($c) => $c?.activeVehicleId != null,
)

/** True if currently on a trip — false hides trip-specific actions */
export const hasActiveTrip = derived(crewCtx, ($c) => $c?.activeTripId != null)

/** DRIVER or CONDUCTOR — for conditional UI rendering */
export const crewType = derived(crewCtx, ($c) => $c?.crewType ?? null)

/**
 * The assigned vehicle's plate — for topbar display.
 * Always null until resolveUserState joins vehicles on driver_assignments.
 */
export const activePlate = derived(
  crewCtx,
  ($c) => $c?.activeVehiclePlate ?? null,
)

/** Current shift state */
export const shiftState = derived(crewCtx, ($c) => $c?.shiftState ?? "off_duty")

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const getCrewActorId = () => get(crewCtx)?.actor.id ?? null
export const getCrewOrgId = () => get(crewCtx)?.orgId ?? null
export const getActiveVehicleId = () => get(crewCtx)?.activeVehicleId ?? null
export const getActiveTripId = () => get(crewCtx)?.activeTripId ?? null
export const isCrewContextActive = () => get(crewCtx) !== null

/**
 * Imperative permission check — use in event handlers or +page.server.ts.
 * @example
 *   if (!crewCan(ACTIONS.BOOKING_ADD)) return showError('Not authorised')
 */
export function crewCan(action: string): boolean {
  const ctx = get(crewCtx)
  if (!ctx) return false
  return isAllowed(ctx.permissions, action)
}
