// lib/stores/compliance.store.ts
import { writable, get } from 'svelte/store'
import { SupabaseClient } from "@supabase/supabase-js"
import { authStore, enforceTenant } from '$lib/features/auth/stores/auth'

/* ============================================================
   COMPLIANCE MODELS
============================================================ */

export interface ComplianceEvent {
  id: string
  organizationId: string
  vehicleId: string
  driverId?: string
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  message: string
  metadata?: Record<string, any>
  timestamp: string
  resolved: boolean
}

export interface ComplianceAlert {
  vehicleId: string
  type: string
  expiryDate: string
  status: 'OK' | 'WARNING' | 'EXPIRED'
}

/* ============================================================
   STORES
============================================================ */

export const complianceEventStore = writable<ComplianceEvent[]>([])
export const complianceAlertStore = writable<ComplianceAlert[]>([])

/* ============================================================
   INTERNAL STATE
============================================================ */

let eventChannel: ReturnType<typeof SupabaseClient.channel> | null = null

/* ============================================================
   INITIALIZATION
============================================================ */

export async function initCompliance(): Promise<void> {
  const currentUser = get(authStore)
  if (!currentUser.organizationId) throw new Error('User has no tenant context')
  const orgId = currentUser.organizationId

  /* ----------------------------
     Fetch unresolved events
  ---------------------------- */
  const { data: events, error: eventsError } = await supabase
    .from<ComplianceEvent>('compliance_events')
    .select('*')
    .eq('organizationId', orgId)
    .eq('resolved', false)

  if (eventsError) throw new Error(`Failed to fetch compliance events: ${eventsError.message}`)
  complianceEventStore.set(events ?? [])

  /* ----------------------------
     Fetch current alerts
  ---------------------------- */
  const { data: alerts, error: alertsError } = await supabase
    .from<ComplianceAlert>('compliance_alerts')
    .select('*')
    .eq('organizationId', orgId)

  if (alertsError) throw new Error(`Failed to fetch compliance alerts: ${alertsError.message}`)
  complianceAlertStore.set(alerts ?? [])

  /* ----------------------------
     Realtime subscription for events
  ---------------------------- */
  if (eventChannel) {
    await supabase.removeChannel(eventChannel)
    eventChannel = null
  }

  eventChannel = supabase
    .channel(`realtime-compliance-${orgId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'compliance_events',
      filter: `organizationId=eq.${orgId}`
    }, payload => {
      const incoming = payload.new as ComplianceEvent
      enforceTenant(incoming.organizationId)

      complianceEventStore.update(current => {
        if (payload.eventType === 'DELETE') {
          return current.filter(e => e.id !== payload.old.id)
        }
        const index = current.findIndex(e => e.id === incoming.id)
        if (index >= 0) current[index] = incoming
        else current.unshift(incoming)
        return [...current]
      })
    })
    .subscribe()
}

/* ============================================================
   TEARDOWN
============================================================ */

export async function destroyCompliance(): Promise<void> {
  if (eventChannel) {
    await supabase.removeChannel(eventChannel)
    eventChannel = null
  }
  complianceEventStore.set([])
  complianceAlertStore.set([])
}

/* ============================================================
   UTILITIES
============================================================ */

export function getUnresolvedEvents(): ComplianceEvent[] {
  return get(complianceEventStore).filter(e => !e.resolved)
}

export function getVehicleAlerts(vehicleId: string): ComplianceAlert[] {
  return get(complianceAlertStore).filter(a => a.vehicleId === vehicleId)
}

export function requireComplianceAccess(orgId: string): void {
  enforceTenant(orgId)
}