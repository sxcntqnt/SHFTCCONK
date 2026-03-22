/**
 * crew.context.ts — DRIVER and CONDUCTOR context.
 *
 * LAZY ACTIVATION: Starts null.
 * Call activateCrewContext() in /crew/+layout.ts.
 *
 * ROUTE: /crew/*  (maps to the crew dashboard: dashboard, incidents, tipjar, requests)
 *
 * TWO CREW TYPES:
 *
 *   DRIVER:
 *     - Assigned to a vehicle via driver_assignments
 *     - Can view vehicle telemetry, log fuel, manage their shift
 *     - Sees their earnings and active trip
 *
 *   CONDUCTOR:
 *     - Assigned to a vehicle via conductor_assignments
 *     - Can manage fares, boarding, tip jar, reservations
 *     - Has finance.add permission for fare collection
 *
 *   Both types:
 *     - Must be assigned to a vehicle (activeVehicleId)
 *     - Must belong to at least one org (verified)
 *     - Can report incidents, view live tracking
 */

import { writable, derived, get } from 'svelte/store'
import { sessionStore } from '$lib/features/auth/stores/auth.store'
import { ROLES } from '$lib/features/auth/stores/roles'
import { ACTIONS } from '$lib/features/auth/stores/permissions'
import type { Actor, OrgMembership, EffectivePermission, Jurisdiction } from '$lib/features/auth/stores/auth.store'

// ── Context shape ─────────────────────────────────────────────────────────────

export interface CrewContext {
  actor:       Actor

  /** DRIVER or CONDUCTOR */
  crewType:    'DRIVER' | 'CONDUCTOR'

  /** Org this crew member belongs to (primary — most crew are in one org) */
  orgId:       string
  orgName:     string

  /**
   * Vehicle currently assigned to this crew member.
   * Comes from driver_assignments / conductor_assignments via bootstrap payload.
   * Null if not yet assigned — show "waiting for assignment" UI.
   */
  activeVehicleId:   string | null
  activeVehiclePlate: string | null

  /**
   * Active trip ID if currently on shift.
   * Null if off duty or between trips.
   */
  activeTripId: string | null

  /** Current shift state: on_duty | off_duty | on_break */
  shiftState:  'on_duty' | 'off_duty' | 'on_break'

