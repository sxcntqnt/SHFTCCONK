import { writable, get } from 'svelte/store'
import { SupabaseClient, type AMREntry } from "@supabase/supabase-js"
import { authStore, enforceTenant } from '$lib/features/auth/stores/auth'

/* ============================================================
   ROUTE ANALYTICS MODEL (Strict)
============================================================ */

export interface RouteStats {
  routeName: string
  avgSpeed: number          // km/h
  activeVehicles: number
  congestionScore: number  // 0–100 normalized index
  organizationId: string
  updated_at?: string
}

/* ============================================================
   STORE
============================================================ */

export const analytics = writable<RouteStats[]>([])

/* ============================================================
   REALTIME STATE
============================================================ */

let analyticsChannel: ReturnType<typeof supabase.channel> | null = null

/* ============================================================
   INITIALIZATION
============================================================ */

export async function initAnalytics(): Promise<void> {
  const currentUser = get(user)

  if (!currentUser.organizationId) {
    throw new Error('Cannot initialize analytics: user has no tenant context')
  }

  const orgId = currentUser.organizationId

  /* ----------------------------
     Initial Tenant Fetch
  ---------------------------- */

  const { data, error } = await supabase
    .from('route_analytics')
    .select('*')
    .eq('organizationId', orgId)

  if (error) {
    throw new Error(`Analytics fetch failed: ${error.message}`)
  }

  analytics.set((data as RouteStats[]) ?? [])

  /* ----------------------------
     Realtime Subscription
  ---------------------------- */

  if (analyticsChannel) {
    await supabase.removeChannel(analyticsChannel)
    analyticsChannel = null
  }

  analyticsChannel = supabase
    .channel(`realtime-analytics-${orgId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'route_analytics',
        filter: `organizationId=eq.${orgId}`
      },
      (payload) => {

        if (payload.eventType === 'DELETE') {
          const deletedRoute = payload.old.routeName as string
          analytics.update(current =>
            current.filter(r => r.routeName !== deletedRoute)
          )
          return
        }

        const incoming = payload.new as RouteStats

        // Defensive tenant enforcement
        enforceTenant(incoming.organizationId)

        analytics.update(current => {
          const idx = current.findIndex(r => r.routeName === incoming.routeName)

          if (idx >= 0) {
            current[idx] = incoming
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

export async function destroyAnalytics(): Promise<void> {
  if (analyticsChannel) {
    await supabase.removeChannel(analyticsChannel)
    analyticsChannel = null
  }
  analytics.set([])
}

/* ============================================================
   ACCESS UTILITIES
============================================================ */

export function getRouteStats(routeName: string): RouteStats | undefined {
  return get(analytics).find(r => r.routeName === routeName)
}

export function getCongestedRoutes(threshold = 70): RouteStats[] {
  return get(analytics).filter(r => r.congestionScore >= threshold)
}

export function requireAnalyticsAccess(stats: RouteStats): void {
  enforceTenant(stats.organizationId)
}