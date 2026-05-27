/**
 * src/hooks/index.ts
 *
 * Re-exports every handle in pipeline order so hooks.server.ts stays
 * a thin composition file with no implementation details.
 */

export { cloudflareHttpsFix } from './cloudflare'
export { locationHandle }     from './location'
export { mapServiceHandle }   from './map-service'
export { posthogProxy }       from './posthog'
export { supabaseHandle }     from './supabase'
export { authGuardHandle }    from './auth-guard'
export { userStateHandle }    from './user-state'
