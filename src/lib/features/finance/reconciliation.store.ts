// src/lib/features/finance/reconciliation.ts

import { writable, get } from "svelte/store"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getOrgContextOrgId,
  isOrgContextActive,
  getActiveOrgId,
  isOrgChairActive,
} from "$lib/features/auth/contexts"

// ── M-Pesa payment transaction ────────────────────────────────────────────────

export interface MpesaTransaction {
  reference: string
  amount: number
  phone: string
  timestamp: string
  vehicleId?: string
  bookingId?: string
}

// ── Cash transaction ──────────────────────────────────────────────────────────

export interface CashTransaction {
  reference: string
  amount: number
  timestamp: string
  vehicleId?: string
  loggedBy: string
}

export type PaymentTransaction = MpesaTransaction | CashTransaction

export function isMpesa(t: PaymentTransaction): t is MpesaTransaction {
  return "phone" in t
}

// ── Remittance target ─────────────────────────────────────────────────────────

export interface RemittanceRecord {
  vehicleId: string
  expectedAmount: number
  saccoPercentage: number
}

// ── Reconciliation result ─────────────────────────────────────────────────────

export type ReconciliationStatus = "MATCHED" | "SHORTFALL" | "OVERAGE"

export interface ReconciliationResult {
  vehicleId: string
  status: ReconciliationStatus
  expectedAmount: number
  collectedAmount: number
  variance: number
  mpesaAmount: number
  cashAmount: number
  transactionRefs: string[]
  mpesaPhones: string[]
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface ReconciliationSummary {
  totalExpected: number
  totalCollected: number
  totalVariance: number
  totalMpesa: number
  totalCash: number
  matchedCount: number
  shortfallCount: number
  overageCount: number
  totalShortfall: number
  totalExcess: number
}

// ── DB event shape (from reconciliation_events table) ────────────────────────

export interface ReconciliationEvent {
  id: string
  organization_id: string
  reference: string
  amount: number
  status: "PENDING" | "COMPLETED" | "FAILED"
  timestamp: string
  metadata?: Record<string, any>
}

// ── Stores ────────────────────────────────────────────────────────────────────

export const reconciliationStore = writable<ReconciliationEvent[]>([])
export const loadingReconciliation = writable(true)

// ── Internal state ────────────────────────────────────────────────────────────

let realtimeChannel: ReturnType<SupabaseClient["channel"]> | null = null

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveOrgId(): string {
  if (isOrgChairActive()) {
    const id = getActiveOrgId()
    if (id) return id
  }
  if (isOrgContextActive()) {
    const id = getOrgContextOrgId()
    if (id) return id
  }
  throw new Error(
    "No active org context — cannot initialise reconciliation store",
  )
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initReconciliation(
  supabase: SupabaseClient,
): Promise<void> {
  const orgId = resolveOrgId()

  loadingReconciliation.set(true)

  const { data, error } = await supabase
    .from<ReconciliationEvent>("reconciliation_events")
    .select("*")
    .eq("organization_id", orgId)
    .order("timestamp", { ascending: false })

  if (error)
    throw new Error(`Failed to fetch reconciliation events: ${error.message}`)

  reconciliationStore.set(data ?? [])
  loadingReconciliation.set(false)

  // Tear down any existing channel before subscribing
  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }

  realtimeChannel = supabase
    .channel(`realtime-reconciliation-${orgId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "reconciliation_events",
        filter: `organization_id=eq.${orgId}`,
      },
      (payload) => {
        const incoming = payload.new as ReconciliationEvent
        reconciliationStore.update((events) => [incoming, ...events])
      },
    )
    .subscribe()
}

// ── Teardown ──────────────────────────────────────────────────────────────────

export async function destroyReconciliation(
  supabase: SupabaseClient,
): Promise<void> {
  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
  reconciliationStore.set([])
  loadingReconciliation.set(false)
}

// ── Pure reconciliation logic ─────────────────────────────────────────────────

export function reconcilePayments(
  payments: PaymentTransaction[],
  remittances: RemittanceRecord[],
): ReconciliationResult[] {
  const MATCH_TOLERANCE = 1

  return remittances.map((remit) => {
    const vehiclePayments = payments.filter(
      (p) => p.vehicleId === remit.vehicleId,
    )
    const mpesaPayments = vehiclePayments.filter(isMpesa)
    const cashPayments = vehiclePayments.filter((p) => !isMpesa(p))

    const mpesaAmount = mpesaPayments.reduce((sum, p) => sum + p.amount, 0)
    const cashAmount = cashPayments.reduce((sum, p) => sum + p.amount, 0)
    const collectedAmount = mpesaAmount + cashAmount
    const variance = collectedAmount - remit.expectedAmount

    let status: ReconciliationStatus
    if (Math.abs(variance) <= MATCH_TOLERANCE) status = "MATCHED"
    else if (variance > 0) status = "OVERAGE"
    else status = "SHORTFALL"

    const mpesaPhones = [
      ...new Set(mpesaPayments.map((p) => (p as MpesaTransaction).phone)),
    ]

    return {
      vehicleId: remit.vehicleId,
      status,
      expectedAmount: remit.expectedAmount,
      collectedAmount,
      variance,
      mpesaAmount,
      cashAmount,
      transactionRefs: vehiclePayments.map((p) => p.reference),
      mpesaPhones,
    }
  })
}

export function summarizeReconciliation(
  results: ReconciliationResult[],
): ReconciliationSummary {
  return results.reduce(
    (acc, r) => {
      acc.totalExpected += r.expectedAmount
      acc.totalCollected += r.collectedAmount
      acc.totalVariance += r.variance
      acc.totalMpesa += r.mpesaAmount
      acc.totalCash += r.cashAmount

      if (r.status === "MATCHED") acc.matchedCount++
      if (r.status === "SHORTFALL") {
        acc.shortfallCount++
        acc.totalShortfall += Math.abs(r.variance)
      }
      if (r.status === "OVERAGE") {
        acc.overageCount++
        acc.totalExcess += r.variance
      }

      return acc
    },
    {
      totalExpected: 0,
      totalCollected: 0,
      totalVariance: 0,
      totalMpesa: 0,
      totalCash: 0,
      matchedCount: 0,
      shortfallCount: 0,
      overageCount: 0,
      totalShortfall: 0,
      totalExcess: 0,
    } as ReconciliationSummary,
  )
}

export function getRevenueTrend(results: ReconciliationResult[]): number[] {
  return results.map((r) => r.collectedAmount)
}

export function groupByStatus(
  results: ReconciliationResult[],
): Record<ReconciliationStatus, ReconciliationResult[]> {
  return {
    MATCHED: results.filter((r) => r.status === "MATCHED"),
    SHORTFALL: results.filter((r) => r.status === "SHORTFALL"),
    OVERAGE: results.filter((r) => r.status === "OVERAGE"),
  }
}
