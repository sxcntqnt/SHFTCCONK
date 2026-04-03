// src/lib/features/finance/finance.store.ts
//
// Finance store — ledger entries and reconciliation events.
//
// ARCHITECTURE:
//   - Supabase client is passed in (not a global) — works with SSR + SvelteKit
//   - Org scoping comes from orgCtx / orgChairCtx / operatorCtx (not authStore)
//   - Realtime channels are keyed by orgId to prevent cross-org leakage
//   - Tables used: reconciliation_events (exists in schema)
//                  reconciliation_events has: organization_id, vehicle_id,
//                  total_collected, expected_amount, variance, status, created_at
//
// NOTE: The schema has no `ledger_entries` table yet.
// Ledger entries are computed client-side from reconciliation_events +
// the LedgerEntry type from ledger.ts until a migration adds the table.
//
// USAGE:
//   // In org dashboard +page.ts or +layout.ts
//   import { initFinance, destroyFinance } from '$lib/features/finance/finance.store'
//
//   onMount(() => {
//     initFinance(supabase, orgId)
//     return () => destroyFinance(supabase)
//   })

import { writable, derived, get } from "svelte/store"
import type { SupabaseClient } from "@supabase/supabase-js"
import { get as getCtx } from "svelte/store"
import { orgCtx, orgChairCtx, operatorCtx } from "$lib/features/auth/contexts"
import type { LedgerEntry } from "./ledger.store"
import type { ReconciliationResult } from "./reconciliation.store"
import {
  reconcilePayments,
  summarizeReconciliation,
  type ReconciliationSummary,
  type MpesaTransaction,
} from "./reconciliation.store"
import { totalCollected, aggregateLedger } from "./ledger.store"

// ── DB row shape (reconciliation_events table) ────────────────────────────────

interface ReconciliationRow {
  id: string
  organization_id: string
  vehicle_id: string
  total_collected: number
  expected_amount: number
  variance: number
  status: "MATCHED" | "SHORTFALL" | "OVERAGE" | string
  created_at: string
}

// ── Store shapes ──────────────────────────────────────────────────────────────

export interface DailyRevenue {
  vehicleId: string
  collected: number // KES
  target: number // KES
  variance: number // KES (positive = overage)
  status: string
  mpesaAmount: number
  cashAmount: number
}

export interface FinanceState {
  reconciliationRows: ReconciliationRow[]
  dailyRevenue: DailyRevenue[]
  summary: ReconciliationSummary | null
  loading: boolean
  error: string | null
  lastUpdated: string | null
}

// ── Stores ────────────────────────────────────────────────────────────────────

export const financeStore = writable<FinanceState>({
  reconciliationRows: [],
  dailyRevenue: [],
  summary: null,
  loading: false,
  error: null,
  lastUpdated: null,
})

// Convenience derived stores for component consumption
export const reconciliationRows = derived(
  financeStore,
  ($s) => $s.reconciliationRows,
)
export const dailyRevenue = derived(financeStore, ($s) => $s.dailyRevenue)
export const financeSummary = derived(financeStore, ($s) => $s.summary)
export const financeLoading = derived(financeStore, ($s) => $s.loading)
export const financeError = derived(financeStore, ($s) => $s.error)

/** KES total collected today across all vehicles in the org */
export const orgTotalCollected = derived(financeStore, ($s) =>
  $s.dailyRevenue.reduce((sum, r) => sum + r.collected, 0),
)

/** Count of vehicles with shortfalls — for alert badge */
export const shortfallCount = derived(
  financeStore,
  ($s) => $s.summary?.shortfallCount ?? 0,
)

// ── Realtime channel handles ──────────────────────────────────────────────────

let realtimeChannel: ReturnType<SupabaseClient["channel"]> | null = null
let activeOrgId: string | null = null

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the org ID from whichever context is currently active.
 * Priority: orgChairCtx → orgCtx → operatorCtx (active org slot).
 */
function resolveOrgId(explicitOrgId?: string): string {
  if (explicitOrgId) return explicitOrgId

  const chair = getCtx(orgChairCtx)
  const staff = getCtx(orgCtx)
  const operator = getCtx(operatorCtx)

  const orgId = chair?.orgId ?? staff?.orgId ?? operator?.activeOrgId ?? null

  if (!orgId)
    throw new Error(
      "[finance] No org context active — call initFinance with an explicit orgId",
    )
  return orgId
}

function rowToDailyRevenue(row: ReconciliationRow): DailyRevenue {
  return {
    vehicleId: row.vehicle_id,
    collected: row.total_collected,
    target: row.expected_amount,
    variance: row.variance,
    status: row.status,
    // M-Pesa vs cash split not in reconciliation_events yet —
    // will be populated once a payment_transactions table is added.
    // For now, treat all collected as M-Pesa (most common in field).
    mpesaAmount: row.total_collected,
    cashAmount: 0,
  }
}

