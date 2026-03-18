/**
 * src/lib/features/analytics/analytics.store.ts
 *
 * FIXES FROM PREVIOUS VERSION:
 *   - `supabase` bare global → accept as parameter
 *   - `get(user)` → caller passes orgId directly
 *   - `enforceTenant` → inline assertTenant()
 *   - Export name: was `analytics`, dashboard imported `analyticsStore`
 *     → now exports both names
 *   - File renamed: `+analytics.ts` → `analytics.store.ts`
 *     (the `+` prefix is reserved for SvelteKit route files only)
 *   - Dashboard import path updated accordingly
 */

import { writable, get }       from 'svelte/store'
import type { SupabaseClient } from '@supabase/supabase-js'

/* ============================================================
   TYPES
============================================================ */
export interface RouteStats {
  routeName:       string
  avgSpeed:        number   // km/h
  activeVehicles:  number
  congestionScore: number   // 0–100
  organizationId:  string
  updated_at?:     string
}

/* ============================================================
   STORE
============================================================ */
export const analyticsStore = writable<RouteStats[]>([])
/** Alias for backward compat */
export const analytics = analyticsStore

/* ============================================================
   INTERNAL STATE
============================================================ */
let _analyticsChannel: ReturnType<SupabaseClient['channel']> | null = null
let _currentOrgId: string | null = null

/* ============================================================
   NORMALIZER
============================================================ */
function mapStats(row: Record<string, unknown>): RouteStats {
  return {
    routeName:       (row.route_name      ?? row.routeName)      as string,
    avgSpeed:        (row.avg_speed       ?? row.avgSpeed       ?? 0) as number,
    activeVehicles:  (row.active_vehicles ?? row.activeVehicles ?? 0) as number,
    congestionScore: (row.congestion_score?? row.congestionScore?? 0) as number,
    organizationId:  (row.organization_id ?? row.organizationId) as string,
    updated_at:       row.updated_at as string | undefined,
  }
}

function assertTenant(orgId: string): void {
  if (_currentOrgId && orgId !== _currentOrgId) {
    throw new Error('Cross-tenant analytics data rejected')
  }
}

/* ============================================================
   INITIALIZATION
============================================================ */
export async function initAnalytics(
  supabase: SupabaseClient,
  orgId: string,
): Promise<void> {
  _currentOrgId = orgId

  const { data, error } = await supabase
    .from('route_analytics')
    .select('*')
    .eq('organization_id', orgId)

  if (error) throw new Error(`Analytics fetch failed: ${error.message}`)

  analyticsStore.set((data ?? []).map(mapStats))

  if (_analyticsChannel) {
    await supabase.removeChannel(_analyticsChannel)
    _analyticsChannel = null
  }

  _analyticsChannel = supabase
    .channel(`analytics-${orgId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'route_analytics', filter: `organization_id=eq.${orgId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const name = (payload.old as any).route_name as string
          analyticsStore.update((r) => r.filter((x) => x.routeName !== name))
          return
        }
        const incoming = mapStats(payload.new as Record<string, unknown>)
        assertTenant(incoming.organizationId)
        analyticsStore.update((current) => {
          const idx = current.findIndex((r) => r.routeName === incoming.routeName)
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
export async function destroyAnalytics(supabase: SupabaseClient): Promise<void> {
  if (_analyticsChannel) {
    await supabase.removeChannel(_analyticsChannel)
    _analyticsChannel = null
  }
  _currentOrgId = null
  analyticsStore.set([])
}

/* ============================================================
   UTILITIES
============================================================ */
export function getRouteStats(routeName: string): RouteStats | undefined {
  return get(analyticsStore).find((r) => r.routeName === routeName)
}

export function getCongestedRoutes(threshold = 70): RouteStats[] {
  return get(analyticsStore).filter((r) => r.congestionScore >= threshold)
}