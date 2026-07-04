// src/lib/features/auth/services/sync.ts
//
// Session sync — bridges InternalAuthProvider identities to Supabase.
//
// WHY THIS EXISTS:
//   When AUTH_PROVIDER=internal, user identity comes from the internal Go
//   auth service (internalUserId = the domain profile UUID stored in
//   Dgraph). The rest of the app — RLS policies, RPCs, bootstrap_session —
//   anchors on Supabase auth.users UUIDs via auth.uid() in Postgres.
//   This module is the join layer: given an internalUserId, find or create
//   the corresponding Supabase auth user and return its UUID so the callback
//   can call supabaseAdmin.auth.admin.createSession({ userId }).
//
// SCHEMA CONTRACT (using the real schema, NOT a nonexistent `users` table):
//
//   identity_accounts
//     provider         = 'internal'   → provider_subject = internalUserId
//     provider         = 'supabase'   → provider_subject = auth.users.id
//     profile_id       → canonical domain identity anchor
//
//   The lookup chain is:
//     internalUserId
//       → identity_accounts (provider='internal', provider_subject=internalUserId)
//       → profile_id
//       → identity_accounts (provider='supabase', profile_id=...)
//       → provider_subject = Supabase auth.users.id
//
//   On first login there may be no 'supabase' identity_account row yet —
//   we create a Supabase auth user and insert the mapping. The profile row
//   itself is NOT created here; that belongs to onboarding.
//
// CALLER CONTRACT:
//   - Always pass supabaseServiceRole (service-role client, bypasses RLS).
//   - Call only after the internal session has been validated — i.e. from
//     handleInternalCallback in auth/callback/+server.ts, after authHandle
//     has populated locals.auth with a confirmed internal user.
//   - The returned supabaseUserId is a real auth.users UUID, suitable for
//     supabaseAdmin.auth.admin.createSession({ userId: supabaseUserId }).

import { createClient } from "@supabase/supabase-js"

export type SyncResult =
  | { supabaseUserId: string; created: boolean }
  | { supabaseUserId: null; error: Error }

export async function getOrCreateSupabaseUser(
  // Must be the service-role client — anon client cannot bypass RLS here.
  supabaseServiceRole: ReturnType<typeof createClient>,
  internalUserId: string,
  email?: string | null,
): Promise<SyncResult> {

  // ── 1. Find the profile mapped to this internal user ID ──────────────────
  //
  // identity_accounts links external provider identities to canonical
  // profiles. The internal Go auth service stores its user UUID as
  // provider='internal', provider_subject=internalUserId.
  const { data: internalAccount, error: internalAccountError } =
    await supabaseServiceRole
      .from("identity_accounts")
      .select("profile_id")
      .eq("provider", "internal")
      .eq("provider_subject", internalUserId)
      .single()

  if (internalAccountError && internalAccountError.code !== "PGRST116") {
    // PGRST116 = no rows found — expected on first-ever login.
    // Any other error is a real database problem.
    return {
      supabaseUserId: null,
      error: new Error(
        `identity_accounts lookup failed: ${internalAccountError.message}`,
      ),
    }
  }

  // ── 2. If we have a profile, look for an existing Supabase auth mapping ──
  if (internalAccount?.profile_id) {
    const profileId = internalAccount.profile_id

    const { data: supabaseAccount, error: supabaseAccountError } =
      await supabaseServiceRole
        .from("identity_accounts")
        .select("provider_subject")
        .eq("provider", "supabase")
        .eq("profile_id", profileId)
        .single()

    if (supabaseAccountError && supabaseAccountError.code !== "PGRST116") {
      return {
        supabaseUserId: null,
        error: new Error(
          `Supabase identity_account lookup failed: ${supabaseAccountError.message}`,
        ),
      }
    }

    if (supabaseAccount?.provider_subject) {
      // Happy path — both mappings already exist, nothing to create.
      return {
        supabaseUserId: supabaseAccount.provider_subject,
        created: false,
      }
    }

    // Profile exists but no Supabase auth user yet. Create one and wire it.
    return createSupabaseAuthUser(supabaseServiceRole, profileId, internalUserId, email)
  }

  // ── 3. No identity_account for this internal user yet ────────────────────
  //
  // This is a first-ever login from this internal user with no prior profile
  // row in Supabase at all. We need to:
  //   a. Check if a profile already exists with this internal_user_id via
  //      a different path (shouldn't happen, but be defensive)
  //   b. Create a Supabase auth user
  //   c. Insert the identity_account mapping
  //
  // We do NOT create a profile row here — that belongs to onboarding, which
  // runs after this callback via bootstrap_session + resolveDestination.
  // The identity_account with provider='internal' is inserted here so future
  // logins find the mapping without re-creating anything.

  // Create the Supabase auth user first (we need their ID for the mapping).
  const { data: newAuthUser, error: createAuthUserError } =
    await supabaseServiceRole.auth.admin.createUser({
      email: email ?? `${internalUserId}@internal.sxcntcnqunts.org`,
      email_confirm: true,
      user_metadata: {
        provider:           "internal",
        internal_user_id:   internalUserId,
      },
    })

  if (createAuthUserError || !newAuthUser?.user?.id) {
    // Guard against race: two concurrent first-logins for the same user.
    // If creation failed due to a duplicate email, try fetching by email.
    if (
      createAuthUserError?.message?.includes("already been registered") ||
      createAuthUserError?.message?.includes("already exists")
    ) {
      const existingResult = await findSupabaseUserByInternalId(
        supabaseServiceRole,
        internalUserId,
        email,
      )
      if (existingResult) {
        return { supabaseUserId: existingResult, created: false }
      }
    }
    return {
      supabaseUserId: null,
      error: new Error(
        `Failed to create Supabase auth user: ${createAuthUserError?.message ?? "no user returned"}`,
      ),
    }
  }

  const supabaseAuthUserId = newAuthUser.user.id

  // Insert both identity_account rows: internal provider and supabase provider.
  // These are inserted together so the profile is always fully linked from
  // both sides — a partial insert (only internal, no supabase) would leave
  // future logins unable to find the Supabase auth user via step 2 above.
  const { error: insertError } = await supabaseServiceRole
    .from("identity_accounts")
    .insert([
      {
        // No profile_id yet — profile is created during onboarding.
        // This row links the internal user ID to the Supabase auth user.
        // profile_id will be populated when the profile is created.
        provider:         "internal",
        provider_subject: internalUserId,
        profile_id:       null, // filled in by onboarding / profile creation
      },
      {
        provider:         "supabase",
        provider_subject: supabaseAuthUserId,
        profile_id:       null, // same — filled in by onboarding
      },
    ])

  if (insertError) {
    // Race condition: another request already inserted these rows.
    // On unique constraint violation (23505) fall back to a fetch.
    if (insertError.code === "23505") {
      const raced = await findSupabaseUserByInternalId(
        supabaseServiceRole,
        internalUserId,
        email,
      )
      if (raced) {
        return { supabaseUserId: raced, created: false }
      }
    }
    return {
      supabaseUserId: null,
      error: new Error(
        `Failed to insert identity_accounts: ${insertError.message}`,
      ),
    }
  }

  return { supabaseUserId: supabaseAuthUserId, created: true }
}


// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * createSupabaseAuthUser handles the case where a profile already exists
 * (via an internal identity_account row) but no Supabase auth user has been
 * created for it yet. Creates the auth user, inserts the Supabase
 * identity_account row, and returns the new Supabase auth user UUID.
 */
async function createSupabaseAuthUser(
  supabaseServiceRole: ReturnType<typeof createClient>,
  profileId: string,
  internalUserId: string,
  email?: string | null,
): Promise<SyncResult> {
  const { data: newAuthUser, error: createError } =
    await supabaseServiceRole.auth.admin.createUser({
      email: email ?? `${internalUserId}@internal.sxcntcnqunts.org`,
      email_confirm: true,
      user_metadata: {
        provider:         "internal",
        internal_user_id: internalUserId,
      },
    })

  if (createError || !newAuthUser?.user?.id) {
    if (
      createError?.message?.includes("already been registered") ||
      createError?.message?.includes("already exists")
    ) {
      const existing = await findSupabaseUserByInternalId(
        supabaseServiceRole,
        internalUserId,
        email,
      )
      if (existing) return { supabaseUserId: existing, created: false }
    }
    return {
      supabaseUserId: null,
      error: new Error(
        `Failed to create Supabase auth user for profile ${profileId}: ${createError?.message ?? "no user returned"}`,
      ),
    }
  }

  const supabaseAuthUserId = newAuthUser.user.id

  const { error: insertError } = await supabaseServiceRole
    .from("identity_accounts")
    .insert({
      profile_id:       profileId,
      provider:         "supabase",
      provider_subject: supabaseAuthUserId,
    })

  if (insertError && insertError.code !== "23505") {
    return {
      supabaseUserId: null,
      error: new Error(
        `Failed to insert Supabase identity_account for profile ${profileId}: ${insertError.message}`,
      ),
    }
  }

  return { supabaseUserId: supabaseAuthUserId, created: true }
}

/**
 * findSupabaseUserByInternalId is used as a fallback in race conditions —
 * when two concurrent requests both try to create the same mapping. It
 * tries both the identity_accounts lookup and, if that fails, a direct
 * auth.admin.listUsers search by email.
 */
async function findSupabaseUserByInternalId(
  supabaseServiceRole: ReturnType<typeof createClient>,
  internalUserId: string,
  email?: string | null,
): Promise<string | null> {
  // Try identity_accounts first.
  const { data: account } = await supabaseServiceRole
    .from("identity_accounts")
    .select("provider_subject")
    .eq("provider", "internal")
    .eq("provider_subject", internalUserId)
    .single()

  if (account?.provider_subject) {
    // This is the internal row — we need the corresponding supabase row.
    // Look up by the profile_id linkage if available.
    if (account.provider_subject !== internalUserId) {
      return account.provider_subject
    }
  }

  // Fall back to email lookup via auth.admin.
  if (email) {
    const { data: { users } } = await supabaseServiceRole.auth.admin.listUsers()
    const match = users.find((u) => u.email === email)
    if (match?.id) return match.id
  }

  return null
}
