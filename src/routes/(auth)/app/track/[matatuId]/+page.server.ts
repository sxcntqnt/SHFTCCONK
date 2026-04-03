// src/routes/(auth)/app/track/[matatuId]/+page.server.ts
//
// Single-vehicle tracking page — guards access behind a confirmed booking.
//
// ACCESS GATE:
//   A passenger can only reach this page if they have an active booking
//   on this vehicle with a CONFIRMED M-Pesa payment (status = 'confirmed',
//   payment_status = 'PAID', mpesa_ref is not null).
//
//   Gate logic:
//     1. Find a booking by this user on this vehicle that is confirmed + paid.
//     2. If none found → 402 Payment Required (not 403 — they may not have paid).
//     3. Only then load the tracking data.
//
// WHY NOT JUST CHECK MPESA_PAYOUTS:
//   The reservation fee split is recorded in mpesa_payouts AFTER the booking
//   is confirmed. The booking itself is the source of truth — it carries
//   payment_status and mpesa_ref stamped by the STK push callback.
//
// GPS MISSING:
//   If a vehicle has a valid booking but no GPS fix yet, the page still loads.
//   The client waits for realtime — hard-erroring would punish paid users.
//
// MERGED FROM:
//   fleet/map/+page.server.ts  — parquetUrl, nonCompliantIds, vehicleCount
//   track/[matatuId]/+page.server.ts — vehicle lookup, H3 hex, GPS
//
// FIXES CARRIED FORWARD:
//   - redirect() thrown not called
//   - snake_case column names throughout
//   - safeGetSession() not getSession()
//   - RLS membership check replaces app_metadata org check
//   - parquetUrl from org.metadata not compliance API route

import type { PageServerLoad } from "./$types"
import { error, redirect } from "@sveltejs/kit"
import { latLngToCell } from "h3-js"

export const load: PageServerLoad = async ({ params, locals }) => {
  const { safeGetSession, supabase } = locals
  const { session } = await safeGetSession()

  if (!session) throw redirect(303, "/login/sign_in")

  const { matatuId } = params
  if (!matatuId) throw error(400, "Missing matatuId")

  // ── Fetch vehicle by reg_number ───────────────────────────────────────────
  const { data: vehicle, error: vehicleErr } = await supabase
    .from("vehicles")
    .select(
      "id, reg_number, organization_id, status, active, capacity, gps_lat, gps_lng, metadata",
    )
    .eq("reg_number", matatuId)
    .maybeSingle()

  if (vehicleErr || !vehicle) throw error(404, "Matatu not found")

  const orgId = vehicle.organization_id

  // ── M-Pesa booking gate ───────────────────────────────────────────────────
  // The passenger must have a booking that is:
  //   - on this vehicle
  //   - placed by this user (profile_id)
  //   - status = confirmed (SACCO accepted it)
  //   - payment_status = PAID (STK callback confirmed receipt)
  //   - mpesa_ref is set (the M-Pesa transaction code — proof of payment)
  //   - trip_date is today or future (stale bookings don't grant permanent access)
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select("id, status, payment_status, mpesa_ref, trip_date, metadata")
    .eq("vehicle_id", vehicle.id)
    .eq("profile_id", session.user.id)
    .eq("payment_status", "PAID")
    .eq("status", "confirmed")
    .not("mpesa_ref", "is", null)
    .gte("trip_date", new Date().toISOString().slice(0, 10))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (bookingErr) {
    console.error("[track] booking verification error:", bookingErr)
    throw error(500, "Could not verify booking status")
  }

  if (!booking) {
    // 402 Payment Required — more accurate than 403 (which implies auth failure).
    // The booking page should intercept this and redirect to payment flow.
    throw error(
      402,
      "A confirmed M-Pesa booking is required to track this matatu",
    )
  }

  const bookingMeta = (booking.metadata as Record<string, unknown> | null) ?? {}
  const seatsBooked = bookingMeta.seats != null ? Number(bookingMeta.seats) : 1

  // ── GPS coords ────────────────────────────────────────────────────────────
  const lat = vehicle.gps_lat != null ? Number(vehicle.gps_lat) : null
  const lng = vehicle.gps_lng != null ? Number(vehicle.gps_lng) : null

  // H3 cell at resolution 9 — used to scope DuckDB tile history queries.
  // Null when GPS hasn't reported yet — client waits for realtime.
  const hex =
    lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)
      ? latLngToCell(lat, lng, 9)
      : null

  // ── Org-level context for the map ─────────────────────────────────────────
  // All three run in parallel — a failing compliance query doesn't block the map.
  const [orgRes, vehicleCountRes, complianceRes] = await Promise.allSettled([
    supabase
      .from("organizations")
      .select("name, metadata")
      .eq("id", orgId)
      .maybeSingle(),

    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("active", true),

    supabase
      .from("compliance_alerts")
      .select("vehicle_id, status")
      .eq("organization_id", orgId)
      .in("status", ["EXPIRED", "WARNING"]),
  ])

  const org = orgRes.status === "fulfilled" ? orgRes.value.data : null
  const vehicleCount =
    vehicleCountRes.status === "fulfilled"
      ? (vehicleCountRes.value.count ?? 0)
      : 0
  const compliance =
    complianceRes.status === "fulfilled" ? (complianceRes.value.data ?? []) : []

  const nonCompliantIds = [
    ...new Set(compliance.map((c: { vehicle_id: string }) => c.vehicle_id)),
  ]

  // parquetUrl from org metadata — set when a DuckDB export is triggered.
  // Falls back to null — map renders with live GPS overlay only.
  const parquetUrl =
    vehicleCount > 0
      ? (((org?.metadata as Record<string, unknown> | null)?.parquet_url as
          | string
          | null) ?? null)
      : null

  return {
    matatuId,
    vehicle: {
      id: vehicle.id,
      regNumber: vehicle.reg_number,
      organizationId: orgId,
      status: vehicle.status,
      active: vehicle.active,
      capacity: vehicle.capacity,
      metadata: vehicle.metadata,
    },
    // Surfaced in the tracking UI — "Booking ref: QBW2NL · 2 seats · 22 Mar"
    booking: {
      id: booking.id,
      mpesaRef: booking.mpesa_ref as string,
      tripDate: booking.trip_date as string,
      seatsBooked,
    },
    orgId,
    orgName: org?.name ?? orgId,
    lat,
    lng,
    hex,
    vehicleCount,
    nonCompliantIds,
    parquetUrl,
    protomapsKey: process.env.PROTOMAPS_API_KEY ?? "",
  }
}
