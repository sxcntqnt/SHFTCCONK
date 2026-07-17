// src/lib/features/profile/profile.service.ts
//
// Shared business logic for profile creation / update.
// Used by:
//   /onboarding/[intent]/create_profile/+page.server.ts  (form action)
//   /app/settings/+page.server.ts                        (edit profile —
//     ⚠️ NOT YET MIGRATED as of this change; still expected to call the
//     old supabase-first signature. Update its call sites when that route
//     is migrated, or this file will break it immediately.)
//
// MIGRATION (Supabase → pg.ts):
//   All functions now take `profileId: string` as their first argument
//   instead of a SupabaseClient. Queries run inside withProfileContext(),
//   which sets app.current_profile_id via SET LOCAL for RLS, scoped to a
//   single transaction — same pattern as
//   onboarding/[intent]/+page.server.ts and root +layout.server.ts.
//
//   Supabase's { data, error } return shape is gone — postgres.js-style
//   tagged-template queries throw on failure, so DB calls are now wrapped
//   in try/catch where the old code checked `error`.
//
//   actor_requests.payload (jsonb) is written via tx.json(obj) — porsager/
//   postgres requires this explicit wrapper to serialize a JS object into
//   a jsonb param; a bare interpolated object is not auto-converted.
//
// EXPORTS:
//   _hasFullProfile   — profile completeness gate (used by layout guards)
//   loadProfileFormData
//   saveProfile
//   validateProfileInput
//   normalisePhone
//   upsertProfile
//   upsertActorRequest

