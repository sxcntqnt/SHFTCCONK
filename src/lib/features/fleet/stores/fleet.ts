// src/lib/features/fleet/fleet.store.ts
//
// Fleet vehicle state — org-scoped, Supabase-backed.
//
// MERGED FROM:
//   v1 (features/fleet/stores/fleet.store.ts) — Vehicle shape, ComplianceStatus,
//      assertTenant, mapVehicle camelCase↔snake_case normaliser, fleet alias,
//      getActiveVehicles(), getVehiclesByRoute()
//   v2 (patched)                              — FleetState wrapper with loading/error/lastUpdated,
//      rich derived stores, insuranceExpiringSoon, suspendedVehicles
//
// USAGE:
//   import { initFleet, destroyFleet, activeVehicles } from '$lib/features/fleet/fleet.store'
//
//   onMount(() => {
//     initFleet(supabase, orgId)
//     return () => destroyFleet(supabase)
//   })

import { writable, derived, get } from "svelte/store"
import type { SupabaseClient } from "@supabase/supabase-js"

// ── Types ─────────────────────────────────────────────────────────────────────

export type VehicleStatus =
  | "ACTIVE"
  | "NON_COMPLIANT"
  | "MAINTENANCE"
  | "SUSPENDED"

export interface ComplianceStatus {
  insuranceValid: boolean
  inspectionValid: boolean
  licenseValid: boolean
  [key: string]: boolean // extensible for future checks
}

