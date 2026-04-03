// src/lib/features/auth/contexts/passenger.context.ts
//
// PASSENGER and GUEST context — including M-PESA GO minor support.
//
// LAZY ACTIVATION: Starts null.
// Call activatePassengerContext(userState) in /app/+layout.ts.
//
// ROUTE: /app/*
//
// MIGRATION FROM sessionStore:
//   activatePassengerContext() now accepts UserState instead of reading sessionStore.
//
// THREE PASSENGER STATES:
//
//   GUEST (unverified):
//     - Registered, no SACCO membership yet
//     - Can browse SACCOs, submit join request
//     - CANNOT book seats or pay
//
//   PASSENGER (adult, SACCO-verified):
//     - Has PASSENGER actor + org membership
//     - Can book tickets, view history, track, pay via M-PESA
//
//   PASSENGER (minor, M-PESA GO):
//     - Age 8–17, has PASSENGER actor + org membership
//     - Parent/guardian linked via guardian_profile_id
//     - Capabilities gated by parent controls + Safaricom compliance
//     - CANNOT: cash withdrawal, betting, loans
//     - REQUIRES: documents submitted within 30 days of M-PESA GO registration
//     - Transitions to adult account at age 18
//
// KYC NOTE:
//   After login, unverified users go through /onboarding with Ballerine KYC.
//   Minors follow a parent-assisted KYC path — parent uploads birth certificate.
//   hooks.server.ts guards this via profile.onboarding_status.

import { derived, get } from "svelte/store"
import type { Tables } from "../../../DatabaseDefinitions"
import type {
  UserState,
  MpesaGoProfile,
} from "$lib/features/auth/services/userState.server"
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
  OrgMembership,
} from "$lib/features/auth/contexts/context.template"
import { ACTIONS } from "$lib/features/auth/stores/permisions"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActorRow = Tables<"actors">
type ProfileRow = Tables<"profiles">

// ── Context shape ─────────────────────────────────────────────────────────────

export interface PassengerContext {
  actor: ActorRow
  profile: ProfileRow

  /**
   * True if actor is PASSENGER type AND has at least one org membership.
   * The primary booking gate — false for GUEST actors.
   */
  isVerified: boolean

  /**
   * True if profile.date_of_birth indicates age < 18.
   * Drives M-PESA GO capability restrictions.
   * False for adult passengers and all GUEST actors.
   */
  isMinor: boolean

  /**
   * Profile ID of the parent/guardian who controls this minor account.
   * Null for adult passengers and GUEST actors.
   */
  guardianProfileId: string | null

  /**
   * M-PESA GO account details — null for adult passengers.
   * When non-null, capability stores respect parent-set limits and
   * Safaricom compliance requirements (document submission window).
   */
  mpesaGo: MpesaGoProfile | null

  /**
   * SACCOs this passenger is verified with.
   * Most passengers belong to exactly one.
   */
  verifiedOrgs: OrgMembership[]

  /**
   * Set if exactly one SACCO — skips the org picker.
   * Null if multiple orgs or unverified.
   */
  primaryOrg: OrgMembership | null

