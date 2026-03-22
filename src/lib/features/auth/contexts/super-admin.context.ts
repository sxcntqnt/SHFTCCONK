/**
 * super-admin.context.ts — sxcntqnt platform admin context.
 *
 * LAZY ACTIVATION: Starts null.
 * Call activateSuperAdminContext() in /admin/+layout.ts.
 *
 * ROUTE: /admin/*
 */

import { writable, derived, get } from 'svelte/store'
import { sessionStore } from '$lib/features/auth/stores/auth'
import { ROLES } from '$lib/features/auth/stores/roles'
import { ACTIONS } from '$lib/features/auth/stores/permisions'
import type { Actor, OrgMembership, EffectivePermission } from '$lib/features/auth/stores/auth'

// ── Context shape ─────────────────────────────────────────────
export interface SuperAdminContext {
  actor: Actor
  orgs: OrgMembership[]
  permissions: EffectivePermission[]
  isSuperAdmin: boolean
}

// ── Store ─────────────────────────────────────────────────────
export const superAdminCtx = writable<SuperAdminContext | null>(null)

// ── Activation ────────────────────────────────────────────────
/**
 * Call from /admin/+layout.ts load().
 * Returns false → redirect to /unauthorized.
 *
 * @example
 *   export async function load() {
 *     if (!activateSuperAdminContext()) throw redirect(302, '/unauthorized')
 *   }
 */
export function activateSuperAdminContext(): boolean {
  const s = get(sessionStore)

  const actor =
    s.actors.find((a) => a.type === ROLES.SUPER_ADMIN && a.status === 'active') ??
    s.actors.find((a) => a.type === ROLES.ADMIN       && a.status === 'active') ??
    null

  if (!actor) {
    superAdminCtx.set(null)
    return false
  }

  sessionStore.update((st) => ({ ...st, activeActorId: actor.id }))

  superAdminCtx.set({
    actor,
    orgs:        s.orgMemberships,
    permissions: s.permissions.filter((p) => p.actor_id === actor.id),
    isSuperAdmin: actor.type === ROLES.SUPER_ADMIN,
  })

  return true
}

export function deactivateSuperAdminContext(): void {
  superAdminCtx.set(null)
}

// ── Permission stores ─────────────────────────────────────────

const _allows = (ctx: SuperAdminContext | null, action: string) =>
  ctx?.permissions.some((p) => p.action === action && p.effect === 'allow') ?? false

/** Create new SACCO organizations (org.create) */
export const canCreateOrg = derived(superAdminCtx, ($c) => _allows($c, ACTIONS.ORG_CREATE))

/** Approve SACCO org activation requests (org.approve) */
export const canApproveOrg = derived(superAdminCtx, ($c) => _allows($c, ACTIONS.ORG_APPROVE))

/** View + edit any user account (admin.users) */
export const canManageUsers = derived(superAdminCtx, ($c) => _allows($c, ACTIONS.ADMIN_USERS))

/** Full platform god-mode (admin.full) */
export const canAdminFull = derived(
  superAdminCtx,
  ($c) => ($c?.isSuperAdmin ?? false) || _allows($c, ACTIONS.ADMIN_FULL),
)

/** View audit logs (audit.view) */
export const canViewAuditLogs = derived(superAdminCtx, ($c) => _allows($c, ACTIONS.AUDIT_VIEW))

/** Approve actor_requests at platform level (member.approve) */
export const canApproveRequests = derived(superAdminCtx, ($c) => _allows($c, ACTIONS.MEMBER_APPROVE))

/** View all reports (reports.view) */
export const canViewReports = derived(superAdminCtx, ($c) => _allows($c, ACTIONS.REPORTS_VIEW))

/** All allowed action strings — for debug panel / feature flags */
export const adminAllowedActions = derived(
  superAdminCtx,
  ($c) => $c?.permissions.filter((p) => p.effect === 'allow').map((p) => p.action) ?? [],
)

// ── Helpers ───────────────────────────────────────────────────
export const getSuperAdminActorId = () => get(superAdminCtx)?.actor.id ?? null
export const isSuperAdminActive   = () => get(superAdminCtx) !== null