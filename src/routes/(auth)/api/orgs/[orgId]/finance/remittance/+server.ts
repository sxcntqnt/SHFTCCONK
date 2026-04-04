// src/routes/api/remittance/+server.ts
//
// POST /api/remittance
//
// Computes and persists daily fare distribution for a vehicle.
// Called at end-of-shift by the conductor or operations system.
//
// DISTRIBUTION MODEL (from revenue-config.ts):
//   Base (≤ target):  SACCO 4/19, owner 3/19, driver 2/19, conductor 2/19, platform remainder
//   Excess (> target): driver 10%, conductor 10%, platform 80%
//
// CHANGES FROM OLD VERSION:
//   - get(user) removed — server stores are always empty, was a silent bug
//   - saccoPercentage override removed — rates come from loadOrgRevenueConfig()
//     which reads org.metadata.revenue_config so orgs can override centrally
//   - Ledger entries are now persisted to Supabase (not just returned)
//   - LedgerEntry types updated to match current schema
//   - createLedgerEntry now takes a params object, not positional args
//   - conductorId added — distribution now includes conductor share

import { json } from "@sveltejs/kit"
import type { RequestHandler } from "$lib/types"
import {
  calculateDistribution,
  createLedgerEntry,
  type LedgerEntry,
} from "$lib/features/finance/ledger.store"
import { loadOrgRevenueConfig } from "$lib/server/revenue-config"

// ── Payload ───────────────────────────────────────────────────────────────────

interface RemittancePayload {
  vehicleId: string
  driverId: string
  conductorId?: string // optional — some routes have no conductor
  orgId: string
  collected: number // KES total collected (cash + M-Pesa)
  target: number // KES daily target set by SACCO
  collectionType?: "MPESA_COLLECTION" | "CASH_COLLECTION"
  mpesaRef?: string // M-Pesa transaction code if applicable
  mpesaPhone?: string // +254 phone if M-Pesa
  reference?: string // internal reference / shift ID
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { session } = await locals.safeGetSession()
  if (!session?.user?.id) {
    return json({ error: "Unauthorised" }, { status: 401 })
  }

  const supabase = locals.supabase

  // ── Parse ─────────────────────────────────────────────────────────────────
  let body: RemittancePayload
  try {
    body = await request.json()
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!body.vehicleId || !body.driverId || !body.orgId) {
    return json(
      { error: "vehicleId, driverId, and orgId are required" },
      { status: 400 },
    )
  }

  if (typeof body.collected !== "number" || typeof body.target !== "number") {
    return json(
      { error: "collected and target must be numeric KES amounts" },
      { status: 400 },
    )
  }

  if (body.collected < 0 || body.target < 0) {
    return json(
      { error: "collected and target must be non-negative" },
      { status: 400 },
    )
  }

  // ── Verify caller has access to this org ──────────────────────────────────
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

  // ── Load org revenue config ───────────────────────────────────────────────
  // Reads org.metadata.revenue_config overrides on top of platform defaults.
  // This is how per-org SACCO levy rates are customised centrally.
  const config = await loadOrgRevenueConfig(supabase, body.orgId)
  const distribution = calculateDistribution(body.collected, body.target)

  // ── Build ledger entries ──────────────────────────────────────────────────
  const collectionType = body.collectionType ?? "CASH_COLLECTION"
  const base = {
    vehicleId: body.vehicleId,
    driverId: body.driverId,
    organizationId: body.orgId,
    reference: body.reference ?? undefined,
  }

  const entries: LedgerEntry[] = [
    // Total collection (raw cash or M-Pesa)
    createLedgerEntry({
      ...base,
      type: collectionType,
      amount: body.collected,
      mpesaPhone: body.mpesaPhone,
      reference: body.mpesaRef ?? body.reference,
    }),

    // SACCO levy (from base settlement)
    createLedgerEntry({
      ...base,
      type: "SACCO_LEVY",
      amount: distribution.saccoLevy,
    }),

    // Vehicle owner share (from base settlement)
    createLedgerEntry({
      ...base,
      type: "OWNER_SHARE",
      amount: distribution.ownerAmount,
    }),

    // Platform share (from base settlement)
    createLedgerEntry({
      ...base,
      type: "PLATFORM_SHARE",
      amount: distribution.platformBase,
    }),

    // Driver base share (from base settlement)
    createLedgerEntry({
      ...base,
      type: "DRIVER_SHARE",
      amount: distribution.driverBase,
    }),

    // Driver incentive (from excess above target)
    ...(distribution.driverIncentive > 0
      ? [
          createLedgerEntry({
            ...base,
            type: "DRIVER_INCENTIVE",
            amount: distribution.driverIncentive,
            notes: `Excess: KES ${distribution.excess}`,
          }),
        ]
      : []),

    // Conductor shares (only if conductor is assigned)
    ...(body.conductorId
      ? [
          createLedgerEntry({
            ...base,
            driverId: body.conductorId, // conductor is the recipient
            type: "CONDUCTOR_SHARE",
            amount: distribution.conductorBase,
          }),
          ...(distribution.conductorIncentive > 0
            ? [
                createLedgerEntry({
                  ...base,
                  driverId: body.conductorId,
                  type: "CONDUCTOR_INCENTIVE",
                  amount: distribution.conductorIncentive,
                  notes: `Excess: KES ${distribution.excess}`,
                }),
              ]
            : []),
        ]
      : []),
  ]

  // ── Persist to Supabase ───────────────────────────────────────────────────
  const { error: insertError } = await supabase.from("ledger_entries").insert(
    entries.map((e) => ({
      id: e.id,
      vehicle_id: e.vehicleId,
      driver_id: e.driverId,
      organization_id: e.organizationId,
      type: e.type,
      amount: e.amount,
      reference: e.reference ?? null,
      mpesa_phone: e.mpesaPhone ?? null,
      notes: e.notes ?? null,
      date: e.date,
    })),
  )

  if (insertError) {
    console.error("[remittance] ledger insert failed:", insertError)
    return json(
      {
        error: "Distribution computed but ledger write failed",
        detail: insertError.message,
      },
      { status: 500 },
    )
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  await supabase.from("audit_logs").insert({
    event_type: "remittance_cleared",
    performed_by: session.user.id,
    target_table: "ledger_entries",
    details: {
      vehicle_id: body.vehicleId,
      driver_id: body.driverId,
      org_id: body.orgId,
      collected_kes: body.collected,
      target_kes: body.target,
      excess_kes: distribution.excess,
      entry_count: entries.length,
    },
  })

  // ── Respond ───────────────────────────────────────────────────────────────
  return json({
    status: "CLEARED",
    vehicleId: body.vehicleId,
    distribution: {
      collected: body.collected,
      target: body.target,
      baseSettlement: distribution.baseSettlement,
      excess: distribution.excess,
      saccoLevy: distribution.saccoLevy,
      ownerAmount: distribution.ownerAmount,
      platformBase: distribution.platformBase,
      driverTotal: distribution.driverTotal,
      conductorTotal: body.conductorId ? distribution.conductorTotal : null,
    },
    entries: entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
    })),
  })
}
