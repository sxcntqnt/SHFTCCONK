import {
  PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_SUPABASE_URL,
} from "$env/static/public"
import {
  createBrowserClient,
  createServerClient,
  isBrowser,
} from "@supabase/ssr"
import { redirect } from "@sveltejs/kit"
import { load_helper } from "$lib/load_helpers.js"
import { resolveRouteFromBootstrap } from "$lib/features/auth/utils/resolveRoute.js"

export const load = async ({ fetch, data, depends }) => {
  depends("supabase:auth")

  const supabase = isBrowser()
    ? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: {
          fetch,
        },
      })
    : createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: {
          fetch,
        },
        cookies: {
          getAll() {
            return data.cookies
          },
        },
      })

  // Redirect if already logged in — route to the correct role dashboard
  const { session, user } = await load_helper(data.session, supabase)
  if (session && user) {
    const { data: rpcData } = await supabase.rpc("bootstrap_session")
    const payload = Array.isArray(rpcData) ? rpcData[0] : rpcData
    redirect(303, resolveRouteFromBootstrap(payload))
  }

  const url = data.url

  return { supabase, url }
}
