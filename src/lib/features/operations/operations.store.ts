// src/lib/features/operations/operations.store.ts
//
// Operations state — real-time situational awareness for OPERATIONS_MANAGER,
// DISPATCHER, and ROUTE_SUPERVISOR roles.
//
// WHAT THIS STORE OWNS:
//   - Active trips (vehicles currently on a route)
//   - Driver/conductor shift states
//   - Route health (on-time, delayed, idle, no coverage)
//   - Incident queue (open, unresolved)
//   - Dispatch queue (pending assignments)
//
// WHAT IT DOES NOT OWN:
//   - GPS positions          → features/vehicles/gps.store.ts
//   - Fleet vehicle status   → features/fleet/fleet.store.ts
//   - Finance/reconciliation → features/finance/finance.store.ts
//   - Compliance detail      → features/compliance/stores/
//
// USAGE:
//   import { initOperations, destroyOperations } from '$lib/features/operations/operations.store'
//
//   onMount(() => {
//     initOperations(supabase, orgId)
//     return () => destroyOperations(supabase)
//   })

import { writable, derived, get } from 'svelte/store'
import type { SupabaseClient }    from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────

export type TripStatus =
  | 'SCHEDULED'    // assigned, not started
  | 'BOARDING'     // accepting passengers at stage
  | 'IN_PROGRESS'  // vehicle on route
  | 'DELAYED'      // behind schedule
  | 'COMPLETED'    // arrived at destination
  | 'CANCELLED'    // trip did not run

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type IncidentStatus   = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED'
export type ShiftState       = 'on_duty' | 'off_duty' | 'on_break'
export type RouteHealth      = 'ON_TIME' | 'DELAYED' | 'IDLE' | 'NO_COVERAGE'

// ── Trip ──────────────────────────────────────────────────────────────────────

export interface ActiveTrip {
  id:                  string
  vehicleId:           string
  vehiclePlate:        string
  driverActorId:       string
  driverName:          string
  conductorActorId?:   string
  conductorName?:      string
  routeId:             string
  routeName:           string
  organizationId:      string
  status:              TripStatus
  departedAt?:         string
  expectedArrival?:    string
  passengerCount:      number
  capacity:            number
  metadata?:           Record<string, unknown>
  createdAt:           string
  updatedAt:           string
}

// ── Incident ──────────────────────────────────────────────────────────────────

export interface Incident {
  id:             string
  vehicleId:      string
  vehiclePlate?:  string
  reportedBy:     string
  reporterName?:  string
  organizationId: string
  severity:       IncidentSeverity
  status:         IncidentStatus
  type:           string   // 'BREAKDOWN' | 'ACCIDENT' | 'PASSENGER_DISPUTE' etc.
  description:    string
  gpsLat?:        number
  gpsLng?:        number
  metadata?:      Record<string, unknown>
  createdAt:      string
  updatedAt:      string
}

// ── Driver shift ──────────────────────────────────────────────────────────────

export interface DriverShift {
  actorId:        string
  driverName:     string
  vehicleId:      string
  vehiclePlate:   string
  organizationId: string
  shiftState:     ShiftState
  activeTripId?:  string
  startedAt?:     string
  updatedAt:      string
}

// ── Route summary ─────────────────────────────────────────────────────────────

export interface RouteSummary {
  routeId:        string
  routeName:      string
  organizationId: string
  health:         RouteHealth
  activeTrips:    number
  scheduledTrips: number
  vehicleCount:   number
  lastActivity?:  string
}

// ── Dispatch queue ────────────────────────────────────────────────────────────

export interface DispatchItem {
  id:                   string
  vehicleId:            string
  vehiclePlate:         string
  routeId:              string
  routeName:            string
  organizationId:       string
  scheduledAt:          string
  assignedDriverId?:    string
  assignedConductorId?: string
  status:               'PENDING' | 'ASSIGNED' | 'DEPARTED'
  createdAt:            string
}

