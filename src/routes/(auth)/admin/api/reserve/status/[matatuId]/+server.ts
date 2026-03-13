import { json } from "@sveltejs/kit"

export async function GET({ url }) {
  const capacity = url.searchParams.get("capacity")
  const matatuId = url.searchParams.get("matatu_id")

  return json({
    reservedSeats: []
  })
}