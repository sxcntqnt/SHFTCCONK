// src/routes/api/transactions/+server.ts
//
// GET  /api/transactions  — list wallet transactions for an actor or org
// POST /api/transactions  — record a new wallet transaction
//
// Covers all money movements in the platform:
//   - Reservation fee splits (platform, driver, conductor)
//   - Tip splits (driver 10%, conductor 10%, platform 80%)
//   - Operator fees
//   - Withdrawals
//   - Top-ups
//   - Refunds / cashback
//
// FLOW:
//   Same pattern as remittance + reconcile:
//     auth → validate → verify org access → business logic → persist → audit → respond
//
// TABLE: wallet_transactions
//   id, profile_id, actor_id, org_id, type, description,
//   amount_kes, direction, status, mpesa_ref, counterpart, created_at

import { json }               from "@sveltejs/kit"
import type { RequestHandler }  from "$lib/types"
import {
  type WalletTxType,
  TX_DIRECTION,
  TX_LABELS,
} from "$lib/features/wallet/wallet.types"
import {
  calculateReservationSplit,
  calculateTipSplit,
  DEFAULT_REVENUE_CONFIG,
} from "$lib/server/revenue-config"

// ── Payload types ─────────────────────────────────────────────────────────────

interface TransactionPayload {
  /** Actor who earns or spends (driver, conductor, operator, passenger) */
  actorId:      string
  /** Profile (auth user) linked to this actor */
  profileId:    string
  orgId:        string
  type:         WalletTxType
  amountKes:    number
  description?: string
  mpesaRef?:    string
  counterpart?: string    // e.g. "Passenger Jane" or "Org: Citi Hoppa"
  /** For reservation_share: how many seats were booked */
  seats?:       number
  /** For tip_share: total tip before split */
  totalTipKes?: number
}

interface ListQuery {
  actorId?:    string
  orgId?:      string
  type?:       WalletTxType
  direction?:  "in" | "out"
  from?:       string    // ISO date
  to?:         string    // ISO date
  limit?:      number
  offset?:     number
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ url, locals }) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session } = await locals.safeGetSession()
  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  const supabase = locals.supabase

  // ── Query params ──────────────────────────────────────────────────────────
  const q: ListQuery = {
    actorId:   url.searchParams.get("actorId")   ?? undefined,
    orgId:     url.searchParams.get("orgId")     ?? undefined,
    type:      url.searchParams.get("type")      as WalletTxType ?? undefined,
    direction: url.searchParams.get("direction") as "in" | "out" ?? undefined,
    from:      url.searchParams.get("from")      ?? undefined,
    to:        url.searchParams.get("to")        ?? undefined,
    limit:     Math.min(Number(url.searchParams.get("limit")  ?? 50), 200),
    offset:    Number(url.searchParams.get("offset") ?? 0),
  }

  if (!q.actorId && !q.orgId) {
    return json(
      { error: "Either actorId or orgId is required" },
      { status: 400 },
    )
  }

  // ── Verify org access if querying by org ──────────────────────────────────
  if (q.orgId) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("actor_id")
      .eq("organization_id", q.orgId)
      .limit(1)
      .maybeSingle()

    if (!membership) {
      return json(
        { error: "You do not have access to this organisation" },
        { status: 403 },
      )
    }
  }

  // ── Query ─────────────────────────────────────────────────────────────────
  let query = supabase
    .from("wallet_transactions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(q.offset!, q.offset! + q.limit! - 1)

  if (q.actorId)   query = query.eq("actor_id",  q.actorId)
  if (q.orgId)     query = query.eq("org_id",    q.orgId)
  if (q.type)      query = query.eq("type",      q.type)
  if (q.direction) query = query.eq("direction", q.direction)
  if (q.from)      query = query.gte("created_at", q.from)
  if (q.to)        query = query.lte("created_at", q.to)

  const { data: rows, count, error: fetchError } = await query

  if (fetchError) {
    console.error("[transactions] fetch error:", fetchError)
    return json({ error: "Failed to fetch transactions" }, { status: 500 })
  }

  const transactions = (rows ?? []).map((r) => ({
    id:          r.id,
    actorId:     r.actor_id,
    profileId:   r.profile_id,
    orgId:       r.org_id,
    type:        r.type,
    label:       TX_LABELS[r.type as WalletTxType] ?? r.type,
    description: r.description,
    amountKes:   Number(r.amount_kes),
    direction:   r.direction,
    status:      r.status,
    mpesaRef:    r.mpesa_ref ?? null,
    counterpart: r.counterpart ?? null,
    createdAt:   r.created_at,
  }))

  // ── Summary totals ────────────────────────────────────────────────────────
  const completedIn  = transactions.filter((t) => t.direction === "in"  && t.status === "completed")
  const completedOut = transactions.filter((t) => t.direction === "out" && t.status === "completed")
  const pending      = transactions.filter((t) => t.status === "pending" || t.status === "processing")

  return json({
    status:       "OK",
    total:        count ?? 0,
    transactions,
    summary: {
      totalIn:      completedIn.reduce((s, t) => s + t.amountKes, 0),
      totalOut:     completedOut.reduce((s, t) => s + t.amountKes, 0),
      totalPending: pending.reduce((s, t) => s + t.amountKes, 0),
      available:    completedIn.reduce((s, t) => s + t.amountKes, 0) - completedOut.reduce((s, t) => s + t.amountKes, 0),
    },
  })
}

