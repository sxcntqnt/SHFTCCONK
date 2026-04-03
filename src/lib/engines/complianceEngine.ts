// src/lib/engines/complianceEngine.ts
import { supabase } from "$lib/supabaseClient"

type ComplianceEvent = {
  organization_id: string
  vehicle_id: string
  driver_id: string
  type: string
  severity: "LOW" | "MEDIUM" | "HIGH"
  message: string
  metadata: any
  timestamp: number
}

const eventQueue: ComplianceEvent[] = []
const lastEventMap = new Map<string, number>()

// Flush every 5 seconds
setInterval(async () => {
  if (eventQueue.length === 0) return

  const batch = eventQueue.splice(0, eventQueue.length)

  await supabase.from("compliance_events").insert(batch)
}, 5000)

/**
 * MAIN ENTRY POINT
 */
export function evaluateRouteDeviation(vehicle, contract) {
  const isOutsideRoute = checkIfOutsideGeoFence(vehicle, contract.route)

  if (!isOutsideRoute) return

  const now = Date.now()
  const dedupeKey = `${vehicle.id}-ROUTE_DEVIATION`

  // 🔥 Deduplication Window (60 seconds)
  const lastTriggered = lastEventMap.get(dedupeKey)
  if (lastTriggered && now - lastTriggered < 60_000) {
    return
  }

  lastEventMap.set(dedupeKey, now)

  eventQueue.push({
    organization_id: vehicle.organizationId,
    vehicle_id: vehicle.id,
    driver_id: vehicle.driverId,
    type: "ROUTE_DEVIATION",
    severity: "HIGH",
    message: `Vehicle ${vehicle.regNumber} deviated from assigned route`,
    metadata: {
      gps: {
        lat: vehicle.gpsLat,
        lng: vehicle.gpsLng,
      },
    },
    timestamp: now,
  })
}
