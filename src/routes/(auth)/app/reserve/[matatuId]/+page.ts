import { error } from '@sveltejs/kit'
import type { PageLoad } from './$types'
import { matatuConfigs, validateCapacity } from '$lib/matatu'
import { resolveModelKey } from '$lib/features/fleet'

/**
 * Load matatu data for the reservation page.
 *
 * Route: /app/reserve/[matatuId]
 *
 * Resolution chain:
 *   1. Try live API → get real matatu data with capacity
 *   2. Fallback to static matatuConfigs registry
 *   3. Resolve the 3D model key via resolveModelKey(capacity)
 *
 * The modelKey is always derived from capacity, ensuring the fleet
 * index loads the correct bus model regardless of how we got here.
 */
export const load: PageLoad = async ({ params, fetch }) => {
  const { matatuId } = params

  console.log("matatuId:", matatuId, typeof matatuId)

  if (!matatuId) throw error(400, 'Missing matatu ID')

  const id = String(matatuId)

  // ── Try live API first ──
  try {
    const res = await fetch(`/api/reserve/status/${matatuId}`)
    if (res.ok) {
      const matatu = await res.json()
      const capacity = validateCapacity(
        String(matatu.totalSeats ?? matatu.capacity)
      )
      const modelKey = resolveModelKey(capacity)

      return {
        matatu: {
          id:           matatu.matatuId     as string,
          route:        matatu.route        as string,
          sacco:        matatu.sacco        as string,
          capacity,
          pricePerSeat: matatu.pricePerSeat as number,
          status:       matatu.status       as string,
          occupancy:    matatu.occupancy    as number,
        },
        config: matatuConfigs[capacity],
        modelKey,
      }
    }
  } catch {
    // fall through to static lookup
  }

  // ── Fallback: static config registry ──
  // Try matching by config.id first (e.g. matatuConfigs["14"].id === "matatu-001")
  const configByIdEntry = Object.entries(matatuConfigs).find(
    ([, cfg]) => (cfg as any).id === id
  )

  if (configByIdEntry) {
    const [capacity, config] = configByIdEntry
    const modelKey = resolveModelKey(capacity)

    return {
      matatu: {
        id,
        route:        (config as any).route ?? 'Route',
        sacco:        (config as any).sacco ?? 'SACCO',
        capacity,
        pricePerSeat: (config as any).pricePerSeat ?? 30,
        status:       'On Route',
        occupancy:    0,
      },
      config,
      modelKey,
    }
  }

  // Try interpreting the id itself as a capacity (e.g. /reserve/14)
  try {
    const capacity = validateCapacity(id)
    const config = matatuConfigs[capacity]
    if (config) {
      const modelKey = resolveModelKey(capacity)

      return {
        matatu: {
          id,
          route:        (config as any).route ?? 'Route',
          sacco:        (config as any).sacco ?? 'SACCO',
          capacity,
          pricePerSeat: (config as any).pricePerSeat ?? 30,
          status:       'On Route',
          occupancy:    0,
        },
        config,
        modelKey,
      }
    }
  } catch {
    // not a valid capacity string
  }

  throw error(404, `Matatu "${id}" not found`)
}