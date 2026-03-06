// src/routes/+layout.ts
//
// Root client layout — creates the Supabase browser client and
// bootstraps the federated session store.
//
// ARCHITECTURE:
//   +layout.server.ts passes { session, user, cookies } from hooks.
//   This file:
//     1. Creates the browser/SSR Supabase client (typed with Database)
//     2. Checks if the session store needs (re)hydration
//     3. Runs bootstrap_session() RPC if needed (single call)
//     4. Returns { supabase, session } for all child routes
//
//   Bootstrap runs here (not server-side) because:
//     - The Svelte store lives client-side
//     - One RPC call, not two (no server+client double-bootstrap)
//     - The browser client has the user's JWT for RLS
//
// STORE HYDRATION SKIP LOGIC:
//   On SvelteKit client-side navigations, this load function re-runs.
//   We skip re-bootstrapping if:
//     - Store is already initialized
//     - Same user (profile ID matches session user)
//     - No ?rebootstrap param (used after invite redemption, permission changes)
//
// HARDENING:
//   - initSession() stores permissions + permissionsVersion in one call
//   - No separate permission patching needed
//   - ?rebootstrap param forces full re-hydration

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



// /operator/+layout.ts
import { requireOperatorAccess } from "$lib/security/authGuard"
export const load = async (event) => { await requireOperatorAccess(event); return {} }

// /org/[orgId]/+layout.ts
import { requireOrgAccess } from "$lib/security/authGuard"
export const load = async (event) => { await requireOrgAccess(event, event.params.orgId); return {} }



export const load: LayoutLoad = async ({ fetch, data, depends, url }) => {
  depends("supabase:auth")

  // ─── Create Supabase client (browser or SSR) ─────────────
  // Browser: uses browser fetch + cookie storage
  // SSR: uses server cookies passed from +layout.server.ts
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

  // ─── No session → clear store, return minimal context ─────
  const session = data.session
  if (!session) {
    clearSession()
    return {
      supabase,
      session: null,
      user: null,
      bootstrapped: false,
    }
  }

  // ─── Skip re-bootstrap if store is already hydrated ───────
  // SvelteKit re-runs layout loads on every client navigation.
  // We only need to bootstrap when:
  //   - First load (store not initialized)
  //   - Different user (e.g., after account switch)
  //   - Forced refresh via ?rebootstrap (after invite, permission change)
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
      bootstrapped: true,
    }
  }

  // ─── Bootstrap: single RPC for full federated session ─────
  // Returns: profile, actors, jurisdictions, org_memberships,
  //          policy_groups, permissions (aggregated by optimized view)
  //
  // initSession() stores everything in one call:
  //   - permissions (pre-aggregated, deny-wins)
  //   - permissionsVersion (for kill-switch comparison)
  //   - actors, jurisdictions, orgMemberships, policyGroups
  const { data: payload, error: bootstrapError } = await supabase.rpc(
    "bootstrap_session",
  )

  if (bootstrapError) {
    console.error("[layout] Bootstrap failed:", bootstrapError)
    clearSession()
    return {
      supabase,
      session,
      user: session.user,
      bootstrapped: false,
    }
  }

  const bootstrapData = payload as BootstrapSessionPayload

  // Detect invite flow context (redirected from callback with ?complete_profile)
  const inviteScoped = url.searchParams.get("complete_profile") === "true"

  // Hydrate the store — permissions + version included
  initSession(bootstrapData, { inviteScoped })

  return {
    supabase,
    session,
    user: session.user,
    profile: bootstrapData.profile,
    bootstrapped: true,
  }
}