// src/routes/api/admin/hyperledger/retry/+server.ts
//
// Manual re-trigger for exhausted or failed Hyperledger enrollments.
// Called from the admin dashboard when an enrollment needs intervention.
//
// SECURITY: requires active SUPER_ADMIN or ADMIN actor in userState.

import type { RequestHandler } from './$types'
import { error }               from '@sveltejs/kit'
import { ACTOR_TYPES }         from '$lib/features/auth/contexts/context.template'

export const POST: RequestHandler = async ({ request, locals }) => {
  const { userState, supabaseServiceRole } = locals

  // ── Gate — admin only ─────────────────────────────────────────────────────
  const isAdmin = userState?.activeContexts.some(
    ctx =>
      [ACTOR_TYPES.SUPER_ADMIN, ACTOR_TYPES.ADMIN].includes(
        ctx.type as typeof ACTOR_TYPES.SUPER_ADMIN
      ) && ctx.status === 'active'
  ) ?? false

  if (!isAdmin) {
    throw error(403, 'Admin access required')
  }

  const body       = await request.json()
  const queueId    = body.queueId as string | undefined
  const actorId    = body.actorId as string | undefined

  if (!queueId && !actorId) {
    throw error(400, 'queueId or actorId required')
  }

  // ── Reset queue item to pending ───────────────────────────────────────────
  const query = supabaseServiceRole
    .from('hyperledger_enrollment_queue')
    .update({
      status:        'pending',
      next_retry_at: null,
      last_error:    null,
    })

  const { data: reset, error: resetError } = queueId
    ? await query.eq('id', queueId).select('id, actor_id, intent').single()
    : await query.eq('actor_id', actorId!).in('status', ['exhausted', 'failed']).select('id, actor_id, intent')

  if (resetError) {
    throw error(500, `Reset failed: ${resetError.message}`)
  }

  // Audit the manual re-trigger
  await supabaseServiceRole
    .from('audit_logs')
    .insert({
      event_type:   'hyperledger_manual_retry',
      performed_by: locals.user!.id,
      details: {
        queue_id:  queueId,
        actor_id:  actorId,
        reset:     reset,
      },
    })

  return new Response(JSON.stringify({ reset: true, items: reset }), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  })
}