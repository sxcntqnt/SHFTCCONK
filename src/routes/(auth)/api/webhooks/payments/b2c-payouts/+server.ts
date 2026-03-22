// src/routes/api/webhooks/mpesa/b2c-payout/+server.ts
//
// Initiates an M-Pesa B2C (Business to Customer) payment.
// Used for: tip payouts to drivers and conductors.
//
// Flow:
//   1. Client POSTs { phoneNumber, amount, role, actorId, orgId, tripId }
//   2. We validate and call Daraja B2C API
//   3. Daraja returns ConversationID immediately (async — result comes via callback)
//   4. We insert a 'processing' row into mpesa_payouts
//   5. The b2c-result webhook updates status to 'completed' or 'failed'
//
// Security:
//   - Requires authenticated session
//   - Validates role against known crew types
//   - Validates phone is Kenyan (+254)
//   - Validates amount is positive KES integer
//   - Server-side actor lookup to prevent spoofed actorId

import type { RequestHandler } from "./$types"
import { json } from "@sveltejs/kit"
import { sendB2CPayment } from "$lib/server/mpesa-provider"
import { ROLES } from "$lib/features/auth/stores/roles"

// Roles eligible to receive B2C payouts
const PAYOUT_ELIGIBLE_ROLES = new Set([
  ROLES.DRIVER,
  ROLES.CONDUCTOR,
])

// KES payout limits (adjust per Daraja tier / Central Bank limits)
const MIN_PAYOUT_KES = 10
const MAX_PAYOUT_KES = 150_000

// Kenyan phone number regex (+2547xx or +2541xx)
const KE_PHONE_RE = /^\+254[17]\d{8}$/

export const POST: RequestHandler = async ({ request, locals }) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session } = await locals.safeGetSession()
  const supabase    = locals.supabase

  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    phoneNumber,
    amount,
    role,
    actorId,
    orgId,
    tripId,
  } = body as Record<string, unknown>

  // Required fields
  if (!phoneNumber || !amount || !role || !actorId || !orgId) {
    return json(
      { error: "Missing required fields: phoneNumber, amount, role, actorId, orgId" },
      { status: 400 },
    )
  }

  // Phone validation
  if (typeof phoneNumber !== "string" || !KE_PHONE_RE.test(phoneNumber)) {
    return json(
      { error: "phoneNumber must be a Kenyan number in +254 format" },
      { status: 400 },
    )
  }

  // Amount validation (KES, positive integer)
  const amountKes = Number(amount)
  if (!Number.isInteger(amountKes) || amountKes < MIN_PAYOUT_KES || amountKes > MAX_PAYOUT_KES) {
    return json(
      { error: `amount must be a whole KES number between ${MIN_PAYOUT_KES} and ${MAX_PAYOUT_KES}` },
      { status: 400 },
    )
  }

  // Role validation
  if (typeof role !== "string" || !PAYOUT_ELIGIBLE_ROLES.has(role as never)) {
    return json(
      { error: `role must be one of: ${[...PAYOUT_ELIGIBLE_ROLES].join(", ")}` },
      { status: 400 },
    )
  }

  // ── Server-side actor verification ───────────────────────────────────────
  // Verify the actorId belongs to this session's profile and is active.
  // Prevents a client from spoofing another user's actorId.
  const { data: actor, error: actorError } = await supabase
    .from("actors")
    .select("id, type, status, profile_id")
    .eq("id", actorId)
    .eq("status", "active")
    .maybeSingle()

  if (actorError || !actor) {
    return json({ error: "Actor not found or inactive" }, { status: 404 })
  }

  if (actor.profile_id !== session.user.id) {
    return json({ error: "Actor does not belong to this session" }, { status: 403 })
  }

  if (!PAYOUT_ELIGIBLE_ROLES.has(actor.type as never)) {
    return json({ error: "Actor is not eligible for payouts" }, { status: 403 })
  }

  // ── Initiate B2C payment ──────────────────────────────────────────────────
  try {
    const roleLabel = role === ROLES.DRIVER ? "Driver" : "Conductor"

    const response = await sendB2CPayment({
      phoneNumber,
      amount: amountKes,
      remarks: `Tip payout — ${roleLabel}`,
    })

    const conversationId = response.ConversationID as string
    if (!conversationId) {
      throw new Error("Daraja did not return a ConversationID")
    }

    // ── Record payout (processing state) ─────────────────────────────────
    const { error: insertError } = await supabase
      .from("mpesa_payouts")
      .insert({
        conversation_id:  conversationId,
        originator_id:    response.OriginatorConversationID ?? null,
        actor_id:         actorId,
        phone:            phoneNumber,
        amount:           amountKes,
        role,
        trip_id:          tripId ?? null,
        organization_id:  orgId,
        remarks:          `Tip payout — ${roleLabel}`,
        status:           "processing",
      })

    if (insertError) {
      // Payment was sent to Daraja but we failed to record it — log and alert
      console.error("[b2c-payout] DB insert failed after Daraja call:", insertError)
      // Don't return 500 — the payment is in flight; return partial success
      return json({
        conversationId,
        warning: "Payment initiated but recording failed — contact support with this ID",
      }, { status: 202 })
    }

    // ── Audit log ─────────────────────────────────────────────────────────
    await supabase.from("audit_logs").insert({
      event_type:   "mpesa_b2c_initiated",
      actor_id:     actorId,
      profile_id:   session.user.id,
      performed_by: session.user.id,
      target_table: "mpesa_payouts",
      details: {
        conversation_id: conversationId,
        amount_kes:      amountKes,
        phone:           phoneNumber,
        role,
        org_id:          orgId,
        trip_id:         tripId ?? null,
      },
    })

    return json({ conversationId }, { status: 202 })

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[b2c-payout]", message)
    return json({ error: "Payout initiation failed", detail: message }, { status: 500 })
  }
}