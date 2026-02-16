import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  // only allow admins to view audit logs
  let isAdmin = false
  try {
    const { data: aData } = await (locals.supabase as any)
      .from('actors')
      .select('id')
      .eq('profile_id', locals.user?.id)
      .eq('type', 'ADMIN')
      .limit(1)
    if (aData && aData.length > 0) isAdmin = true
  } catch (e) {
    // ignore
  }

  if (!isAdmin) return { allowed: false, logs: [] }

  const eventType = url.searchParams.get('event_type')
  const performedBy = url.searchParams.get('performed_by')

  let query = (locals.supabase as any).from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500)
  if (eventType) query = query.eq('event_type', eventType)
  if (performedBy) query = query.eq('performed_by', performedBy)

  const { data: logs, error } = await query
  if (error) {
    console.error('audit_logs load error', error)
    return { allowed: true, logs: [] }
  }

  return { allowed: true, logs: logs ?? [] }
}
