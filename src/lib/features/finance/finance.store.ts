// lib/stores/finance.store.ts
import { writable, get } from 'svelte/store'
import { supabase } from '$lib/supabaseClient'
import { user, enforceTenant } from '../auth'

/* ============================================================
   LEDGER & RECONCILIATION MODELS
============================================================ */

export interface LedgerEntry {
  id: string
  vehicleId: string
  driverId?: string
  organizationId: string
  type: string // PAYMENT, FEE, PENALTY, etc.
  amount: number
  reference?: string
  created_at?: string
}

export type ReconciliationStatus = 'MATCHED' | 'SHORTFALL' | 'OVERAGE'

export interface ReconciliationEvent {
  id: string
  vehicleId: string
  organizationId: string
  totalCollected: number
  expectedAmount: number
  variance: number
  status: ReconciliationStatus
  created_at?: string
}

/* ============================================================
   DERIVED DAILY REVENUE
============================================================ */

export interface DailyRevenue {
  vehicle: string
  collected: number
  target: number
  variance: number
}

/* ============================================================
   STORES
============================================================ */

export const ledgerStore = writable<LedgerEntry[]>([])
export const reconciliationStore = writable<ReconciliationEvent[]>([])
export const dailyRevenueStore = writable<DailyRevenue[]>([])

/* ============================================================
   REALTIME CHANNELS
============================================================ */

let ledgerChannel: ReturnType<typeof supabase.channel> | null = null
let reconciliationChannel: ReturnType<typeof supabase.channel> | null = null

/* ============================================================
   INITIALIZATION
============================================================ */

export async function initFinance(): Promise<void> {
  const currentUser = get(user)
  if (!currentUser.organizationId) throw new Error('User has no tenant context')

  const orgId = currentUser.organizationId

  /* ----------------------------
     Initial Ledger Fetch
  ---------------------------- */
  const { data: ledgerData, error: ledgerError } = await supabase
    .from('ledger_entries')
    .select('*')
    .eq('organization_id', orgId)

  if (ledgerError) throw new Error(`Ledger fetch failed: ${ledgerError.message}`)
  ledgerStore.set((ledgerData as LedgerEntry[]) ?? [])

  /* ----------------------------
     Initial Reconciliation Fetch
  ---------------------------- */
  const { data: recData, error: recError } = await supabase
    .from('reconciliation_events')
    .select('*')
    .eq('organization_id', orgId)

  if (recError) throw new Error(`Reconciliation fetch failed: ${recError.message}`)
  reconciliationStore.set((recData as ReconciliationEvent[]) ?? [])

  /* ----------------------------
     Compute Daily Revenue
  ---------------------------- */
  computeDailyRevenue()

  /* ----------------------------
     Realtime Subscriptions
  ---------------------------- */
  // Ledger
  if (ledgerChannel) {
    await supabase.removeChannel(ledgerChannel)
    ledgerChannel = null
  }
  ledgerChannel = supabase
    .channel(`realtime-ledger-${orgId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ledger_entries', filter: `organization_id=eq.${orgId}` },
      (payload) => {
        const incoming = payload.new as LedgerEntry
        enforceTenant(incoming.organizationId)
        ledgerStore.update((current) => {
          const index = current.findIndex(e => e.id === incoming.id)
          if (payload.eventType === 'DELETE') return current.filter(e => e.id !== payload.old.id)
          if (index >= 0) {
            current[index] = incoming
            return [...current]
          }
          return [...current, incoming]
        })
        computeDailyRevenue()
      }
    )
    .subscribe()

  // Reconciliation
  if (reconciliationChannel) {
    await supabase.removeChannel(reconciliationChannel)
    reconciliationChannel = null
  }
  reconciliationChannel = supabase
    .channel(`realtime-reconciliation-${orgId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reconciliation_events', filter: `organization_id=eq.${orgId}` },
      (payload) => {
        const incoming = payload.new as ReconciliationEvent
        enforceTenant(incoming.organizationId)
        reconciliationStore.update((current) => {
          const index = current.findIndex(e => e.id === incoming.id)
          if (payload.eventType === 'DELETE') return current.filter(e => e.id !== payload.old.id)
          if (index >= 0) {
            current[index] = incoming
            return [...current]
          }
          return [...current, incoming]
        })
        computeDailyRevenue()
      }
    )
    .subscribe()
}

/* ============================================================
   TEARDOWN
============================================================ */

export async function destroyFinance(): Promise<void> {
  if (ledgerChannel) {
    await supabase.removeChannel(ledgerChannel)
    ledgerChannel = null
  }
  if (reconciliationChannel) {
    await supabase.removeChannel(reconciliationChannel)
    reconciliationChannel = null
  }
  ledgerStore.set([])
  reconciliationStore.set([])
  dailyRevenueStore.set([])
}

/* ============================================================
   DERIVED COMPUTATION
============================================================ */

function computeDailyRevenue(): void {
  const ledgers = get(ledgerStore)
  const recs = get(reconciliationStore)

  // Aggregate by vehicle
  const revenueMap: Record<string, DailyRevenue> = {}

  recs.forEach((r) => {
    revenueMap[r.vehicleId] = {
      vehicle: r.vehicleId,
      collected: r.totalCollected,
      target: r.expectedAmount,
      variance: r.variance,
    }
  })

  // Merge ledger sums for additional verification
  ledgers.forEach((l) => {
    if (!revenueMap[l.vehicleId]) {
      revenueMap[l.vehicleId] = {
        vehicle: l.vehicleId,
        collected: l.amount,
        target: 0,
        variance: l.amount,
      }
    } else {
      revenueMap[l.vehicleId].collected += l.amount
      revenueMap[l.vehicleId].variance = revenueMap[l.vehicleId].collected - revenueMap[l.vehicleId].target
    }
  })

  dailyRevenueStore.set(Object.values(revenueMap))
}

/* ============================================================
   UTILITIES
============================================================ */

export function getLedgerByVehicle(vehicleId: string): LedgerEntry[] {
  return get(ledgerStore).filter(l => l.vehicleId === vehicleId)
}

export function getReconciliationByVehicle(vehicleId: string): ReconciliationEvent[] {
  return get(reconciliationStore).filter(r => r.vehicleId === vehicleId)
}

export function requireFinanceAccess(orgId: string): void {
  enforceTenant(orgId)
}