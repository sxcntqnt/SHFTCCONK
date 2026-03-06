// src/routes/+layout.server.ts
//
// Server-side root layout — passes session context to the client.
//
// ARCHITECTURE:
//   hooks.server.ts creates the Supabase client and validates the
//   session via safeGetSession(). This file just passes the results
//   through to the client-side +layout.ts, which handles:
//     - Creating the browser Supabase client
//     - Running bootstrap_session() RPC (one call, client-side only)
//     - Hydrating the auth store
//
//   We do NOT bootstrap server-side because:
//     1. It would double the RPC calls (server bootstrap + client re-bootstrap)
//     2. The Svelte store is client-side only — server can't hydrate it
//     3. SvelteKit's data flow (server load → client load) already handles
//        passing the session, and the client load creates the browser client
//        that the store and all components use
//
// WHAT THIS FILE DOES:
//   - Reads session + user from locals (set by hooks.server.ts authGuardHandle)
//   - Passes cookies for the client-side Supabase client (SSR cookie sync)
//   - Returns session, user, cookies to +layout.ts via `data`

import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({
  locals: { session, user },
  cookies,
}) => {
  return {
    // Session object (from safeGetSession in hooks)
    session,

    // Validated user (from getUser() — not just cookie parsing)
    // null on public routes where authGuardHandle didn't run
    user,

    // All cookies for the client-side Supabase client to sync with
    cookies: cookies.getAll(),
  }
}