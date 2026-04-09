// src/lib/features/auth/contexts/super-admin.context.ts
//
// sxcntqnt platform admin context.
//
// LAZY ACTIVATION: Starts null.
// Call activateSuperAdminContext(userState) in /admin/+layout.ts.
//
// ROUTE: /admin/*
//
// MIGRATION FROM sessionStore:
//   activateSuperAdminContext() now accepts UserState instead of reading sessionStore.
//   sessionStore.update() calls removed.
//   ROLES.* replaced with ACTOR_TYPES.* from context.template.
//
// TWO ADMIN TYPES:
//   SUPER_ADMIN — full platform god-mode, isSuperAdmin = true
//   ADMIN       — elevated but not full — canAdminFull may be false
//
// PERMISSION SCOPE:
//   Super admin permissions are federal-level (level = 'federal', scope_id = null).
//   extractPermissions() with no scopeId returns all permissions including federal.
//   No org-scoping needed — super admin sees everything.

import { derived, get } from "svelte/store"
import type { Tables } from "../../../../DatabaseDefinitions"
import type { UserState } from "$lib/features/auth/services/userState.server"
import {
  createContextStore,
  extractPermissions,
  extractOrgMemberships,
  isAllowed,
  ACTOR_TYPES,
} from "$lib/features/auth/contexts/context.template"
import type {
  EffectivePermission,
  OrgMembership,
} from "$lib/features/auth/contexts/context.template"
import { ACTIONS } from "$lib/features/auth/stores/permisions"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActorRow = Tables<"actors">

// ── Context shape ─────────────────────────────────────────────────────────────

export interface SuperAdminContext {
  actor: ActorRow

  /**
   * All org memberships across the platform.
   * Super admin has visibility into all SACCOs — not scoped to a single org.
   * Sourced from userState.assignments.orgMemberships (all actors combined).
   */
  orgs: OrgMembership[]

  /**
   * Federal-level permissions for this actor.
   * Includes direct, policy_group, and delegated grants at federal scope.
   */
  permissions: EffectivePermission[]

  /**
   * True if actor.type === SUPER_ADMIN.
   * False for ADMIN — used to gate canAdminFull and any
   * destructive platform operations that require the highest privilege.
   */
  isSuperAdmin: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

const { store, setContext, clearContext } =
  createContextStore<SuperAdminContext>()
export const superAdminCtx = store

// ─────────────────────────────────────────────────────────────────────────────
// Activation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call from /admin/+layout.ts load({ data }).
 * Returns false if user has no active SUPER_ADMIN or ADMIN actor → redirect.
 *
 * Prefers SUPER_ADMIN over ADMIN when user holds both.
 *
 * @example
 *   // /admin/+layout.ts
 *   export async function load({ data }) {
 *     if (!data.userState) throw redirect(302, '/login')
 *     if (!activateSuperAdminContext(data.userState)) throw redirect(302, '/unauthorized')
 *   }
 */
export function activateSuperAdminContext(userState: UserState): boolean {
  // Prefer SUPER_ADMIN over ADMIN
  const actorCtx =
    userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.SUPER_ADMIN && ctx.status === "active",
    ) ??
    userState.activeContexts.find(
      (ctx) => ctx.type === ACTOR_TYPES.ADMIN && ctx.status === "active",
    ) ??
    null

  if (!actorCtx) {
    clearContext()
    return false
  }

  const actor = userState.actors.find((a) => a.id === actorCtx.actorId)
  if (!actor) {
    clearContext()
    return false
  }

  // No scopeId — super admin permissions are federal, extractPermissions
  // returns all grants including federal when no scope is provided
  const permissions = extractPermissions(userState, actorCtx.actorId)

  // Platform-wide org visibility — all memberships across all actors
  // Super admin needs this for the SACCO management dashboard
  const orgs = userState.assignments.orgMemberships

  setContext({
    actor,
    orgs,
    permissions,
    isSuperAdmin: actor.type === ACTOR_TYPES.SUPER_ADMIN,
  })

  return true
}

export function deactivateSuperAdminContext(): void {
  clearContext()
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────────────────────────

const _allows = (ctx: SuperAdminContext | null, action: string): boolean =>
  ctx ? isAllowed(ctx.permissions, action) : false

// ─────────────────────────────────────────────────────────────────────────────
// Permission stores
// ─────────────────────────────────────────────────────────────────────────────

/** Create new SACCO organizations (org.create) */
export const canCreateOrg = derived(superAdminCtx, ($c) =>
  _allows($c, ACTIONS.ORG_CREATE),
)

/** Approve SACCO org activation requests (org.approve) */
export const canApproveOrg = derived(superAdminCtx, ($c) =>
  _allows($c, ACTIONS.ORG_APPROVE),
)

/** View + edit any user account (admin.users) */
export const canManageUsers = derived(superAdminCtx, ($c) =>
  _allows($c, ACTIONS.ADMIN_USERS),
)

/**
 * Full platform god-mode (admin.full).
 * True if SUPER_ADMIN type OR has explicit admin.full permission grant.
 * ADMIN actors can have this granted explicitly — not automatic.
 */
export const canAdminFull = derived(
  superAdminCtx,
  ($c) => ($c?.isSuperAdmin ?? false) || _allows($c, ACTIONS.ADMIN_FULL),
)

/** View audit logs (audit.view) */
export const canViewAuditLogs = derived(superAdminCtx, ($c) =>
  _allows($c, ACTIONS.AUDIT_VIEW),
)

/** Approve actor_requests at platform level (member.approve) */
export const canApproveRequests = derived(superAdminCtx, ($c) =>
  _allows($c, ACTIONS.MEMBER_APPROVE),
)

/** View all platform reports (reports.view) */
export const canViewReports = derived(superAdminCtx, ($c) =>
  _allows($c, ACTIONS.REPORTS_VIEW),
)

/** All allowed action strings — for debug panel / feature flag inspection */
export const adminAllowedActions = derived(
  superAdminCtx,
  ($c) =>
    $c?.permissions.filter((p) => p.effect === "allow").map((p) => p.action) ??
    [],
)

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const getSuperAdminActorId = () => get(superAdminCtx)?.actor.id ?? null
export const isSuperAdminActive = () => get(superAdminCtx) !== null

/**
 * Imperative permission check — use in server load functions or event handlers.
 *
 * @example
 *   if (!superAdminCan(ACTIONS.ORG_APPROVE)) throw redirect(302, '/unauthorized')
 */
export function superAdminCan(action: string): boolean {
  const ctx = get(superAdminCtx)
  if (!ctx) return false
  return isAllowed(ctx.permissions, action)
}
