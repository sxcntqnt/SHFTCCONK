// src/lib/features/auth/services/sync.ts
//
// Session sync — bridges InternalAuthProvider identities to Supabase rows.
//
// WHY THIS EXISTS:
//   When AUTH_PROVIDER=internal, user identity comes from the internal auth
//   service (internalUserId). The rest of the app — RLS policies, foreign
//   keys, resolveUserState — still anchors on Supabase row IDs in the
//   `users` table. This module is the join layer: given an internalUserId,
//   find or create the corresponding Supabase row and return its UUID.
//
// CALLER CONTRACT:
//   - Always pass `supabaseServiceRole` (not the anon client).
//     The anon client is subject to RLS and cannot upsert into `users`
//     on behalf of a user who doesn't yet have a row.
//   - Call only after the internal session has been validated (i.e. from
//     sessionSyncHandle, after authHandle has populated locals.auth).
//   - The returned `supabaseUserId` is stored in locals and used by
//     resolveUserState and all downstream data queries.
//
// DATABASE CONTRACT:
//   The `users` table must have:
//     - id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
//     - internal_user_id  TEXT UNIQUE NOT NULL
//     - email             TEXT
//     - created_at        TIMESTAMPTZ NOT NULL

import { createClient } from "@supabase/supabase-js"

export type SyncResult =
  | { supabaseUserId: string; created: boolean }
  | { supabaseUserId: null; error: Error }

export async function getOrCreateSupabaseUser(
  // Must be the service-role client — anon client cannot bypass RLS here
  supabaseServiceRole: ReturnType<typeof createClient>,
  internalUserId: string,
  email?: string | null,
): Promise<SyncResult> {
  // ── 1. Try to fetch an existing mapping ───────────────────
  const { data: existingUser, error: fetchError } = await supabaseServiceRole
    .from("users")
    .select("id")
    .eq("internal_user_id", internalUserId)
    .single()

  if (fetchError && fetchError.code !== "PGRST116") {
    // PGRST116 = no rows found — expected on first login.
    // Anything else is a real database error.
    return { supabaseUserId: null, error: new Error(fetchError.message) }
  }

  if (existingUser?.id) {
    return { supabaseUserId: existingUser.id, created: false }
  }

  // ── 2. First login — create the Supabase row ──────────────
  const { data: newUser, error: insertError } = await supabaseServiceRole
    .from("users")
    .insert({
      internal_user_id: internalUserId,
      email:            email ?? null,
      created_at:       new Date().toISOString(),
    })
    .select("id")
    .single()

  if (insertError) {
    // Guard against a race condition: two concurrent requests for the same
    // new user can both pass the fetch check and race to insert.
    // On unique constraint violation (23505), retry the fetch.
    if (insertError.code === "23505") {
      const { data: racedUser, error: retryError } = await supabaseServiceRole
        .from("users")
        .select("id")
        .eq("internal_user_id", internalUserId)
        .single()

      if (retryError || !racedUser?.id) {
        return {
          supabaseUserId: null,
          error: new Error(`Sync race retry failed: ${retryError?.message}`),
        }
      }

      return { supabaseUserId: racedUser.id, created: false }
    }

    return { supabaseUserId: null, error: new Error(insertError.message) }
  }

  return { supabaseUserId: newUser.id, created: true }
}