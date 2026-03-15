// src/routes/api/reserve/status/[matatuId]/+server.ts
import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"

/**
 * GET /api/reserve/status/[matatuId]
 *
 * Returns live matatu status for the reservation page.
 * Replace the mock data below with a real DB/Supabase query when ready.
 *
 * Shape must match what page.ts expects:
 *   matatu.matatuId, route, sacco, totalSeats, pricePerSeat, status, occupancy
 */

const MOCK_MATATUS: Record<string, object> = {
  "matatu-001": {
    matatuId:     "matatu-001",
    route:        "Route 23",
    sacco:        "City Hoppa",
    totalSeats:   14,
    pricePerSeat: 50,
    status:       "On Route",
    occupancy:    4,
  },
  "matatu-002": {
    matatuId:     "matatu-002",
    route:        "Route 46",
    sacco:        "Metro Trans",
    totalSeats:   26,
    pricePerSeat: 70,
    status:       "Boarding",
    occupancy:    10,
  },
  "matatu-003": {
    matatuId:     "matatu-003",
    route:        "Route 111",
    sacco:        "Forward Travellers",
    totalSeats:   33,
    pricePerSeat: 60,
    status:       "On Route",
    occupancy:    18,
  },
}

export const GET: RequestHandler = ({ params }) => {
  const matatu = MOCK_MATATUS[params.matatuId]

  if (!matatu) {
    // Return a generic fallback rather than 404 so the page always loads
    return json({
      matatuId:     params.matatuId,
      route:        "Route ?",
      sacco:        "Unknown SACCO",
      totalSeats:   14,
      pricePerSeat: 50,
      status:       "On Route",
      occupancy:    0,
    })
  }

  return json(matatu)
}