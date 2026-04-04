// src/lib/features/vehicles/gps.store.ts
//
// Vehicle GPS and environmental state — real-time from Supabase.
// Replaces the old standalone gpsStore with org-scoped Supabase realtime.
//
// GPS data originates from NE06M trackers posted to:
//   POST /api/gps/ingest → upserts into vehicle_locations table
//
// USAGE:
//   import { initGps, destroyGps, gpsStore, getVehicleGPS } from '$lib/features/vehicles/gps.store'
//
//   onMount(() => {
//     initGps(supabase, orgId)
//     return () => destroyGps(supabase)
//   })

import { writable, derived, get } from "svelte/store"
import type { SupabaseClient } from "@supabase/supabase-js"

// ── GPS data model ────────────────────────────────────────────────────────────

export type FixStatus = "NO_FIX" | "2D_FIX" | "3D_FIX"

export interface GPSData {
  vehicleId: string
  organizationId: string
  lat: number
  lng: number
  speed?: number // km/h
  heading?: number // degrees 0–360
  altitude?: number // metres
  satellites?: number
  fixStatus?: FixStatus
  hdop?: number // horizontal dilution of precision — lower is better
  timestamp: string // ISO string

  // Environmental / sensor fields (NE06M supports these)
  rain?: boolean | number // true/false or mm/h intensity
  temperature?: number // °C (future sensor)
  humidity?: number // % (future sensor)
}

// ── Store state ───────────────────────────────────────────────────────────────

interface GpsState {
  locations: Map<string, GPSData> // keyed by vehicleId — latest position per vehicle
  loading: boolean
  error: string | null
  lastUpdated: string | null
}

// Map is not directly reactive in Svelte stores but we replace it on each update
const initialState: GpsState = {
  locations: new Map(),
  loading: false,
  error: null,
  lastUpdated: null,
}

export const gpsStore = writable<GpsState>(initialState)

// ── Derived stores ────────────────────────────────────────────────────────────

/** All current vehicle positions as an array */
export const allPositions = derived(gpsStore, ($s) => [
  ...$s.locations.values(),
])

/** Vehicles with a valid fix */
export const activePositions = derived(gpsStore, ($s) =>
  [...$s.locations.values()].filter((v) => v.fixStatus !== "NO_FIX"),
)

/** Vehicles currently in rain */
export const vehiclesInRain = derived(gpsStore, ($s) =>
  [...$s.locations.values()].filter(
    (v) => v.rain === true || (typeof v.rain === "number" && v.rain > 0),
  ),
)

/** Vehicles exceeding a speed threshold (default 80 km/h) */
export function overspeeding(threshold = 80) {
  return derived(gpsStore, ($s) =>
    [...$s.locations.values()].filter(
      (v) => v.fixStatus !== "NO_FIX" && (v.speed ?? 0) > threshold,
    ),
  )
}

// ── Realtime channel ──────────────────────────────────────────────────────────

let realtimeChannel: ReturnType<SupabaseClient["channel"]> | null = null

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initGps(
  supabase: SupabaseClient,
  orgId: string,
): Promise<void> {
  gpsStore.update((s) => ({ ...s, loading: true, error: null }))

  try {
    // Fetch latest position per vehicle (one row per vehicle from vehicle_locations)
    const { data, error } = await supabase
      .from("vehicle_locations")
      .select(
        "vehicle_id, organization_id, lat, lng, speed, heading, altitude, satellites, fix_status, hdop, timestamp, metadata",
      )
      .eq("organization_id", orgId)
      .order("timestamp", { ascending: false })

    if (error) throw new Error(`GPS fetch failed: ${error.message}`)

    const locations = new Map<string, GPSData>()
    for (const row of data ?? []) {
      // Keep only the most recent entry per vehicle (rows are ordered desc)
      if (!locations.has(row.vehicle_id)) {
        locations.set(row.vehicle_id, rowToGps(row))
      }
    }

    gpsStore.set({
      locations,
      loading: false,
      error: null,
      lastUpdated: new Date().toISOString(),
    })

    // ── Realtime — upsert latest position per vehicle ─────────────────────
    await _teardown(supabase)

    realtimeChannel = supabase
      .channel(`gps-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT", // GPS ingest always inserts new rows
          schema: "public",
          table: "vehicle_locations",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const incoming = rowToGps(payload.new as Record<string, unknown>)
          gpsStore.update((state) => {
            // Replace with new Map so Svelte detects the change
            const locations = new Map(state.locations)
            locations.set(incoming.vehicleId, incoming)
            return {
              ...state,
              locations,
              lastUpdated: new Date().toISOString(),
            }
          })
        },
      )
      .subscribe()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown GPS error"
    console.error("[gps]", message)
    gpsStore.update((s) => ({ ...s, loading: false, error: message }))
  }
}

// ── Teardown ──────────────────────────────────────────────────────────────────

async function _teardown(supabase: SupabaseClient): Promise<void> {
  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}

export async function destroyGps(supabase: SupabaseClient): Promise<void> {
  await _teardown(supabase)
  gpsStore.set(initialState)
}

// ── Imperatives ───────────────────────────────────────────────────────────────

/**
 * Get the latest GPS position for a specific vehicle.
 * Use in event handlers — for reactive UI use the derived stores above.
 */
export function getVehicleGPS(vehicleId: string): GPSData | undefined {
  return get(gpsStore).locations.get(vehicleId)
}

/**
 * Get all vehicles with an active GPS fix.
 * Use in event handlers — for reactive UI use activePositions derived store.
 */
export function getActiveVehiclesGPS(): GPSData[] {
  return [...get(gpsStore).locations.values()].filter(
    (v) => v.fixStatus !== "NO_FIX",
  )
}

/**
 * Get all vehicles currently reporting rain.
 */
export function getVehiclesInRain(): GPSData[] {
  return [...get(gpsStore).locations.values()].filter(
    (v) => v.rain === true || (typeof v.rain === "number" && v.rain > 0),
  )
}

// ── Row mapper ────────────────────────────────────────────────────────────────

function rowToGps(row: Record<string, unknown>): GPSData {
  const meta = (row.metadata as Record<string, unknown> | null) ?? {}
  return {
    vehicleId: String(row.vehicle_id),
    organizationId: String(row.organization_id ?? ""),
    lat: Number(row.lat),
    lng: Number(row.lng),
    speed: row.speed != null ? Number(row.speed) : undefined,
    heading: row.heading != null ? Number(row.heading) : undefined,
    altitude: row.altitude != null ? Number(row.altitude) : undefined,
    satellites: row.satellites != null ? Number(row.satellites) : undefined,
    fixStatus: (row.fix_status as FixStatus | undefined) ?? undefined,
    hdop: row.hdop != null ? Number(row.hdop) : undefined,
    timestamp: String(row.timestamp),
    rain: meta.rain != null ? (meta.rain as boolean | number) : undefined,
    temperature:
      meta.temperature != null ? Number(meta.temperature) : undefined,
    humidity: meta.humidity != null ? Number(meta.humidity) : undefined,
  }
}
