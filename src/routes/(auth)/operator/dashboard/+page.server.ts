// src/routes/(auth)/operator/+page.server.ts
//
// Operator dashboard data load.
// Context activation already done in /operator/+layout.ts.
// This file fetches the KPI data the dashboard displays.
//
// All mock data from the old version is replaced with real Supabase queries.
// Vehicle IDs come from operatorCtx.orgSlots after layout activates the context.

import type { PageServerLoad } from "$lib/types"
import { redirect }            from "@sveltejs/kit"
import { requireOperatorAccess } from "$lib/security/authGuard"
import { get }                 from "svelte/store"
import { operatorCtx }         from "$lib/features/auth/contexts"

export const load: PageServerLoad = async (event) => {
  await requireOperatorAccess(event)

  const { locals } = event
  const supabase   = locals.supabase

  const operator = get(operatorCtx)
  if (!operator) throw redirect(302, "/app/dashboard")

  const vehicleIds = operator.orgSlots.flatMap((s) => s.assignedVehicleIds)
  const today      = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso   = today.toISOString()

  // ── Parallel fetches ──────────────────────────────────────────────────────
  const [
    tripsRes,
    revenueRes,
    incidentsRes,
    vehicleStatusRes,
    pendingDispatchRes,
  ] = await Promise.allSettled([

    // Recent trips (last 20)
    vehicleIds.length > 0
      ? supabase
          .from("active_trips")
          .select(`
            id, status, route_id, route_name, vehicle_id, vehicle_plate,
            driver_id, scheduled_departure, actual_departure, delay_minutes,
            passenger_count, capacity,
            actors!driver_id ( profiles ( full_name ) )
          `)
          .in("vehicle_id", vehicleIds)
          .gte("scheduled_departure", todayIso)
          .order("scheduled_departure", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),

    // Revenue from ledger entries today
    vehicleIds.length > 0
      ? supabase
          .from("ledger_entries")
          .select("amount")
          .in("vehicle_id", vehicleIds)
          .in("type", ["MPESA_COLLECTION", "CASH_COLLECTION"])
          .gte("date", todayIso)
      : Promise.resolve({ data: [] }),

    // Open incidents
    vehicleIds.length > 0
      ? supabase
          .from("incidents")
          .select("id, vehicle_id, severity, type, description, created_at, metadata")
          .in("vehicle_id", vehicleIds)
          .eq("resolved", false)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),

    // Active vehicle count
    vehicleIds.length > 0
      ? supabase
          .from("vehicles")
          .select("id, reg_number, status, active, metadata")
          .in("id", vehicleIds)
      : Promise.resolve({ data: [] }),

    // Pending dispatch assignments
    vehicleIds.length > 0
      ? supabase
          .from("dispatch_assignments")
          .select("id", { count: "exact", head: true })
          .in("vehicle_id", vehicleIds)
          .eq("status", "PENDING")
      : Promise.resolve({ count: 0 }),
  ])

  // ── Extract and shape data ─────────────────────────────────────────────────

  const trips     = tripsRes.status     === "fulfilled" ? (tripsRes.value.data     ?? []) : []
  const revenue   = revenueRes.status   === "fulfilled" ? (revenueRes.value.data   ?? []) : []
  const incidents = incidentsRes.status === "fulfilled" ? (incidentsRes.value.data ?? []) : []
  const vehicles  = vehicleStatusRes.status === "fulfilled" ? (vehicleStatusRes.value.data ?? []) : []
  const pendingCount = pendingDispatchRes.status === "fulfilled"
    ? (pendingDispatchRes.value as { count: number }).count ?? 0
    : 0

  const todayRevenueKes  = revenue.reduce((sum: number, r: { amount: number }) => sum + Number(r.amount ?? 0), 0)
  const activeVehicles   = vehicles.filter((v: { active: boolean; status: string }) => v.active && v.status === "ACTIVE").length

  // Trips completed + in progress today
  const totalTripsToday  = trips.filter((t: { status: string }) =>
    ["COMPLETED", "IN_PROGRESS", "BOARDING"].includes(t.status),
  ).length

  // Recent trips for table
  const recentTrips = trips.slice(0, 12).map((t: Record<string, unknown>) => {
    const actor   = (t.actors as { profiles?: { full_name?: string } } | null)
    const profile = actor?.profiles
    return {
      id:           String(t.id),
      route:        String(t.route_name ?? t.route_id ?? "—"),
      driver:       profile?.full_name ?? "Unknown",
      vehiclePlate: String(t.vehicle_plate ?? "—"),
      status:       (t.status as "IN_PROGRESS" | "COMPLETED" | "DELAYED" | "SCHEDULED") ?? "SCHEDULED",
      revenueKes:   0,   // loaded per-trip on the trips page
      departedAt:   t.actual_departure as string | null ?? null,
    }
  })

  // Incidents shaped
  const openIncidents = incidents.map((i: Record<string, unknown>) => ({
    id:           String(i.id),
    vehiclePlate: (vehicles.find((v: { id: unknown; reg_number: unknown }) => v.id === i.vehicle_id) as { reg_number?: string } | undefined)?.reg_number ?? String(i.vehicle_id),
    severity:     (i.severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") ?? "LOW",
    type:         String(i.type ?? "UNKNOWN"),
    description:  String(i.description ?? ""),
    createdAt:    String(i.created_at ?? ""),
  }))

  // Fuel alerts — vehicles below 30% (from metadata)
  const fuelAlerts = vehicles
    .map((v: { id: string; reg_number: string; metadata?: Record<string, unknown> }) => {
      const meta    = (v.metadata ?? {}) as Record<string, unknown>
      const fuelPct = meta.fuel_pct != null ? Number(meta.fuel_pct) : null
      const lastFill = meta.last_fuel_date
        ? Math.floor((Date.now() - new Date(meta.last_fuel_date as string).getTime()) / 86_400_000)
        : null
      return { vehicleId: v.id, plate: v.reg_number, fuelPct, lastFillDaysAgo: lastFill }
    })
    .filter((f: { fuelPct: number | null }) => f.fuelPct !== null && f.fuelPct < 30)
    .sort((a: { fuelPct: number | null }, b: { fuelPct: number | null }) => (a.fuelPct ?? 100) - (b.fuelPct ?? 100))
    .slice(0, 6) as { vehicleId: string; plate: string; fuelPct: number; lastFillDaysAgo: number | null }[]

  return {
    todayRevenueKes,
    activeVehicles,
    totalTripsToday,
    pendingDispatches: pendingCount,
    recentTrips,
    openIncidents,
    fuelAlerts: fuelAlerts.map((f) => ({
      ...f,
      lastFillDaysAgo: f.lastFillDaysAgo ?? 0,
    })),
  }
}