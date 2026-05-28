/**
 * src/routes/(marketing)/login/+layout.server.ts
 *
 * Server layout for all /login/* pages.
 *
 * Single responsibility: gate already-authenticated users away from
 * the login UI so they land on the correct dashboard immediately.
 *
 * IDENTITY SOURCE:
 *   locals.auth is populated by authHandle in hooks.server.ts —
 *   always present, never undefined.  locals.auth.user === null
 *   means unauthenticated.
 *
 * REDIRECT TARGET:
 *   /app/dashboard — neutral entry point.  userStateHandle resolves
 *   role + context on the next request and the app routes from there.
 *   This replaces the old bootstrap_session() → resolveRouteFromBootstrap()
 *   round-trip that was done client-side in +layout.ts.
 *
 *   When a resolveRouteFromUserState() helper exists, swap the redirect
 *   target to resolveRouteFromUserState(locals.userState) for instant
 *   role-based routing without an extra RPC.
 *
 * COOKIES:
 *   Forwarded for the SSR Supabase client in +layout.ts (still needed
 *   for GitHub OAuth flows and the bootstrap_session() compatibility shim).
 */
import { redirect }          from "@sveltejs/kit"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({
  locals: { auth },
  cookies,
  url,
}) => {
  // Already authenticated — bypass the login UI.
  // authHandle guarantees locals.auth is always set; user being non-null
  // is the single correct signal for an active session regardless of provider.
  if (auth.user) {
    redirect(303, "/app/dashboard")
  }

  return {
    url:     url.origin,
    cookies: cookies.getAll(),
    // user is null here — don't expose a typed null session to the client.
    // Child pages that need to know "are we authed" use locals.auth on the
    // server, or data.user (null) on the client.
  }
}