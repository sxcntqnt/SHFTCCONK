// src/lib/guards/auth.guard.ts
//
// Route guards for federated governance.
// Use in +page.ts or +layout.ts load functions to protect pages.
//
// HARDENING CHANGES:
//   - requireAuth checks isSessionCurrent() and triggers re-bootstrap
//     if the permission version is stale
//   - requirePermission uses the deny-first logic from can()
//
// Usage:
//   import { requireAuth, requirePermission, requireOrgScope } from "$lib/guards/auth.guard"
//
//   export const load: PageLoad = async (event) => {
//     const session = await requireAuth(event)
//     await requirePermission(event, "vehicle.view")
//     return { ... }
//   }

import { redirect } from "@sveltejs/kit"
import { get } from "svelte/store"
import {
  sessionStore,
  can,
  hasJurisdictionAt,
  isSessionCurrent,
  type JurisdictionLevel,
} from "$lib/features/auth/stores/auth"

interface LoadEvent {
  url: URL
  parent: () => Promise<{
    supabase: import("@supabase/supabase-js").SupabaseClient
    session: { user: { id: string } } | null
    bootstrapped: boolean
  }>
}

/**
 * Require authenticated session. Redirects to login if not authenticated.
 * If the session is stale (version mismatch), forces a re-bootstrap
 * by redirecting with ?rebootstrap param.
 */
export async function requireAuth(event: LoadEvent) {
  const { session, bootstrapped, supabase } = await event.parent()

  if (!session) {
    const returnTo = event.url.pathname + event.url.search
    redirect(303, `/login/sign_in?next=${encodeURIComponent(returnTo)}`)
  }

  // If bootstrapped but version is stale, force re-bootstrap
  // This catches the case where permissions changed between navigations
  if (bootstrapped && !isSessionCurrent()) {
    const returnTo = event.url.pathname + event.url.search
    redirect(303, `${returnTo}${returnTo.includes("?") ? "&" : "?"}rebootstrap=1`)
  }

  return { session, bootstrapped }
}

/**
 * Require a specific permission on the active actor.
 * Redirects to /unauthorized if the permission is missing.
 *
 * IMPORTANT: This is a UI guard only. RLS enforces the real check.
 */
export async function requirePermission(
  event: LoadEvent,
  ...actions: string[]
) {
  await requireAuth(event)

  const s = get(sessionStore)
  if (!s.initialized) {
    // Store not ready yet — let the page load; RLS will catch unauthorized queries
    return
  }

  const hasAny = actions.some((action) => can(action))
  if (!hasAny) {
    redirect(303, `/unauthorized?required=${actions.join(",")}`)
  }
}

/**
 * Require jurisdiction over a specific org.
 * Use on org-scoped pages like /org/[orgId]/dashboard.
 */
export async function requireOrgScope(event: LoadEvent, orgId: string) {
  await requireAuth(event)

  const s = get(sessionStore)
  if (!s.initialized) return

  const hasScope = hasJurisdictionAt("org", orgId)
  if (!hasScope) {
    redirect(303, "/org/select?reason=no_access")
  }
}

/**
 * Require a specific actor type to be active.
 * Use for role-specific pages (e.g. /crew/* requires DRIVER or CONDUCTOR).
 */
export async function requireActorType(
  event: LoadEvent,
  ...types: string[]
) {
  await requireAuth(event)

  const s = get(sessionStore)
  if (!s.initialized) return

  const activeActor = s.actors.find((a) => a.id === s.activeActorId)
  if (!activeActor || !types.includes(activeActor.type)) {
    redirect(303, "/dashboard?reason=wrong_actor_type")
  }
}