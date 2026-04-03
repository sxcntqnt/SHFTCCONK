// src/routes/api/webhooks/mpesa/b2b-settlement/+server.ts
//
// Initiates an M-Pesa B2B (Business to Business) payment.
// Used for: SACCO → operator paybill/till revenue share settlements.
//
// Flow:
//   1. Client POSTs { shortcode, amount, orgId, reference? }
//   2. We validate and call Daraja B2B API
//   3. Daraja returns ConversationID immediately (async)
//   4. We insert a 'processing' row into mpesa_settlements
//   5. The b2b-result webhook updates status to 'completed' or 'failed'
//
// Security:
//   - Requires authenticated session
//   - Caller must be ACCOUNTANT, ORG_CHAIR, or GENERAL_MANAGER in the org
//   - Shortcode must be a valid Safaricom paybill or till (5–6 digits)
//   - Amount validated as positive KES integer
//   - Daily settlement limit enforced (configurable per org)

import type { RequestHandler } from "./$types"
import { json } from "@sveltejs/kit"
import { sendB2BPayment } from "$lib/server/mpesa-provider"
import { ROLES } from "$lib/features/auth/stores/roles"

// Roles authorised to trigger B2B settlements
const SETTLEMENT_AUTHORISED_ROLES = new Set([
  ROLES.ORG_CHAIR,
  ROLES.GENERAL_MANAGER,
  ROLES.ACCOUNTANT,
])

// KES settlement limits
const MIN_SETTLEMENT_KES = 100
const MAX_SETTLEMENT_KES = 10_000_000 // 10M KES — adjust per Daraja tier

// Safaricom paybill/till: 5 or 6 digits
const SHORTCODE_RE = /^\d{5,6}$/

export const POST: RequestHandler = async ({ request, locals }) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session } = await locals.safeGetSession()
  const supabase = locals.supabase

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

  const { shortcode, amount, orgId, reference, actorId } = body as Record<
    string,
    unknown
  >

  // Required fields
  if (!shortcode || !amount || !orgId || !actorId) {
    return json(
      { error: "Missing required fields: shortcode, amount, orgId, actorId" },
      { status: 400 },
    )
  }

  // Shortcode validation
  if (typeof shortcode !== "string" || !SHORTCODE_RE.test(shortcode)) {
    return json(
      {
        error:
          "shortcode must be a 5 or 6 digit Safaricom paybill or till number",
      },
      { status: 400 },
    )
  }

  // Amount validation
  const amountKes = Number(amount)
  if (
    !Number.isInteger(amountKes) ||
    amountKes < MIN_SETTLEMENT_KES ||
    amountKes > MAX_SETTLEMENT_KES
  ) {
    return json(
      {
        error: `amount must be a whole KES number between ${MIN_SETTLEMENT_KES} and ${MAX_SETTLEMENT_KES.toLocaleString()}`,
      },
      { status: 400 },
    )
  }

  // ── Verify actor is authorised to settle for this org ─────────────────────
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
    return json(
      { error: "Actor does not belong to this session" },
      { status: 403 },
    )
  }

  if (!SETTLEMENT_AUTHORISED_ROLES.has(actor.type as never)) {
    return json(
      {
        error: `Settlements require one of: ${[...SETTLEMENT_AUTHORISED_ROLES].join(", ")}`,
      },
      { status: 403 },
    )
  }

  // Verify actor has jurisdiction over the org being settled
  const { data: membership } = await supabase
    .from("organization_members")
    .select("actor_id")
    .eq("actor_id", actorId)
    .eq("organization_id", orgId)
    .maybeSingle()

  if (!membership) {
    return json(
      { error: "Actor is not a member of this organisation" },
      { status: 403 },
    )
  }

  // ── Daily settlement limit check ──────────────────────────────────────────
  // Sum today's completed + processing settlements for this org
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: todaySettlements } = await supabase
    .from("mpesa_settlements")
    .select("amount")
    .eq("organization_id", orgId)
    .in("status", ["processing", "completed"])
    .gte("created_at", startOfDay.toISOString())

  const todayTotal = (todaySettlements ?? []).reduce(
    (sum, s) => sum + Number(s.amount),
    0,
  )

  // Default daily cap: 10M KES — load from org metadata if configurable
  const DAILY_CAP = MAX_SETTLEMENT_KES
  if (todayTotal + amountKes > DAILY_CAP) {
    return json(
      {
        error: `Daily settlement limit (KES ${DAILY_CAP.toLocaleString()}) would be exceeded`,
        todayTotal,
        requested: amountKes,
      },
      { status: 422 },
    )
  }

  // ── Initiate B2B payment ──────────────────────────────────────────────────
  try {
    const response = await sendB2BPayment({
      shortcode,
      amount: amountKes,
      remarks: reference
        ? `Settlement — ${reference}`
        : "Revenue share settlement",
    })

    const conversationId = response.ConversationID as string
    if (!conversationId) {
      throw new Error("Daraja did not return a ConversationID")
    }

    // ── Record settlement (processing state) ──────────────────────────────
    const { error: insertError } = await supabase
      .from("mpesa_settlements")
      .insert({
        conversation_id: conversationId,
        originator_id: response.OriginatorConversationID ?? null,
        shortcode,
        amount: amountKes,
        reference: reference ?? null,
        organization_id: orgId,
        initiated_by: actorId,
        remarks: reference
          ? `Settlement — ${reference}`
          : "Revenue share settlement",
        status: "processing",
      })

    if (insertError) {
      console.error(
        "[b2b-settlement] DB insert failed after Daraja call:",
        insertError,
      )
      return json(
        {
          conversationId,
          warning:
            "Settlement initiated but recording failed — contact support with this ID",
        },
        { status: 202 },
      )
    }

    // ── Audit log ─────────────────────────────────────────────────────────
    await supabase.from("audit_logs").insert({
      event_type: "mpesa_b2b_initiated",
      actor_id: actorId,
      profile_id: session.user.id,
      performed_by: session.user.id,
      target_table: "mpesa_settlements",
      details: {
        conversation_id: conversationId,
        amount_kes: amountKes,
        shortcode,
        reference: reference ?? null,
        org_id: orgId,
      },
    })

    return json({ conversationId }, { status: 202 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[b2b-settlement]", message)
    return json(
      { error: "Settlement initiation failed", detail: message },
      { status: 500 },
    )
  }
}
