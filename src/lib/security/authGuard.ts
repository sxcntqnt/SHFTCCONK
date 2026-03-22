// src/lib/guards/auth.guard.ts
//
// Route guards using context activation as the access gate.
//
// ARCHITECTURE SHIFT:
//   Old pattern: guard reads sessionStore directly → layout calls activate()
//   New pattern: guard calls activate() → layout reads the context store
//
//   This means each context is bootstrapped ONCE per navigation, not twice.
//   The guard IS the activation step. Layout.ts just reads the result.
//
// INCREMENTAL BOOTSTRAP:
//   Only the context needed by the current route is activated.
//   A DRIVER visiting /crew/* gets CrewContext only.
//   A user visiting /admin/* gets SuperAdminContext only.
//   No context is loaded eagerly — all start null.
//
// SECURITY REMINDER:
//   These are UI guards only. Real authorization:
//     - hooks.server.ts (server-side session check)
//     - RLS on every table (deny by default)
//     - can_actor_perform() DB function (double-gate)
//
// ROUTE → GUARD → CONTEXT:
//   /admin/*            requireAdminAccess      → superAdminCtx
//   /org/[orgId]/*      requireOrgMemberAccess  → orgChairCtx | orgCtx
//   /crew/*             requireCrewAccess       → crewCtx
//   /operator/*         requireOperatorAccess   → operatorCtx
//   /stage/[orgId]/*    requireStageAccess      → orgCtx (STAGE_OPERATOR)
//   /app/*              requirePassengerAccess  → passengerCtx
//
// LAYOUT USAGE:
//   // /crew/+layout.ts
//   import { requireCrewAccess } from '$lib/guards/auth.guard'
//   import { crewCtx } from '$lib/features/auth/contexts'
//   import { get } from 'svelte/store'
//
//   export const load: LayoutLoad = async (event) => {
//     await requireCrewAccess(event)          // activates crewCtx
//     const crew = get(crewCtx)!              // already populated — no second activate()
//     return { plate: crew.activeVehiclePlate }
//   }

import { redirect } from "@sveltejs/kit"
import { get } from "svelte/store"
import { isSessionCurrent } from "$lib/features/auth/stores/auth"
import {
  activateSuperAdminContext,
  activateOrgChairContext,
  activateOrgContext,
  activateCrewContext,
  activateOperatorContext,
  activatePassengerContext,
  superAdminCtx,
  orgChairCtx,
  orgCtx,
  operatorCtx,
} from "$lib/features/auth/contexts"

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
   requireAuth — base guard, call first in every protected layout.

   Only checks session existence and permission version freshness.
   Does NOT activate any context — that is the job of the
   route-specific guards below.
============================================================ */
export async function requireAuth(event: LoadEvent) {
  const { session, bootstrapped } = await event.parent()

  if (!session) {
    const returnTo = event.url.pathname + event.url.search
    redirect(303, `/login/sign_in?next=${encodeURIComponent(returnTo)}`)
  }

  // Stale permission version — force re-bootstrap.
  // Background polling handles idle detection; this catches navigation-time staleness.
  if (bootstrapped && !isSessionCurrent()) {
    const current = event.url.pathname + event.url.search
    const sep = current.includes("?") ? "&" : "?"
    redirect(303, `${current}${sep}rebootstrap=1`)
  }

  return { session, bootstrapped }
}

/* ============================================================
   requirePassengerAccess — /app/*

   Activates passengerCtx. Returns false only if no profile exists.
   GUEST users get a context — isVerified in the UI gates booking.
   Layout reads passengerCtx after this returns.
============================================================ */
export async function requirePassengerAccess(event: LoadEvent) {
  await requireAuth(event)

  const activated = activatePassengerContext()
  if (!activated) {
    redirect(303, "/app/onboarding")
  }
}

/* ============================================================
   requireCrewAccess — /crew/*

   Activates crewCtx with the best DRIVER or CONDUCTOR actor.
   Auto-switches active actor if needed (handled inside activateCrewContext).
   Layout reads crewCtx after this returns.
============================================================ */
export async function requireCrewAccess(event: LoadEvent) {
  await requireAuth(event)

  const activated = activateCrewContext()
  if (!activated) {
    redirect(303, "/app/dashboard?denied=requires_crew")
  }
}

