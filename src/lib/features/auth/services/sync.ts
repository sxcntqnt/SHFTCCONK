// src/lib/features/auth/services/sync.ts
//
// Profile resolution — bridges auth-service identities to a Postgres
// profile_id. This REPLACES the old getOrCreateSupabaseUser entirely.
//
// WHY THIS IS SIMPLER NOW:
//   The old version had to reconcile TWO identities per user — a Supabase
//   Auth user (for auth.uid()-based RLS) and the internal auth-service
//   user — via a two-row identity_accounts mapping. That's why every bug
//   we hit involved partial failures between the two sides (orphaned auth
//   users, orphaned stub profiles, silent insert failures on conflict).
//
//   Now there is exactly ONE identity: auth-service's internalUserId.
//   RLS no longer depends on a Supabase-issued session at all (see
//   pg.ts's withProfileContext) — it trusts app.current_profile_id,
//   set directly from this resolution, with no second identity in between.
//
// FAILURE MODE BY DESIGN:
//   If Postgres is unreachable, this throws and the caller (sessionSyncHandle)
//   treats profileId as null. auth-service's session is still completely
//   valid — the user can still be considered "signed up" and "logged in"
//   from an identity standpoint. Routes that need Postgres data degrade
//   gracefully (or hard-fail with a clear 503, per route) rather than
//   sign-up itself depending on Postgres being up.

import { withServiceRoleTx } from '$lib/server/pg'

export type ProfileResolution =
  | { profileId: string; created: boolean }
  | { profileId: null; error: Error }

export async function resolveProfileId(
  internalUserId: string,
): Promise<ProfileResolution> {
  try {
    return await withServiceRoleTx(async (tx) => {
      const existing = await tx<{ profile_id: string }[]>`
        SELECT profile_id FROM identity_accounts
        WHERE provider = 'internal' AND provider_subject = ${internalUserId}
      `

      if (existing[0]?.profile_id) {
        return { profileId: existing[0].profile_id, created: false }
      }

      // First login: create the stub profile and the single identity
      // mapping row, in one transaction. No second row, no second
      // system to reconcile against — a single INSERT either commits
      // both statements or neither, by definition of the transaction.
      const [profile] = await tx<{ id: string }[]>`
        INSERT INTO profiles DEFAULT VALUES RETURNING id
      `

      await tx`
        INSERT INTO identity_accounts (profile_id, provider, provider_subject)
        VALUES (${profile.id}, 'internal', ${internalUserId})
      `

      return { profileId: profile.id, created: true }
    })
  } catch (err) {
    // Covers: Postgres unreachable, unique violation on a genuine
    // concurrent-first-login race (rare — two simultaneous requests for
    // a brand-new user), or any other transaction failure. In every
    // case, the caller should treat this as "Postgres-side resolution
    // unavailable right now" rather than failing the user's session.
    return {
      profileId: null,
      error: err instanceof Error ? err : new Error(String(err)),
    }
  }
}