// ── POST ──────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session } = await locals.safeGetSession()
  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  const supabase = locals.supabase

  // ── Parse ─────────────────────────────────────────────────────────────────
  let body: TransactionPayload
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!body.actorId || !body.profileId || !body.orgId || !body.type) {
    return json(
      { error: "actorId, profileId, orgId, and type are required" },
      { status: 400 },
    )
  }

  if (typeof body.amountKes !== "number" || body.amountKes <= 0) {
    return json(
      { error: "amountKes must be a positive number" },
      { status: 400 },
    )
  }

  if (!(body.type in TX_DIRECTION)) {
    return json(
      { error: `Unknown transaction type: ${body.type}` },
      { status: 400 },
    )
  }

  // ── Verify org access ─────────────────────────────────────────────────────
  const { data: membership } = await supabase
    .from("organization_members")
    .select("actor_id")
    .eq("organization_id", body.orgId)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return json(
      { error: "You do not have access to this organisation" },
      { status: 403 },
    )
  }

  // ── Compute split amounts ─────────────────────────────────────────────────
  // For split transaction types, compute the correct actor share
  // rather than trusting the caller to send the right amount.
  let resolvedAmountKes = body.amountKes
  let splitMeta: Record<string, unknown> | null = null

  if (body.type === "reservation_share") {
    const seats = body.seats ?? 1
    const split = calculateReservationSplit(DEFAULT_REVENUE_CONFIG.reservation, seats)
    // Actor gets their role-specific share — caller sends full fee, we compute the split
    // Convention: amountKes in the payload is the per-seat fee total (seats × 19)
    // We store the actor's actual share
    resolvedAmountKes = split.driverKes  // KES 2 per seat — same for driver and conductor
    splitMeta = {
      seats,
      totalFeeKes:  split.totalKes,
      platformKes:  split.platformKes,
      driverKes:    split.driverKes,
      conductorKes: split.conductorKes,
    }
  }

  if (body.type === "tip_share") {
    const totalTip = body.totalTipKes ?? body.amountKes
    const split    = calculateTipSplit(totalTip)
    // Each crew member gets their 10% share
    resolvedAmountKes = split.driverKes  // same value for driver and conductor
    splitMeta = {
      totalTipKes:    totalTip,
      driverKes:      split.driverKes,
      conductorKes:   split.conductorKes,
      platformKes:    split.platformKes,
    }
  }

  // ── Build row ─────────────────────────────────────────────────────────────
  const direction = TX_DIRECTION[body.type]
  const label     = TX_LABELS[body.type]

  const row = {
    actor_id:    body.actorId,
    profile_id:  body.profileId,
    org_id:      body.orgId,
    type:        body.type,
    description: body.description ?? label,
    amount_kes:  resolvedAmountKes,
    direction,
    status:      "completed",    // server-initiated transactions are immediately completed
    mpesa_ref:   body.mpesaRef   ?? null,
    counterpart: body.counterpart ?? null,
    metadata:    splitMeta ?? null,
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  const { data: inserted, error: insertError } = await supabase
    .from("wallet_transactions")
    .insert(row)
    .select("id")
    .single()

  if (insertError) {
    console.error("[transactions] insert failed:", insertError)
    return json(
      { error: "Transaction record failed", detail: insertError.message },
      { status: 500 },
    )
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  await supabase.from("audit_logs").insert({
    event_type:   "wallet_transaction_created",
    performed_by: session.user.id,
    target_table: "wallet_transactions",
    details: {
      transaction_id: inserted.id,
      actor_id:       body.actorId,
      org_id:         body.orgId,
      type:           body.type,
      amount_kes:     resolvedAmountKes,
      direction,
      split_meta:     splitMeta,
    },
  })

  // ── Respond ───────────────────────────────────────────────────────────────
  return json({
    status: "OK",
    transaction: {
      id:          inserted.id,
      type:        body.type,
      label,
      amountKes:   resolvedAmountKes,
      direction,
      status:      "completed",
      splitMeta,
    },
  }, { status: 201 })
}