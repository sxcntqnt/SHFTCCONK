/**
 * org-chair.context.ts — SACCO ORG_CHAIR context.
 *
 * LAZY ACTIVATION: Starts null.
 * Call activateOrgChairContext(orgId) in /org/[orgId]/+layout.ts.
 *
 * ROUTE: /org/[orgId]/*
 *
 * SINGLE ADMIN GUARANTEE:
 *   Exactly one ORG_CHAIR per org (enforced by DB RPC admin_activate_org_member).
 *   This context does not handle multiple chair actors.
 *
 * SECRETARY NOTE:
 *   SECRETARY gets MEMBER_APPROVE via delegated_authority, not direct grant.
 *   The SECRETARY's own context (coming in a future file) handles /org/[orgId]/members.
 *   ORG_CHAIR context exposes `hasDelegatedApproval` to show UI state.
 */

import { writable, derived, get } from 'svelte/store'
import { sessionStore } from '$lib/features/auth/stores/auth'
import { ROLES } from '$lib/features/auth/stores/roles'
import { ACTIONS } from '$lib/features/auth/stores/permisions'
import type { Actor, OrgMembership, EffectivePermission, Jurisdiction } from '$lib/features/auth/stores/auth'

// ── Context shape ─────────────────────────────────────────────
export interface OrgChairContext {
  actor: Actor
  orgId: string
  orgName: string
  jurisdictions: Jurisdiction[]
  permissions: EffectivePermission[]
  /** True if chair has granted approval delegation to a SECRETARY */
  hasDelegatedApproval: boolean
}

// ── Store ─────────────────────────────────────────────────────
export const orgChairCtx = writable<OrgChairContext | null>(null)

// ── Activation ────────────────────────────────────────────────
/**
 * Call from /org/[orgId]/+layout.ts load({ params }).
 * Returns false if user has no ORG_CHAIR actor for this org → redirect.
 *
 * @example
 *   export async function load({ params }) {
 *     if (!activateOrgChairContext(params.orgId)) {
 *       throw redirect(302, '/org/select')
 *     }
 *   }
 */
export function activateOrgChairContext(orgId: string): boolean {
  const s = get(sessionStore)

  // Find ORG_CHAIR actor with jurisdiction over this org
  const actor = s.actors.find((a) => {
    if (a.type !== ROLES.ORG_CHAIR || a.status !== 'active') return false
    return s.jurisdictions.some(
      (j) =>
        j.actor_id === a.id &&
        (j.level === 'federal' || (j.level === 'org' && j.scope_id === orgId)),
    )
  }) ?? null

  if (!actor) {
    orgChairCtx.set(null)
    return false
  }

  sessionStore.update((st) => ({ ...st, activeActorId: actor.id }))

  const orgMembership = s.orgMemberships.find((m) => m.organization_id === orgId)

  // Permissions scoped to this org (org-level scope_id or federal)
  const permissions = s.permissions.filter(
    (p) =>
      p.actor_id === actor.id &&
      (p.scope_id === orgId || p.level === 'federal'),
  )

  orgChairCtx.set({
    actor,
    orgId,
    orgName:             orgMembership?.org_name ?? 'Unknown SACCO',
    jurisdictions:       s.jurisdictions.filter((j) => j.actor_id === actor.id),
    permissions,
    hasDelegatedApproval: false, // TODO: wire from bootstrap payload delegated_authority
  })

  return true
}

export function deactivateOrgChairContext(): void {
  orgChairCtx.set(null)
}

// ── Internal helper ───────────────────────────────────────────
const _allows = (ctx: OrgChairContext | null, action: string) =>
  ctx?.permissions.some(
    (p) =>
      p.action === action &&
      p.effect === 'allow' &&
      (p.scope_id === ctx.orgId || p.level === 'federal'),
  ) ?? false

// ── Permission stores ─────────────────────────────────────────

/**
 * Approve/reject passenger + crew join requests (member.approve).
 * Primary revenue action — approved passengers → ticket commissions.
 */
export const canApproveMembers = derived(orgChairCtx, ($c) => _allows($c, ACTIONS.MEMBER_APPROVE))

/** Send invite tokens to new SACCO members (member.invite) */
export const canInviteMembers = derived(orgChairCtx, ($c) => _allows($c, ACTIONS.MEMBER_INVITE))

/** View pending actor_requests for this org (member.requests) */
export const canViewMemberRequests = derived(orgChairCtx, ($c) => _allows($c, ACTIONS.MEMBER_REQUESTS))

/** Manage org settings, branding, metadata (org.manage) */
export const canManageOrgSettings = derived(orgChairCtx, ($c) => _allows($c, ACTIONS.ORG_MANAGE))

/** Manage vehicles (vehicle.list + vehicle.edit) */
export const canManageVehicles = derived(
  orgChairCtx,
  ($c) => _allows($c, ACTIONS.VEHICLE_LIST) || _allows($c, ACTIONS.VEHICLE_EDIT),
)

/** View finance records (finance.list) */
export const canViewFinance = derived(orgChairCtx, ($c) => _allows($c, ACTIONS.FINANCE_LIST))

/** Live tracking (tracking.live) */
export const canTrackLive = derived(orgChairCtx, ($c) => _allows($c, ACTIONS.TRACKING_LIVE))

/** Manage drivers (driver.list) */
export const canManageDrivers = derived(orgChairCtx, ($c) => _allows($c, ACTIONS.DRIVER_LIST))

/** View maintenance records (maintenance.view) */
export const canViewMaintenance = derived(orgChairCtx, ($c) => _allows($c, ACTIONS.MAINTENANCE_VIEW))

/** View reports (reports.view) */
export const canViewOrgReports = derived(orgChairCtx, ($c) => _allows($c, ACTIONS.REPORTS_VIEW))

/** Full settings access (settings.all) */
export const canChangeSettings = derived(orgChairCtx, ($c) => _allows($c, ACTIONS.SETTINGS_ALL))

/** Active org ID — avoids $orgChairCtx?.orgId in every template */
export const activeOrgId = derived(orgChairCtx, ($c) => $c?.orgId ?? null)

/** Active org name — for page titles, nav breadcrumbs */
export const activeOrgName = derived(orgChairCtx, ($c) => $c?.orgName ?? '')

/** All allowed actions for this chair in this org */
export const chairAllowedActions = derived(
  orgChairCtx,
  ($c) => $c?.permissions.filter((p) => p.effect === 'allow').map((p) => p.action) ?? [],
)

// ── Helpers ───────────────────────────────────────────────────
export const getOrgChairActorId = () => get(orgChairCtx)?.actor.id ?? null
export const getActiveOrgId     = () => get(orgChairCtx)?.orgId ?? null
export const isOrgChairActive   = () => get(orgChairCtx) !== null

/**
 * Imperative permission check — use in server load fns or event handlers.
 * @example
 *   if (!orgChairCan(ACTIONS.MEMBER_APPROVE)) throw redirect(302, '/unauthorized')
 */
export function orgChairCan(action: string): boolean {
  const ctx = get(orgChairCtx)
  if (!ctx) return false
  return ctx.permissions.some(
    (p) =>
      p.action === action &&
      p.effect === 'allow' &&
      (p.scope_id === ctx.orgId || p.level === 'federal'),
  )
}