  permissions: EffectivePermission[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

const { store, setContext, clearContext } =
  createContextStore<PassengerContext>()
export const passengerCtx = store

// ─────────────────────────────────────────────────────────────────────────────
// Minor age helper
// ─────────────────────────────────────────────────────────────────────────────

function computeIsMinor(dateOfBirth: string | null | undefined): boolean {
  if (!dateOfBirth) return false
  const dob = new Date(dateOfBirth)
  const today = new Date()
  const age = today.getFullYear() - dob.getFullYear()
  const hadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate())
  return (hadBirthday ? age : age - 1) < 18
}

// ─────────────────────────────────────────────────────────────────────────────
// Activation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call from /app/+layout.ts load({ data }).
 * Returns false only if user has no profile at all → redirect to /login.
 * GUEST actors still get a context — UI shows join prompt, not redirect.
 *
 * @example
 *   // /app/+layout.ts
 *   export async function load({ data }) {
 *     if (!data.userState) throw redirect(302, '/login')
 *     if (!activatePassengerContext(data.userState)) throw redirect(302, '/login')
 *     // Do NOT redirect GUEST users here — isVerified handles UI branching
 *   }
 */
export function activatePassengerContext(userState: UserState): boolean {
  if (!userState.profile) {
    clearContext()
    return false
  }

  // Prefer PASSENGER over GUEST
  const actorCtx =
    userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.PASSENGER && ctx.status === "active",
    ) ??
    userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.GUEST && ctx.status === "active",
    ) ??
    null

  if (!actorCtx) {
    clearContext()
    return false
  }

  const actor = userState.actors.find((a) => a.id === actorCtx.actorId)
  if (!actor) {
    clearContext()
    return false
  }

  const profile = userState.profile
  const jurisdictions = extractJurisdictions(userState, actorCtx.actorId)
  const orgMemberships = extractOrgMemberships(userState, actorCtx.actorId)
  const permissions = extractPermissions(userState, actorCtx.actorId)

  // ── Verified state ──────────────────────────────────────────────────────────
  // PASSENGER type + at least one org membership = verified
  const isVerified =
    actor.type === ACTOR_TYPES.PASSENGER && orgMemberships.length > 0

  // ── Verified orgs ───────────────────────────────────────────────────────────
  // Cross-reference org memberships with org-level jurisdictions for this actor
  const actorOrgIds = new Set(
    jurisdictions
      .filter((j) => j.level === "org" && j.scope_id != null)
      .map((j) => j.scope_id as string),
  )
  const verifiedOrgs = orgMemberships.filter((m) =>
    actorOrgIds.has(m.organization_id),
  )
  const primaryOrg = verifiedOrgs.length === 1 ? verifiedOrgs[0] : null

  // ── Minor detection ─────────────────────────────────────────────────────────
  // Cast needed until DatabaseDefinitions regenerates with date_of_birth
  const dateOfBirth = (profile as any).date_of_birth as string | null
  const isMinor = computeIsMinor(dateOfBirth)
  const guardianProfileId =
    ((profile as any).guardian_profile_id as string | null) ?? null

  setContext({
    actor,
    profile,
    isVerified,
    isMinor,
    guardianProfileId,
    mpesaGo: userState.mpesaGo ?? null,
    verifiedOrgs,
    primaryOrg,
    permissions,
  })

  return true
}

