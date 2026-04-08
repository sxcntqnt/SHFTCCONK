/* 
 src/routes/+layout.ts

 Root client layout — creates the Supabase browser client and
 bootstraps the federated session store.

 ARCHITECTURE:
   +layout.server.ts now passes:
     { session, user, userState, activeContext, cookies }

   This file:
     1. Creates the browser/SSR Supabase client (typed with Database)
     2. Passes userState + activeContext through to all child routes
     3. Runs bootstrap_session() RPC ONLY as a compatibility shim
        for components still reading from sessionStore
     4. Returns { supabase, session, userState, activeContext, ... }

 BOOTSTRAP SHIM STATUS:
   bootstrap_session() is now a compatibility bridge — NOT the source
   of truth for domain state. userState (resolved server-side by
   userStateHandle) is authoritative. The RPC call will be removed
   once all components are migrated away from sessionStore.

   Skip conditions for bootstrap_session():
     - userState is present (server already resolved everything)
     - Store already initialized for the same user
     - No ?rebootstrap param

 CONTEXT STORE HYDRATION:
   Individual context activate*() functions are called from their
   respective route +layout.ts files (lazy pattern), NOT here.
   Root layout does not activate any context — it only passes data.
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

  // ─── Create Supabase client (browser or SSR) ──────────────────
  // Browser: uses browser fetch + cookie storage
  // SSR:     uses server cookies passed from +layout.server.ts
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

 //  ─── No session → clear store, return minimal context ─────────
  const session = data.session
  if (!session) {
    clearSession()
    return {
      supabase,
      session: null,
      user: null,
      userState: null,
      activeContext: null,
      bootstrapped: false,
    }
  }

  //  ─── userState is present — server already resolved everything ─
   //  userStateHandle in hooks.server.ts ran resolveUserState() and
   //  activateXContext() before this load function was called.
   //  Pass it through and skip bootstrap_session() entirely.
   //  This is the fast path for all authenticated requests.
  if (data.userState) {
    const current = get(sessionStore)
    const forceRefresh = url.searchParams.has("rebootstrap")

     //  Only bootstrap the sessionStore shim if it isn't already hydrated
     //  for this user, OR if a force refresh was requested.
     //  This keeps legacy components reading sessionStore functional
     //  without an unnecessary RPC round trip on every navigation.
    const needsBootstrap =
      !current.initialized ||
      current.profile?.id !== session.user.id ||
      forceRefresh

    if (needsBootstrap) {
      const { data: payload, error: bootstrapError } =
        await supabase.rpc("bootstrap_session")

      if (bootstrapError) {
     //    Non-fatal — userState is the authoritative source.
     //    sessionStore will remain stale but pages using the new
     //    context system are unaffected.
        console.warn(
          "[layout] bootstrap_session() shim failed — " +
            "sessionStore not updated. userState is still authoritative.",
          bootstrapError,
        )
      } else {
        const bootstrapData = payload as BootstrapSessionPayload
        const inviteScoped = url.searchParams.get("complete_profile") === "true"
        initSession(bootstrapData, { inviteScoped })
      }
    }

    return {
      supabase,
      session,
      user: session.user,
      userState: data.userState,
      activeContext: data.activeContext,
      bootstrapped: true,
    }
  }

 //  ─── Fallback: no userState (public route or resolution failure) ──
 //  userStateHandle skips resolution on public paths and swallows
 //  non-redirect errors. In both cases userState + activeContext are null.
 //  Still run bootstrap_session() so sessionStore-dependent components
 //  function correctly on partially-authenticated states.
  const current = get(sessionStore)
  const forceRefresh = url.searchParams.has("rebootstrap")

  if (
    current.initialized &&
    current.profile?.id === session.user.id &&
    !forceRefresh
  ) {
    return {
      supabase,
      session,
      user: session.user,
      userState: null,
      activeContext: null,
      bootstrapped: true,
    }
  }

  const { data: payload, error: bootstrapError } =
    await supabase.rpc("bootstrap_session")

  if (bootstrapError) {
    console.error("[layout] Bootstrap failed:", bootstrapError)
    clearSession()
    return {
      supabase,
      session,
      user: session.user,
      userState: null,
      activeContext: null,
      bootstrapped: false,
    }
  }

  const bootstrapData = payload as BootstrapSessionPayload
  const inviteScoped = url.searchParams.get("complete_profile") === "true"
  initSession(bootstrapData, { inviteScoped })

  return {
    supabase,
    session,
    user: session.user,
    profile: bootstrapData.profile,
    userState: null,
    activeContext: null,
    bootstrapped: true,
  }
}
