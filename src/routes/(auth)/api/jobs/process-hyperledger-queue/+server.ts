// src/routes/api/jobs/process-hyperledger-queue/+server.ts
//
// Queue processor for Hyperledger Fabric enrollment.
//
// CALLED BY: cron job every 2 minutes
//   Vercel:     vercel.json cron
//   Supabase:   pg_cron or Edge Function schedule
//   Self-hosted: system cron → curl POST with PRIVATE_CRON_SECRET header
//
// RETRY STRATEGY:
//   attempt 1 → immediate
//   attempt 2 → 2 min delay
//   attempt 3 → 10 min delay
//   attempt 4 → 1 hour delay
//   attempt 5 → 6 hour delay
//   attempt 6+ → status: exhausted (admin must re-trigger)
//
// SECURITY:
//   Requires Authorization: Bearer ${PRIVATE_CRON_SECRET} header.
//   Only processes 'pending' and 'retrying' rows where
//   next_retry_at <= now() (or null for first attempt).

import type { RequestHandler }      from './$types'
import { error }                    from '@sveltejs/kit'
import {
  PRIVATE_CRON_SECRET,
  PRIVATE_HYPERLEDGER_API_URL,
  PRIVATE_HYPERLEDGER_API_KEY,
}                                   from '$env/static/private'
import { createClient }             from '@supabase/supabase-js'
import {
  PUBLIC_SUPABASE_URL,
}                                   from '$env/static/public'
import { PRIVATE_SUPABASE_SERVICE_ROLE } from '$env/static/private'

// Retry delay schedule in minutes per attempt number
const RETRY_DELAYS_MINUTES: Record<number, number> = {
  1: 2,
  2: 10,
  3: 60,
  4: 360,
}

const MAX_ATTEMPTS = 5

// ─────────────────────────────────────────────────────────────────────────────
// Hyperledger enrollment call
// ─────────────────────────────────────────────────────────────────────────────

type EnrollResult = {
  success:   boolean
  fabricUserId?: string
  mspId?:    string
  error?:    string
}

async function callHyperledgerEnroll(
  eventName:  string,
  actorId:    string,
  profileId:  string,
  intent:     string,
): Promise<EnrollResult> {
  try {
    const response = await fetch(`${PRIVATE_HYPERLEDGER_API_URL}/enroll`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${PRIVATE_HYPERLEDGER_API_KEY}`,
      },
      body: JSON.stringify({
        event:       eventName,
        actor_id:    actorId,
        profile_id:  profileId,
        intent,
        enrolled_at: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${body}` }
    }

    const data = await response.json()
    return {
      success:      true,
      fabricUserId: data.userId  ?? data.enrollmentId ?? actorId,
      mspId:        data.mspId   ?? 'MataPulseMSP',
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request }) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${PRIVATE_CRON_SECRET}`) {
    throw error(401, 'Unauthorized')
  }

  // Use service role — queue processor bypasses RLS
  const supabase = createClient(
    PUBLIC_SUPABASE_URL,
    PRIVATE_SUPABASE_SERVICE_ROLE,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // ── Fetch due items ────────────────────────────────────────────────────────
  // Pick up pending + retrying rows where next_retry_at has passed
  const now = new Date().toISOString()
  const { data: dueItems, error: fetchError } = await supabase
    .from('hyperledger_enrollment_queue')
    .select('id, actor_id, profile_id, intent, event_name, attempts, max_attempts')
    .in('status', ['pending', 'retrying'])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .limit(20)   // process 20 per cron tick to avoid timeouts

  if (fetchError) {
    console.error('[hlf-queue] Fetch failed:', fetchError)
    throw error(500, 'Queue fetch failed')
  }

  if (!dueItems || dueItems.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Process each item ──────────────────────────────────────────────────────
  const results = await Promise.allSettled(
    dueItems.map(async (item) => {
      // Mark as processing to prevent double-processing on parallel runs
      await supabase
        .from('hyperledger_enrollment_queue')
        .update({ status: 'processing' })
        .eq('id', item.id)

      const attempt = item.attempts + 1
      const result  = await callHyperledgerEnroll(
        item.event_name,
        item.actor_id,
        item.profile_id,
        item.intent,
      )

      if (result.success) {
        // Success — mark done and record fabric identity
        await supabase
          .from('hyperledger_enrollment_queue')
          .update({
            status:        'success',
            attempts:      attempt,
            fabric_user_id: result.fabricUserId,
            msp_id:        result.mspId,
            enrolled_at:   new Date().toISOString(),
            last_error:    null,
          })
          .eq('id', item.id)

        // Write audit log
        await supabase
          .from('audit_logs')
          .insert({
            event_type:   'hyperledger_enrolled',
            actor_id:     item.actor_id,
            profile_id:   item.profile_id,
            performed_by: item.profile_id,
            details: {
              intent:        item.intent,
              event_name:    item.event_name,
              fabric_user_id: result.fabricUserId,
              msp_id:        result.mspId,
              attempt,
            },
          })

        return { id: item.id, status: 'success' }

      } else {
        // Failure — schedule retry or exhaust
        const isExhausted = attempt >= MAX_ATTEMPTS
        const delayMins   = RETRY_DELAYS_MINUTES[attempt] ?? 360
        const nextRetry   = isExhausted
          ? null
          : new Date(Date.now() + delayMins * 60 * 1000).toISOString()

        await supabase
          .from('hyperledger_enrollment_queue')
          .update({
            status:        isExhausted ? 'exhausted' : 'retrying',
            attempts:      attempt,
            last_error:    result.error,
            next_retry_at: nextRetry,
          })
          .eq('id', item.id)

        if (isExhausted) {
          console.error(
            `[hlf-queue] Exhausted after ${attempt} attempts:`,
            item.id, result.error,
          )
        }

        return { id: item.id, status: isExhausted ? 'exhausted' : 'retrying', error: result.error }
      }
    }),
  )

  const summary = {
    processed: results.length,
    success:   results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'success').length,
    retrying:  results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'retrying').length,
    exhausted: results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'exhausted').length,
    errors:    results.filter(r => r.status === 'rejected').length,
  }

  console.log('[hlf-queue] Processed:', summary)

  return new Response(JSON.stringify(summary), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  })
}