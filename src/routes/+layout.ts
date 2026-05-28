/**
 * src/routes/+layout.ts
 *
 * Root client layout — creates the Supabase browser client and
 * bootstraps the federated session store.
 *
 * ARCHITECTURE:
 *   +layout.server.ts now passes:
 *     { session, user, userState, activeContext, requestContext, cookies }
 *
 *   IDENTITY SIGNAL: use `data.user` to determine authenticated state.
 *   Do NOT use `data.session?.user` — the internal provider session is
 *   { sessionId, expiresAt } and has no .user field.  The Supabase
 *   provider session does, but relying on that shape here creates a
 *   provider-specific coupling this file must not have.
 *
 *   This file:
 *     1. Creates the browser/SSR Supabase client (typed with Database)
 *        — Supabase remains the RPC execution layer even when the
 *          internal auth provider is active.
 *     2. Passes userState + activeContext through to all child routes.
 *     3. Runs bootstrap_session() RPC ONLY as a compatibility shim for
 *        components still reading from sessionStore.
 *     4. Returns { supabase, session, user, userState, activeContext, … }
 *
 * BOOTSTRAP SHIM STATUS:
 *   bootstrap_session() is a compatibility bridge — NOT the source of
 *   truth for domain state.  userState (resolved server-side by
 *   userStateHandle) is authoritative.  The RPC call will be removed
 *   once all components are migrated away from sessionStore.
 *
 *   Skip conditions for bootstrap_session():
 *     - userState is present (server already resolved everything)
 *     - Store already initialised for the same user (profile.id match)
 *     - No ?rebootstrap param
 *
 * CONTEXT STORE HYDRATION:
 *   Individual context activate*() functions are called from their
 *   respective route +layout.ts files (lazy pattern), NOT here.
 *   Root layout does not activate any context — it only passes data.
 *
 * SUPABASE DEPENDENCY NOTE:
 *   depends("supabase:auth") + onAuthStateChange → invalidate("supabase:auth")
 *   This pair currently drives re-runs for both providers because
 *   sessionSyncHandle creates a Supabase session for internal users too.
 *   When that bridge is removed, change the dependency to "auth:session"
 *   and pair it with a server-sent event or cookie-change signal.
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
import type { LayoutLoad } from "./$types"
import type { Database } from "../DatabaseDefinitions"
import {
  initSession,
  sessionStore,
  clearSession,
  type BootstrapSessionPayload,
} from "$lib/features/auth/stores/auth"
import { get } from "svelte/store"

export const load: LayoutLoad = async ({ fetch, data, depends, url }) => {
  depends("supabase:auth")

  // ─── Create Supabase client (browser or SSR) ─────────────────────────────
  // Supabase is the RPC / SQL execution layer regardless of which auth
  // provider issued the session.  The browser client is used for
  // bootstrap_session() and any client-side RPCs.  The SSR client reuses
  // the cookie jar forwarded by +layout.server.ts so the first server-side
  // render picks up the right user context.
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

  // ─── No authenticated user → clear store, return minimal context ──────────
  // Use data.user as the identity signal — NOT data.session — because the
  // internal provider session shape ({ sessionId, expiresAt }) has no .user
  // property.  authHandle always sets both independently; user being null
  // is the single correct indicator of an unauthenticated request.
  const user = data.user
  if (!user) {
    clearSession()
    return {
      supabase,
      session:      data.session,
      user:         null,
      userState:    null,
      activeContext: null,
      bootstrapped: false,
    }
  }

  // ─── userState present → server resolved everything, fast path ───────────
  // userStateHandle in hooks.server.ts ran resolveUserState() and any
  // activateXContext() call before this load function executed.
  // Skip bootstrap_session() unless the sessionStore shim needs hydrating.
  if (data.userState) {
    const current      = get(sessionStore)
    const forceRefresh = url.searchParams.has("rebootstrap")

    // Only bootstrap the sessionStore shim when it's stale for this user
    // or a force refresh was requested.  Avoids an unnecessary RPC on
    // every navigation while keeping legacy components functional.
    const needsBootstrap =
      !current.initialized        ||
      current.profile?.id !== user.id ||
      forceRefresh

    if (needsBootstrap) {
      const { data: payload, error: bootstrapError } =
        await supabase.rpc("bootstrap_session")

      if (bootstrapError) {
        // Non-fatal — userState is authoritative.  sessionStore will be
        // stale but all pages using the new context system are unaffected.
        console.warn(
          "[layout] bootstrap_session() shim failed — " +
            "sessionStore not updated.  userState is still authoritative.",
          bootstrapError,
        )
      } else {
        const bootstrapData = payload as BootstrapSessionPayload
        const inviteScoped  = url.searchParams.get("complete_profile") === "true"
        initSession(bootstrapData, { inviteScoped })
      }
    }

    return {
      supabase,
      session:       data.session,
      user,
      userState:     data.userState,
      activeContext: data.activeContext,
      bootstrapped:  true,
    }
  }

  // ─── Fallback: no userState (public route or resolution failure) ──────────
  // userStateHandle skips resolution on public paths and swallows non-redirect
  // errors.  In both cases userState + activeContext are null.
  // Still run bootstrap_session() so sessionStore-dependent components work
  // on partially-authenticated states (e.g. invite completion flow).
  const current      = get(sessionStore)
  const forceRefresh = url.searchParams.has("rebootstrap")

  if (
    current.initialized          &&
    current.profile?.id === user.id &&
    !forceRefresh
  ) {
    return {
      supabase,
      session:       data.session,
      user,
      userState:     null,
      activeContext: null,
      bootstrapped:  true,
    }
  }

  const { data: payload, error: bootstrapError } =
    await supabase.rpc("bootstrap_session")

  if (bootstrapError) {
    console.error("[layout] Bootstrap failed:", bootstrapError)
    clearSession()
    return {
      supabase,
      session:       data.session,
      user,
      userState:     null,
      activeContext: null,
      bootstrapped:  false,
    }
  }

  const bootstrapData = payload as BootstrapSessionPayload
  const inviteScoped  = url.searchParams.get("complete_profile") === "true"
  initSession(bootstrapData, { inviteScoped })

  return {
    supabase,
    session:       data.session,
    user,
    profile:       bootstrapData.profile,
    userState:     null,
    activeContext: null,
    bootstrapped:  true,
  }
}