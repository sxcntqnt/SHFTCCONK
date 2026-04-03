// src/lib/security/authGuard.ts
//
// Route guards — UI-layer access gates for protected routes.
//
// MIGRATION FROM sessionStore:
//   All activate*Context() calls now accept userState as a parameter.
//   sessionStore reads removed entirely.
//   LoadEvent type updated to include userState + activeContext from
//   the root +layout.server.ts pass-through.
//
// ARCHITECTURE:
//   hooks.server.ts  → resolveUserState + activateXContext (server)
//   +layout.server.ts → domain gate + data fetch (server)
//   authGuard.ts     → context store activation + permission checks (client)
//   +layout.ts       → reads activated context store (client)
//
//   Guards are CLIENT-SIDE only. Real authorization is enforced by:
//     - hooks.server.ts (session + domain redirects)
//     - RLS on every table (deny by default)
//     - can_actor_perform() DB function (double-gate on mutations)
//
// ROUTE → GUARD → CONTEXT:
//   /admin/*         requireAdminAccess      → superAdminCtx
//   /org/[orgId]/*   requireOrgMemberAccess  → orgChairCtx | orgCtx
//   /crew/*          requireCrewAccess       → crewCtx
//   /operator/*      requireOperatorAccess   → operatorCtx
//   /app/*           requirePassengerAccess  → passengerCtx
//
// LAYOUT USAGE:
//   // /crew/+layout.ts
//   export const load: LayoutLoad = async ({ data }) => {
//     if (!data.userState) throw redirect(303, '/login')
//     if (!activateCrewContext(data.userState)) throw redirect(303, '/app/dashboard')
//   }
//
// NOTE:
//   Most guards are now thin wrappers kept for backward compatibility
//   with any remaining +layout.ts files not yet migrated to the direct
//   activate*() pattern. New layouts should call activate*() directly.

import { redirect, type LoadEvent as SvelteLoadEvent } from "@sveltejs/kit"
import { get } from "svelte/store"
import { isSessionCurrent } from "$lib/features/auth/stores/auth"
import {
  activateSuperAdminContext,
  superAdminCtx,
} from "$lib/features/auth/contexts/super-admin.context"
import {
  activateOrgChairContext,
  orgChairCtx,
} from "$lib/features/auth/contexts/org-chair.context"
import {
  activateOrgContext,
  orgCtx,
} from "$lib/features/auth/contexts/org.context"
import { activateCrewContext } from "$lib/features/auth/contexts/crew.context"
import {
  activateOperatorContext,
  operatorCtx,
} from "$lib/features/auth/contexts/operator.context"
import { activatePassengerContext } from "$lib/features/auth/contexts/passenger.context"
import { isAllowed } from "$lib/features/auth/contexts/context.template"
import type { UserState } from "$lib/features/auth/services/userState.server"

// ─────────────────────────────────────────────────────────────────────────────
// LoadEvent type
//
// Guards read from event.parent() which now includes userState + activeContext
// forwarded through root +layout.server.ts → child +layout.server.ts chain.
// ─────────────────────────────────────────────────────────────────────────────

interface GuardParent {
  session: { user: { id: string } } | null
  bootstrapped: boolean
  userState: UserState | null
  activeContext: App.ActiveContext | null
}

interface GuardEvent {
  url: URL
  parent: () => Promise<GuardParent>
}

// ─────────────────────────────────────────────────────────────────────────────
// requireAuth — base guard
//
// Checks session existence and JWT permission version freshness.
// Returns userState so callers don't need to call parent() again.
// Every route-specific guard calls this first.
// ─────────────────────────────────────────────────────────────────────────────

export async function requireAuth(event: GuardEvent): Promise<GuardParent> {
  const parent = await event.parent()
  const { session, bootstrapped, userState } = parent

  if (!session) {
    const returnTo = event.url.pathname + event.url.search
    throw redirect(303, `/login/sign_in?next=${encodeURIComponent(returnTo)}`)
  }

  // JWT permission version stale — force re-bootstrap.
  // Catches permission changes that happened since last login.
  // Background polling handles idle; this catches navigation-time staleness.
  if (bootstrapped && !isSessionCurrent()) {
    const current = event.url.pathname + event.url.search
    const sep = current.includes("?") ? "&" : "?"
    throw redirect(303, `${current}${sep}rebootstrap=1`)
  }

  // userState missing on an authenticated route = resolution failure in hooks.
  // Redirect to login — safer than proceeding with unknown state.
  if (!userState) {
    throw redirect(303, "/login")
  }

  return parent
}

// ─────────────────────────────────────────────────────────────────────────────
// requirePassengerAccess — /app/*
//
// Activates passengerCtx. GUEST users get a context — isVerified in
// the UI gates booking. Returns false only if user has no profile.
// ─────────────────────────────────────────────────────────────────────────────