export interface Vehicle {
  id: string
  regNumber: string // reg_number in DB
  ownerId: string
  organizationId: string
  route: string
  routeId?: string // explicit FK when available
  gpsLat: number
  gpsLng: number
  status: VehicleStatus
  active: boolean
  capacity: number
  insuranceExpiry?: string // ISO date
  lastMaintenance?: string // ISO date
  complianceStatus: ComplianceStatus
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

// ── Store state ───────────────────────────────────────────────────────────────

interface FleetState {
  vehicles: Vehicle[]
  loading: boolean
  error: string | null
  lastUpdated: string | null
}

export const fleetStore = writable<FleetState>({
  vehicles: [],
  loading: false,
  error: null,
  lastUpdated: null,
})

/** Alias for components that import as `fleet` — backward compat */
export const fleet = fleetStore

// ── Derived stores ────────────────────────────────────────────────────────────

export const vehicles = derived(fleetStore, ($s) => $s.vehicles)
export const fleetLoading = derived(fleetStore, ($s) => $s.loading)
export const fleetError = derived(fleetStore, ($s) => $s.error)

export const activeVehicles = derived(fleetStore, ($s) =>
  $s.vehicles.filter((v) => v.active && v.status === "ACTIVE"),
)

export const activeCount = derived(
  fleetStore,
  ($s) => $s.vehicles.filter((v) => v.active && v.status === "ACTIVE").length,
)

export const nonCompliantVehicles = derived(fleetStore, ($s) =>
  $s.vehicles.filter((v) => v.status === "NON_COMPLIANT"),
)

export const maintenanceVehicles = derived(fleetStore, ($s) =>
  $s.vehicles.filter((v) => v.status === "MAINTENANCE"),
)

export const suspendedVehicles = derived(fleetStore, ($s) =>
  $s.vehicles.filter((v) => v.status === "SUSPENDED"),
)

/** Vehicles whose insurance expires within 30 days */
export const insuranceExpiringSoon = derived(fleetStore, ($s) => {
  const threshold = Date.now() + 30 * 24 * 60 * 60 * 1000
  return $s.vehicles.filter((v) => {
    if (!v.insuranceExpiry) return false
    return new Date(v.insuranceExpiry).getTime() < threshold
  })
})

/** Vehicles with any compliance flag failing */
export const complianceFailing = derived(fleetStore, ($s) =>
  $s.vehicles.filter((v) =>
    Object.values(v.complianceStatus).some((flag) => flag === false),
  ),
)

// ── Internal state ────────────────────────────────────────────────────────────

let _realtimeChannel: ReturnType<SupabaseClient["channel"]> | null = null
let _currentOrgId: string | null = null

// ── Tenant guard ──────────────────────────────────────────────────────────────

function assertTenant(vehicleOrgId: string): void {
  if (_currentOrgId && vehicleOrgId !== _currentOrgId) {
    console.error(
      `[fleet] Tenant violation: received org ${vehicleOrgId}, expected ${_currentOrgId}`,
    )
    throw new Error("Cross-tenant data rejected")
  }
}

// ── Row mapper ────────────────────────────────────────────────────────────────
// Handles both snake_case DB columns and legacy camelCase shapes

function mapVehicle(row: Record<string, unknown>): Vehicle {
  const meta = (row.metadata as Record<string, unknown> | null) ?? {}

  const rawCompliance = (row.compliance_status ??
    row.complianceStatus ??
    meta.compliance ??
    null) as Record<string, boolean> | null

  const complianceStatus: ComplianceStatus = {
    insuranceValid:
      rawCompliance?.insuranceValid ?? rawCompliance?.insurance_valid ?? false,
    inspectionValid:
      rawCompliance?.inspectionValid ??
      rawCompliance?.inspection_valid ??
      false,
    licenseValid:
      rawCompliance?.licenseValid ?? rawCompliance?.license_valid ?? false,
  }

  return {
    id: String(row.id ?? ""),
    regNumber: String(row.reg_number ?? row.regNumber ?? ""),
    ownerId: String(row.owner_id ?? row.ownerId ?? ""),
    organizationId: String(row.organization_id ?? row.organizationId ?? ""),
    route: String(row.route ?? ""),
    routeId: row.route_id ? String(row.route_id) : undefined,
    gpsLat: Number(row.gps_lat ?? row.gpsLat ?? 0),
    gpsLng: Number(row.gps_lng ?? row.gpsLng ?? 0),
    status: (row.status as VehicleStatus) ?? "ACTIVE",
    active: Boolean(row.active ?? true),
    capacity: Number(row.capacity ?? 0),
    insuranceExpiry:
      String(
        row.insurance_expiry ??
          row.insuranceExpiry ??
          meta.insurance_expiry ??
          "",
      ) || undefined,
    lastMaintenance:
      String(
        row.last_maintenance ??
          row.lastMaintenance ??
          meta.last_maintenance ??
          "",
      ) || undefined,
    complianceStatus,
    metadata: row.metadata as Record<string, unknown> | undefined,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initFleet(
  supabase: SupabaseClient,
  orgId: string,
): Promise<void> {
  _currentOrgId = orgId
  fleetStore.update((s) => ({ ...s, loading: true, error: null }))

  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("organization_id", orgId)
      .order("reg_number", { ascending: true })

    if (error) throw new Error(`Fleet fetch failed: ${error.message}`)

    fleetStore.set({
      vehicles: (data ?? []).map(mapVehicle),
      loading: false,
      error: null,
      lastUpdated: new Date().toISOString(),
    })

    await _teardown(supabase)

    _realtimeChannel = supabase
      .channel(`fleet-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehicles",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            fleetStore.update((state) => ({
              ...state,
              vehicles: state.vehicles.filter(
                (v) => v.id !== (payload.old as { id: string }).id,
              ),
              lastUpdated: new Date().toISOString(),
            }))
            return
          }

          const incoming = mapVehicle(payload.new as Record<string, unknown>)
          assertTenant(incoming.organizationId)

          fleetStore.update((state) => {
            const list = [...state.vehicles]
            const idx = list.findIndex((v) => v.id === incoming.id)
            if (idx >= 0) list[idx] = incoming
            else list.push(incoming)
            return {
              ...state,
              vehicles: list,
              lastUpdated: new Date().toISOString(),
            }
          })
        },
      )
      .subscribe()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown fleet error"
    console.error("[fleet]", message)
    fleetStore.update((s) => ({ ...s, loading: false, error: message }))
  }
}

// ── Teardown ──────────────────────────────────────────────────────────────────

async function _teardown(supabase: SupabaseClient): Promise<void> {
  if (_realtimeChannel) {
    await supabase.removeChannel(_realtimeChannel)
    _realtimeChannel = null
  }
}

export async function destroyFleet(supabase: SupabaseClient): Promise<void> {
  await _teardown(supabase)
  _currentOrgId = null
  fleetStore.set({
    vehicles: [],
    loading: false,
    error: null,
    lastUpdated: null,
  })
}

// ── Imperatives ───────────────────────────────────────────────────────────────

export function getVehicleById(id: string): Vehicle | undefined {
  return get(fleetStore).vehicles.find((v) => v.id === id)
}

export function getActiveVehicles(): Vehicle[] {
  return get(fleetStore).vehicles.filter(
    (v) => v.active && v.status === "ACTIVE",
  )
}

export function getVehiclesByRoute(routeId: string): Vehicle[] {
  return get(fleetStore).vehicles.filter(
    (v) => v.route === routeId || v.routeId === routeId,
  )
}

export function getVehiclesByStatus(status: VehicleStatus): Vehicle[] {
  return get(fleetStore).vehicles.filter((v) => v.status === status)
}
