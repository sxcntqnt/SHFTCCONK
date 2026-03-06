// src/lib/guards/auth.guard.ts
//
// Route guards for federated governance.
// Use in +page.ts or +layout.ts load functions to protect pages.
//
// These are UI guards — they prevent bad UX (blank pages, cryptic
// RLS errors) but are NOT security boundaries. Real authorization:
//   - hooks.server.ts authGuardHandle (server-side redirect/401)
//   - RLS policies on every table (deny by default)
//   - can_actor_perform() / my_permissions (DB-side double-gate)
//
// CHANGES from previous version:
//   - Fixed /dashboard phantom route → /app/dashboard
//   - Fixed /unauthorized phantom route → /app/dashboard?denied=...
//   - requireOrgScope renamed to requireOrgAccess, now auto-switches actor
//   - requireActorType now auto-switches to matching actor if available
//   - NEW: requireFederal (admin routes — checks permissions not just type)
//   - NEW: requireOrgPermission (org-scoped permission check)
//   - NEW: requireCrewAccess, requireOperatorAccess, requireAdminAccess,
//          requireAuditAccess (route-specific shorthands)
//   - Original requireOrgScope preserved as @deprecated alias
//
// Usage:
//   import { requireAuth, requireOrgAccess } from "$lib/guards/auth.guard"
//
//   export const load: LayoutLoad = async (event) => {
//     await requireAuth(event)
//     await requireOrgAccess(event, event.params.orgId)
//     return {}
//   }

import { redirect } from "@sveltejs/kit"
import { get } from "svelte/store"
import {
  sessionStore,
  can,
  canInOrg,
  isSessionCurrent,
  findActorForOrg,
  switchActor,
  ROLES,
} from "$lib/features/auth/stores/auth"

/* ============================================================
   SHARED TYPES
============================================================ */
interface LoadEvent {
  url: URL
  parent: () => Promise<{
    supabase: import("@supabase/supabase-js").SupabaseClient
    session: { user: { id: string } } | null
    bootstrapped: boolean
  }>
}

/* ============================================================
   requireAuth — base guard for all protected routes

   Checks:
     1. Session exists (redirect to login if not)
     2. Store is bootstrapped
     3. Permission version is current (re-bootstrap if stale)

   Returns the session + bootstrapped flag for downstream use.
============================================================ */
export async function requireAuth(event: LoadEvent) {
  const { session, bootstrapped } = await event.parent()

  if (!session) {
    const returnTo = event.url.pathname + event.url.search
    redirect(303, `/login/sign_in?next=${encodeURIComponent(returnTo)}`)
  }

  // Version check: if permissions changed since bootstrap,
  // force re-bootstrap via redirect. The 60s polling in
  // layout.svelte handles background detection, but this
  // catches stale sessions at navigation time.
  if (bootstrapped && !isSessionCurrent()) {
    const current = event.url.pathname + event.url.search
    const separator = current.includes("?") ? "&" : "?"
    redirect(303, `${current}${separator}rebootstrap=1`)
  }

  return { session, bootstrapped }
}

/* ============================================================
   requirePermission — active actor must have permission(s)

   Checks if the ACTIVE actor has at least one of the given
   actions (unscoped). For org-scoped checks, use requireOrgPermission().
============================================================ */
export async function requirePermission(
  event: LoadEvent,
  ...actions: string[]
) {
  await requireAuth(event)

  const s = get(sessionStore)
  if (!s.initialized) return // store not ready; RLS catches it

  const hasAny = actions.some((action) => can(action))
  if (!hasAny) {
    redirect(303, `/app/dashboard?denied=${actions[0]}`)
  }
}

/* ============================================================
   requireFederal — federal-level permission required

   For admin routes that need platform-wide access.
   Checks actual permissions, not just actor type — an ADMIN actor
   with revoked admin.full permission will be blocked.

   Usage:
     await requireFederal(event, "admin.full", "admin.users")
     await requireFederal(event, "audit.view")
============================================================ */
export async function requireFederal(
  event: LoadEvent,
  ...actions: string[]
) {
  await requireAuth(event)

  const s = get(sessionStore)
  if (!s.initialized) return

  const hasFederal = actions.some((action) =>
    can(action, { level: "federal", scopeId: null }),
  )

  if (!hasFederal) {
    redirect(303, `/app/dashboard?denied=federal_required`)
  }
}

