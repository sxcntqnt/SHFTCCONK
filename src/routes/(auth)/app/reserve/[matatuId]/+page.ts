// src/routes/app/reserve/[matatuId]/+page.ts
import type { PageLoad } from './$types'
import { error } from '@sveltejs/kit'
import { matatuConfigs, validateCapacity } from '$lib/matatu'
import { resolveModelKey } from '$lib/features/fleet'

export const load: PageLoad = async ({ data, params }) => {
  const { matatuId } = params

  // ── Server data path (production) ──
  if (data?.capacity) {
    const capacity  = validateCapacity(data.capacity)
    const modelKey  = resolveModelKey(capacity)
    const config    = matatuConfigs[capacity]

    return {
      matatu: {
        id:           data.vehicleId,
        regNumber:    data.regNumber,
        capacity,
        pricePerSeat: (config as any)?.pricePerSeat ?? 30,
        status:       'On Route',
        occupancy:    data.occupancy,
      },
      config,
      modelKey,
      existingReservation: data.existingReservation,
    }
  }

  // ── Static fallback (dev / storybook only) ──
  const id = String(matatuId)

  const configByIdEntry = Object.entries(matatuConfigs).find(
    ([, cfg]) => (cfg as any).id === id
  )
  if (configByIdEntry) {
    const [capacity, config] = configByIdEntry
    return {
      matatu: {
        id,
        regNumber:    id,
        capacity,
        pricePerSeat: (config as any).pricePerSeat ?? 30,
        status:       'On Route',
        occupancy:    0,
      },
      config,
      modelKey:            resolveModelKey(capacity),
      existingReservation: null,
    }
  }

  try {
    const capacity = validateCapacity(id)
    const config   = matatuConfigs[capacity]
    if (config) {
      return {
        matatu: {
          id,
          regNumber:    id,
          capacity,
          pricePerSeat: (config as any).pricePerSeat ?? 30,
          status:       'On Route',
          occupancy:    0,
        },
        config,
        modelKey:            resolveModelKey(capacity),
        existingReservation: null,
      }
    }
  } catch { /* not a valid capacity string */ }

  throw error(404, `Matatu "${id}" not found`)
}