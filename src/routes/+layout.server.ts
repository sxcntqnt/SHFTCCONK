// src/routes/+layout.server.ts
//
// Server-side root layout — passes session + resolved enterprise state
// to the client-side +layout.ts.
//
// ARCHITECTURE:
//   hooks.server.ts runs the full resolution chain:
//     supabaseHandle  → creates clients + safeGetSession
//     authGuardHandle → session guard → populates locals.session/user
//     userStateHandle → resolveUserState + activateXContext
//                     → populates locals.userState + locals.activeContext
//
//   This file is a pure pass-through — it reads from locals and hands
//   everything to +layout.ts. No DB queries, no business logic here.
//
// WHY NOT BOOTSTRAP SERVER-SIDE:
//   1. Svelte stores (sessionStore, context stores) are client-side only
//   2. bootstrap_session() RPC is now a compat shim — userState is the
//      authoritative source and is already resolved by userStateHandle
//   3. Server-side bootstrap + client re-bootstrap = double round trip
//
// WHAT THIS FILE DOES:
//   - Reads session, user, userState, activeContext from locals
//   - Passes cookies for client-side Supabase SSR cookie sync
//   - Returns all of the above to +layout.ts via data

import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({
  locals: { session, user, userState, activeContext },
  cookies,
}) => {
  return {
    // ── Auth ──────────────────────────────────────────────────────
    // Session object from safeGetSession in hooks
    session,
    // Validated user from getUser() — not just cookie parsing
    // null on public routes where authGuardHandle didn't run
    user,

    // ── Enterprise state ──────────────────────────────────────────
    // Both resolved by userStateHandle in hooks.server.ts.
    // null on public routes and on resolution failure.
    // Pages read these via data.userState / data.activeContext —
    // never re-resolve in page or layout load functions.
    userState,
    activeContext,

    // ── Cookies ───────────────────────────────────────────────────
    // Forwarded for client-side Supabase client SSR cookie sync
    cookies: cookies.getAll(),
  }
}