/* ============================================================
   requireOperatorAccess — /operator/*

   Activates operatorCtx. Two-stage check:
     1. Must have an active OPERATOR actor
     2. Must have at least one approved org jurisdiction
        (ORG_CHAIR has granted them a fleet allocation)

   Without stage 2, an operator approved at platform level but with
   no org grants would see an empty fleet with no explanation.
   Layout reads operatorCtx after this returns.
============================================================ */
export async function requireOperatorAccess(event: LoadEvent) {
  await requireAuth(event)

  const activated = activateOperatorContext()
  if (!activated) {
    redirect(303, "/app/dashboard?denied=requires_operator")
  }

  // activateOperatorContext returns false if orgSlots is empty,
  // but we check the store explicitly for the pending-approval redirect
  const ctx = get(operatorCtx)
  if (!ctx || ctx.orgSlots.length === 0) {
    redirect(303, "/operator/pending?reason=no_org_approved")
  }
}

/* ============================================================
   requireAdminAccess — /admin/*

   Activates superAdminCtx. Checks for ADMIN or SUPER_ADMIN actor.
   Layout reads superAdminCtx after this returns.
============================================================ */
export async function requireAdminAccess(event: LoadEvent) {
  await requireAuth(event)

  const activated = activateSuperAdminContext()
  if (!activated) {
    redirect(303, "/app/dashboard?denied=requires_admin")
  }
}

/* ============================================================
   requireAuditAccess — /admin/audit_logs/*

   Subset of admin — additionally checks audit.view permission.
   Assumes requireAdminAccess has already run in the parent layout.
============================================================ */
export async function requireAuditAccess(event: LoadEvent) {
  await requireAdminAccess(event)

  const ctx = get(superAdminCtx)
  const canAudit = ctx?.permissions.some(
    (p) => p.action === "audit.view" && p.effect === "allow",
  ) ?? false

  if (!canAudit) {
    redirect(303, "/admin/dashboard?denied=audit.view")
  }
}

/* ============================================================
   requireOrgMemberAccess — /org/[orgId]/*

   Tries ORG_CHAIR context first, falls through to general org staff.
   Returns which context was activated so layout.ts can branch.

   Layout pattern:
     const role = await requireOrgMemberAccess(event, params.orgId)
     const ctx  = role === 'chair' ? get(orgChairCtx) : get(orgCtx)
============================================================ */
export async function requireOrgMemberAccess(
  event: LoadEvent,
  orgId: string,
): Promise<"chair" | "staff"> {
  await requireAuth(event)

  const isChair = activateOrgChairContext(orgId)
  if (isChair) return "chair"

  const isStaff = activateOrgContext(orgId)
  if (isStaff) return "staff"

  redirect(303, "/org/select?reason=no_access")
}

/* ============================================================
   requireOrgPermission — /org/[orgId]/* with a specific permission

   Activates the correct org context then checks for a permission.
   Use for sub-routes that need more than basic org membership.
============================================================ */
export async function requireOrgPermission(
  event: LoadEvent,
  orgId: string,
  ...actions: string[]
) {
  const contextType = await requireOrgMemberAccess(event, orgId)

  const permissions =
    contextType === "chair"
      ? (get(orgChairCtx)?.permissions ?? [])
      : (get(orgCtx)?.permissions ?? [])

  const hasAny = actions.some((action) =>
    permissions.some(
      (p) =>
        p.action === action &&
        p.effect === "allow" &&
        (p.scope_id === orgId || p.level === "federal"),
    ),
  )

  if (!hasAny) {
    redirect(303, `/org/${orgId}/dashboard?denied=${actions[0]}`)
  }
}

/* ============================================================
   requireStageAccess — /stage/[orgId]/*

   STAGE_OPERATOR is an org-scoped staff role (queue/dispatch at a
   physical stage). Uses orgCtx — not a separate context — since
   STAGE_OPERATOR permissions are a subset of org staff permissions.

   This is distinct from requireOperatorAccess (cross-org OPERATOR).
============================================================ */
export async function requireStageAccess(event: LoadEvent, orgId: string) {
  await requireOrgMemberAccess(event, orgId)

  const ctx = get(orgCtx)
  const canStage = ctx?.permissions.some(
    (p) =>
      (p.action === "tracking.live" || p.action === "booking.list") &&
      p.effect === "allow" &&
      (p.scope_id === orgId || p.level === "federal"),
  ) ?? false

  if (!canStage) {
    redirect(303, `/org/${orgId}/dashboard?denied=stage_access`)
  }
}

/* ============================================================
   BACKWARD COMPATIBILITY
============================================================ */

/** @deprecated Use requireOrgMemberAccess() */
export async function requireOrgScope(event: LoadEvent, orgId: string) {
  await requireOrgMemberAccess(event, orgId)
}

/** @deprecated Use requireOrgMemberAccess() */
export async function requireOrgAccess(event: LoadEvent, orgId: string) {
  await requireOrgMemberAccess(event, orgId)
}