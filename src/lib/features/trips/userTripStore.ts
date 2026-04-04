import { writable, derived } from "svelte/store"
import { browser } from "$app/environment"
import { openDB } from "idb"

export const currentTrip = writable(null)
export const savedRoutes = writable([])
export const alerts = writable([])

let dbPromise: Promise<any> | null = null

// Only initialize IndexedDB in the browser
if (browser) {
  dbPromise = openDB("commuter-db", 1, {
    upgrade(db) {
      db.createObjectStore("routes", { keyPath: "id" })
    },
  })
}

export async function saveRoute(route) {
  if (!browser || !dbPromise) return

  const db = await dbPromise
  await db.put("routes", route)
  savedRoutes.update((r) => [...r, route])
}

export const tripScore = derived(currentTrip, ($trip) => {
  if (!$trip) return 0

  return Math.round(
    $trip.speed * 0.3 +
      $trip.reliability * 0.3 +
      $trip.costEfficiency * 0.2 +
      $trip.ecoScore * 0.2,
  )
})

export function planMockTrip(from, to, mode) {
  const duration = Math.floor(Math.random() * 20) + 25
  const delay = Math.random() > 0.7 ? 5 : 0

  return {
    id: browser ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    from,
    to,
    mode,
    departure: "8:30 AM",
    duration: `${duration} min`,
    transfers: mode === "transit" ? 1 : 0,
    delay,
    cost: (Math.random() * 5 + 2).toFixed(2),
    ecoScore: mode === "bike" ? 100 : 60,
    speed: 80,
    reliability: delay ? 70 : 90,
    costEfficiency: 75,
    coordinates: [
      [-73.9851, 40.7589],
      [-73.9819, 40.7681],
    ],
  }
}
