// src/routes/+layout.server.ts
//
// Server-side root layout — passes session + resolved enterprise state
// + request geo context to the client-side +layout.ts.
//
// ARCHITECTURE:
//   hooks.server.ts runs the full resolution chain:
//     cloudflareHttpsFix  → protocol normalization
//     locationHandle      → requestContext (geo seed, NOT auth)
//     supabaseHandle      → creates clients + safeGetSession
//     authGuardHandle     → session guard → populates locals.session/user
//     userStateHandle     → resolveUserState + activateXContext
//                         → populates locals.userState + locals.activeContext
//
//   This file is a pure pass-through — reads from locals, hands
//   everything to +layout.ts. No DB queries, no business logic here.
//
// TWO SEPARATE PIPELINES (important — do not merge):
//   Identity:  session → user → userState → activeContext
//   Map seed:  requestContext → BootstrapManifestService → map system
//
//   requestContext MUST NOT flow into userState/activeContext.
//   It is a request optimization hint, not an identity claim.

import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({
  locals: { session, user, userState, activeContext, requestContext },
  cookies,
}) => {
  return {
    // ── Auth pipeline ─────────────────────────────────────────────
    session,
    user,
    userState,
    activeContext,

    // ── Map bootstrap pipeline ────────────────────────────────────
    // requestContext is safe to expose to the client — it contains
    // no secrets, only edge-inferred geo hints.
    // The client uses this to call BootstrapManifestService before
    // the user's first map interaction.
    requestContext,

    // ── Cookies ───────────────────────────────────────────────────
    cookies: cookies.getAll(),
  }
}