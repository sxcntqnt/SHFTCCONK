import type { RequestEvent } from '@sveltejs/kit'
import { Redis } from '@upstash/redis'

const r = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL as string, token: process.env.UPSTASH_REDIS_REST_TOKEN as string })

/*
  POST /api/billing/mpesa-upgrade
  - Enforces idempotency via Upstash Redis key 'mpesa_upgrade:{operator_id}:{plan_id}'
  - Fetches ledger stats for operator and pre-populates Daraja STK push
  - On success sets idempotency key with 10-minute TTL

  Assumptions:
  - ledger_stats view exists and contains (operator_id, ledger_event_count, days_until_cap, phone_number)
*/

export const POST = async ({ request, locals }: RequestEvent) => {
  const body = await request.json().catch(() => ({}))
  const operator_id = body.operator_id
  const plan_id = body.plan_id
  if (!operator_id || !plan_id) return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400 })

  const idempotencyKey = `mpesa_upgrade:${operator_id}:${plan_id}`
  const exists = await r.get(idempotencyKey)
  if (exists) return new Response(JSON.stringify({ message: 'Upgrade already in progress' }), { status: 409 })

  // Fetch ledger stats and phone number
  const { data: stats, error: statsErr } = await locals.supabaseServiceRole
    .from('ledger_stats')
    .select('ledger_event_count,days_until_cap,phone_number')
    .eq('operator_id', operator_id)
    .limit(1)

  if (statsErr) {
    console.error('[mpesa-upgrade] ledger_stats query failed', statsErr)
    return new Response(JSON.stringify({ error: 'ledger_query_failed' }), { status: 500 })
  }

  const ledger = stats && stats.length > 0 ? (stats[0] as any) : null
  if (!ledger) return new Response(JSON.stringify({ error: 'operator_not_found' }), { status: 404 })

  const darajaPayload = {
    BusinessShortCode: process.env.DARAJA_SHORTCODE,
    PhoneNumber: ledger.phone_number,
    Amount: body.amount || 0,
    AccountReference: `Upgrade:${plan_id}:events=${ledger.ledger_event_count}`,
    TransactionDesc: `Upgrade ${plan_id}`,
  }

  // Fire Daraja STK push
  try {
    const darajaRes = await fetch(process.env.DARAJA_STK_PUSH_URL as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DARAJA_API_TOKEN}` },
      body: JSON.stringify(darajaPayload),
    })
    const darajaJson = await darajaRes.json()
    if (!darajaRes.ok) return new Response(JSON.stringify({ error: 'daraja_failed', detail: darajaJson }), { status: 502 })

    // Set idempotency key for 10 minutes
    await r.set(idempotencyKey, JSON.stringify({ started_at: Date.now() }), { ex: 600 })

    return new Response(JSON.stringify({ checkout_request_id: darajaJson.CheckoutRequestID ?? darajaJson.checkout_request_id ?? null }), { status: 200 })
  } catch (e) {
    console.error('[mpesa-upgrade] daraja call failed', e)
    return new Response(JSON.stringify({ error: 'daraja_error' }), { status: 502 })
  }
}