function buildSummaryFromRows(
  rows: ReconciliationRow[],
): ReconciliationSummary {
  return {
    totalExpected: rows.reduce((s, r) => s + r.expected_amount, 0),
    totalCollected: rows.reduce((s, r) => s + r.total_collected, 0),
    totalVariance: rows.reduce((s, r) => s + r.variance, 0),
    totalMpesa: rows.reduce((s, r) => s + r.total_collected, 0), // stub
    totalCash: 0,
    matchedCount: rows.filter((r) => r.status === "MATCHED").length,
    shortfallCount: rows.filter((r) => r.status === "SHORTFALL").length,
    overageCount: rows.filter((r) => r.status === "OVERAGE").length,
    totalShortfall: rows
      .filter((r) => r.status === "SHORTFALL")
      .reduce((s, r) => s + Math.abs(r.variance), 0),
    totalExcess: rows
      .filter((r) => r.status === "OVERAGE")
      .reduce((s, r) => s + r.variance, 0),
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Initialise the finance store for an org.
 * Fetches reconciliation data and sets up a realtime subscription.
 *
 * @param supabase  The Supabase client from event.locals or layout data
 * @param orgId     Optional — resolves from active context if omitted
 *
 * @example
 *   // In +page.svelte onMount
 *   import { initFinance, destroyFinance } from '$lib/features/finance/finance.store'
 *
 *   onMount(() => {
 *     initFinance(supabase, orgId)
 *     return () => destroyFinance(supabase)
 *   })
 */
export async function initFinance(
  supabase: SupabaseClient,
  explicitOrgId?: string,
): Promise<void> {
  const orgId = resolveOrgId(explicitOrgId)
  activeOrgId = orgId

  financeStore.update((s) => ({ ...s, loading: true, error: null }))

  try {
    // ── Fetch reconciliation events ──────────────────────────────────────────
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: rows, error } = await supabase
      .from("reconciliation_events")
      .select(
        "id, organization_id, vehicle_id, total_collected, expected_amount, variance, status, created_at",
      )
      .eq("organization_id", orgId)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false })

    if (error) throw new Error(`Reconciliation fetch failed: ${error.message}`)

    const reconciliationRows = (rows ?? []) as ReconciliationRow[]
    const dailyRevenue = reconciliationRows.map(rowToDailyRevenue)
    const summary = buildSummaryFromRows(reconciliationRows)

    financeStore.set({
      reconciliationRows,
      dailyRevenue,
      summary,
      loading: false,
      error: null,
      lastUpdated: new Date().toISOString(),
    })

    // ── Realtime subscription ────────────────────────────────────────────────
    await _teardownChannel(supabase)

    realtimeChannel = supabase
      .channel(`finance-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reconciliation_events",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          // Guard against cross-org leakage (belt + suspenders)
          const incoming = payload.new as ReconciliationRow
          if (incoming?.organization_id && incoming.organization_id !== orgId) {
            console.warn("[finance] Rejected cross-org realtime event")
            return
          }

          financeStore.update((state) => {
            let rows = [...state.reconciliationRows]

            if (payload.eventType === "DELETE") {
              rows = rows.filter(
                (r) => r.id !== (payload.old as ReconciliationRow).id,
              )
            } else if (payload.eventType === "INSERT") {
              rows = [incoming, ...rows]
            } else {
              // UPDATE
              const idx = rows.findIndex((r) => r.id === incoming.id)
              if (idx >= 0) rows[idx] = incoming
              else rows = [incoming, ...rows]
            }

            const dailyRevenue = rows.map(rowToDailyRevenue)
            const summary = buildSummaryFromRows(rows)

            return {
              ...state,
              reconciliationRows: rows,
              dailyRevenue,
              summary,
              lastUpdated: new Date().toISOString(),
            }
          })
        },
      )
      .subscribe()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown finance error"
    console.error("[finance]", message)
    financeStore.update((s) => ({ ...s, loading: false, error: message }))
  }
}

// ── Teardown ──────────────────────────────────────────────────────────────────

async function _teardownChannel(supabase: SupabaseClient): Promise<void> {
  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}

/**
 * Tear down realtime subscriptions and clear the store.
 * Call in onDestroy() of the layout that called initFinance().
 */
export async function destroyFinance(supabase: SupabaseClient): Promise<void> {
  await _teardownChannel(supabase)
  activeOrgId = null
  financeStore.set({
    reconciliationRows: [],
    dailyRevenue: [],
    summary: null,
    loading: false,
    error: null,
    lastUpdated: null,
  })
}

// ── Imperatives ───────────────────────────────────────────────────────────────

/** Filter daily revenue for a specific vehicle */
export function getVehicleRevenue(vehicleId: string): DailyRevenue | null {
  return (
    get(financeStore).dailyRevenue.find((r) => r.vehicleId === vehicleId) ??
    null
  )
}

/** Filter reconciliation rows for a specific vehicle */
export function getReconciliationByVehicle(
  vehicleId: string,
): ReconciliationRow[] {
  return get(financeStore).reconciliationRows.filter(
    (r) => r.vehicle_id === vehicleId,
  )
}

/**
 * Check that the caller is operating within the active org scope.
 * Use in event handlers before writing finance data.
 *
 * @throws if the orgId doesn't match the active context
 */
export function assertOrgScope(orgId: string): void {
  if (activeOrgId && activeOrgId !== orgId) {
    throw new Error(
      `[finance] Org scope violation: expected ${activeOrgId}, got ${orgId}`,
    )
  }
}
// Re-export as reconciliationStore so the finance page has one import source
export const reconciliationStore = reconciliationRows

// Re-export pure helpers from reconciliation.ts
export {
  reconcilePayments,
  summarizeReconciliation,
  getRevenueTrend,
  groupByStatus,
  type ReconciliationEvent,
  type ReconciliationResult,
  type ReconciliationSummary,
  type MpesaTransaction,
  type CashTransaction,
  type PaymentTransaction,
} from "./reconciliation.store"

export const dailyRevenueStore = dailyRevenue
export const ledgerStore = reconciliationRows
