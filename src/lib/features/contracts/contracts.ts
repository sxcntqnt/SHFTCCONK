import { writable, get } from 'svelte/store'
import { SupabaseClient, type AMREntry } from "@supabase/supabase-js"
import { authStore, enforceTenant } from '$lib/features/auth/stores/auth'

/* ============================================================
   ROUTE MODEL (Replace unsafe `any`)
============================================================ */

export interface RouteStop {
  lat: number
  lng: number
  name?: string
}

export interface RouteDefinition {
  id: string
  name: string
  polyline?: string
  stops: RouteStop[]
}

/* ============================================================
   CONTRACT MODEL (Strict + Tenant Aware)
============================================================ */

export interface Contract {
  id: string
  name: string
  route: RouteDefinition
  maxVehicles: number
  subsidyAmount: number
  assignedVehicles: string[]
  organizationId: string
  created_at?: string
  updated_at?: string
}

/* ============================================================
   STORE
============================================================ */

export const contracts = writable<Contract[]>([])

/* ============================================================
   REALTIME STATE
============================================================ */

let contractsChannel: ReturnType<typeof supabase.channel> | null = null

/* ============================================================
   INITIALIZATION
============================================================ */

export async function initContracts(): Promise<void> {
  const currentUser = get(user)

  if (!currentUser.organizationId) {
    throw new Error('Cannot initialize contracts: user has no tenant context')
  }

  const orgId = currentUser.organizationId

  /* ----------------------------
     Initial Tenant Fetch
  ---------------------------- */

  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('organizationId', orgId)

  if (error) {
    throw new Error(`Contracts fetch failed: ${error.message}`)
  }

  contracts.set((data as Contract[]) ?? [])

  /* ----------------------------
     Realtime Subscription
  ---------------------------- */

  if (contractsChannel) {
    await supabase.removeChannel(contractsChannel)
    contractsChannel = null
  }

  contractsChannel = supabase
    .channel(`realtime-contracts-${orgId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'contracts',
        filter: `organizationId=eq.${orgId}`
      },
      (payload) => {

        // Handle DELETE safely
        if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id as string
          contracts.update(current =>
            current.filter(c => c.id !== deletedId)
          )
          return
        }

        const incoming = payload.new as Contract

        // Defensive runtime tenant enforcement
        enforceTenant(incoming.organizationId)

        contracts.update(current => {
          const index = current.findIndex(c => c.id === incoming.id)

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
   TEARDOWN
============================================================ */

export async function destroyContracts(): Promise<void> {
  if (contractsChannel) {
    await supabase.removeChannel(contractsChannel)
    contractsChannel = null
  }
  contracts.set([])
}

/* ============================================================
   ACCESS UTILITIES
============================================================ */

export function getContractById(id: string): Contract | undefined {
  return get(contracts).find(c => c.id === id)
}

export function getContractsByVehicle(vehicleId: string): Contract[] {
  return get(contracts).filter(c =>
    c.assignedVehicles.includes(vehicleId)
  )
}

export function requireContractAccess(contract: Contract): void {
  enforceTenant(contract.organizationId)
}