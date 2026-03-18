/**
 * src/routes/(auth)/admin/+page.server.ts
 *
 * Admin dashboard — all KPI data loaded from DB in parallel.
 * Also handles inline approve/reject shortcuts from the dashboard card.
 *
 * DATA:
 *   pendingRequestCount    — actor_requests WHERE status='pending'
 *   totalUserCount         — profiles count
 *   totalOrgCount          — organizations count
 *   totalJurisdictionCount — actor_jurisdictions count
 *   criticalAuditCount     — audit_logs severity='critical' last 24h
 *   recentRequests         — last 5 actor_requests with profile join
 *   recentAuditEntries     — last 5 audit_logs with performer profile
 *   orgSummaries           — organizations + member/vehicle counts
 */

import type { PageServerLoad, Actions } from './$types'
import { fail, redirect }               from '@sveltejs/kit'

async function _requireAdmin(locals: App.Locals): Promise<boolean> {
  const { supabase, user } = locals
  if (!user) return false
  const { data } = await supabase
    .from('actors').select('id')
    .eq('profile_id', user.id)
    .in('type', ['ADMIN', 'SUPER_ADMIN'])
    .eq('status', 'active').limit(1)
  return !!(data?.length)
}

export const load: PageServerLoad = async ({ locals }) => {
  const { supabase } = locals
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: pendingRequestCount },
    { count: totalUserCount },
    { count: totalJurisdictionCount },
    { count: criticalAuditCount },
    { count: totalOrgCount },
    { data: recentRequests },
    { data: recentAuditEntries },
    { data: orgs },
  ] = await Promise.all([
    supabase.from('actor_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('actor_jurisdictions').select('*', { count: 'exact', head: true }),
    supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('severity', 'critical').gte('created_at', yesterday),
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('actor_requests').select(`id, requested_type, status, payload, created_at, profiles ( full_name, avatar_url )`).order('created_at', { ascending: false }).limit(5),
    supabase.from('audit_logs').select(`id, event_type, performed_by, details, created_at, severity, performer:profiles!audit_logs_performed_by_fkey ( full_name )`).order('created_at', { ascending: false }).limit(5),
    supabase.from('organizations').select('id, name, status, metadata, created_at').order('created_at', { ascending: false }).limit(8),
  ])

  // Counts per org — same efficient pattern as /admin/organizations
  const orgIds = (orgs ?? []).map((o) => o.id)
  let memberCounts:  Record<string, number> = {}
  let vehicleCounts: Record<string, number> = {}

  if (orgIds.length > 0) {
    const [{ data: memberRows }, { data: vehicleRows }] = await Promise.all([
      supabase.from('organization_members').select('organization_id').in('organization_id', orgIds),
      supabase.from('vehicles').select('organization_id').in('organization_id', orgIds),
    ])
    for (const m of memberRows  ?? []) memberCounts[m.organization_id]  = (memberCounts[m.organization_id]  ?? 0) + 1
    for (const v of vehicleRows ?? []) {
      if (v.organization_id) vehicleCounts[v.organization_id] = (vehicleCounts[v.organization_id] ?? 0) + 1
    }
  }

  return {
    pendingRequestCount:    pendingRequestCount    ?? 0,
    totalUserCount:         totalUserCount         ?? 0,
    totalOrgCount:          totalOrgCount          ?? 0,
    totalJurisdictionCount: totalJurisdictionCount ?? 0,
    criticalAuditCount:     criticalAuditCount     ?? 0,
    recentRequests:         recentRequests         ?? [],
    recentAuditEntries:     recentAuditEntries     ?? [],
    orgSummaries: (orgs ?? []).map((o) => ({
      ...o,
      memberCount:  memberCounts[o.id]  ?? 0,
      vehicleCount: vehicleCounts[o.id] ?? 0,
    })),
  }
}

export const actions: Actions = {
  approve_request: async ({ request, locals }) => {
    const { supabase } = locals
    if (!(await _requireAdmin(locals))) return fail(403, { error: 'Admin access required' })
    const id = ((await request.formData()).get('request_id') as string)?.trim()
    if (!id) return fail(400, { error: 'Missing request id' })
    const { error } = await supabase.rpc('approve_actor_request', { request_id: id, binding_type: null, binding_target: null })
    if (error) return fail(500, { error: error.message })
    throw redirect(303, '/admin')
  },

  reject_request: async ({ request, locals }) => {
    const { supabase, user } = locals
    if (!(await _requireAdmin(locals))) return fail(403, { error: 'Admin access required' })
    const id = ((await request.formData()).get('request_id') as string)?.trim()
    if (!id) return fail(400, { error: 'Missing request id' })
    const { error } = await supabase.from('actor_requests')
      .update({ status: 'rejected', processed_at: new Date().toISOString(), processed_by: user?.id })
      .eq('id', id).eq('status', 'pending')
    if (error) return fail(500, { error: error.message })
    throw redirect(303, '/admin')
  },
}