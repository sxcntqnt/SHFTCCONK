/**
 * src/routes/+layout.ts
 *
 * Root client layout — hydrates the legacy sessionStore compatibility shim
 * from bootstrap data already resolved server-side, and forwards auth/
 * enterprise state to child routes.
 *
 * ARCHITECTURE:
 *   +layout.server.ts now passes:
 *     { session, user, userState, activeContext, requestContext,
 *       bootstrapPayload, csrfToken }
 *
 *   Supabase has been fully removed — no browser or SSR client is created
 *   here anymore. bootstrap_session() is a Neon SQL function, called
 *   server-side in +layout.server.ts via pg.ts's withProfileContext(). This
 *   file only consumes the already-resolved payload; it never queries the
 *   database itself, so there's no client-side RPC round trip anymore.
 *
 *   IDENTITY SIGNAL: use `data.user` to determine authenticated state.
 *   Do NOT use `data.session?.user` — the auth-service session shape is
 *   { sessionId, expiresAt } and has no .user field.
 *
 * BOOTSTRAP SHIM STATUS:
 *   bootstrapPayload is a compatibility bridge for components still
 *   reading from sessionStore — NOT the source of truth for domain state.
 *   userState (resolved server-side by userStateHandle) is authoritative.
 *   This shim will be removed once all components migrate off sessionStore.
 *
 *   Skip condition for calling initSession() with bootstrapPayload:
 *     - Store already initialised for the same profile (compared via
 *       bootstrapPayload.profile.id, NOT auth.user.id — those are
 *       different identities, see pg.ts), and no ?rebootstrap param.
 *
 * CONTEXT STORE HYDRATION:
 *   Individual context activate*() functions are called from their
 *   respective route +layout.ts files (lazy pattern), NOT here.
 *   Root layout does not activate any context — it only passes data.
 */

import type { LayoutLoad } from "./$types"
import {
  initSession,
  sessionStore,
  clearSession,
  type BootstrapSessionPayload,
} from "$lib/features/auth/stores/auth"
import { get } from "svelte/store"

export const load: LayoutLoad = async ({ data, url }) => {
  const user = data.user

  // ─── No authenticated user → clear store ───────────────────────────────
  if (!user) {
    clearSession()
    return {
      session:        data.session,
      user:           null,
      userState:      null,
      activeContext:  null,
      requestContext: data.requestContext,
      csrfToken:      data.csrfToken,
      bootstrapped:   false,
    }
  }

  // ─── Hydrate sessionStore shim if a payload was resolved server-side ────
  // No network call happens here — bootstrapPayload already came down
  // with the page data.
  if (data.bootstrapPayload) {
    const current      = get(sessionStore)
    const forceRefresh = url.searchParams.has("rebootstrap")

    const needsBootstrap =
      !current.initialized ||
      current.profile?.id !== data.bootstrapPayload.profile?.id ||
      forceRefresh

    if (needsBootstrap) {
      const inviteScoped = url.searchParams.get("complete_profile") === "true"
      initSession(data.bootstrapPayload as BootstrapSessionPayload, { inviteScoped })
    }
  }

  return {
    session:        data.session,
    user,
    userState:      data.userState,
    activeContext:  data.activeContext,
    requestContext: data.requestContext,
    csrfToken:      data.csrfToken,
    bootstrapped:   true,
  }
}
