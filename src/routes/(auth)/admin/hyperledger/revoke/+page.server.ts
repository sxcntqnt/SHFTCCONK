// src/routes/admin/hyperledger/revoke/+page.server.ts

import { fail, redirect }        from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { revokeUser }            from '../utils/enrollment'
import { ACTOR_TYPES }           from '$lib/features/auth/contexts/context.template'

export const load: PageServerLoad = async ({ locals, url }) => {
  const { userState } = locals
  if (!userState) throw redirect(303, '/login')

  const isAdmin = userState.activeContexts.some(
    ctx =>
      [ACTOR_TYPES.SUPER_ADMIN, ACTOR_TYPES.ADMIN].includes(
        ctx.type as typeof ACTOR_TYPES.SUPER_ADMIN
      ) && ctx.status === 'active'
  )
  if (!isAdmin) throw redirect(303, '/admin/dashboard')

  return { prefillUserId: url.searchParams.get('userId') ?? '' }
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const { userState } = locals
    const isAdmin = userState?.activeContexts.some(
      ctx =>
        [ACTOR_TYPES.SUPER_ADMIN, ACTOR_TYPES.ADMIN].includes(
          ctx.type as typeof ACTOR_TYPES.SUPER_ADMIN
        ) && ctx.status === 'active'
    ) ?? false
    if (!isAdmin) return fail(403, { error: 'Forbidden' })

    const form   = await request.formData()
    const userId = String(form.get('userId') ?? '').trim()
    const reason = String(form.get('reason') ?? 'privilegewithdrawn').trim()
    const type   = String(form.get('entityType') ?? 'driver') as any

    if (!userId) return fail(400, { error: 'User ID is required.' })

    try {
      await revokeUser(userId, reason, type)

      await locals.supabase
        .from('audit_logs')
        .insert({
          event_type:   'hyperledger_identity_revoked',
          performed_by: locals.user!.id,
          details:      { userId, reason, type },
        })

      return { success: true, userId }
    } catch (err) {
      return fail(500, { error: `Revocation failed: ${String(err)}` })
    }
  },
}

