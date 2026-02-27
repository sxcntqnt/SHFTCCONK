import { error } from '@sveltejs/kit'
import type { PageLoad } from './$types'
import { matatuConfigs, validateCapacity } from '$lib/matatu'

// In production this would be a fetch() to your live API.
// For now we derive config from the static registry the same way the feed does.
export const load: PageLoad = async ({ params, fetch }) => {
  const { id } = params

  // Try to fetch live matatu data from your backend
  try {
    const res = await fetch(`/api/matatu/${id}`)
    if (res.ok) {
      const matatu = await res.json()
      // Validate that the capacity in the live data maps to a known config
      const capacity = validateCapacity(String(matatu.totalSeats ?? matatu.capacity))
      return {
        matatu: {
          id:           matatu.id          as string,
          route:        matatu.route       as string,
          sacco:        matatu.sacco       as string,
          capacity:     capacity,
          pricePerSeat: matatu.pricePerSeat as number,
          status:       matatu.status      as string,
          occupancy:    matatu.occupancy   as number,
        },
        config: matatuConfigs[capacity],
      }
    }
  } catch {
    // fall through to static lookup below
  }

  // Fallback: derive from static registry using the id to find capacity.
  // This matches what the sample data in the feed uses.
  const capacityEntry = Object.entries(matatuConfigs).find(
    ([, cfg]) => cfg.id === id
  )

  if (!capacityEntry) {
    throw error(404, `Matatu "${id}" not found`)
  }

  const [capacity, config] = capacityEntry

  return {
    matatu: {
      id,
      route:        config.route        ?? '',
      sacco:        config.sacco        ?? '',
      capacity,
      pricePerSeat: config.pricePerSeat ?? 20,
      status:       'On Route',
      occupancy:    0,
    },
    config,
  }
}
