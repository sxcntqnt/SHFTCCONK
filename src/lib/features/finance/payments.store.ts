/**
 * payments.store.ts — Plan and M-Pesa payment state.
 *
 * PAYMENT MODEL: M-Pesa STK Push (Lipa Na M-Pesa Online).
 *   No subscription objects. Payments are discrete KES transactions.
 *   Plan access is manually tracked via profiles.plan + profiles.plan_expires_at.
 *   On payment confirmation (Daraja callback) → server writes plan + expiry.
 *   On expiry → plan reverts to 'free' at next bootstrap.
 *
 * FLOW:
 *   1. User selects plan on /app/select_plan
 *   2. Server initiates STK Push via Daraja API → returns checkout_request_id
 *   3. Store status → 'pending', show "Check your phone" UI
 *   4. User approves on phone → Daraja POSTs callback to /api/mpesa/callback
 *   5. Callback server writes:
 *        profiles.plan            = 'pro' | 'fleet'
 *        profiles.plan_expires_at = now + 30 days
 *        profiles.mpesa_ref       = e.g. "MPESA4G8K2L"
 *   6. Store status → 'active', planBadge appears
 *   7. On expiry → bootstrap returns plan = 'free' → badge removed
 *
 * PLAN HIERARCHY:
 *   free  → Starter — basic tracking, 1 vehicle
 *   pro   → Pro     — KES 1,499/mo, up to 10 vehicles
 *   fleet → Fleet   — KES custom, unlimited vehicles, multi-branch
 *
 * BADGE:
 *   free  → no badge
 *   pro   → teal  ✓
 *   fleet → orange ✓
 *
 * DB COLUMNS NEEDED (add to profiles via migration):
 *   plan             text    default 'free'
 *   plan_expires_at  timestamptz
 *   mpesa_ref        text    (last successful M-Pesa transaction code)
 *   mpesa_phone      text    (phone used for payments, e.g. +254712345678)
 */

import { writable, derived, get } from "svelte/store"

// ── Plan types ────────────────────────────────────────────────────────────────

export type PlanId = "free" | "pro" | "fleet"

export type MpesaPaymentStatus =
  | "idle" // no payment in progress
  | "pending" // STK Push sent — waiting for user to approve on phone
  | "completed" // Daraja callback received — payment confirmed
  | "failed" // STK timeout, declined, or wrong PIN
  | "expired" // plan period ended — user needs to renew

// Plan prices in KES
export const PLAN_PRICES_KES: Record<PlanId, number | null> = {
  free: 0,
  pro: 1_499,
  fleet: null, // custom — contact sales
}

// Plan display names
export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Starter",
  pro: "Pro",
  fleet: "Fleet",
}

// ── Store shape ───────────────────────────────────────────────────────────────

export interface PaymentState {
  /** Current active plan */
  plan: PlanId

  /**
   * ISO date string — when the current paid plan expires.
   * Null on free or before first payment.
   * On expiry, bootstrap_session returns plan = 'free'.
   */
  planExpiresAt: string | null

  /**
   * Days remaining on the current plan period.
   * Computed from planExpiresAt at activation time.
   * Null on free plan.
   */
  daysRemaining: number | null

  /**
   * Last successful M-Pesa transaction code (e.g. "MPESA4G8K2L").
   * Shown in billing history / receipts.
   */
  mpesaRef: string | null

  /**
   * M-Pesa phone number used for payments (+254 format).
   * Pre-filled in the STK Push prompt.
   */
  mpesaPhone: string | null

  /**
   * Status of the most recent M-Pesa payment attempt.
   * 'idle' at startup; updated by STK Push flow.
   */
  mpesaStatus: MpesaPaymentStatus

  /**
   * Checkout request ID from the most recent STK Push.
   * Used to query payment status if callback is delayed.
   */
  checkoutRequestId: string | null

  /** True if plan expires within 7 days — show renewal reminder */
  isExpiringSoon: boolean

  /** True if plan has expired — show re-payment prompt */
  isExpired: boolean
}

// ── Bootstrap shape ───────────────────────────────────────────────────────────
// What bootstrap_session returns for payments.
// All fields come from the profiles table.

export interface PaymentBootstrap {
  plan?: string | null
  plan_expires_at?: string | null
  mpesa_ref?: string | null
  mpesa_phone?: string | null
}

