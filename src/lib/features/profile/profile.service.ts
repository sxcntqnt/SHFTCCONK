// src/lib/features/profile/profile.service.ts
//
// Shared business logic for profile creation / update.
// Used by both:
//   +page.server.ts  (form action)
//   +server.ts       (JSON API)

// src/lib/features/profile/profile.service.ts
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ProfileInput {
  fullName: string
  phone: string
  companyName?: string
  website?: string

  // New enrichment fields
  startingLocations?: string
  destinations?: string
  highwayCorridors?: string[]
  routesToTrack?: string[]
  preferredVehicleType?: string[]
  socialMediaLinks?: string
  emergencyContacts?: string
  languagesSpoken?: string[]
  timeZone?: string
  workingHoursStart?: string
  workingHoursEnd?: string

  orgIds?: string[]
}

export interface ProfileValidationError {
  fields: string[]
  message: string
}

export interface Organization {
  id: string
  name: string
  status: string
  type: string | null
  county: string | null
}

// ── Validation ─────────────────────────────────────────────────────────────────
export function validateProfileInput(
  input: ProfileInput,
): ProfileValidationError | null {
  const fields: string[] = []

  if (!input.fullName?.trim()) fields.push('fullName')

  const phoneDigits = input.phone?.replace(/\D/g, '') ?? ''
  if (!phoneDigits || phoneDigits.length < 9) fields.push('phone')

  // You can add more validation here (e.g. for phone format, URLs, etc.)

  if (fields.length > 0) {
    return { fields, message: 'Please fix the highlighted fields.' }
  }
  return null
}

// ── Phone normalisation (unchanged) ───────────────────────────────────────────
export function normalisePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '254' + digits.slice(1)
  if (!digits.startsWith('+')) digits = '+' + digits
  return digits
}

// ── Core operations ────────────────────────────────────────────────────────────
export async function upsertProfile(
  supabase: SupabaseClient,
  userId: string,
  input: ProfileInput & { normalisedPhone: string },
): Promise<string | null> {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        full_name: input.fullName.trim(),
        phone: input.normalisedPhone,
        company_name: input.companyName?.trim() || null,
        website: input.website?.trim() || null,

        // New fields
        starting_locations: input.startingLocations?.trim() || null,
        destinations: input.destinations?.trim() || null,
        highway_corridors: input.highwayCorridors?.length ? input.highwayCorridors : null,
        routes_to_track: input.routesToTrack?.length ? input.routesToTrack : null,
        preferred_vehicle_type: input.preferredVehicleType?.length ? input.preferredVehicleType : null,
        social_media_links: input.socialMediaLinks?.trim() || null,
        emergency_contacts: input.emergencyContacts?.trim() || null,
        languages_spoken: input.languagesSpoken?.length ? input.languagesSpoken : null,
        time_zone: input.timeZone?.trim() || null,
        working_hours_start: input.workingHoursStart || null,
        working_hours_end: input.workingHoursEnd || null,

        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (error) {
    console.error('[profile.service] upsert error:', error)
    return 'Failed to save profile. Please try again.'
  }
  return null
}
// ── Core operations ────────────────────────────────────────────────────────────

/**
 * Upsert the user's profile row.
 * Returns null on success, or an error message string on failure.
 */
export async function upsertProfile(
  supabase: SupabaseClient,
  userId:   string,
  input:    ProfileInput & { normalisedPhone: string },
): Promise<string | null> {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id:           userId,
        full_name:    input.fullName.trim(),
        phone:        input.normalisedPhone,
        company_name: input.companyName?.trim() || null,
        website:      input.website?.trim()     || null,
        updated_at:   new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (error) {
    console.error('[profile.service] upsert error:', error)
    return 'Failed to save profile. Please try again.'
  }

  return null
}

/**
 * Upsert desired org IDs into the user's pending actor_request payload.
 * Creates a new request if none exists; merges into the existing one if it does.
 */
export async function upsertActorRequest(
  supabase:         SupabaseClient,
  userId:           string,
  orgIds:           string[],
  normalisedPhone:  string,
): Promise<void> {
  if (orgIds.length === 0) return

  const { data: existing } = await supabase
    .from('actor_requests')
    .select('id, payload')
    .eq('profile_id', userId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    const merged = Array.from(
      new Set([
        ...((existing.payload as any)?.desired_org_ids ?? []),
        ...orgIds,
      ]),
    )
    const { error } = await supabase
      .from('actor_requests')
      .update({
        payload: {
          ...(existing.payload as object),
          desired_org_ids: merged,
          phone:           normalisedPhone,
        },
      })
      .eq('id', existing.id)

    if (error) console.error('[profile.service] actor_request update error:', error)
  } else {
    const { error } = await supabase
      .from('actor_requests')
      .insert({
        profile_id:     userId,
        requested_type: 'GUEST',
        status:         'pending',
        payload: {
          desired_org_ids: orgIds,
          phone:           normalisedPhone,
        },
      })

    if (error) console.error('[profile.service] actor_request insert error:', error)
  }
}

/**
 * Run the full profile save flow:
 *   1. Validate
 *   2. Normalise phone
 *   3. Upsert profile
 *   4. Upsert actor_request with org IDs
 *
 * Returns null on success, or a ProfileValidationError / message string on failure.
 */
export async function saveProfile(
  supabase: SupabaseClient,
  userId: string,
  input: ProfileInput,
): Promise<ProfileValidationError | { serverError: string } | null> {
  const validationError = validateProfileInput(input)
  if (validationError) return validationError

  const normalisedPhone = normalisePhone(input.phone)

  const saveError = await upsertProfile(supabase, userId, { ...input, normalisedPhone })
  if (saveError) return { serverError: saveError }

  await upsertActorRequest(supabase, userId, input.orgIds ?? [], normalisedPhone)
  return null
}

// ── Load (updated to fetch new fields) ─────────────────────────────────────────
export async function loadProfileFormData(
  supabase: SupabaseClient,
  userId: string,
) {
  const [
    { data: profile },
    { data: orgsRaw, error: orgError },
    { data: existingRequests },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select(`
        full_name, 
        phone, 
        company_name, 
        website,
        starting_locations,
        destinations,
        highway_corridors,
        routes_to_track,
        preferred_vehicle_type,
        social_media_links,
        emergency_contacts,
        languages_spoken,
        time_zone,
        working_hours_start,
        working_hours_end
      `)
      .eq('id', userId)
      .maybeSingle(),

    supabase
      .from('organizations')
      .select('id, name, status, metadata')
      .eq('status', 'active')
      .order('name', { ascending: true }),

    supabase
      .from('actor_requests')
      .select('payload')
      .eq('profile_id', userId)
      .eq('status', 'pending'),
  ])

  if (orgError) console.error('[profile.service] organizations load error:', orgError)

  const organizations: Organization[] = (orgsRaw ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    status: o.status,
    type: (o.metadata as any)?.type ?? null,
    county: (o.metadata as any)?.county ?? null,
  }))

  const linkedOrgIds: string[] = (existingRequests ?? []).flatMap(
    (r) => (r.payload as any)?.desired_org_ids ?? [],
  )

  return { 
    profile: profile ?? null, 
    organizations, 
    linkedOrgIds 
  }
}