/* ============================================================
   requireOrgAccess — jurisdiction over a specific org + auto-switch

   For org-scoped pages like /org/[orgId]/dashboard.

   1. Finds the best actor for the given org (prefers federal, then org-level)
   2. Auto-switches to that actor if it's not currently active
   3. Redirects to /org/select if no actor has access

   This eliminates the "I have access but see a blank page" problem
   when a multi-actor user navigates to an org route while their
   active actor is a different persona.

   Usage:
     await requireOrgAccess(event, event.params.orgId)
============================================================ */
export async function requireOrgAccess(event: LoadEvent, orgId: string) {
  await requireAuth(event)

  const s = get(sessionStore)
  if (!s.initialized) return

  const bestActor = findActorForOrg(orgId)

  if (!bestActor) {
    redirect(303, "/org/select?reason=no_access")
  }

  // Auto-switch to the actor that has access to this org
  if (s.activeActorId !== bestActor) {
    switchActor(bestActor)
  }
}

/* ============================================================
   requireOrgPermission — org-scoped permission check

   Combines org access (with auto-switch) + specific permission.
   Uses canInOrg() which checks the permission scoped to the org.

   Usage:
     await requireOrgPermission(event, orgId, "org.manage")
     await requireOrgPermission(event, orgId, "vehicle.view")
============================================================ */
export async function requireOrgPermission(
  event: LoadEvent,
  orgId: string,
  ...actions: string[]
) {
  await requireOrgAccess(event, orgId)

  const s = get(sessionStore)
  if (!s.initialized) return

  const hasAny = actions.some((action) => canInOrg(action, orgId))
  if (!hasAny) {
    redirect(303, `/org/${orgId}/dashboard?denied=${actions[0]}`)
  }
}

/* ============================================================
   requireActorType — active actor must be a specific type

   Checks IDENTITY (role type), not permissions.
   If the active actor doesn't match but another active actor does,
   auto-switches to it instead of denying access.

   Usage:
     await requireActorType(event, "DRIVER", "CONDUCTOR")
============================================================ */
export async function requireActorType(
  event: LoadEvent,
  ...types: string[]
) {
  await requireAuth(event)

  const s = get(sessionStore)
  if (!s.initialized) return

  const activeActor = s.actors.find((a) => a.id === s.activeActorId)

  // Active actor already matches
  if (activeActor && types.includes(activeActor.type)) return

  // Try to auto-switch to a matching active actor
  const alternate = s.actors.find(
    (a) => types.includes(a.type) && a.status === "active",
  )

  if (alternate) {
    switchActor(alternate.id)
    return
  }

  // No matching actor at all
  redirect(303, `/app/dashboard?denied=requires_${types[0].toLowerCase()}`)
}

/* ============================================================
   ROUTE-SPECIFIC SHORTHANDS
   These call the generic guards with the right parameters
   for each route group. Use in +layout.ts for the route group.
============================================================ */

/** /admin/* — requires admin.full or admin.users at federal level */
export async function requireAdminAccess(event: LoadEvent) {
  await requireFederal(event, "admin.full", "admin.users")
}

/** /admin/audit_logs/* — requires audit.view at federal level */
export async function requireAuditAccess(event: LoadEvent) {
  await requireFederal(event, "audit.view")
}

/** /crew/* — requires DRIVER or CONDUCTOR actor */
export async function requireCrewAccess(event: LoadEvent) {
  await requireActorType(event, ROLES.DRIVER, ROLES.CONDUCTOR)
}

/** /operator/* — requires STAGE_OPERATOR actor */
export async function requireOperatorAccess(event: LoadEvent) {
  await requireActorType(event, ROLES.STAGE_OPERATOR)
}

/* ============================================================
   BACKWARD COMPATIBILITY
============================================================ */

/**
 * @deprecated Use requireOrgAccess() instead — it auto-switches the actor.
 */
export async function requireOrgScope(event: LoadEvent, orgId: string) {
  await requireOrgAccess(event, orgId)
}