// ── Store ─────────────────────────────────────────────────────────────────────

const DEFAULT_STATE: PaymentState = {
  plan: "free",
  planExpiresAt: null,
  daysRemaining: null,
  mpesaRef: null,
  mpesaPhone: null,
  mpesaStatus: "idle",
  checkoutRequestId: null,
  isExpiringSoon: false,
  isExpired: false,
}

export const paymentStore = writable<PaymentState>(DEFAULT_STATE)

// ── Activation ────────────────────────────────────────────────────────────────

/**
 * Call from root +layout.ts after bootstrap_session resolves.
 * Safe with null/partial payload — falls back to free tier.
 *
 * @example
 *   // root +layout.ts
 *   import { activatePaymentsStore } from '$lib/features/payments/payments.store'
 *   activatePaymentsStore(bootstrap)
 */
export function activatePaymentsStore(
  bootstrap: PaymentBootstrap | null | undefined,
): void {
  if (!bootstrap) {
    paymentStore.set(DEFAULT_STATE)
    return
  }

  const rawPlan = bootstrap.plan ?? "free"
  const plan = isValidPlan(rawPlan) ? rawPlan : "free"

  const planExpiresAt = bootstrap.plan_expires_at ?? null
  const daysRemaining = computeDaysRemaining(planExpiresAt)
  const isExpired =
    plan !== "free" && daysRemaining !== null && daysRemaining <= 0
  const isExpiringSoon =
    plan !== "free" &&
    daysRemaining !== null &&
    daysRemaining <= 7 &&
    !isExpired

  paymentStore.set({
    plan: isExpired ? "free" : plan, // treat expired as free
    planExpiresAt,
    daysRemaining,
    mpesaRef: bootstrap.mpesa_ref ?? null,
    mpesaPhone: bootstrap.mpesa_phone ?? null,
    mpesaStatus: isExpired ? "expired" : "idle",
    checkoutRequestId: null,
    isExpiringSoon,
    isExpired,
  })
}

export function resetPaymentsStore(): void {
  paymentStore.set(DEFAULT_STATE)
}

// ── STK Push flow helpers ─────────────────────────────────────────────────────

/**
 * Call immediately after initiating an STK Push.
 * Updates status to 'pending' and stores the checkout request ID.
 *
 * @example
 *   const { checkoutRequestId } = await initiateStkPush(phone, plan)
 *   setStkPushPending(checkoutRequestId, phone)
 */
export function setStkPushPending(
  checkoutRequestId: string,
  mpesaPhone: string,
): void {
  paymentStore.update((s) => ({
    ...s,
    mpesaStatus: "pending",
    checkoutRequestId,
    mpesaPhone,
  }))
}

/**
 * Call when the Daraja callback confirms payment.
 * In practice this is called by your server polling the callback result
 * and pushing an update to the client (realtime or polling).
 *
 * @example
 *   // After /api/mpesa/callback receives success
 *   confirmStkPayment('pro', 'MPESA4G8K2L', expiresAt)
 */
export function confirmStkPayment(
  plan: PlanId,
  mpesaRef: string,
  planExpiresAt: string,
): void {
  const daysRemaining = computeDaysRemaining(planExpiresAt)

  paymentStore.update((s) => ({
    ...s,
    plan,
    planExpiresAt,
    daysRemaining,
    mpesaRef,
    mpesaStatus: "completed",
    checkoutRequestId: null,
    isExpired: false,
    isExpiringSoon: false,
  }))
}

/**
 * Call when STK Push times out, is declined, or the user enters the wrong PIN.
 * Resets to idle so the user can try again.
 */
export function setStkPushFailed(): void {
  paymentStore.update((s) => ({
    ...s,
    mpesaStatus: "failed",
    checkoutRequestId: null,
  }))
}

/**
 * Reset STK status to idle — use when user dismisses the failure/pending UI.
 */
