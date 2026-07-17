/**
 * src/routes/+layout.server.ts
 *
 * Server-side root layout — resolves auth state + enterprise context +
 * request geo context, and (if a profile is resolved) the legacy
 * sessionStore bootstrap payload — then hands everything to +layout.ts.
 *
 * ARCHITECTURE:
 *   hooks.server.ts runs the full resolution chain:
 *     cloudflareHttpsFix  → protocol normalisation
 *     locationHandle      → requestContext (geo seed, NOT auth)
 *     initLocalsHandle    → zeros all auth/domain locals (no clients)
 *     authHandle          → unified resolution → locals.auth { session, user, amr }
 *     sessionSyncHandle   → locals.profileId (RLS's only trusted identity)
 *     csrfHandle          → token issue + verify
 *     authGuardHandle     → redirect / 401 on missing session
 *     userStateHandle     → resolveUserState + activateXContext
 *                         → locals.userState + locals.activeContext
 *
 *   Supabase has been fully removed. bootstrap_session() is now a Neon
 *   SQL function (see 03_functions.sql) — called here, server-side, via
 *   pg.ts's withProfileContext(profileId, ...), because profileId is a
 *   server-only value and pg.ts's postgres connection cannot run in the
 *   browser. +layout.ts no longer talks to the database at all.
 *
 * AUTH SHAPE (important):
 *   locals.auth is always initialised by authHandle — never undefined.
 *   session shape is { sessionId: string, expiresAt: number } (auth-service).
 *
 * TWO SEPARATE PIPELINES (must not merge):
 *   Identity:  auth.session → auth.user → userState → activeContext
 *   Map seed:  requestContext → BootstrapManifestService → map system
 *
 *   requestContext MUST NOT flow into userState / activeContext.
 *   It is a request-scoped network hint, not an identity claim.
 */
import type { LayoutServerLoad } from "./$types"
import { withProfileContext } from "$lib/server/pg"
import type { BootstrapSessionPayload } from "$lib/features/auth/stores/auth"

export const load: LayoutServerLoad = async ({
  locals: { auth, profileId, userState, activeContext, requestContext, csrfToken },
}) => {
  // ── Legacy sessionStore bootstrap shim ──────────────────────────────────
  // bootstrap_session() (03_functions.sql) is a SECURITY DEFINER Neon
  // function that reads app.current_profile_id via get_current_profile_id().
  // withProfileContext sets that GUC for the duration of this transaction
  // from the already-verified profileId — never call this with an
  // unverified id (see pg.ts's SECURITY INVARIANT comment).
  //
  // userState is the authoritative domain state; this payload exists only
  // to hydrate components still reading from the legacy sessionStore.
  // Stays null when profileId hasn't resolved (public routes, or Neon
  // unreachable — see app.d.ts's note on locals.profileId).
  let bootstrapPayload: BootstrapSessionPayload | null = null

  if (profileId) {
    try {
      const [row] = await withProfileContext(profileId, (tx) =>
        tx`select public.bootstrap_session() as payload`,
      )
      bootstrapPayload = (row?.payload ?? null) as BootstrapSessionPayload | null
    } catch (err) {
      // Non-fatal — userState is authoritative. sessionStore shim will be
      // stale but every page using the new context system is unaffected.
      console.error("[layout.server] bootstrap_session() query failed:", err)
    }
  }

  return {
    // ── Auth pipeline ─────────────────────────────────────────────
    session: auth.session,
    user:    auth.user,

    // ── Enterprise state ──────────────────────────────────────────
    userState,
    activeContext,

    // ── Map bootstrap pipeline ────────────────────────────────────
    requestContext,

    // ── Legacy sessionStore shim payload ────────────────────────────
    bootstrapPayload,

    // ── CSRF ──────────────────────────────────────────────────────
    csrfToken,
  }
}
