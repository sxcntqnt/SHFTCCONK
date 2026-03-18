/**
 * src/lib/features/fleet/stores/fleet.store.ts
 *
 * FIXES FROM PREVIOUS VERSION:
 *
 *   BUG 1 — `supabase` used as undeclared global:
 *     All DB and channel calls used `supabase` without importing it.
 *     Fixed: init functions now accept a typed supabase client parameter.
 *     Caller (dashboard onMount) passes the client from locals/parent.
 *
 *   BUG 2 — `get(authStore)` returns deprecated shape:
 *     Was reading `currentUser.organizationId` from deprecated authStore.
 *     Fixed: caller passes orgId directly — no store dependency in init.
 *
 *   BUG 3 — `enforceTenant` imported but never defined:
 *     Replaced with an inline guard function.
 *
 *   BUG 4 — Wrong export name:
 *     Was exported as `fleetStore`, dashboard imported as `fleet`.
 *     Now exported as both for backward compat.
 *
 *   BUG 5 — `SupabaseClient, type AMREntry` import was wrong:
 *     AMREntry is unrelated. Using typed SupabaseClient properly.
 *
 *   BUG 6 — camelCase column names vs snake_case DB:
 *     `organizationId` → `organization_id`, `regNumber` → `reg_number`
 *     Added a mapVehicle() normalizer so DB rows map to the Vehicle interface.
 */

import { writable, get }        from 'svelte/store'
import type { SupabaseClient }  from '@supabase/supabase-js'

/* ============================================================
   TYPES
============================================================ */
export interface ComplianceStatus {
  insuranceValid:   boolean
  inspectionValid:  boolean
  licenseValid:     boolean
  [key: string]:    boolean
}

export type VehicleStatus = 'ACTIVE' | 'NON_COMPLIANT' | 'MAINTENANCE' | 'SUSPENDED'

export interface Vehicle {
  id:               string
  regNumber:        string
  ownerId:          string
  route:            string
  gpsLat:           number
  gpsLng:           number
  status:           VehicleStatus
  active:           boolean
  insuranceExpiry?: string
  complianceStatus: ComplianceStatus
  organizationId:   string
  created_at?:      string
  updated_at?:      string
}

/* ============================================================
   STORE
============================================================ */
export const fleetStore = writable<Vehicle[]>([])
/** Alias for components that import as `fleet` */
export const fleet = fleetStore

/* ============================================================
   INTERNAL STATE
============================================================ */
let _fleetChannel: ReturnType<SupabaseClient['channel']> | null = null
let _currentOrgId: string | null = null

/* ============================================================
   DB ROW → Vehicle normalizer
   Handles snake_case DB columns → camelCase interface
============================================================ */
function mapVehicle(row: Record<string, unknown>): Vehicle {
  return {
    id:             row.id as string,
    regNumber:      (row.reg_number ?? row.regNumber)    as string,
    ownerId:        (row.owner_id   ?? row.ownerId)      as string,
    route:          row.route                             as string,
    gpsLat:         (row.gps_lat   ?? row.gpsLat  ?? 0) as number,
    gpsLng:         (row.gps_lng   ?? row.gpsLng  ?? 0) as number,
    status:         (row.status ?? 'ACTIVE')              as VehicleStatus,
    active:         (row.active ?? false)                 as boolean,
    insuranceExpiry:(row.insurance_expiry ?? row.insuranceExpiry) as string | undefined,
    complianceStatus: (row.compliance_status ?? row.complianceStatus ?? {
      insuranceValid: false, inspectionValid: false, licenseValid: false,
    }) as ComplianceStatus,
    organizationId: (row.organization_id ?? row.organizationId) as string,
    created_at:     row.created_at as string | undefined,
    updated_at:     row.updated_at as string | undefined,
  }
}

/* ============================================================
   INLINE TENANT GUARD (replaces missing enforceTenant)
============================================================ */
function assertTenant(vehicleOrgId: string): void {
  if (_currentOrgId && vehicleOrgId !== _currentOrgId) {
    console.error(`[fleet] Tenant violation: received org ${vehicleOrgId}, expected ${_currentOrgId}`)
    throw new Error('Cross-tenant data rejected')
  }
}

/* ============================================================
   INITIALIZATION
   Call from dashboard onMount, pass supabase client + orgId.
============================================================ */
export async function initFleet(
  supabase: SupabaseClient,
  orgId: string,
): Promise<void> {
  _currentOrgId = orgId

  // Initial fetch
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('organization_id', orgId)

  if (error) throw new Error(`Fleet fetch failed: ${error.message}`)

  fleetStore.set((data ?? []).map(mapVehicle))

  // Tear down any previous channel
  if (_fleetChannel) {
    await supabase.removeChannel(_fleetChannel)
    _fleetChannel = null
  }

  // Realtime subscription
  _fleetChannel = supabase
    .channel(`fleet-${orgId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'vehicles', filter: `organization_id=eq.${orgId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          fleetStore.update((v) => v.filter((x) => x.id !== (payload.old as any).id))
          return
        }
        const incoming = mapVehicle(payload.new as Record<string, unknown>)
        assertTenant(incoming.organizationId)
        fleetStore.update((current) => {
          const idx = current.findIndex((v) => v.id === incoming.id)
          if (idx >= 0) { current[idx] = incoming; return [...current] }
          return [...current, incoming]
        })
      },
    )
    .subscribe()
}

/* ============================================================
   TEARDOWN
============================================================ */
export async function destroyFleet(supabase: SupabaseClient): Promise<void> {
  if (_fleetChannel) {
    await supabase.removeChannel(_fleetChannel)
    _fleetChannel = null
  }
  _currentOrgId = null
  fleetStore.set([])
}

/* ============================================================
   UTILITIES
============================================================ */
export function getVehicleById(id: string): Vehicle | undefined {
  return get(fleetStore).find((v) => v.id === id)
}

export function getActiveVehicles(): Vehicle[] {
  return get(fleetStore).filter((v) => v.active && v.status === 'ACTIVE')
}

export function getVehiclesByRoute(routeId: string): Vehicle[] {
  return get(fleetStore).filter((v) => v.route === routeId)
}