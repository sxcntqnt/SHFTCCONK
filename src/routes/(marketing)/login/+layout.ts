/**
 * src/routes/(marketing)/login/+layout.ts
 *
 * Client layout for all /login/* pages.
 *
 * WHAT CHANGED:
 *   - Supabase client removed entirely. GitHub OAuth now flows through
 *     auth-service via a plain redirect (browser -> auth-service ->
 *     GitHub -> auth-service callback -> sets atk_/rtk_ cookies -> redirect
 *     into app). No client-side SDK or auth-state listener is needed for
 *     that flow, so there's nothing left for this load function to set up.
 *   - Already-authed redirect stays server-side in +layout.server.ts.
 *   - csrfToken still passed through from server data so sign-in/sign-up
 *     forms can inject it as a hidden field.
 */
import type { LayoutLoad } from "./$types"

export const load: LayoutLoad = async ({ data }) => {
  return {
    url:       data.url,
    csrfToken: data.csrfToken,
  }
}
