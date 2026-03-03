// src/routes/+layout.ts
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import { createBrowserClient, isBrowser } from '@supabase/ssr'
import type { LayoutLoad } from './$types'
import { initSession, sessionStore, clearSession, get } from '$lib/features/auth/stores/auth'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export const load: LayoutLoad = async ({ data, depends, url }) => {
  depends('supabase:auth')

  // Create browser client ONLY in browser
  if (isBrowser() && !browserClient) {
    browserClient = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
  }

  const supabase = browserClient // will be undefined on server — that's fine

  // Use server-passed data
  const { session, user, profile, bootstrapped, bootstrapData } = data

  if (!session) {
    clearSession()
    return {
      supabase,
      session: null,
      user: null,
      bootstrapped: false
    }
  }

  // Skip if already hydrated (client navigation)
  const current = get(sessionStore)
  const inviteScoped = url.searchParams.get('complete_profile') === 'true'

  if (
    current.initialized &&
    current.profile?.id === user?.id &&
    !url.searchParams.has('rebootstrap')
  ) {
    return {
      supabase,
      session,
      user,
      profile,
      bootstrapped: true
    }
  }

  // Hydrate store from server-passed bootstrap data
  if (bootstrapData) {
    initSession(bootstrapData, { inviteScoped })
    // If permissions came from server, update store
    if (bootstrapData.permissions) {
      sessionStore.update(s => ({ ...s, permissions: bootstrapData.permissions ?? [] }))
    }
  } else {
    // Fallback: if no server bootstrap, do client-side RPC (but avoid if possible)
    console.warn('[layout.ts] No server bootstrap data — falling back to client RPC')
    const { data: payload, error } = await supabase!.rpc('bootstrap_session')
    if (!error && payload) {
      initSession(payload, { inviteScoped })
    }
  }

  return {
    supabase,
    session,
    user,
    profile,
    bootstrapped: !!bootstrapData
  }
}