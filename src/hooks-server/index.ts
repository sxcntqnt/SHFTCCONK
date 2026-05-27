/**
 * src/hooks/index.ts
 *
 * Re-exports every handle in pipeline order so hooks.server.ts stays
 * a thin composition file with no implementation details.
 */

export { supabaseHandle }     from './Supabase'
export { authHandle }         from './Auth'           // NEW
export { sessionSyncHandle }  from './SessionSync'    // NEW
export { authGuardHandle }    from './AuthGuard'
export { userStateHandle }    from './UserState'
export { locationHandle }     from './Location'
export { mapServiceHandle }   from './MapService'
export { cloudflareHttpsFix } from './Cloudflare'
export { posthogProxy }       from './Posthog'