  jurisdictions: Jurisdiction[]
  permissions:   EffectivePermission[]
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const crewCtx = writable<CrewContext | null>(null)

// ── Activation ────────────────────────────────────────────────────────────────

/**
 * Call from /crew/+layout.ts load().
 * Returns false if user has no active DRIVER or CONDUCTOR actor → redirect.
 *
 * @example
 *   export async function load() {
 *     if (!activateCrewContext()) throw redirect(302, '/app/dashboard')
 *   }
 */
export function activateCrewContext(): boolean {
  const s = get(sessionStore)

  // Prefer DRIVER over CONDUCTOR if user has both (edge case)
  const actor =
    s.actors.find((a) => a.type === ROLES.DRIVER    && a.status === 'active') ??
    s.actors.find((a) => a.type === ROLES.CONDUCTOR && a.status === 'active') ??
    null

  if (!actor) {
    crewCtx.set(null)
    return false
  }

  sessionStore.update((st) => ({ ...st, activeActorId: actor.id }))

  const crewType = actor.type === ROLES.DRIVER ? 'DRIVER' : 'CONDUCTOR'

  // Find the org this crew member belongs to via jurisdictions
  const orgJurisdiction = s.jurisdictions.find(
    (j) => j.actor_id === actor.id && j.level === 'org' && j.scope_id,
  )
  const orgId = orgJurisdiction?.scope_id ?? ''
  const orgMembership = s.orgMemberships.find((m) => m.organization_id === orgId)

  // Vehicle + trip assignment comes from actor.metadata (set by bootstrap_session RPC)
  // Shape: { vehicle_id, vehicle_plate, active_trip_id, shift_state }
  const meta = actor.metadata as Record<string, unknown> ?? {}

  crewCtx.set({
    actor,
    crewType,
    orgId,
    orgName:            orgMembership?.org_name ?? 'Unknown SACCO',
    activeVehicleId:    (meta.vehicle_id    as string)  ?? null,
    activeVehiclePlate: (meta.vehicle_plate as string)  ?? null,
    activeTripId:       (meta.active_trip_id as string) ?? null,
    shiftState:         (meta.shift_state as CrewContext['shiftState']) ?? 'off_duty',
    jurisdictions:      s.jurisdictions.filter((j) => j.actor_id === actor.id),
    permissions:        s.permissions.filter((p) => p.actor_id === actor.id),
  })

  return true
}

export function deactivateCrewContext(): void {
  crewCtx.set(null)
}

// ── Internal helper ───────────────────────────────────────────────────────────

const _allows = (ctx: CrewContext | null, action: string) =>
  ctx?.permissions.some((p) => p.action === action && p.effect === 'allow') ?? false

// ── Permission stores ─────────────────────────────────────────────────────────

/** View the vehicle they're assigned to (vehicle.view) */
export const canViewVehicle = derived(crewCtx, ($c) => _allows($c, ACTIONS.VEHICLE_VIEW))

/** Live tracking — both crew types get this (tracking.live) */
export const canTrackLive = derived(crewCtx, ($c) => _allows($c, ACTIONS.TRACKING_LIVE))

/** Log fuel entries — DRIVER primary (fuel.add) */
export const canLogFuel = derived(crewCtx, ($c) => _allows($c, ACTIONS.FUEL_ADD))

/** View fuel history (fuel.list) */
export const canViewFuel = derived(crewCtx, ($c) => _allows($c, ACTIONS.FUEL_LIST))

/** Add a booking / accept a reservation — CONDUCTOR primary (booking.add) */
export const canAddBooking = derived(crewCtx, ($c) => _allows($c, ACTIONS.BOOKING_ADD))

/** View bookings / passenger manifest (booking.list) */
export const canViewBookings = derived(crewCtx, ($c) => _allows($c, ACTIONS.BOOKING_LIST))

/** Record a fare / cash collection (finance.add) — CONDUCTOR */
export const canRecordFare = derived(crewCtx, ($c) => _allows($c, ACTIONS.FINANCE_ADD))

/** View reminders — service due, licence expiry, etc. (reminder.list) */
export const canViewReminders = derived(crewCtx, ($c) => _allows($c, ACTIONS.REMINDER_LIST))

/**
 * True if crew member is currently on an active shift.
 * Use to show/hide shift-sensitive actions (boarding, fare collection).
 */
export const isOnDuty = derived(crewCtx, ($c) => $c?.shiftState === 'on_duty')

/** True if a vehicle is assigned — false shows "waiting for assignment" UI */
export const hasVehicleAssignment = derived(crewCtx, ($c) => $c?.activeVehicleId !== null)

/** True if currently on a trip — false hides trip-specific actions */
export const hasActiveTrip = derived(crewCtx, ($c) => $c?.activeTripId !== null)

/** DRIVER or CONDUCTOR — for conditional UI rendering */
export const crewType = derived(crewCtx, ($c) => $c?.crewType ?? null)

/** The assigned vehicle's plate — for topbar display */
export const activePlate = derived(crewCtx, ($c) => $c?.activeVehiclePlate ?? null)

/** Current shift state */
export const shiftState = derived(crewCtx, ($c) => $c?.shiftState ?? 'off_duty')

// ── Helpers ───────────────────────────────────────────────────────────────────

export const getCrewActorId       = () => get(crewCtx)?.actor.id ?? null
export const getCrewOrgId         = () => get(crewCtx)?.orgId ?? null
export const getActiveVehicleId   = () => get(crewCtx)?.activeVehicleId ?? null
export const getActiveTripId      = () => get(crewCtx)?.activeTripId ?? null
export const isCrewContextActive  = () => get(crewCtx) !== null

/**
 * Imperative permission check — use in event handlers or +page.server.ts.
 * @example
 *   if (!crewCan(ACTIONS.BOOKING_ADD)) return showError('Not authorised')
 */
export function crewCan(action: string): boolean {
  const ctx = get(crewCtx)
  if (!ctx) return false
  return ctx.permissions.some((p) => p.action === action && p.effect === 'allow')
}