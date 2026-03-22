// src/routes/api/reconcile/+server.ts
//
// POST /api/reconcile
//
// Reconciles M-Pesa and cash payments against expected daily remittance
// targets per vehicle. Returns per-vehicle status and org-wide summary.
//
// CHANGES FROM OLD VERSION:
//   - No auth — anyone could call it. Now requires session.
//   - orgId missing — results were not scoped to a tenant.
//   - Results were computed but never persisted. Now upserts to
//     reconciliation_events so the finance store and org wallet can read them.
//   - PaymentTransaction now typed as MpesaTransaction | CashTransaction.
//   - summarizeReconciliation now returns totalMpesa, totalCash, totalShortfall.

import { json }               from "@sveltejs/kit"
import type { RequestHandler }  from "./$types"
import {
  reconcilePayments,
  summarizeReconciliation,
  type PaymentTransaction,
  type RemittanceRecord,
} from "$lib/features/finance/reconciliation.store"

// ── Handler ───────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session } = await locals.safeGetSession()
  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  const supabase = locals.supabase

  // ── Parse ─────────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { payments, remittances, orgId, date } = body as {
    payments:    unknown
    remittances: unknown
    orgId:       unknown
    date?:       unknown
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!Array.isArray(payments) || !Array.isArray(remittances)) {
    return json(
      { error: "payments and remittances must be arrays" },
      { status: 400 },
    )
  }

  if (payments.length === 0) {
    return json({ error: "payments array is empty" }, { status: 400 })
  }

  if (remittances.length === 0) {
    return json({ error: "remittances array is empty" }, { status: 400 })
  }

  if (remittances.length > 500) {
    return json({ error: "Maximum 500 vehicles per reconciliation run" }, { status: 422 })
  }

  if (typeof orgId !== "string" || !orgId) {
    return json({ error: "orgId is required" }, { status: 400 })
  }

  // ── Verify org access ─────────────────────────────────────────────────────
  const { data: membership } = await supabase
    .from("organization_members")
    .select("actor_id")
    .eq("organization_id", orgId)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return json(
      { error: "You do not have access to this organisation" },
      { status: 403 },
    )
  }

  // ── Run reconciliation ────────────────────────────────────────────────────
  let results: ReturnType<typeof reconcilePayments>
  let summary: ReturnType<typeof summarizeReconciliation>

  try {
    results = reconcilePayments(
      payments    as PaymentTransaction[],
      remittances as RemittanceRecord[],
    )
    summary = summarizeReconciliation(results)
  } catch (err) {
    console.error("[reconcile] engine error:", err)
    return json({ error: "Reconciliation computation failed" }, { status: 500 })
  }

  // ── Persist to reconciliation_events ─────────────────────────────────────
  // Upsert so re-running reconciliation for the same date/org/vehicle
  // updates rather than duplicates.
  const reconciliationDate = typeof date === "string"
    ? date
    : new Date().toISOString().slice(0, 10)  // YYYY-MM-DD

  const rows = results.map((r) => ({
    organization_id:  orgId,
    vehicle_id:       r.vehicleId,
    total_collected:  r.collectedAmount,
    expected_amount:  r.expectedAmount,
    variance:         r.variance,
    status:           r.status,
    mpesa_amount:     r.mpesaAmount,
    cash_amount:      r.cashAmount,
    transaction_refs: r.transactionRefs,
    mpesa_phones:     r.mpesaPhones,
    reconciled_date:  reconciliationDate,
    reconciled_by:    session.user.id,
    created_at:       new Date().toISOString(),
  }))

  const { error: upsertError } = await supabase
    .from("reconciliation_events")
    .upsert(rows, {
      onConflict:        "organization_id,vehicle_id,reconciled_date",
      ignoreDuplicates:  false,   // update on conflict
    })

  if (upsertError) {
    console.error("[reconcile] upsert failed:", upsertError)
    // Return results anyway — caller can retry the persist separately
    return json(
      {
        status:          "COMPUTED_NOT_PERSISTED",
        warning:         "Reconciliation computed but not saved. Retry or contact support.",
        detail:          upsertError.message,
        reconciliation:  results,
        summary,
      },
      { status: 207 },  // 207 Multi-Status — partial success
    )
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  await supabase.from("audit_logs").insert({
    event_type:   "reconciliation_run",
    performed_by: session.user.id,
    target_table: "reconciliation_events",
    details: {
      org_id:           orgId,
      date:             reconciliationDate,
      vehicle_count:    results.length,
      total_collected:  summary.totalCollected,
      total_expected:   summary.totalExpected,
      total_variance:   summary.totalVariance,
      matched_count:    summary.matchedCount,
      shortfall_count:  summary.shortfallCount,
      overage_count:    summary.overageCount,
    },
  })

  // ── Respond ───────────────────────────────────────────────────────────────
  return json({
    status:         "OK",
    orgId,
    date:           reconciliationDate,
    vehicleCount:   results.length,
    reconciliation: results,
    summary,
  })
}