// ── Store state ───────────────────────────────────────────────────────────────

export interface OperationsState {
  activeTrips:    ActiveTrip[]
  incidents:      Incident[]
  driverShifts:   DriverShift[]
  routeSummaries: RouteSummary[]
  dispatchQueue:  DispatchItem[]
  loading:        boolean
  error:          string | null
  lastUpdated:    string | null
}

export const operationsStore = writable<OperationsState>({
  activeTrips:    [],
  incidents:      [],
  driverShifts:   [],
  routeSummaries: [],
  dispatchQueue:  [],
  loading:        false,
  error:          null,
  lastUpdated:    null,
})

// ── Derived stores ────────────────────────────────────────────────────────────

export const activeTrips    = derived(operationsStore, ($s) => $s.activeTrips)
export const incidents      = derived(operationsStore, ($s) => $s.incidents)
export const driverShifts   = derived(operationsStore, ($s) => $s.driverShifts)
export const routeSummaries = derived(operationsStore, ($s) => $s.routeSummaries)
export const dispatchQueue  = derived(operationsStore, ($s) => $s.dispatchQueue)
export const opsLoading     = derived(operationsStore, ($s) => $s.loading)
export const opsError       = derived(operationsStore, ($s) => $s.error)

export const tripsInProgress = derived(
  operationsStore,
  ($s) => $s.activeTrips.filter((t) => t.status === 'IN_PROGRESS'),
)

export const delayedTrips = derived(
  operationsStore,
  ($s) => $s.activeTrips.filter((t) => t.status === 'DELAYED'),
)

export const boardingTrips = derived(
  operationsStore,
  ($s) => $s.activeTrips.filter((t) => t.status === 'BOARDING'),
)

export const openIncidents = derived(
  operationsStore,
  ($s) => $s.incidents.filter((i) => i.status === 'OPEN'),
)

/** Critical or escalated — drives the alert badge count */
export const urgentIncidents = derived(
  operationsStore,
  ($s) => $s.incidents.filter(
    (i) =>
      (i.severity === 'CRITICAL' || i.status === 'ESCALATED') &&
      i.status !== 'RESOLVED',
  ),
)

export const driversOnDuty = derived(
  operationsStore,
  ($s) => $s.driverShifts.filter((d) => d.shiftState === 'on_duty'),
)

export const driversOnBreak = derived(
  operationsStore,
  ($s) => $s.driverShifts.filter((d) => d.shiftState === 'on_break'),
)

/** Vehicles on an active trip with no driver currently on duty */
export const unmannedVehicles = derived(operationsStore, ($s) => {
  const mannedIds = new Set(
    $s.driverShifts.filter((d) => d.shiftState === 'on_duty').map((d) => d.vehicleId),
  )
  return $s.activeTrips
    .filter((t) => t.status === 'IN_PROGRESS' && !mannedIds.has(t.vehicleId))
    .map((t) => t.vehicleId)
})

export const routesWithNoCoverage = derived(
  operationsStore,
  ($s) => $s.routeSummaries.filter((r) => r.health === 'NO_COVERAGE'),
)

export const passengersInTransit = derived(
  operationsStore,
  ($s) =>
    $s.activeTrips
      .filter((t) => t.status === 'IN_PROGRESS')
      .reduce((sum, t) => sum + t.passengerCount, 0),
)

export const pendingDispatches = derived(
  operationsStore,
  ($s) => $s.dispatchQueue.filter((d) => d.status === 'PENDING'),
)

