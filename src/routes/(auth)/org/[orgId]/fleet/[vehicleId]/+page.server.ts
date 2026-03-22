// src/routes/(auth)/org/[orgId]/fleet/[vehicleId]/+page.server.ts
//
// Vehicle detail page data load.
// All finance, compliance, and vehicle data fetched server-side.
// Client stores (ledgerStore, reconciliationStore, complianceAlertStore)
// are NOT used here — they were the source of the separation-of-concerns
// violation in the old page. The server is the right place to load this data.

import type { PageServerLoad } from "./$types"
import { error }               from "@sveltejs/kit"
import { requireOrgMemberAccess } from "$lib/security/authGuard"

export const load: PageServerLoad = async (event) => {
  await requireOrgMemberAccess(event, event.params.orgId)

  const { params, locals } = event
  const { orgId, vehicleId } = params
  const supabase = locals.supabase

  // ── Vehicle ───────────────────────────────────────────────────────────────
  const { data: row, error: vehicleErr } = await supabase
    .from("vehicles")
    .select("id, reg_number, organization_id, route, status, active, capacity, owner_id, gps_lat, gps_lng, metadata")
    .eq("id", vehicleId)
    .eq("organization_id", orgId)   // enforce org scope
    .maybeSingle()

  if (vehicleErr || !row) throw error(404, "Vehicle not found")

  const vehicle = {
    id:             row.id,
    regNumber:      row.reg_number,
    organizationId: row.organization_id,
    route:          row.route ?? "",
    status:         row.status ?? "ACTIVE",
    active:         Boolean(row.active),
    capacity:       row.capacity ?? null,
    ownerId:        row.owner_id ?? "",
    gpsLat:         row.gps_lat != null ? Number(row.gps_lat) : null,
    gpsLng:         row.gps_lng != null ? Number(row.gps_lng) : null,
    metadata:       row.metadata ?? null,
  }

  // ── Parallel data fetches ─────────────────────────────────────────────────
  const [complianceRes, reconciliationRes, ledgerRes] = await Promise.allSettled([

    // Compliance alerts for this vehicle
    supabase
      .from("compliance_alerts")
      .select("id, type, status, expiry_date, vehicle_id")
      .eq("vehicle_id", vehicleId)
      .eq("organization_id", orgId)
      .order("expiry_date", { ascending: true }),

    // Reconciliation history for revenue summary
    supabase
      .from("reconciliation_events")
      .select("total_collected, expected_amount, variance, status, reconciled_date")
      .eq("vehicle_id", vehicleId)
      .eq("organization_id", orgId)
      .order("reconciled_date", { ascending: true })
      .limit(30),

    // Recent ledger entries
    supabase
      .from("ledger_entries")
      .select("id, type, amount, direction, date, reference")
      .eq("vehicle_id", vehicleId)
      .order("date", { ascending: false })
      .limit(10),
  ])

  // ── Compliance alerts ─────────────────────────────────────────────────────
  const complianceAlerts = (
    complianceRes.status === "fulfilled" ? (complianceRes.value.data ?? []) : []
  ).map((a: Record<string, unknown>) => ({
    id:         String(a.id),
    type:       String(a.type ?? ""),
    status:     String(a.status ?? "OK"),
    expiryDate: String(a.expiry_date ?? ""),
  }))

  // ── Revenue summary ───────────────────────────────────────────────────────
  const recRows = reconciliationRes.status === "fulfilled"
    ? (reconciliationRes.value.data ?? [])
    : []

  const totalCollected = recRows.reduce(
    (sum: number, r: { total_collected: number }) => sum + Number(r.total_collected ?? 0), 0,
  )
  const totalExpected  = recRows.reduce(
    (sum: number, r: { expected_amount: number }) => sum + Number(r.expected_amount ?? 0), 0,
  )
  const trendPoints: number[] = recRows.map(
    (r: { total_collected: number }) => Number(r.total_collected ?? 0),
  )

  const revenueSummary = {
    totalCollected,
    totalExpected,
    variance:   totalCollected - totalExpected,
    dayCount:   recRows.length,
    trendPoints,
  }

  // ── Recent ledger entries ─────────────────────────────────────────────────
  const recentLedger = (
    ledgerRes.status === "fulfilled" ? (ledgerRes.value.data ?? []) : []
  ).map((e: Record<string, unknown>) => ({
    id:        String(e.id),
    type:      String(e.type ?? ""),
    amount:    Number(e.amount ?? 0),
    direction: String(e.direction ?? "in"),
    date:      String(e.date ?? ""),
    reference: e.reference ? String(e.reference) : null,
  }))

  const protomapsKey = process.env.PROTOMAPS_API_KEY ?? ""

  return {
    supabase,            // passed through for realtime GPS channel in page
    vehicle,
    complianceAlerts,
    revenueSummary,
    recentLedger,
    protomapsKey,
  }
}