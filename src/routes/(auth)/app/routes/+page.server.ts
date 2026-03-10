import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = locals.session
  const user = locals.user
  if (!session || !user) throw redirect(303, '/login/sign_in')

  // ─── User's tracked / favorited routes ───
  let trackedRoutes: any[] = []
  try {
    // Routes the user has subscribed to via contact_requests
    const { data: subs } = await (locals.supabase as any)
      .from('contact_requests')
      .select('id, company_name, message_body, created_at')
      .eq('email', user.email)
      .like('message_body', '%route_subscription%')
      .order('created_at', { ascending: false })

    if (subs) {
      for (const sub of subs) {
        try {
          const payload = JSON.parse(sub.message_body)
          if (payload.type === 'route_subscription') {
            trackedRoutes.push({
              id: sub.id,
              orgName: sub.company_name,
              organizationId: payload.organization_id,
              allRoutes: payload.all_routes,
              routeIds: payload.route_ids || [],
              subscribedAt: payload.subscribed_at || sub.created_at
            })
          }
        } catch { /* skip malformed */ }
      }
    }
  } catch (e) { /* ignore */ }

  // ─── Fetch actual stage_assignments for tracked orgs ───
  const trackedOrgIds = [...new Set(trackedRoutes.map(r => r.organizationId).filter(Boolean))]
  let stageRoutes: any[] = []
  if (trackedOrgIds.length > 0) {
    try {
      const { data: stages } = await (locals.supabase as any)
        .from('stage_assignments')
        .select('id, stage_name, route, organization_id, created_at, organizations ( name )')
        .in('organization_id', trackedOrgIds)
        .order('stage_name')
        .limit(100)

      if (stages) stageRoutes = stages
    } catch (e) { /* ignore */ }
  }

  // ─── User's booking history for route inference ───
  let recentBookings: any[] = []
  try {
    // Get user's actor ids
    const { data: actors } = await (locals.supabase as any)
      .from('actors')
      .select('id')
      .eq('profile_id', user.id)

    const actorIds = (actors || []).map((a: any) => a.id)
    if (actorIds.length > 0) {
      const { data: bookings } = await (locals.supabase as any)
        .from('bookings')
        .select('id, route_from, route_to, fare, status, created_at, vehicle_id, vehicles ( reg_number, organization_id, organizations ( name ) )')
        .in('passenger_actor_id', actorIds)
        .order('created_at', { ascending: false })
        .limit(30)

      if (bookings) recentBookings = bookings
    }
  } catch (e) { /* ignore */ }

  // ─── Derive frequent routes from booking history ───
  const routeFrequency: Record<string, { from: string; to: string; count: number; lastFare: number | null; lastTrip: string; orgName: string | null }> = {}
  for (const b of recentBookings) {
    if (b.route_from && b.route_to) {
      const key = `${b.route_from}→${b.route_to}`
      if (!routeFrequency[key]) {
        routeFrequency[key] = {
          from: b.route_from,
          to: b.route_to,
          count: 0,
          lastFare: b.fare,
          lastTrip: b.created_at,
          orgName: b.vehicles?.organizations?.name || null
        }
      }
      routeFrequency[key].count++
      if (b.created_at > routeFrequency[key].lastTrip) {
        routeFrequency[key].lastTrip = b.created_at
        routeFrequency[key].lastFare = b.fare
      }
    }
  }
  const frequentRoutes = Object.values(routeFrequency)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ─── AI Recommendations placeholder ───
  // In production, this hits the matatu-ai pipeline API endpoint
  // which runs RegionDCL embeddings + RL policy inference.
  // For now, we structure the data shape the frontend expects.
  const aiRecommendations = {
    ready: false, // flip to true when pipeline API is live
    lastUpdated: null as string | null,
    suggestions: [] as Array<{
      id: string
      type: 'route_optimization' | 'fare_prediction' | 'congestion_alert' | 'new_route' | 'safety_alert'
      confidence: number
      title: string
      body: string
      routeFrom?: string
      routeTo?: string
      metadata: Record<string, any>
    }>,
    // Pipeline status for the UI
    pipelineStatus: {
      regiondcl: 'idle' as 'idle' | 'training' | 'ready',
      rl_policy: 'idle' as 'idle' | 'training' | 'ready',
      embeddings: 'idle' as 'idle' | 'stored' | 'stale',
      features: 'idle' as 'idle' | 'enhanced' | 'stale',
    }
  }

  // TODO: Replace with actual API call when pipeline is deployed:
  // const aiRes = await fetch(`${AI_PIPELINE_URL}/recommend`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     user_id: user.id,
  //     recent_routes: frequentRoutes,
  //     tracked_org_ids: trackedOrgIds,
  //   })
  // })
  // if (aiRes.ok) aiRecommendations = await aiRes.json()

  // ─── All available organizations (for discovery) ───
  let allOrgs: any[] = []
  try {
    const { data: orgs } = await (locals.supabase as any)
      .from('organizations')
      .select('id, name, status')
      .eq('status', 'active')
      .order('name')
      .limit(50)
    if (orgs) allOrgs = orgs
  } catch (e) { /* ignore */ }

  return {
    session,
    trackedRoutes,
    stageRoutes,
    frequentRoutes,
    recentBookings: recentBookings.slice(0, 10),
    aiRecommendations,
    allOrgs,
    trackedOrgIds
  }
}