/**
 * src/routes/(auth)/admin/+layout.server.ts
 *
 * FIXES FROM PREVIOUS VERSION:
 *   - LayoutLoad → LayoutServerLoad  (was running on client, DB calls need server)
 *   - Supabase calls now use typed client from locals.supabase
 *   - pendingRequestCount now also counts by requested_type for nav badge breakdown
 *   - Added orgCount for admin dashboard summary
 */

import type { LayoutServerLoad } from './$types'
import { redirect }             from '@sveltejs/kit'
import { requireAdminAccess }   from '$lib/security/authGuard'

export const load: LayoutServerLoad = async (event) => {
  // Blocks non-admins. Auto-switches to ADMIN actor if needed.
  // Throws redirect(302, '/unauthorized') if no admin actor found.
  await requireAdminAccess(event)

  const { supabase, session, user } = event.locals

  if (!session || !user) throw redirect(302, '/login')

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: pendingRequestCount },
    { count: recentAuditCount },
    { count: orgCount },
    { data: pendingByType },
  ] = await Promise.all([
    // Total pending requests — badge on nav link
    supabase
      .from('actor_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),

    // Audit events in last 24h
    supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday),

    // Total active orgs — for dashboard summary card
    supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),

    // Breakdown by type — so nav can show "3 org_member, 1 crew" etc.
    supabase
      .from('actor_requests')
      .select('requested_type')
      .eq('status', 'pending'),
  ])

  // Count by type client-side (avoids a GROUP BY RPC)
  const typeBreakdown: Record<string, number> = {}
  for (const row of pendingByType ?? []) {
    typeBreakdown[row.requested_type] = (typeBreakdown[row.requested_type] ?? 0) + 1
  }

  return {
    session,
    user,
    pendingRequestCount:  pendingRequestCount ?? 0,
    recentAuditCount:     recentAuditCount    ?? 0,
    orgCount:             orgCount             ?? 0,
    typeBreakdown,
  }
}