export async function requirePassengerAccess(event: GuardEvent): Promise<void> {
  const { userState } = await requireAuth(event)

  if (!activatePassengerContext(userState!)) {
    throw redirect(303, "/onboarding")
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// requireCrewAccess — /crew/*
//
// Activates crewCtx. Prefers DRIVER over CONDUCTOR.
// Redirects if no active crew actor exists.
// ─────────────────────────────────────────────────────────────────────────────

export async function requireCrewAccess(event: GuardEvent): Promise<void> {
  const { userState } = await requireAuth(event)

  if (!activateCrewContext(userState!)) {
    throw redirect(303, "/app/dashboard?denied=crew_not_active")
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// requireOperatorAccess — /operator/*
//
// Activates operatorCtx. Two-stage check:
//   1. Must have an active OPERATOR actor
//   2. Must have at least one approved org jurisdiction slot
//      (ORG_CHAIR has set max_vehicles on their actor_jurisdictions row)
//
// Without stage 2, an operator approved at platform level but with
// no org grants would see an empty fleet with no explanation.
// ─────────────────────────────────────────────────────────────────────────────

export async function requireOperatorAccess(event: GuardEvent): Promise<void> {
  const { userState } = await requireAuth(event)

  if (!activateOperatorContext(userState!)) {
    throw redirect(303, "/app/dashboard?denied=operator_not_active")
  }

  // activateOperatorContext returns false if orgSlots is empty,
  // but check explicitly for the pending-approval redirect
  const ctx = get(operatorCtx)
  if (!ctx || ctx.orgSlots.length === 0) {
    throw redirect(303, "/operator/pending?reason=no_org_approved")
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// requireAdminAccess — /admin/*
//
// Activates superAdminCtx. Accepts SUPER_ADMIN or ADMIN actor.
// ─────────────────────────────────────────────────────────────────────────────

export async function requireAdminAccess(event: GuardEvent): Promise<void> {
  const { userState } = await requireAuth(event)

  if (!activateSuperAdminContext(userState!)) {
    throw redirect(303, "/app/dashboard?denied=requires_admin")
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// requireAuditAccess — /admin/audit_logs/*
//
// Subset of admin — additionally checks audit.view permission.
// Assumes requireAdminAccess has already run in the parent layout.
// ─────────────────────────────────────────────────────────────────────────────

export async function requireAuditAccess(event: GuardEvent): Promise<void> {
  await requireAdminAccess(event)

  const ctx = get(superAdminCtx)
  const canAudit = ctx ? isAllowed(ctx.permissions, "audit.view") : false

  if (!canAudit) {
    throw redirect(303, "/admin/dashboard?denied=audit.view")
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// requireOrgMemberAccess — /org/[orgId]/*
//
// Tries ORG_CHAIR context first, falls through to general org staff.
// Returns which context was activated so callers can read the right store.
//
// Layout pattern:
//   const role = await requireOrgMemberAccess(event, params.orgId)
//   const ctx  = role === 'chair' ? get(orgChairCtx) : get(orgCtx)
// ─────────────────────────────────────────────────────────────────────────────

export async function requireOrgMemberAccess(
  event: GuardEvent,
  orgId: string,
): Promise<"chair" | "staff"> {
  const { userState } = await requireAuth(event)

  if (activateOrgChairContext(userState!, orgId)) return "chair"
  if (activateOrgContext(userState!, orgId)) return "staff"

  throw redirect(303, "/org/select?reason=no_access")
}

// ─────────────────────────────────────────────────────────────────────────────
// requireOrgPermission — /org/[orgId]/* with a specific permission
//
// Activates the correct org context then checks for one or more actions.
// Use for sub-routes that need more than basic org membership.
// ─────────────────────────────────────────────────────────────────────────────

export async function requireOrgPermission(
  event: GuardEvent,
  orgId: string,
  ...actions: string[]
): Promise<void> {
  const contextType = await requireOrgMemberAccess(event, orgId)

  const permissions =
    contextType === "chair"
      ? (get(orgChairCtx)?.permissions ?? [])
      : (get(orgCtx)?.permissions ?? [])

  const hasAny = actions.some((action) => isAllowed(permissions, action, orgId))

  if (!hasAny) {
    throw redirect(303, `/org/${orgId}/dashboard?denied=${actions[0]}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// requireStageAccess — /stage/[orgId]/*
//
// STAGE_OPERATOR is an org-scoped staff role (queue/dispatch at a
// physical stage). Uses orgCtx — not a separate context — since
// STAGE_OPERATOR permissions are a subset of org staff permissions.
//
// Distinct from requireOperatorAccess (cross-org platform OPERATOR).
// ─────────────────────────────────────────────────────────────────────────────

export async function requireStageAccess(
  event: GuardEvent,
  orgId: string,
): Promise<void> {
  await requireOrgMemberAccess(event, orgId)

  const ctx = get(orgCtx)
  const canStage = ctx
    ? isAllowed(ctx.permissions, "tracking.live", orgId) ||
      isAllowed(ctx.permissions, "booking.list", orgId)
    : false

  if (!canStage) {
    throw redirect(303, `/org/${orgId}/dashboard?denied=stage_access`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Backward compatibility aliases
// Remove once all call sites are migrated to direct activate*() pattern
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use activateOrgContext(data.userState, orgId) directly */
export async function requireOrgScope(
  event: GuardEvent,
  orgId: string,
): Promise<void> {
  await requireOrgMemberAccess(event, orgId)
}

/** @deprecated Use activateOrgContext(data.userState, orgId) directly */
export async function requireOrgAccess(
  event: GuardEvent,
  orgId: string,
): Promise<void> {
  await requireOrgMemberAccess(event, orgId)
}
