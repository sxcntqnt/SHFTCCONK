// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import { createServerClient } from '@supabase/ssr'
import { initSession, clearSession, type BootstrapSessionPayload } from '$lib/features/auth/stores/auth' // if you want server-side init too (optional)

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, { ...options, path: '/' })
        })
      }
    }
  })

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return {
      session: null,
      user: null,
      profile: null,
      bootstrapped: false
    }
  }

  // Optional: you can bootstrap here on server if RPC is fast & doesn't depend on client-only things
  const { data: payload, error } = await supabase.rpc('bootstrap_session')

  if (error || !payload) {
    console.error('[layout.server] Bootstrap failed', error)
    return {
      session,
      user: session.user,
      profile: null,
      bootstrapped: false
    }
  }

  const bootstrapData = payload as BootstrapSessionPayload & { permissions?: any[] }

  // You can init store here too if you want (but usually better on client for reactivity)
  // initSession(bootstrapData, { inviteScoped: url.searchParams.get('complete_profile') === 'true' })

  return {
    session,
    user: session.user,
    profile: bootstrapData.profile,
    bootstrapped: true,
    // Pass any other needed data (permissions, actors, etc.)
    bootstrapData // or just the fields you need
  }
}