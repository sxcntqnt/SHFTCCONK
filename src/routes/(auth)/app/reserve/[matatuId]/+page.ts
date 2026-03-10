import { error } from '@sveltejs/kit'
import type { PageLoad } from './$types'
import { matatuConfigs, validateCapacity } from '$lib/matatu'

/**
 * Load matatu data for the reservation page.
 * Tries live API first, falls back to static config registry.
 *
 * Route: /reserve/[id] — params.id is the matatu identifier.
 */
export const load: PageLoad = async ({ params, fetch }) => {
  const id = (params as Record<string, string>).id
  if (!id) throw error(400, 'Missing matatu ID')

  // Try live API
  try {
    const res = await fetch(`/api/matatu/${id}`)
    if (res.ok) {
      const matatu = await res.json()
      const capacity = validateCapacity(String(matatu.totalSeats ?? matatu.capacity))
      return {
        matatu: {
          id:           matatu.id           as string,
          route:        matatu.route        as string,
          sacco:        matatu.sacco        as string,
          capacity,
          pricePerSeat: matatu.pricePerSeat as number,
          status:       matatu.status       as string,
          occupancy:    matatu.occupancy    as number,
        },
        config: matatuConfigs[capacity],
      }
    }
  } catch {
    // fall through to static lookup
  }

  // Fallback: static registry
  // MatatuConfig may not have id/route/sacco — cast through Record for flexibility
  const capacityEntry = Object.entries(matatuConfigs).find(
    ([, cfg]) => (cfg as Record<string, any>).id === id
  )

  if (!capacityEntry) {
    throw error(404, `Matatu "${id}" not found`)
  }

  const [capacity, config] = capacityEntry
  const cfgAny = config as Record<string, any>

  return {
    matatu: {
      id,
      route:        (cfgAny.route        ?? '') as string,
      sacco:        (cfgAny.sacco        ?? '') as string,
      capacity,
      pricePerSeat: (cfgAny.pricePerSeat ?? 20) as number,
      status:       'On Route',
      occupancy:    0,
    },
    config,
  }
}