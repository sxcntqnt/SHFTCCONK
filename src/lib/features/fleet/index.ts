// src/lib/features/fleet/index.ts

/**
 * Vehicle model registry.
 *
 * Keys are seat-count strings matching validated capacity values.
 * Each loader dynamically imports the corresponding Threlte GLTF component.
 *
 * To add a new bus model:
 *   1. Drop the .svelte GLTF wrapper into static/models/
 *   2. Add a new entry here keyed by its seat count
 *   3. That's it — the resolver handles everything downstream
 */

import { createVehicleLoader } from "./services/three/loader"

export const vehicleModelLoaders = {
  "14": () => import("./components/isuzu_erga_mio_bus.svelte"), // keep existing Svelte wrappers
  "26": () => import("./components/japanese_bus_osaka_city_bus_osaka.svelte"),
  "33": () => import("./components/retro_anime_vintage_volkswagen_van.svelte"),
  "matatu-generic": () => import("./components/GenericMatatu.svelte"),

} satisfies Record<string, () => Promise<{ default: any }>>

/** Union of all valid keys in the vehicle model registry */
export type VehicleModelKey = keyof typeof vehicleModelLoaders

/** All valid capacity keys (excludes named keys like "matatu-generic") */
export const validCapacities = Object.keys(vehicleModelLoaders).filter(
  (k) => /^\d+$/.test(k)
) as string[]

/**
 * Resolve a model key from any input.
 *
 * Priority:
 *   1. Exact match in registry (e.g. "14", "26", "matatu-generic")
 *   2. Extract leading digits from display strings (e.g. "14/18" → "14")
 *   3. Find closest capacity match (e.g. "18" → "14" as nearest smaller)
 *   4. Fallback to "matatu-generic"
 *
 * This is the single source of truth for model resolution.
 */
export function resolveModelKey(input: string | number | undefined | null): VehicleModelKey {
  if (!input) return "matatu-generic"

  const raw = String(input).trim()

  // 1. Exact match
  if (raw in vehicleModelLoaders) return raw as VehicleModelKey

  // 2. Extract leading digits ("14/18" → "14", "33-seater" → "33")
  const digits = raw.match(/^(\d+)/)
  if (digits) {
    const num = digits[1]
    if (num in vehicleModelLoaders) return num as VehicleModelKey

    // 3. Closest capacity match (find the largest capacity ≤ the input number)
    const inputNum = parseInt(num)
    const capacities = validCapacities.map(Number).sort((a, b) => a - b)

    // Find the best fit: largest capacity that doesn't exceed the input
    let best: number | null = null
    for (const cap of capacities) {
      if (cap <= inputNum) best = cap
    }

    // If no smaller match, use the smallest available
    if (best === null && capacities.length > 0) best = capacities[0]

    if (best !== null && String(best) in vehicleModelLoaders) {
      return String(best) as VehicleModelKey
    }
  }

  // 4. Fallback
  return "matatu-generic"
}