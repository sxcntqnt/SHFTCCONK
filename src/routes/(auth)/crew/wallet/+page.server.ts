// src/routes/(auth)/crew/wallet/+page.server.ts
//
// Crew wallet — tip shares and reservation motivation shares.
//
// MONEY FLOWS IN:
//   - Tip share:         10% of each tip paid by a passenger
//   - Reservation share: KES 2 per seat on digital bookings on their vehicle
//
// MONEY FLOWS OUT:
//   - Withdrawal: STK Push to crew member's personal M-Pesa phone
//
// MIGRATION FROM sessionStore:
//   requireCrewAccess(event) + get(crewCtx) → userState.activeContexts
//   crew.actor.metadata.mpesa_phone → profiles.phone (from migration)
//   crew.activeVehicleId → actorCtx.driverAssignment / conductorAssignment
//   crew.activeVehiclePlate → re-queried via vehicles join
//   session.user.id → locals.user.id
//
// HYPERLEDGER ADDITION:
//   Crew Fabric enrollment status shown — crew need active identity
//   to log fares and trips on-chain. Exhausted enrollment blocks
//   on-chain logging but does NOT prevent M-Pesa wallet actions.

import { redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import { processMpesaPush } from "$lib/server/mpesa-provider"
import { DEFAULT_REVENUE_CONFIG } from "$lib/server/revenue-config"
import type {
  WalletTransaction,
  WalletSummary,
} from "$lib/features/wallet/wallet.types"
import { ACTOR_TYPES } from "$lib/features/auth/contexts/context.template"

export const load: PageServerLoad = async ({ locals }) => {
  const { userState, supabase, user } = locals

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (!userState || !user) throw redirect(303, "/login")

  // Prefer DRIVER over CONDUCTOR — matches activateCrewContext priority
  const actorCtx =
    userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.DRIVER && ctx.status === "active",
    ) ??
    userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.CONDUCTOR && ctx.status === "active",
    ) ??
    null

  if (!actorCtx) throw redirect(303, "/app/dashboard?denied=crew_not_active")

  const actorId = actorCtx.actorId
  const crewType = actorCtx.type === ACTOR_TYPES.DRIVER ? "DRIVER" : "CONDUCTOR"

  // ── Vehicle assignment ─────────────────────────────────────────────────────
  // Driver: driverAssignment from resolveUserState
  // Conductor: conductorAssignment from resolveUserState
  // Plate comes from a vehicles join — same approach as crew +layout.server.ts
  const activeVehicleId =
    crewType === "DRIVER"
      ? (actorCtx.driverAssignment?.vehicle_id ?? null)
      : (actorCtx.conductorAssignment?.vehicle_id ?? null)

  const activeTripId =
    crewType === "DRIVER"
      ? (actorCtx.driverAssignment?.active_trip_id ?? null)
      : (actorCtx.conductorAssignment?.active_trip_id ?? null)

  // ── Org resolution ─────────────────────────────────────────────────────────
  const orgJurisdiction = actorCtx.jurisdictions.find(
    (j) => j.level === "org" && j.scope_id != null,
  )
  const orgId = orgJurisdiction?.scope_id ?? null
  const orgMembership = actorCtx.orgMemberships.find(
    (m) => m.organization_id === orgId,
  )

  // ── Parallel fetch ─────────────────────────────────────────────────────────
  const [vehicleResult, tipResult, withdrawResult, hlfResult] =
    await Promise.all([
      // Vehicle plate — re-query with reg_number join
      // (resolveUserState has vehicle_id but not reg_number — see crew layout note)
      activeVehicleId
        ? supabase
            .from("vehicles")
            .select("id, reg_number, capacity")
            .eq("id", activeVehicleId)
            .maybeSingle()
        : Promise.resolve({ data: null }),

      // Tip payouts received by this actor
      supabase
        .from("mpesa_payouts")
        .select("id, amount, status, transaction_id, remarks, created_at")
        .eq("actor_id", actorId)
        .neq("remarks", "Wallet withdrawal")
        .order("created_at", { ascending: false })
        .limit(60),

      // Withdrawal outflows
      supabase
        .from("mpesa_payouts")
        .select("id, amount, status, transaction_id, created_at")
        .eq("actor_id", actorId)
        .eq("remarks", "Wallet withdrawal")
        .order("created_at", { ascending: false })
        .limit(20),

      // Hyperledger enrollment status for this crew actor
      supabase
        .from("hyperledger_enrollment_queue")
        .select(
          "status, enrolled_at, fabric_user_id, msp_id, last_error, attempts",
        )
        .eq("actor_id", actorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const vehiclePlate = vehicleResult.data?.reg_number ?? null

  // ── Tip transactions ───────────────────────────────────────────────────────
  const tipTx: WalletTransaction[] = (tipResult.data ?? []).map((p) => ({
    id: p.id,
    type: "tip_share",
    description: p.remarks ?? "Tip share",
    amountKes: Number(p.amount),
    direction: "in",
    status:
      p.status === "completed"
        ? "completed"
        : p.status === "failed"
          ? "failed"
          : "pending",
    mpesaRef: p.transaction_id ?? null,
    createdAt: p.created_at,
  }))

  // ── Reservation share transactions ─────────────────────────────────────────
  // KES 2 per seat — calculated from confirmed bookings on the assigned vehicle
  const perSeatShare =
    crewType === "DRIVER"
      ? Math.floor(
          DEFAULT_REVENUE_CONFIG.reservation.totalFeeKes *
            DEFAULT_REVENUE_CONFIG.reservation.driverRate,
        )
      : Math.floor(
          DEFAULT_REVENUE_CONFIG.reservation.totalFeeKes *
            DEFAULT_REVENUE_CONFIG.reservation.conductorRate,
        )

  let resTx: WalletTransaction[] = []
  if (activeVehicleId) {
    const { data: bookingRows } = await supabase
      .from("bookings")
      .select("id, metadata, created_at")
      .eq("vehicle_id", activeVehicleId)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(40)

    resTx = (bookingRows ?? []).map((b) => {
      const seats = (b.metadata as { seats?: number } | null)?.seats ?? 1
      return {
        id: `res-${b.id}`,
        type: "reservation_share",
        description: `Reservation share · ${seats} seat${seats !== 1 ? "s" : ""}`,
        amountKes: perSeatShare * seats,
        direction: "in",
        status: "completed",
        mpesaRef: null,
        createdAt: b.created_at,
      }
    })
  }

  // ── Withdrawal transactions ────────────────────────────────────────────────
  const withdrawTx: WalletTransaction[] = (withdrawResult.data ?? []).map(
    (w) => ({
      id: `wd-${w.id}`,
      type: "withdrawal",
      description: "Withdrawal to M-Pesa",
      amountKes: Number(w.amount),
      direction: "out",
      status:
        w.status === "completed"
          ? "completed"
          : w.status === "failed"
            ? "failed"
            : "pending",
      mpesaRef: w.transaction_id ?? null,
      createdAt: w.created_at,
    }),
  )

  // ── Merge and sort ─────────────────────────────────────────────────────────
  const transactions = [...tipTx, ...resTx, ...withdrawTx].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  // ── Summary ────────────────────────────────────────────────────────────────
  const completedIn = transactions.filter(
    (t) => t.direction === "in" && t.status === "completed",
  )
  const completedOut = transactions.filter(
    (t) => t.direction === "out" && t.status === "completed",
  )
  const pending = transactions.filter(
    (t) => t.status === "pending" || t.status === "processing",
  )

  const summary: WalletSummary = {
    availableKes: Math.max(
      0,
      completedIn.reduce((s, t) => s + t.amountKes, 0) -
        completedOut.reduce((s, t) => s + t.amountKes, 0),
    ),
    pendingKes: pending.reduce((s, t) => s + t.amountKes, 0),
    totalEarnedKes: completedIn.reduce((s, t) => s + t.amountKes, 0),
    totalSpentKes: completedOut.reduce((s, t) => s + t.amountKes, 0),
    currency: "KES",
  }

  // ── Hyperledger identity status ────────────────────────────────────────────
  // Crew need an active Fabric identity to log fares and trips on-chain.
  // This does NOT block M-Pesa wallet actions — only on-chain logging.
  const hlfData = hlfResult.data
  const hlfStatus = hlfData
    ? {
        status: hlfData.status,
        enrolledAt: hlfData.enrolled_at,
        fabricId: hlfData.fabric_user_id,
        mspId: hlfData.msp_id,
        lastError: hlfData.last_error,
        attempts: hlfData.attempts,
        // Crew can only log on-chain with an active Fabric identity
        canLogOnChain: hlfData.status === "success",
      }
    : null

  // Phone from profiles (added via migration 20260327000006)
  const mpesaPhone = ((userState.profile as any).phone as string | null) ?? null

  return {
    transactions,
    summary,
    crewType,
    perSeatShare,
    mpesaPhone,
    vehiclePlate,
    activeVehicleId,
    activeTripId,
    orgId,
    orgName: orgMembership?.org_name ?? "Unknown SACCO",
    hlfStatus,
    actorId,
  }
}

export const actions: Actions = {
  withdraw: async ({ request, locals }) => {
    const { user, userState, supabase } = locals
    if (!user || !userState) throw redirect(303, "/login")

    // Re-validate crew actor in the action — don't trust client-side state
    const actorCtx =
      userState.activeContexts.find(
        (ctx) => ctx.type === ACTOR_TYPES.DRIVER && ctx.status === "active",
      ) ??
      userState.activeContexts.find(
        (ctx) => ctx.type === ACTOR_TYPES.CONDUCTOR && ctx.status === "active",
      ) ??
      null

    if (!actorCtx) return { error: "No active crew account.", success: false }

    const formData = await request.formData()
    const amountKes = Number(formData.get("amount"))
    const phone = (formData.get("phone") as string)?.trim() ?? ""

    if (!amountKes || amountKes < 10)
      return { error: "Minimum withdrawal is KES 10", success: false }
    if (amountKes > 150_000)
      return { error: "Maximum withdrawal is KES 150,000", success: false }
    if (!phone.match(/^\+254[17]\d{8}$/))
      return { error: "Enter a valid Kenyan phone (+254...)", success: false }

    const orgJurisdiction = actorCtx.jurisdictions.find(
      (j) => j.level === "org" && j.scope_id != null,
    )
    const orgId = orgJurisdiction?.scope_id ?? null
    const crewType =
      actorCtx.type === ACTOR_TYPES.DRIVER ? "DRIVER" : "CONDUCTOR"

    try {
      const response = await processMpesaPush(
        phone,
        amountKes,
        "CREW_WITHDRAW",
        "Crew wallet withdrawal",
      )

      await supabase.from("mpesa_payouts").insert({
        conversation_id: response.CheckoutRequestID,
        actor_id: actorCtx.actorId,
        phone,
        amount: amountKes,
        role: crewType,
        organization_id: orgId,
        remarks: "Wallet withdrawal",
        status: "processing",
      })

      await supabase.from("audit_logs").insert({
        event_type: "crew_wallet_withdrawal",
        actor_id: actorCtx.actorId,
        profile_id: user.id,
        performed_by: user.id,
        target_table: "mpesa_payouts",
        details: {
          amount_kes: amountKes,
          phone,
          checkout_request_id: response.CheckoutRequestID,
          crew_type: crewType,
        },
      })

      return {
        success: true,
        message:
          "Check your phone and enter your M-Pesa PIN to complete the withdrawal.",
      }
    } catch (err) {
      console.error("[crew wallet withdraw]", err)
      return { error: "Withdrawal failed. Please try again.", success: false }
    }
  },
}