import { withProfileContext } from "$lib/server/pg"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfileInput {
  fullName: string
  phone: string
  companyName?: string
  website?: string
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

// ─────────────────────────────────────────────────────────────────────────────
// Profile completeness gate
//
// Single source of truth — imported by:
//   /onboarding/[intent]/create_profile/+page.server.ts  (skip if already complete)
//   /app/settings/+layout.server.ts                      (redirect if incomplete)
//   /app/security/+layout.server.ts                      (redirect if incomplete)
//
// ⚠️  HELD: extending this check (date_of_birth, guardian) deferred
//     until minor flow is finalized.
// ─────────────────────────────────────────────────────────────────────────────

export function _hasFullProfile(
  profile:
    | { full_name?: string | null; phone?: string | null }
    | null
    | undefined,
): boolean {
  if (!profile) return false
  const name = profile.full_name?.trim() ?? ""
  if (!name || name.toLowerCase() === "user") return false
  if (!profile.phone?.trim()) return false
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export function validateProfileInput(
  input: ProfileInput,
): ProfileValidationError | null {
  const fields: string[] = []

  if (!input.fullName?.trim()) fields.push("fullName")

  const phoneDigits = input.phone?.replace(/\D/g, "") ?? ""
  if (!phoneDigits || phoneDigits.length < 9) fields.push("phone")

  if (fields.length > 0) {
    return { fields, message: "Please fix the highlighted fields." }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Phone normalisation
// ─────────────────────────────────────────────────────────────────────────────

export function normalisePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "")
  if (digits.startsWith("0")) digits = "254" + digits.slice(1)
  if (!digits.startsWith("+")) digits = "+" + digits
  return digits
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: upsertProfile
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertProfile(
  profileId: string,
  input: ProfileInput & { normalisedPhone: string },
): Promise<string | null> {
  try {
    await withProfileContext(profileId, (tx) =>
      tx`
        INSERT INTO profiles (
          id, full_name, phone, company_name, website,
          starting_locations, destinations, highway_corridors,
          routes_to_track, preferred_vehicle_type, social_media_links,
          emergency_contacts, languages_spoken, time_zone,
          working_hours_start, working_hours_end, updated_at
        ) VALUES (
          ${profileId},
          ${input.fullName.trim()},
          ${input.normalisedPhone},
          ${input.companyName?.trim() || null},
          ${input.website?.trim() || null},
          ${input.startingLocations?.trim() || null},
          ${input.destinations?.trim() || null},
          ${input.highwayCorridors?.length ? input.highwayCorridors : null},
          ${input.routesToTrack?.length ? input.routesToTrack : null},
          ${input.preferredVehicleType?.length ? input.preferredVehicleType : null},
          ${input.socialMediaLinks?.trim() || null},
          ${input.emergencyContacts?.trim() || null},
          ${input.languagesSpoken?.length ? input.languagesSpoken : null},
          ${input.timeZone?.trim() || "Africa/Nairobi"},
          ${input.workingHoursStart || null},
          ${input.workingHoursEnd || null},
          now()
        )
        ON CONFLICT (id) DO UPDATE SET
          full_name              = EXCLUDED.full_name,
          phone                  = EXCLUDED.phone,
          company_name           = EXCLUDED.company_name,
          website                = EXCLUDED.website,
          starting_locations     = EXCLUDED.starting_locations,
          destinations           = EXCLUDED.destinations,
          highway_corridors      = EXCLUDED.highway_corridors,
          routes_to_track        = EXCLUDED.routes_to_track,
          preferred_vehicle_type = EXCLUDED.preferred_vehicle_type,
          social_media_links     = EXCLUDED.social_media_links,
          emergency_contacts     = EXCLUDED.emergency_contacts,
          languages_spoken       = EXCLUDED.languages_spoken,
          time_zone              = EXCLUDED.time_zone,
          working_hours_start    = EXCLUDED.working_hours_start,
          working_hours_end      = EXCLUDED.working_hours_end,
          updated_at             = EXCLUDED.updated_at
      `,
    )
    return null
  } catch (error) {
    console.error("[profile.service] upsert error:", error)
    return "Failed to save profile. Please try again."
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: upsertActorRequest
//
// Merges desired org IDs into a pending actor_request payload.
// Passengers selecting SACCOs during create_profile — not role assignment.
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertActorRequest(
  profileId: string,
  orgIds: string[],
  normalisedPhone: string,
): Promise<void> {
  if (orgIds.length === 0) return

  try {
    await withProfileContext(profileId, async (tx) => {
      const [existing] = await tx`
        SELECT id, payload
        FROM actor_requests
        WHERE profile_id = ${profileId} AND status = 'pending'
        LIMIT 1
      `

      if (existing) {
        const merged = Array.from(
          new Set([
            ...((existing.payload as any)?.desired_org_ids ?? []),
            ...orgIds,
          ]),
        )

        await tx`
          UPDATE actor_requests
          SET payload = ${tx.json({
            ...(existing.payload as object),
            desired_org_ids: merged,
            phone: normalisedPhone,
          })}
          WHERE id = ${existing.id}
        `
      } else {
        await tx`
          INSERT INTO actor_requests (profile_id, requested_type, status, payload)
          VALUES (
            ${profileId},
            'GUEST',
            'pending',
            ${tx.json({ desired_org_ids: orgIds, phone: normalisedPhone })}
          )
        `
      }
    })
  } catch (error) {
    console.error("[profile.service] actor_request upsert error:", error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: saveProfile
//
// Full save flow:
//   1. Validate
//   2. Normalise phone
//   3. Upsert profile
//   4. Upsert actor_request with org IDs (passenger SACCO preference)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveProfile(
  profileId: string,
  input: ProfileInput,
): Promise<ProfileValidationError | { serverError: string } | null> {
  const validationError = validateProfileInput(input)
  if (validationError) return validationError

  const normalisedPhone = normalisePhone(input.phone)

  const saveError = await upsertProfile(profileId, {
    ...input,
    normalisedPhone,
  })
  if (saveError) return { serverError: saveError }

  await upsertActorRequest(profileId, input.orgIds ?? [], normalisedPhone)
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Load: loadProfileFormData
// ─────────────────────────────────────────────────────────────────────────────

export async function loadProfileFormData(profileId: string) {
  return withProfileContext(profileId, async (tx) => {
    const [profileRows, orgsRaw, existingRequests] = await Promise.all([
      tx`
        SELECT
          full_name, phone, company_name, website,
          starting_locations, destinations, highway_corridors,
          routes_to_track, preferred_vehicle_type, social_media_links,
          emergency_contacts, languages_spoken, time_zone,
          working_hours_start, working_hours_end
        FROM profiles
        WHERE id = ${profileId}
        LIMIT 1
      `,
      tx`
        SELECT id, name, status, metadata
        FROM organizations
        WHERE status = 'active'
        ORDER BY name ASC
      `,
      tx`
        SELECT payload
        FROM actor_requests
        WHERE profile_id = ${profileId} AND status = 'pending'
      `,
    ])

    const organizations: Organization[] = (orgsRaw ?? []).map((o: any) => ({
      id: o.id,
      name: o.name,
      status: o.status,
      type: (o.metadata as any)?.type ?? null,
      county: (o.metadata as any)?.county ?? null,
    }))

    const linkedOrgIds: string[] = (existingRequests ?? []).flatMap(
      (r: any) => (r.payload as any)?.desired_org_ids ?? [],
    )

    return {
      profile: profileRows?.[0] ?? null,
      organizations,
      linkedOrgIds,
    }
  })
}
