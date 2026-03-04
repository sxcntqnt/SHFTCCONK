// src/routes/+layout.ts
//
// Root client layout — creates the Supabase client and bootstraps
// the federated session store. Every child route inherits `supabase`,
// `session`, and the hydrated store.
//
// HARDENING CHANGES:
//   - initSession() now accepts permissions in the bootstrap payload,
//     so the manual sessionStore.update for permissions is gone
//   - BootstrapSessionPayload type already includes `permissions` field
//   - No separate type cast needed
//   - `rebootstrap` URL param preserved for forced refresh

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
import {
  initSession,
  sessionStore,
  clearSession,
  type BootstrapSessionPayload,
} from "$lib/features/auth/stores/auth"
import { get } from "svelte/store"

export const load: LayoutLoad = async ({ fetch, data, depends, url }) => {
  depends("supabase:auth")

  // ─── Create Supabase client (browser or SSR) ─────────────
  const supabase = isBrowser()
    ? createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: { fetch },
      })
    : createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: { fetch },
        cookies: {
          getAll() {
            return data.cookies
          },
        },
      })

  // ─── Resolve session from server data ─────────────────────
  const session = data.session

  // No session → clear store, return minimal context
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
  // Unless ?rebootstrap is in the URL (forced refresh after mutations)
  const current = get(sessionStore)
  if (
    current.initialized &&
    current.profile?.id === session.user.id &&
    !url.searchParams.has("rebootstrap")
  ) {
    return {
      supabase,
      session,
      user: session.user,
      bootstrapped: true,
    }
  }

  // ─── Bootstrap: single RPC for full federated session ─────
  // The hardened bootstrap_session() returns profile, actors,
  // jurisdictions, org_memberships, policy_groups, AND permissions.
  // initSession() stores everything including permissions and
  // permissionsVersion in one call — no separate patching needed.
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

  // Detect invite flow context
  const inviteScoped = url.searchParams.get("complete_profile") === "true"

  // Hydrate the store (permissions + version included in one call)
  initSession(bootstrapData, { inviteScoped })

  return {
    supabase,
    session,
    user: session.user,
    profile: bootstrapData.profile,
    bootstrapped: true,
  }
}