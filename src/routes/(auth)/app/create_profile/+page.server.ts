// src/routes/(auth)/app/create_profile/+page.server.ts
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import {
  loadProfileFormData,
  saveProfile,
  type Organization,
} from '$lib/features/profile/profile.service'

export type { Organization }

// ── Helper ────────────────────────────────────────────────────────────────────
function hasFullProfile(
  profile: { full_name?: string | null; phone?: string | null } | null | undefined,
): boolean {
  if (!profile) return false
  const name = profile.full_name?.trim() ?? ''
  if (!name || name.toLowerCase() === 'user') return false
  if (!profile.phone?.trim()) return false
  return true
}

// ── Load ──────────────────────────────────────────────────────────────────────
export const load: PageServerLoad = async ({ locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session) redirect(303, '/login/sign_in')

  const { profile, organizations, linkedOrgIds } = await loadProfileFormData(
    locals.supabase,
    session.user.id,
  )

  if (hasFullProfile(profile)) redirect(303, '/app/select_plan')

  return {
    profile,
    organizations,
    linkedOrgIds,
    user: { email: session.user.email ?? '' },
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    const { session } = await locals.safeGetSession()
    if (!session) redirect(303, '/login/sign_in')

    const formData = await request.formData()

    const input = {
      fullName: (formData.get('fullName') as string | null)?.trim() ?? '',
      phone: (formData.get('phone') as string | null)?.trim() ?? '',
      companyName: (formData.get('companyName') as string | null)?.trim() ?? '',
      website: (formData.get('website') as string | null)?.trim() ?? '',

      // New enrichment fields
      startingLocations: (formData.get('startingLocations') as string | null)?.trim() ?? '',
      destinations: (formData.get('destinations') as string | null)?.trim() ?? '',
      highwayCorridors: formData.getAll('highwayCorridors') as string[],
      routesToTrack: formData.getAll('routesToTrack') as string[],
      preferredVehicleType: formData.getAll('preferredVehicleType') as string[],
      socialMediaLinks: (formData.get('socialMediaLinks') as string | null)?.trim() ?? '',
      emergencyContacts: (formData.get('emergencyContacts') as string | null)?.trim() ?? '',
      languagesSpoken: formData.getAll('languagesSpoken') as string[],
      timeZone: (formData.get('timeZone') as string | null)?.trim() ?? '',

      // Working hours (optional)
      workingHoursStart: (formData.get('workingHoursStart') as string | null)?.trim() ?? '',
      workingHoursEnd: (formData.get('workingHoursEnd') as string | null)?.trim() ?? '',

      orgIds: formData.getAll('org_ids') as string[],
    }

    const result = await saveProfile(locals.supabase, session.user.id, input)

    if (result && 'fields' in result) {
      return fail(400, {
        errorFields: result.fields,
        errorMessage: result.message,
        ...input,
      })
    }

    if (result && 'serverError' in result) {
      return fail(500, {
        errorFields: [],
        errorMessage: result.serverError,
        ...input,
      })
    }

    redirect(303, '/app/select_plan')
  },
}