export function deactivatePassengerContext(): void {
  clearContext()
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const _allows = (ctx: PassengerContext | null, action: string): boolean =>
  ctx ? isAllowed(ctx.permissions, action) : false

/**
 * True if minor's M-PESA GO documents are submitted and within compliance.
 * Blocks all transactions if overdue — mirrors Safaricom's 30-day rule.
 */
const _mpesaGoCompliant = (ctx: PassengerContext | null): boolean => {
  if (!ctx?.isMinor || !ctx.mpesaGo) return true // adults always compliant
  return ctx.mpesaGo.documentsSubmitted && !ctx.mpesaGo.documentsOverdue
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission stores
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full booking gate:
 *   adult    → isVerified + booking.add permission
 *   minor    → isVerified + booking.add + lipa_na_mpesa_enabled + documents compliant
 *
 * Show <BookingForm> if true, <JoinSaccoPrompt> if false + unverified,
 * <MpesaGoCompliancePrompt> if false + minor + not compliant.
 */
export const canBookSeats = derived(passengerCtx, ($c) => {
  if (!$c?.isVerified) return false
  if (!_allows($c, ACTIONS.BOOKING_ADD)) return false
  if ($c.isMinor) {
    if (!_mpesaGoCompliant($c)) return false
    if (!$c.mpesaGo?.lipaNaMpesaEnabled) return false
  }
  return true
})

/**
 * True if passenger has been SACCO-verified.
 * Main UX branch — drives verified vs unverified UI split.
 */
export const isVerified = derived(passengerCtx, ($c) => $c?.isVerified ?? false)

/** View booking history (booking.list) */
export const canViewBookings = derived(passengerCtx, ($c) =>
  _allows($c, ACTIONS.BOOKING_LIST),
)

/**
 * Live tracking.
 * Available to GUEST actors — public tracking requires no SACCO verification.
 */
export const canTrackLive = derived(passengerCtx, ($c) =>
  _allows($c, ACTIONS.TRACKING_LIVE),
)

/** Edit own profile/customer record (customer.edit) */
export const canEditProfile = derived(passengerCtx, ($c) =>
  _allows($c, ACTIONS.CUSTOMER_EDIT),
)

/**
 * Submit a SACCO join request.
 * Any authenticated user can apply — GUEST or unverified PASSENGER.
 */
export const canApplyToSacco = derived(passengerCtx, ($c) => $c !== null)

/**
 * Send money via M-PESA GO.
 * Adults: always true if verified.
 * Minors: parent must have enabled send_money AND documents must be compliant.
 */
export const canSendMoney = derived(passengerCtx, ($c) => {
  if (!$c?.isVerified) return false
  if (!$c.isMinor) return true // adults unrestricted
  return ($c.mpesaGo?.sendMoneyEnabled ?? false) && _mpesaGoCompliant($c)
})

/**
 * Pay for goods via Lipa na M-PESA.
 * Adults: permission-based.
 * Minors: parent toggle + compliance gate.
 */
export const canPayGoods = derived(passengerCtx, ($c) => {
  if (!$c?.isVerified) return false
  if (!$c.isMinor) return _allows($c, ACTIONS.BOOKING_ADD)
  return ($c.mpesaGo?.lipaNaMpesaEnabled ?? false) && _mpesaGoCompliant($c)
})

/**
 * True if minor's M-PESA GO documents are compliant.
 * Show <DocumentSubmissionBanner> in /app layout when false + isMinor.
 */
export const isMpesaGoCompliant = derived(passengerCtx, ($c) =>
  _mpesaGoCompliant($c),
)

/**
 * True if documents are overdue — account is frozen for transactions.
 * Show urgent warning UI + block all payment actions.
 */
export const isMpesaGoDocumentsOverdue = derived(
  passengerCtx,
  ($c) => ($c?.isMinor && $c?.mpesaGo?.documentsOverdue) ?? false,
)

/** Daily transaction limit in KES — null for adults or if no limit set */
export const mpesaGoDailyLimit = derived(
  passengerCtx,
  ($c) => ($c?.isMinor ? $c?.mpesaGo?.dailyLimit : null) ?? null,
)

/** Per-transaction limit in KES — null for adults or if no limit set */
export const mpesaGoPerTransactionLimit = derived(
  passengerCtx,
  ($c) => ($c?.isMinor ? $c?.mpesaGo?.perTransactionLimit : null) ?? null,
)

/**
 * True if this is a minor passenger.
 * Use to show/hide age-appropriate UI (guardian info, document prompts, limits).
 */
export const isMinor = derived(passengerCtx, ($c) => $c?.isMinor ?? false)

/** Guardian profile ID — for linking to parent account UI */
export const guardianProfileId = derived(
  passengerCtx,
  ($c) => $c?.guardianProfileId ?? null,
)

/** SACCOs this passenger is verified with */
export const verifiedOrgs = derived(
  passengerCtx,
  ($c) => $c?.verifiedOrgs ?? [],
)

/** Primary SACCO (exactly one) — skips org picker */
export const primaryOrg = derived(passengerCtx, ($c) => $c?.primaryOrg ?? null)

/** 'PASSENGER' | 'GUEST' | null — for onboarding UX branching */
export const passengerActorType = derived(
  passengerCtx,
  ($c) => $c?.actor.type ?? null,
)

/** True if actor is GUEST — show SACCO discovery + join UI */
export const isGuest = derived(
  passengerCtx,
  ($c) => $c?.actor.type === ACTOR_TYPES.GUEST,
)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const getPassengerActorId = () => get(passengerCtx)?.actor.id ?? null
export const getPrimaryOrgId = () =>
  get(passengerCtx)?.primaryOrg?.organization_id ?? null
export const isPassengerVerified = () => get(passengerCtx)?.isVerified ?? false
export const getGuardianId = () => get(passengerCtx)?.guardianProfileId ?? null
export const getMpesaGo = () => get(passengerCtx)?.mpesaGo ?? null

/**
 * Imperative permission check.
 * Does NOT apply M-PESA GO gates — use the derived stores for those.
 *
 * @example
 *   if (!passengerCan(ACTIONS.BOOKING_LIST)) return
 */
export function passengerCan(action: string): boolean {
  const ctx = get(passengerCtx)
  if (!ctx) return false
  return isAllowed(ctx.permissions, action)
}

/**
 * Check if a specific payment amount is within the minor's per-transaction limit.
 * Always true for adult passengers.
 *
 * @example
 *   if (!withinTransactionLimit(fare)) showLimitExceededPrompt()
 */
export function withinTransactionLimit(amountKes: number): boolean {
  const ctx = get(passengerCtx)
  if (!ctx?.isMinor || !ctx.mpesaGo?.perTransactionLimit) return true
  return amountKes <= ctx.mpesaGo.perTransactionLimit
}
