import type { RequestHandler } from '@sveltejs/kit'

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const body = await request.json()
    const { capacity, seats, amount } = body
    const seatCount = Array.isArray(seats) ? seats.length : 0
    const expected = seatCount * 20
    if (amount !== expected) {
      return new Response(JSON.stringify({ error: 'invalid_amount', expected }), { status: 400 })
    }

    // Attempt to insert a reservation record if the table exists.
    try {
      await (locals.supabase as any).from('reservations').insert({
        profile_id: locals.user?.id ?? null,
        capacity,
        seats,
        amount,
        status: 'pending'
      })
    } catch (e) {
      // ignore if table missing — still simulate payment
      console.warn('reservations insert failed (table may not exist):', e)
    }

    // Simulate M-Pesa initiation (in production integrate with Safaricom API / backend jobs)
    const mpesaRequestId = 'MPESA_' + Math.random().toString(36).slice(2, 10).toUpperCase()
    return new Response(JSON.stringify({ ok: true, mpesaRequestId }), { status: 200 })
  } catch (err) {
    console.error('reserve/pay error', err)
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500 })
  }
}