export function resetStkStatus(): void {
  paymentStore.update((s) => ({
    ...s,
    mpesaStatus: "idle",
    checkoutRequestId: null,
  }))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidPlan(plan: string): plan is PlanId {
  return ["free", "pro", "fleet"].includes(plan)
}

function computeDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ── Derived stores ────────────────────────────────────────────────────────────

/** Current plan ID */
export const userPlan = derived(paymentStore, ($s) => $s.plan)

/** True if on a paid plan */
export const isPaidUser = derived(paymentStore, ($s) => $s.plan !== "free")

/** True if on free tier */
export const isFreeUser = derived(paymentStore, ($s) => $s.plan === "free")

/** True if on Pro */
export const isProUser = derived(paymentStore, ($s) => $s.plan === "pro")

/** True if on Fleet */
export const isFleetUser = derived(paymentStore, ($s) => $s.plan === "fleet")

/** True if STK Push is awaiting user approval on phone */
export const isStkPending = derived(
  paymentStore,
  ($s) => $s.mpesaStatus === "pending",
)

/** True if last STK Push failed */
export const isStkFailed = derived(
  paymentStore,
  ($s) => $s.mpesaStatus === "failed",
)

/** True if plan expires within 7 days — show renewal reminder */
export const isExpiringSoon = derived(paymentStore, ($s) => $s.isExpiringSoon)

/** True if paid plan has expired — show re-payment prompt */
export const isExpired = derived(paymentStore, ($s) => $s.isExpired)

/** Days left on current plan — null on free */
export const daysRemaining = derived(paymentStore, ($s) => $s.daysRemaining)

/** M-Pesa phone for pre-filling STK Push prompt */
export const mpesaPhone = derived(paymentStore, ($s) => $s.mpesaPhone)

/** Last M-Pesa transaction code — for receipts */
export const mpesaRef = derived(paymentStore, ($s) => $s.mpesaRef)

/**
 * Badge config for the user avatar / nav pill.
 *
 *   free  → null  (no badge)
 *   pro   → { color: teal,   label: 'Pro',   icon: '✓' }
 *   fleet → { color: orange, label: 'Fleet', icon: '✓' }
 */
export const planBadge = derived(
  paymentStore,
  ($s): { color: string; bg: string; border: string; label: string } | null => {
    switch ($s.plan) {
      case "pro":
        return {
          color: "var(--teal)",
          bg: "rgba(0,176,155,0.12)",
          border: "rgba(0,176,155,0.25)",
          label: "Pro",
        }
      case "fleet":
        return {
          color: "var(--orange)",
          bg: "rgba(242,101,34,0.12)",
          border: "rgba(242,101,34,0.25)",
          label: "Fleet",
        }
      default:
        return null
    }
  },
)

/** Human-readable plan name */
export const planLabel = derived(paymentStore, ($s) => PLAN_LABELS[$s.plan])

/** Price in KES — null for fleet (custom) */
export const planPriceKes = derived(
  paymentStore,
  ($s) => PLAN_PRICES_KES[$s.plan],
)

/**
 * CTA label for the upgrade/renew button.
 *
 *   expired      → 'Renew Plan'
 *   expiring     → 'Renew — X days left'
 *   free         → 'Upgrade to Pro'
 *   pro          → 'Upgrade to Fleet'
 *   fleet        → 'Manage Plan'
 */
export const paymentCta = derived(paymentStore, ($s) => {
  if ($s.isExpired) return "Renew Plan"
  if ($s.isExpiringSoon && $s.daysRemaining !== null)
    return `Renew — ${$s.daysRemaining}d left`
  if ($s.plan === "free") return "Upgrade to Pro"
  if ($s.plan === "pro") return "Upgrade to Fleet"
  return "Manage Plan"
})

/**
 * M-Pesa status message — show in the STK Push modal.
 */
export const stkStatusMessage = derived(paymentStore, ($s) => {
  switch ($s.mpesaStatus) {
    case "pending":
      return "Check your phone and enter your M-Pesa PIN to complete payment."
    case "completed":
      return "Payment confirmed! Your plan has been activated."
    case "failed":
      return "Payment failed or timed out. Please try again."
    case "expired":
      return "Your plan has expired. Renew to continue."
    default:
      return null
  }
})

// ── Imperative helpers ────────────────────────────────────────────────────────

export const getCurrentPlan = () => get(paymentStore).plan
export const getMpesaPhone = () => get(paymentStore).mpesaPhone
export const isPlanPaid = () => get(paymentStore).plan !== "free"
export const isPlanExpired = () => get(paymentStore).isExpired
export const getStkRequestId = () => get(paymentStore).checkoutRequestId
