/**
 * src/routes/(marketing)/login/+layout.ts
 *
 * Client layout for all /login/* pages.
 *
 * WHAT CHANGED FROM SUPABASE-ONLY VERSION:
 *   - Removed load_helper() session check — already-authed redirect is
 *     now done server-side in +layout.server.ts (single source of truth).
 *   - Removed bootstrap_session() RPC call and resolveRouteFromBootstrap()
 *     redirect — not needed on the login side; app routing handles it.
 *   - Supabase client is still created because GitHub OAuth still flows
 *     through Supabase (signInWithOAuth + /auth/callback).  Email/password
 *     login now bypasses Supabase entirely and calls the Go auth service.
 *   - depends("supabase:auth") is kept so OAuth state changes (SIGNED_IN
 *     event via onAuthStateChange) still trigger a load re-run.
 */
import {
  PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_SUPABASE_URL,
} from "$env/static/public"
import {
  createBrowserClient,
  createServerClient,
  isBrowser,
} from "@supabase/ssr"
import type { Database } from "../../../DatabaseDefinitions"
import type { LayoutLoad } from "./$types"

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
  depends("supabase:auth")

  // Supabase client — used by child pages for GitHub OAuth only.
  // Email/password routes do not touch this client.
  const supabase = isBrowser()
    ? createBrowserClient<Database>(
        PUBLIC_SUPABASE_URL,
        PUBLIC_SUPABASE_ANON_KEY,
        { global: { fetch } },
      )
    : createServerClient<Database>(
        PUBLIC_SUPABASE_URL,
        PUBLIC_SUPABASE_ANON_KEY,
        {
          global: { fetch },
          cookies: {
            getAll() {
              return data.cookies
            },
          },
        },
      )

  return {
    supabase,
    url: data.url,
  }
}
