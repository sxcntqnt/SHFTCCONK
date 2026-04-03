// src/lib/load_helpers.ts
//
// Shared load helpers for SvelteKit + Supabase
// Handles SSR/browser differences and session/user resolution safely.
//
// ARCHITECTURE NOTE:
//   On protected routes, hooks.server.ts already validates the session
//   via safeGetSession() (which calls getUser() against the auth server).
//   The validated session + user are in locals and passed through
//   layout.server.ts → layout.ts → data.
//
//   This helper is still useful for:
//     1. Public routes where hooks doesn't validate (no authGuardHandle)
//     2. Browser-side fresh session resolution after client-side navigation
//     3. Edge cases where you need session + user outside the layout chain
//
//   On protected routes, prefer reading from `data.session` / `data.user`
//   instead of calling this helper — it saves a getUser() round-trip.

import { isBrowser } from "@supabase/ssr"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import type { Database } from "../DatabaseDefinitions.js"

/**
 * Resolves authenticated session + user in both server and browser contexts.
 *
 * - On server: trusts the session passed from hooks (usually +layout.server.ts)
 * - On client: always fetches fresh session via getSession()
 * - Always validates user via getUser() to catch revoked/expired sessions
 */
export async function load_helper(
  serverSession: Session | null,
  supabase: SupabaseClient<Database>,
): Promise<{ session: Session | null; user: User | null }> {
  let session = serverSession

  // In browser → always get fresh session (cookies / local storage may have changed)
  if (isBrowser()) {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.warn("[load_helper] getSession failed in browser", error)
      return { session: null, user: null }
    }
    session = data.session
  }

  if (!session) {
    return { session: null, user: null }
  }

  // Silence annoying console warning (still needed in many Supabase SDK versions)
  // Also suppressed in hooks.server.ts for server-side, but this covers browser.
  // https://github.com/supabase/auth-js/issues/888
  try {
    if ("suppressGetSessionWarning" in supabase.auth) {
      // @ts-expect-error – intentional private API usage
      supabase.auth.suppressGetSessionWarning = true
    }
  } catch {
    // ignore – warning suppression is best-effort
  }

  // Final validation: is this session still valid?
  // On protected routes this is redundant (hooks already validated via getUser),
  // but on public routes and browser-side navigations it catches revoked sessions.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.warn("[load_helper] getUser failed or returned no user", userError)
    return { session: null, user: null }
  }

  return { session, user }
}

/**
 * Build a login redirect URL that preserves the current path
 * so user can be sent back after successful sign-in.
 *
 * Usage in load / actions:
 *   if (!user) throw redirect(303, loginRedirect(url.pathname + url.search))
 */
export function loginRedirect(currentPath: string): string {
  const next = encodeURIComponent(currentPath)
  return `/login/sign_in?next=${next}`
}

// Convenience type export
export type LoadHelperResult = Awaited<ReturnType<typeof load_helper>>
