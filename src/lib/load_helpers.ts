// src/lib/load_helpers.ts
// Shared load helpers for SvelteKit + Supabase
// Handles SSR/browser differences and session/user resolution safely

import { isBrowser } from "@supabase/ssr"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import type { Database } from "../DatabaseDefinitions.js"   // adjust path if needed

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
      console.warn("getSession failed in browser", error)
      return { session: null, user: null }
    }
    session = data.session
  }

  if (!session) {
    return { session: null, user: null }
  }

  // Silence annoying console warning (still needed in many versions – 2025/2026)
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
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.warn("getUser failed or returned no user", userError)
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

// Convenience type export (optional but helpful)
export type LoadHelperResult = Awaited<ReturnType<typeof load_helper>>