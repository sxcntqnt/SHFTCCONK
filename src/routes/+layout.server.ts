/**
 * src/routes/+layout.server.ts
 *
 * Server-side root layout — passes resolved auth state + enterprise context
 * + request geo context to the client-side +layout.ts.
 *
 * ARCHITECTURE:
 *   hooks.server.ts runs the full resolution chain:
 *     cloudflareHttpsFix  → protocol normalisation
 *     locationHandle      → requestContext (geo seed, NOT auth)
 *     supabaseHandle      → SSR clients + zeros all auth locals
 *     authHandle          → unified resolution → locals.auth { session, user, amr }
 *     sessionSyncHandle   → locals.supabaseUserId (internal provider bridge)
 *     csrfHandle          → token issue + verify
 *     authGuardHandle     → redirect / 401 on missing session
 *     userStateHandle     → resolveUserState + activateXContext
 *                         → locals.userState + locals.activeContext
 *
 *   This file is a pure pass-through — reads from locals, hands
 *   everything to +layout.ts. No DB queries, no business logic here.
 *
 * AUTH SHAPE (important):
 *   locals.auth is always initialised by authHandle — never undefined.
 *   session shape differs by provider:
 *     internal  → { sessionId: string, expiresAt: number }
 *     supabase  → Supabase Session object
 *   user is always the same shape (Supabase User type) regardless of provider,
 *   because sessionSyncHandle maps internal users into the Supabase user table.
 *
 * TWO SEPARATE PIPELINES (must not merge):
 *   Identity:  auth.session → auth.user → userState → activeContext
 *   Map seed:  requestContext → BootstrapManifestService → map system
 *
 *   requestContext MUST NOT flow into userState / activeContext.
 *   It is a request-scoped network hint, not an identity claim.
 */
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({
  locals: { auth, userState, activeContext, requestContext },
  cookies,
}) => {
  return {
    // ── Auth pipeline ─────────────────────────────────────────────
    // Split auth.session and auth.user so +layout.ts can check user
    // presence independently of the session shape (which varies by
    // provider).  Consumers must use `data.user` for identity, NOT
    // `data.session.user` — the internal session object has no .user
    // property.
    session:       auth.session,
    user:          auth.user,

    // ── Enterprise state ──────────────────────────────────────────
    // Resolved by userStateHandle.  null on public routes and on
    // resolution failures (userStateHandle swallows non-redirect
    // errors rather than crashing the request).
    userState,
    activeContext,

    // ── Map bootstrap pipeline ────────────────────────────────────
    // Safe to expose — no secrets, only edge-inferred geo hints.
    // Client uses this to seed BootstrapManifestService before the
    // first map interaction.
    requestContext,

    // ── Cookies ───────────────────────────────────────────────────
    // Forwarded so the SSR Supabase client in +layout.ts can reuse
    // the same cookie jar (needed for bootstrap_session() RPC on the
    // first SSR pass and for Supabase execution-layer calls).
    cookies: cookies.getAll(),
  }
}