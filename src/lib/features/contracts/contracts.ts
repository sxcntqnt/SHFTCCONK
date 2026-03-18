/**
 * src/lib/features/contracts/contracts.store.ts
 *
 * FIXES FROM PREVIOUS VERSION:
 *   - `supabase` bare global → accept as parameter
 *   - `get(user)` → caller passes orgId directly
 *   - `enforceTenant` → inline assertTenant()
 *   - snake_case DB column normalizer
 *   - File renamed from `contracts.ts` to `contracts.store.ts`
 *     (no `+` prefix — that's reserved for SvelteKit route files)
 */

import { writable, get }       from 'svelte/store'
import type { SupabaseClient } from '@supabase/supabase-js'

/* ============================================================
   TYPES
============================================================ */
export interface RouteStop {
  lat:    number
  lng:    number
  name?:  string
}

export interface RouteDefinition {
  id:        string
  name:      string
  polyline?: string
  stops:     RouteStop[]
}

export interface Contract {
  id:               string
  name:             string
  route:            RouteDefinition
  maxVehicles:      number
  subsidyAmount:    number
  assignedVehicles: string[]
  organizationId:   string
  created_at?:      string
  updated_at?:      string
}

/* ============================================================
   STORE
============================================================ */
export const contracts = writable<Contract[]>([])

/* ============================================================
   INTERNAL STATE
============================================================ */
let _contractsChannel: ReturnType<SupabaseClient['channel']> | null = null
let _currentOrgId: string | null = null

/* ============================================================
   NORMALIZER
============================================================ */
function mapContract(row: Record<string, unknown>): Contract {
  return {
    id:               row.id              as string,
    name:             row.name            as string,
    route:            (row.route ?? { id: '', name: '', stops: [] }) as RouteDefinition,
    maxVehicles:      (row.max_vehicles   ?? row.maxVehicles   ?? 0) as number,
    subsidyAmount:    (row.subsidy_amount ?? row.subsidyAmount ?? 0) as number,
    assignedVehicles: (row.assigned_vehicles ?? row.assignedVehicles ?? []) as string[],
    organizationId:   (row.organization_id  ?? row.organizationId) as string,
    created_at:       row.created_at as string | undefined,
    updated_at:       row.updated_at as string | undefined,
  }
}

function assertTenant(contractOrgId: string): void {
  if (_currentOrgId && contractOrgId !== _currentOrgId) {
    throw new Error('Cross-tenant contract data rejected')
  }
}

/* ============================================================
   INITIALIZATION
============================================================ */
export async function initContracts(
  supabase: SupabaseClient,
  orgId: string,
): Promise<void> {
  _currentOrgId = orgId

  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('organization_id', orgId)

  if (error) throw new Error(`Contracts fetch failed: ${error.message}`)

  contracts.set((data ?? []).map(mapContract))

  if (_contractsChannel) {
    await supabase.removeChannel(_contractsChannel)
    _contractsChannel = null
  }

  _contractsChannel = supabase
    .channel(`contracts-${orgId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contracts', filter: `organization_id=eq.${orgId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          contracts.update((c) => c.filter((x) => x.id !== (payload.old as any).id))
          return
        }
        const incoming = mapContract(payload.new as Record<string, unknown>)
        assertTenant(incoming.organizationId)
        contracts.update((current) => {
          const idx = current.findIndex((c) => c.id === incoming.id)
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
export async function destroyContracts(supabase: SupabaseClient): Promise<void> {
  if (_contractsChannel) {
    await supabase.removeChannel(_contractsChannel)
    _contractsChannel = null
  }
  _currentOrgId = null
  contracts.set([])
}

/* ============================================================
   ACTIONS — called by contracts.svelte
============================================================ */
export async function assignVehicleToContract(
  supabase: SupabaseClient,
  contract: Contract,
  vehicleId: string,
): Promise<void> {
  if (contract.assignedVehicles.includes(vehicleId)) return
  if (contract.assignedVehicles.length >= contract.maxVehicles) return

  const updated = [...contract.assignedVehicles, vehicleId]

  // Optimistic update
  contracts.update((cs) =>
    cs.map((c) => c.id === contract.id ? { ...c, assignedVehicles: updated } : c),
  )

  const { error } = await supabase
    .from('contracts')
    .update({ assigned_vehicles: updated })
    .eq('id', contract.id)

  if (error) {
    // Rollback
    contracts.update((cs) =>
      cs.map((c) => c.id === contract.id
        ? { ...c, assignedVehicles: c.assignedVehicles.filter((id) => id !== vehicleId) }
        : c,
      ),
    )
    console.error('[contracts] assignVehicle error:', error)
  }
}

/* ============================================================
   UTILITIES
============================================================ */
export function getContractById(id: string): Contract | undefined {
  return get(contracts).find((c) => c.id === id)
}

export function getContractsByVehicle(vehicleId: string): Contract[] {
  return get(contracts).filter((c) => c.assignedVehicles.includes(vehicleId))
}