// lib/stores/fleet.store.ts
import { writable, get } from 'svelte/store'
import { supabase } from '$lib/supabaseClient'
import { user, enforceTenant } from '../auth'

/* ============================================================
   VEHICLE MODEL (Unified + Strict)
============================================================ */

export interface ComplianceStatus {
  insuranceValid: boolean
  inspectionValid: boolean
  licenseValid: boolean
  [key: string]: boolean
}

export type VehicleStatus = 'ACTIVE' | 'NON_COMPLIANT' | 'MAINTENANCE' | 'SUSPENDED'

export interface Vehicle {
  id: string
  regNumber: string
  ownerId: string
  route: string // route identifier for operator-stage assignments
  gpsLat: number
  gpsLng: number
  status: VehicleStatus
  active: boolean
  insuranceExpiry?: string
  complianceStatus: ComplianceStatus
  organizationId: string
  created_at?: string
  updated_at?: string
}

/* ============================================================
   STORE
============================================================ */

export const fleetStore = writable<Vehicle[]>([])

/* ============================================================
   INTERNAL REALTIME STATE
============================================================ */

let fleetChannel: ReturnType<typeof supabase.channel> | null = null

/* ============================================================
   INITIALIZATION
============================================================ */

export async function initFleet(): Promise<void> {
  const currentUser = get(user)

  if (!currentUser.organizationId) {
    throw new Error('Cannot initialize fleet: user has no tenant context')
  }

  const orgId = currentUser.organizationId

  /* ----------------------------
     Initial Tenant-Scoped Fetch
  ---------------------------- */
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('organizationId', orgId)

  if (error) {
    throw new Error(`Fleet fetch failed: ${error.message}`)
  }

  fleetStore.set((data as Vehicle[]) ?? [])

  /* ----------------------------
     Realtime Subscription
  ---------------------------- */

  if (fleetChannel) {
    await supabase.removeChannel(fleetChannel)
    fleetChannel = null
  }

  fleetChannel = supabase
    .channel(`realtime-fleet-${orgId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'vehicles',
        filter: `organizationId=eq.${orgId}`
      },
      (payload) => {
        const incoming = payload.new as Vehicle

        // Hard tenant guard (defensive programming)
        enforceTenant(incoming.organizationId)

        fleetStore.update((current) => {
          const index = current.findIndex(v => v.id === incoming.id)

          if (payload.eventType === 'DELETE') {
            return current.filter(v => v.id !== payload.old.id)
          }

          if (index >= 0) {
            current[index] = incoming
            return [...current]
          }

          return [...current, incoming]
        })
      }
    )
    .subscribe()
}

/* ============================================================
   TEARDOWN (IMPORTANT FOR NAVIGATION)
============================================================ */

export async function destroyFleet(): Promise<void> {
  if (fleetChannel) {
    await supabase.removeChannel(fleetChannel)
    fleetChannel = null
  }
  fleetStore.set([])
}

/* ============================================================
   DERIVED UTILITIES
============================================================ */

export function getVehicleById(id: string): Vehicle | undefined {
  return get(fleetStore).find(v => v.id === id)
}

export function getActiveVehicles(): Vehicle[] {
  return get(fleetStore).filter(v => v.active && v.status === 'ACTIVE')
}

export function requireVehicleAccess(vehicle: Vehicle): void {
  enforceTenant(vehicle.organizationId)
}

export function getVehiclesByRoute(routeId: string): Vehicle[] {
  return get(fleetStore).filter(v => v.route === routeId)
}