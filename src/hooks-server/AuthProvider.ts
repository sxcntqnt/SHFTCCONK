// src/hooks-server/authProvider.ts
import { env }                  from '$env/dynamic/private'
import { InternalAuthProvider } from '$lib/features/auth/providers/internal'
import type { AuthProvider }    from '$lib/features/auth/types/types'

export const authProvider: AuthProvider =
  env.AUTH_PROVIDER === 'internal'
    ? new InternalAuthProvider(env.AUTH_URL ?? 'http://auth-service')
    : {
        // Supabase path — session resolution lives in authHandle/supabaseHandle.
        // This stub satisfies the interface for the guard's clearCookies call.
        async getSession() { return { session: null, user: null, amr: [] } },
        clearCookies()     {},
      } satisfies AuthProvider & { clearCookies: (...args: any[]) => void }
