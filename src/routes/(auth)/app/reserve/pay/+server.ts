import type { RequestHandler } from "@sveltejs/kit"
import { getPostHogClient } from "$lib/server/posthog"

export const POST: RequestHandler = async ({ request, locals }) => {
  const posthog = getPostHogClient()
  const userId = locals.user?.id ?? "anonymous"

  try {
    const body = await request.json()
    const { capacity, seats, amount, matatuId } = body
    const seatCount = Array.isArray(seats) ? seats.length : 0
    const expected = seatCount * 20
    if (amount !== expected) {
      posthog.capture({
        distinctId: userId,
        event: "seat_reservation_failed",
        properties: {
          reason: "invalid_amount",
          amount,
          expected,
          seat_count: seatCount,
          matatu_id: matatuId ?? null,
        },
      })
      return new Response(
        JSON.stringify({ error: "invalid_amount", expected }),
        { status: 400 },
      )
    }

    // Attempt to insert a reservation record if the table exists.
    try {
      await (locals.supabase as any).from("reservations").insert({
        profile_id: locals.user?.id ?? null,
        capacity,
        seats,
        amount,
        status: "pending",
      })
    } catch (e) {
      // ignore if table missing — still simulate payment
      console.warn("reservations insert failed (table may not exist):", e)
    }

    // Simulate M-Pesa initiation (in production integrate with Safaricom API / backend jobs)
    const mpesaRequestId =
      "MPESA_" + Math.random().toString(36).slice(2, 10).toUpperCase()

    // Capture successful reservation
    posthog.capture({
      distinctId: userId,
      event: "seat_reservation_completed",
      properties: {
        seat_count: seatCount,
        amount,
        matatu_id: matatuId ?? null,
        mpesa_request_id: mpesaRequestId,
      },
    })
    await posthog.flush()

    return new Response(JSON.stringify({ ok: true, mpesaRequestId }), {
      status: 200,
    })
  } catch (err) {
    console.error("reserve/pay error", err)

    posthog.capture({
      distinctId: userId,
      event: "seat_reservation_failed",
      properties: {
        reason: "server_error",
        error: err instanceof Error ? err.message : String(err),
      },
    })
    await posthog.flush()

    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
    })
  }
}
