import type { PageServerLoad, Actions } from './$types'
import { fail } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ locals }) => {
  // Fetch profiles
  const { data: profiles, error: pErr } = await (locals.supabase as any)
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (pErr) console.error('profiles list error', pErr)

  const profileList = profiles ?? []
  const profileIds = profileList.map((p: any) => p.id)

  // Fetch actors per profile
  let actorsByProfile: Record<string, any[]> = {}
  if (profileIds.length > 0) {
    try {
      const { data: actors, error: aErr } = await (locals.supabase as any)
        .from('actors')
        .select('id, type, status, profile_id')
        .in('profile_id', profileIds)

      if (!aErr && actors) {
        for (const a of actors) {
          if (!actorsByProfile[a.profile_id]) actorsByProfile[a.profile_id] = []
          actorsByProfile[a.profile_id].push(a)
        }
      }
    } catch (e) { /* ignore */ }
  }

  // Fetch org memberships
  let orgMembershipsByProfile: Record<string, any[]> = {}
  if (profileIds.length > 0) {
    try {
      // Get actor ids for all profiles first
      const allActorIds = Object.values(actorsByProfile).flat().map((a: any) => a.id)
      if (allActorIds.length > 0) {
        const { data: memberships, error: mErr } = await (locals.supabase as any)
          .from('organization_members')
          .select('actor_id, organization_id, role, organizations ( name )')
          .in('actor_id', allActorIds)

        if (!mErr && memberships) {
          // Map back to profile_id
          const actorToProfile: Record<string, string> = {}
          for (const [pid, actors] of Object.entries(actorsByProfile)) {
            for (const a of actors as any[]) {
              actorToProfile[a.id] = pid
            }
          }
          for (const m of memberships) {
            const pid = actorToProfile[m.actor_id]
            if (pid) {
              if (!orgMembershipsByProfile[pid]) orgMembershipsByProfile[pid] = []
              orgMembershipsByProfile[pid].push(m)
            }
          }
        }
      }
    } catch (e) { /* ignore */ }
  }

  return {
    session: locals.session ?? null,
    profiles: profileList,
    actorsByProfile,
    orgMembershipsByProfile
  }
}

export const actions: Actions = {
  update_profile: async ({ request, locals }) => {
    const form = await request.formData()
    const id = form.get('id') as string
    const full_name = (form.get('full_name') as string)?.trim() || null
    const company_name = (form.get('company_name') as string)?.trim() || null

    if (!id) return fail(400, { error: 'Missing profile id' })

    const { error } = await (locals.supabase as any)
      .from('profiles')
      .update({ full_name, company_name, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('update profile error', error)
      return fail(500, { error: error.message })
    }

    return { success: true }
  }
}