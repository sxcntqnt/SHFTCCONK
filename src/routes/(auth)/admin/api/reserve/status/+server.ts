import { json } from "@sveltejs/kit"

export async function GET({ url }) {
  const capacity = url.searchParams.get("capacity")

  return json({
    reservedSeats: []
  })
}