/** Single KPI object for the ops dashboard header — avoids 10 separate subscriptions */
export const opsSummary = derived(operationsStore, ($s) => ({
  tripsActive:       $s.activeTrips.filter((t) => t.status === 'IN_PROGRESS').length,
  tripsDelayed:      $s.activeTrips.filter((t) => t.status === 'DELAYED').length,
  tripsBoarding:     $s.activeTrips.filter((t) => t.status === 'BOARDING').length,
  incidentsOpen:     $s.incidents.filter((i) => i.status === 'OPEN').length,
  incidentsCritical: $s.incidents.filter((i) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length,
  driversOnDuty:     $s.driverShifts.filter((d) => d.shiftState === 'on_duty').length,
  driversOnBreak:    $s.driverShifts.filter((d) => d.shiftState === 'on_break').length,
  pendingDispatches: $s.dispatchQueue.filter((d) => d.status === 'PENDING').length,
  routesHealthy:     $s.routeSummaries.filter((r) => r.health === 'ON_TIME').length,
  routesDelayed:     $s.routeSummaries.filter((r) => r.health === 'DELAYED').length,
  passengersInTransit: $s.activeTrips
    .filter((t) => t.status === 'IN_PROGRESS')
    .reduce((sum, t) => sum + t.passengerCount, 0),
}))

// ── Internal state ────────────────────────────────────────────────────────────

const _channels: ReturnType<SupabaseClient['channel']>[] = []
let _currentOrgId: string | null = null

// ── Tenant guard ──────────────────────────────────────────────────────────────

function assertTenant(orgId: string, table: string): void {
  if (_currentOrgId && orgId !== _currentOrgId) {
    console.error(`[ops:${table}] Tenant violation: got ${orgId}, expected ${_currentOrgId}`)
    throw new Error('Cross-tenant data rejected')
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initOperations(
  supabase: SupabaseClient,
  orgId:    string,
): Promise<void> {
  _currentOrgId = orgId
  operationsStore.update((s) => ({ ...s, loading: true, error: null }))

  try {
    await _teardown(supabase)

    const [
      { data: tripsData,    error: tripsErr    },
      { data: incData,      error: incErr      },
      { data: shiftsData,   error: shiftsErr   },
      { data: dispatchData, error: dispatchErr },
    ] = await Promise.all([
      supabase
        .from('trips')
        .select(`
          id, vehicle_id, driver_actor_id, conductor_actor_id,
          route_id, organization_id, status,
          departed_at, expected_arrival, passenger_count, capacity,
          metadata, created_at, updated_at,
          vehicles ( reg_number ),
          routes   ( name )
        `)
        .eq('organization_id', orgId)
        .in('status', ['SCHEDULED', 'BOARDING', 'IN_PROGRESS', 'DELAYED'])
        .order('created_at', { ascending: false }),

      supabase
        .from('compliance_events')
        .select(`
          id, vehicle_id, reported_by, organization_id,
          severity, status, type, description,
          metadata, created_at, updated_at,
          vehicles ( reg_number )
        `)
        .eq('organization_id', orgId)
        .neq('status', 'RESOLVED')
        .order('created_at', { ascending: false })
        .limit(100),

      supabase
        .from('driver_assignments')
        .select(`
          actor_id, vehicle_id, organization_id,
          active_trip_id, started_at, updated_at,
          vehicles ( reg_number ),
          actors   ( metadata )
        `)
        .eq('organization_id', orgId),

      supabase
        .from('dispatch_queue')
        .select(`
          id, vehicle_id, route_id, organization_id,
          scheduled_at, assigned_driver_id, assigned_conductor_id,
          status, created_at,
          vehicles ( reg_number ),
          routes   ( name )
        `)
        .eq('organization_id', orgId)
        .in('status', ['PENDING', 'ASSIGNED'])
        .order('scheduled_at', { ascending: true }),
    ])

    if (tripsErr)    throw new Error(`Trips: ${tripsErr.message}`)
    if (incErr)      throw new Error(`Incidents: ${incErr.message}`)
    if (shiftsErr)   throw new Error(`Shifts: ${shiftsErr.message}`)
    if (dispatchErr) throw new Error(`Dispatch: ${dispatchErr.message}`)

    const mappedTrips = (tripsData    ?? []).map(mapTrip)

    operationsStore.set({
      activeTrips:    mappedTrips,
      incidents:      (incData      ?? []).map(mapIncident),
      driverShifts:   (shiftsData   ?? []).map(mapShift),
      routeSummaries: computeRouteSummaries(mappedTrips, orgId),
      dispatchQueue:  (dispatchData ?? []).map(mapDispatch),
      loading:        false,
      error:          null,
      lastUpdated:    new Date().toISOString(),
    })

    _subTrips(supabase, orgId)
    _subIncidents(supabase, orgId)
    _subShifts(supabase, orgId)
    _subDispatch(supabase, orgId)

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown operations error'
    console.error('[ops]', msg)
    operationsStore.update((s) => ({ ...s, loading: false, error: msg }))
  }
}

// ── Realtime subscriptions ────────────────────────────────────────────────────

function _subTrips(supabase: SupabaseClient, orgId: string): void {
  const ch = supabase
    .channel(`ops-trips-${orgId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'trips',
      filter: `organization_id=eq.${orgId}`,
    }, (payload) => {
      operationsStore.update((s) => {
        let list = [...s.activeTrips]

        if (payload.eventType === 'DELETE') {
          list = list.filter((t) => t.id !== (payload.old as { id: string }).id)
        } else {
          const incoming = mapTrip(payload.new as Record<string, unknown>)
          assertTenant(incoming.organizationId, 'trips')
          if (incoming.status === 'COMPLETED' || incoming.status === 'CANCELLED') {
            list = list.filter((t) => t.id !== incoming.id)
          } else {
            const idx = list.findIndex((t) => t.id === incoming.id)
            if (idx >= 0) list[idx] = incoming
            else list.push(incoming)
          }
        }

        return {
          ...s,
          activeTrips:    list,
          routeSummaries: computeRouteSummaries(list, orgId),
          lastUpdated:    new Date().toISOString(),
        }
      })
    })
    .subscribe()
  _channels.push(ch)
}

function _subIncidents(supabase: SupabaseClient, orgId: string): void {
  const ch = supabase
    .channel(`ops-incidents-${orgId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'compliance_events',
      filter: `organization_id=eq.${orgId}`,
    }, (payload) => {
      operationsStore.update((s) => {
        let list = [...s.incidents]

        if (payload.eventType === 'DELETE') {
          list = list.filter((i) => i.id !== (payload.old as { id: string }).id)
        } else {
          const incoming = mapIncident(payload.new as Record<string, unknown>)
          assertTenant(incoming.organizationId, 'incidents')
          if (incoming.status === 'RESOLVED') {
            list = list.filter((i) => i.id !== incoming.id)
          } else {
            const idx = list.findIndex((i) => i.id === incoming.id)
            if (idx >= 0) list[idx] = incoming
            else list.unshift(incoming)
          }
        }

        return { ...s, incidents: list, lastUpdated: new Date().toISOString() }
      })
    })
    .subscribe()
  _channels.push(ch)
}

function _subShifts(supabase: SupabaseClient, orgId: string): void {
  const ch = supabase
    .channel(`ops-shifts-${orgId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'driver_assignments',
      filter: `organization_id=eq.${orgId}`,
    }, (payload) => {
      operationsStore.update((s) => {
        let list = [...s.driverShifts]

        if (payload.eventType === 'DELETE') {
          list = list.filter((d) => d.actorId !== (payload.old as { actor_id: string }).actor_id)
        } else {
          const incoming = mapShift(payload.new as Record<string, unknown>)
          const idx = list.findIndex((d) => d.actorId === incoming.actorId)
          if (idx >= 0) list[idx] = incoming
          else list.push(incoming)
        }

        return { ...s, driverShifts: list, lastUpdated: new Date().toISOString() }
      })
    })
    .subscribe()
  _channels.push(ch)
}

function _subDispatch(supabase: SupabaseClient, orgId: string): void {
  const ch = supabase
    .channel(`ops-dispatch-${orgId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'dispatch_queue',
      filter: `organization_id=eq.${orgId}`,
    }, (payload) => {
      operationsStore.update((s) => {
        let list = [...s.dispatchQueue]

        if (payload.eventType === 'DELETE') {
          list = list.filter((d) => d.id !== (payload.old as { id: string }).id)
        } else {
          const incoming = mapDispatch(payload.new as Record<string, unknown>)
          if (incoming.status === 'DEPARTED') {
            list = list.filter((d) => d.id !== incoming.id)
          } else {
            const idx = list.findIndex((d) => d.id === incoming.id)
            if (idx >= 0) list[idx] = incoming
            else list.push(incoming)
          }
        }

        return { ...s, dispatchQueue: list, lastUpdated: new Date().toISOString() }
      })
    })
    .subscribe()
  _channels.push(ch)
}

// ── Teardown ──────────────────────────────────────────────────────────────────

async function _teardown(supabase: SupabaseClient): Promise<void> {
  for (const ch of _channels) await supabase.removeChannel(ch)
  _channels.length = 0
}

export async function destroyOperations(supabase: SupabaseClient): Promise<void> {
  await _teardown(supabase)
  _currentOrgId = null
  operationsStore.set({
    activeTrips: [], incidents: [], driverShifts: [],
    routeSummaries: [], dispatchQueue: [],
    loading: false, error: null, lastUpdated: null,
  })
}

// ── Imperatives ───────────────────────────────────────────────────────────────

export const getTripById          = (id: string)        => get(operationsStore).activeTrips.find((t) => t.id === id)
export const getIncidentsByVehicle = (vehicleId: string) => get(operationsStore).incidents.filter((i) => i.vehicleId === vehicleId)
export const getShiftByDriver      = (actorId: string)   => get(operationsStore).driverShifts.find((d) => d.actorId === actorId)
export const getDispatchByVehicle  = (vehicleId: string) => get(operationsStore).dispatchQueue.filter((d) => d.vehicleId === vehicleId)
export const getRouteSummary       = (routeId: string)   => get(operationsStore).routeSummaries.find((r) => r.routeId === routeId)

// ── Route summary computation ─────────────────────────────────────────────────

function computeRouteSummaries(trips: ActiveTrip[], orgId: string): RouteSummary[] {
  const map = new Map<string, RouteSummary>()

  for (const trip of trips) {
    if (!map.has(trip.routeId)) {
      map.set(trip.routeId, {
        routeId:        trip.routeId,
        routeName:      trip.routeName,
        organizationId: orgId,
        health:         'NO_COVERAGE',
        activeTrips:    0,
        scheduledTrips: 0,
        vehicleCount:   0,
        lastActivity:   trip.updatedAt,
      })
    }

    const s = map.get(trip.routeId)!
    if (trip.status === 'IN_PROGRESS') s.activeTrips++
    if (trip.status === 'SCHEDULED')   s.scheduledTrips++
    s.vehicleCount++

    if (trip.status === 'DELAYED')                                  s.health = 'DELAYED'
    else if (s.health !== 'DELAYED' && trip.status === 'IN_PROGRESS') s.health = 'ON_TIME'
    else if (s.health === 'NO_COVERAGE' && trip.status === 'SCHEDULED') s.health = 'IDLE'

    if (!s.lastActivity || trip.updatedAt > s.lastActivity) s.lastActivity = trip.updatedAt
  }

  return [...map.values()]
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function mapTrip(row: Record<string, unknown>): ActiveTrip {
  const v = row.vehicles as Record<string, unknown> | null
  const r = row.routes   as Record<string, unknown> | null
  return {
    id:               String(row.id ?? ''),
    vehicleId:        String(row.vehicle_id ?? ''),
    vehiclePlate:     String(v?.reg_number ?? row.vehicle_id ?? ''),
    driverActorId:    String(row.driver_actor_id ?? ''),
    driverName:       String(row.driver_name ?? ''),
    conductorActorId: row.conductor_actor_id ? String(row.conductor_actor_id) : undefined,
    conductorName:    row.conductor_name     ? String(row.conductor_name)     : undefined,
    routeId:          String(row.route_id ?? ''),
    routeName:        String(r?.name ?? row.route_id ?? ''),
    organizationId:   String(row.organization_id ?? ''),
    status:           (row.status as TripStatus) ?? 'SCHEDULED',
    departedAt:       row.departed_at     ? String(row.departed_at)     : undefined,
    expectedArrival:  row.expected_arrival ? String(row.expected_arrival) : undefined,
    passengerCount:   Number(row.passenger_count ?? 0),
    capacity:         Number(row.capacity ?? 0),
    metadata:         row.metadata as Record<string, unknown> | undefined,
    createdAt:        String(row.created_at ?? ''),
    updatedAt:        String(row.updated_at ?? ''),
  }
}

function mapIncident(row: Record<string, unknown>): Incident {
  const v = row.vehicles as Record<string, unknown> | null
  return {
    id:             String(row.id ?? ''),
    vehicleId:      String(row.vehicle_id ?? ''),
    vehiclePlate:   v?.reg_number ? String(v.reg_number) : undefined,
    reportedBy:     String(row.reported_by ?? ''),
    organizationId: String(row.organization_id ?? ''),
    severity:       (row.severity as IncidentSeverity) ?? 'LOW',
    status:         (row.status   as IncidentStatus)   ?? 'OPEN',
    type:           String(row.type ?? ''),
    description:    String(row.description ?? ''),
    gpsLat:         row.gps_lat ? Number(row.gps_lat) : undefined,
    gpsLng:         row.gps_lng ? Number(row.gps_lng) : undefined,
    metadata:       row.metadata as Record<string, unknown> | undefined,
    createdAt:      String(row.created_at ?? ''),
    updatedAt:      String(row.updated_at ?? ''),
  }
}

function mapShift(row: Record<string, unknown>): DriverShift {
  const v    = row.vehicles as Record<string, unknown> | null
  const a    = row.actors   as Record<string, unknown> | null
  const meta = (a?.metadata as Record<string, unknown> | null) ?? {}
  return {
    actorId:        String(row.actor_id ?? ''),
    driverName:     String(meta.full_name ?? meta.name ?? row.actor_id ?? ''),
    vehicleId:      String(row.vehicle_id ?? ''),
    vehiclePlate:   String(v?.reg_number ?? row.vehicle_id ?? ''),
    organizationId: String(row.organization_id ?? ''),
    shiftState:     (row.shift_state as ShiftState) ?? 'off_duty',
    activeTripId:   row.active_trip_id ? String(row.active_trip_id) : undefined,
    startedAt:      row.started_at     ? String(row.started_at)     : undefined,
    updatedAt:      String(row.updated_at ?? ''),
  }
}

function mapDispatch(row: Record<string, unknown>): DispatchItem {
  const v = row.vehicles as Record<string, unknown> | null
  const r = row.routes   as Record<string, unknown> | null
  return {
    id:                   String(row.id ?? ''),
    vehicleId:            String(row.vehicle_id ?? ''),
    vehiclePlate:         String(v?.reg_number ?? row.vehicle_id ?? ''),
    routeId:              String(row.route_id ?? ''),
    routeName:            String(r?.name ?? row.route_id ?? ''),
    organizationId:       String(row.organization_id ?? ''),
    scheduledAt:          String(row.scheduled_at ?? ''),
    assignedDriverId:     row.assigned_driver_id    ? String(row.assigned_driver_id)    : undefined,
    assignedConductorId:  row.assigned_conductor_id ? String(row.assigned_conductor_id) : undefined,
    status:               (row.status as DispatchItem['status']) ?? 'PENDING',
    createdAt:            String(row.created_at ?? ''),
  }
}