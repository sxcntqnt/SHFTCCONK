/**
 * passenger.context.ts — PASSENGER and GUEST context.
 *
 * LAZY ACTIVATION: Starts null.
 * Call activatePassengerContext() in /app/+layout.ts.
 *
 * ROUTE: /app/*
 *
 * TWO STATES:
 *
 *   GUEST actor (unverified):
 *     - Has profile, has GUEST actor
 *     - Not in any org's organization_members
 *     - Can browse SACCOs, submit join request, track buses publicly
 *     - CANNOT book tickets
 *
 *   PASSENGER actor (SACCO-verified):
 *     - Has PASSENGER actor + org membership
 *     - Can book tickets, view booking history, track
 *     - One or more SACCOs (primaryOrg if exactly one)
 *
 *   `isVerified` is the main gate between these two states.
 */

import { writable, derived, get } from 'svelte/store'
import { sessionStore } from '$lib/features/auth/stores/auth'
import { ROLES } from '$lib/features/auth/stores/roles'
import { ACTIONS } from '$lib/features/auth/stores/permisions'
import type { Actor, OrgMembership, EffectivePermission } from '$lib/features/auth/stores/auth'

// ── Context shape ─────────────────────────────────────────────
export interface PassengerContext {
  /**
   * PASSENGER if SACCO-verified, GUEST if not yet approved.
   */
  actor: Actor

  /**
   * True if actor is PASSENGER type AND has at least one org membership.
   * This is the booking gate.
   */
  isVerified: boolean

  /**
   * SACCOs this passenger is verified with.
   * Most users have exactly one.
   */
  verifiedOrgs: OrgMembership[]

  /**
   * Set if exactly one SACCO — used to skip org picker.
   * Null if multiple (show picker) or unverified (show join prompt).
   */
  primaryOrg: OrgMembership | null

  permissions: EffectivePermission[]
}

// ── Store ─────────────────────────────────────────────────────
export const passengerCtx = writable<PassengerContext | null>(null)

// ── Activation ────────────────────────────────────────────────
/**
 * Call from /app/+layout.ts load().
 * Returns false only if user is not logged in at all.
 * GUEST users still get a context — show join prompt, not redirect.
 *
 * @example
 *   export async function load() {
 *     if (!activatePassengerContext()) throw redirect(302, '/login')
 *     // Don't redirect unverified users — isVerified handles that in the UI
 *   }
 */
export function activatePassengerContext(): boolean {
  const s = get(sessionStore)

  if (!s.profile) {
    passengerCtx.set(null)
    return false
  }

  // Prefer PASSENGER over GUEST
  const actor =
    s.actors.find((a) => a.type === ROLES.PASSENGER && a.status === 'active') ??
    s.actors.find((a) => a.type === ROLES.GUEST      && a.status === 'active') ??
    null

  if (!actor) {
    passengerCtx.set(null)
    return false
  }

  sessionStore.update((st) => ({ ...st, activeActorId: actor.id }))

  // Verified = PASSENGER type + has org memberships
  const isVerified = actor.type === ROLES.PASSENGER && s.orgMemberships.length > 0

  // Orgs this actor's jurisdictions cover
  const actorOrgIds = new Set(
    s.jurisdictions
      .filter((j) => j.actor_id === actor.id && j.level === 'org' && j.scope_id)
      .map((j) => j.scope_id as string),
  )
  const verifiedOrgs = s.orgMemberships.filter((m) =>
    actorOrgIds.has(m.organization_id),
  )
  const primaryOrg = verifiedOrgs.length === 1 ? verifiedOrgs[0] : null

  passengerCtx.set({
    actor,
    isVerified,
    verifiedOrgs,
    primaryOrg,
    permissions: s.permissions.filter((p) => p.actor_id === actor.id),
  })

  return true
}

export function deactivatePassengerContext(): void {
  passengerCtx.set(null)
}

// ── Internal helper ───────────────────────────────────────────
const _allows = (ctx: PassengerContext | null, action: string) =>
  ctx?.permissions.some((p) => p.action === action && p.effect === 'allow') ?? false

// ── Permission stores ─────────────────────────────────────────

/**
 * TRUE gate for booking — requires verified + booking.add permission.
 * Show <BookingForm> if true, <JoinSaccoPrompt> if false.
 */
export const canBookSeats = derived(
  passengerCtx,
  ($c) => ($c?.isVerified ?? false) && _allows($c, ACTIONS.BOOKING_ADD),
)

/**
 * True if passenger has been verified by at least one SACCO.
 * Main UX branch — verified vs unverified.
 */
export const isVerified = derived(passengerCtx, ($c) => $c?.isVerified ?? false)

/** View booking history (booking.list) */
export const canViewBookings = derived(passengerCtx, ($c) => _allows($c, ACTIONS.BOOKING_LIST))

/**
 * Live tracking — GUEST actors also get this.
 * Public tracking is available without SACCO verification.
 */
export const canTrackLive = derived(passengerCtx, ($c) => _allows($c, ACTIONS.TRACKING_LIVE))

/** Edit own profile/customer record (customer.edit) */
export const canEditProfile = derived(passengerCtx, ($c) => _allows($c, ACTIONS.CUSTOMER_EDIT))

/**
 * Submit a SACCO join request.
 * Any logged-in user can apply — GUEST or unverified PASSENGER.
 * No permission needed, just a valid profile.
 */
export const canApplyToSacco = derived(passengerCtx, ($c) => $c !== null)

/** SACCOs this passenger is verified with */
export const verifiedOrgs = derived(passengerCtx, ($c) => $c?.verifiedOrgs ?? [])

/** Primary SACCO (if exactly one) — skips picker */
export const primaryOrg = derived(passengerCtx, ($c) => $c?.primaryOrg ?? null)

/** "PASSENGER" | "GUEST" | null — for onboarding UX branching */
export const passengerActorType = derived(passengerCtx, ($c) => $c?.actor.type ?? null)

/** True if actor is GUEST — show SACCO discovery UI */
export const isGuest = derived(passengerCtx, ($c) => $c?.actor.type === ROLES.GUEST)

// ── Helpers ───────────────────────────────────────────────────
export const getPassengerActorId = () => get(passengerCtx)?.actor.id ?? null
export const getPrimaryOrgId     = () => get(passengerCtx)?.primaryOrg?.organization_id ?? null
export const isPassengerVerified = () => get(passengerCtx)?.isVerified ?? false

/**
 * Imperative check — use in event handlers or load fns.
 * @example
 *   if (!passengerCan(ACTIONS.BOOKING_ADD)) showVerifyPrompt()
 */
export function passengerCan(action: string): boolean {
  const ctx = get(passengerCtx)
  if (!ctx) return false
  return ctx.permissions.some((p) => p.action === action && p.effect === 'allow')
}