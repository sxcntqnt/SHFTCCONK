/**
 * org.context.ts — General SACCO staff context.
 *
 * LAZY ACTIVATION: Starts null.
 * Call activateOrgContext(orgId) in /org/[orgId]/+layout.ts.
 *
 * ROUTE: /org/[orgId]/*
 *
 * COVERS ALL NON-CHAIR ORG ROLES:
 *   GENERAL_MANAGER, FLEET_MANAGER, OPERATIONS_MANAGER, BRANCH_MANAGER,
 *   SECRETARY, ACCOUNTANT, ACCOUNTS_CLERK, AUDITOR, COMPLIANCE_OFFICER,
 *   ROUTE_SUPERVISOR, DISPATCHER, MECHANIC, FIELD_ATTENDANT, DATA_CLERK,
 *   CUSTOMER_SUPPORT, SALES_MANAGER
 *
 * The ORG_CHAIR has its own context (org-chair.context.ts).
 * This context handles all staff below chair level, using
 * their actual assigned permissions rather than hardcoded role checks.
 *
 * PERMISSION MODEL:
 *   Permissions are org-scoped — a FLEET_MANAGER at Citi Hoppa
 *   cannot see Super Metro data even if they are also in Super Metro.
 *   Each org load activates a fresh context scoped to that orgId.
 */

import { writable, derived, get } from 'svelte/store'
import { sessionStore } from '$lib/features/auth/stores/auth.store'
import { ROLES } from '$lib/features/auth/stores/roles'
import { ACTIONS } from '$lib/features/auth/stores/permissions'
import type { Actor, OrgMembership, EffectivePermission, Jurisdiction } from '$lib/features/auth/stores/auth.store'

// ── Staff role priority (for picking the best actor when user has multiple) ──
// Higher index = higher precedence
const STAFF_ROLE_PRIORITY: string[] = [
  ROLES.DATA_CLERK,
  ROLES.FIELD_ATTENDANT,
  ROLES.MECHANIC,
  ROLES.ACCOUNTS_CLERK,
  ROLES.COMPLIANCE_OFFICER,
  ROLES.AUDITOR,
  ROLES.CUSTOMER_SUPPORT,
  ROLES.SALES_MANAGER,
  ROLES.SECRETARY,
  ROLES.ACCOUNTANT,
  ROLES.ROUTE_SUPERVISOR,
  ROLES.DISPATCHER,
  ROLES.BRANCH_MANAGER,
  ROLES.OPERATIONS_MANAGER,
  ROLES.FLEET_MANAGER,
  ROLES.GENERAL_MANAGER,
]

// ── Context shape ─────────────────────────────────────────────────────────────

export interface OrgContext {
  actor:       Actor

  /** The role this actor holds — for UI labels and conditional nav */
  roleType:    string

  orgId:       string
  orgName:     string

  jurisdictions: Jurisdiction[]
  permissions:   EffectivePermission[]

  /**
   * Branch scope if this actor is branch-scoped (BRANCH_MANAGER etc.).
   * Null for org-wide actors.
   */
  branchId: string | null
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const orgCtx = writable<OrgContext | null>(null)

// ── Activation ────────────────────────────────────────────────────────────────

/**
 * Call from /org/[orgId]/+layout.ts load({ params }).
 * Returns false if user has no staff actor for this org → redirect to /org/select.
 *
 * Note: ORG_CHAIR is handled by org-chair.context.ts.
 * If the user is an ORG_CHAIR this function will still find them — the
 * layout.ts should check org-chair context first and only fall through to this.
 *
 * @example
 *   export async function load({ params }) {
 *     if (!activateOrgContext(params.orgId)) {
 *       throw redirect(302, '/org/select')
 *     }
 *   }
 */
export function activateOrgContext(orgId: string): boolean {
  const s = get(sessionStore)

  // Find all active actors that have jurisdiction over this org
  const candidates = s.actors.filter((a) => {
    if (a.status !== 'active') return false
    if (a.type === ROLES.ORG_CHAIR) return false // handled separately
    return s.jurisdictions.some(
      (j) =>
        j.actor_id === a.id &&
        (j.level === 'federal' || (j.level === 'org' && j.scope_id === orgId) ||
          (j.level === 'branch' && j.scope_id)), // branch actors also qualify
    )
  })

  if (candidates.length === 0) {
    orgCtx.set(null)
    return false
  }

  // Pick the highest-priority role the user holds for this org
  const actor = candidates.sort((a, b) => {
    const ai = STAFF_ROLE_PRIORITY.indexOf(a.type)
    const bi = STAFF_ROLE_PRIORITY.indexOf(b.type)
    return bi - ai // descending — highest precedence first
  })[0]

  sessionStore.update((st) => ({ ...st, activeActorId: actor.id }))

  const orgMembership = s.orgMemberships.find((m) => m.organization_id === orgId)

  // Permissions scoped to this org (org-level or federal)
  const permissions = s.permissions.filter(
    (p) =>
      p.actor_id === actor.id &&
      (p.scope_id === orgId || p.level === 'federal' || p.level === 'branch'),
  )

  // Branch scope (if actor is branch-scoped)
  const branchJurisdiction = s.jurisdictions.find(
    (j) => j.actor_id === actor.id && j.level === 'branch' && j.scope_id,
  )

  orgCtx.set({
    actor,
    roleType:      actor.type,
    orgId,
    orgName:       orgMembership?.org_name ?? 'Unknown SACCO',
    jurisdictions: s.jurisdictions.filter((j) => j.actor_id === actor.id),
    permissions,
    branchId:      branchJurisdiction?.scope_id ?? null,
  })

  return true
}

export function deactivateOrgContext(): void {
  orgCtx.set(null)
}

// ── Internal helper ───────────────────────────────────────────────────────────

const _allows = (ctx: OrgContext | null, action: string) =>
  ctx?.permissions.some(
    (p) =>
      p.action === action &&
      p.effect === 'allow' &&
      (p.scope_id === ctx.orgId || p.level === 'federal' || p.level === 'branch'),
  ) ?? false

// ── Permission stores ─────────────────────────────────────────────────────────
// All based on actual permission grants — not hardcoded role checks.
// The permission set was seeded from ROLE_PERMISSIONS on actor creation.

/** List vehicles in this org (vehicle.list) */
export const canListVehicles = derived(orgCtx, ($c) => _allows($c, ACTIONS.VEHICLE_LIST))

/** View a single vehicle's details (vehicle.view) */
export const canViewVehicle = derived(orgCtx, ($c) => _allows($c, ACTIONS.VEHICLE_VIEW))

/** Edit vehicle records (vehicle.edit) */
export const canEditVehicle = derived(orgCtx, ($c) => _allows($c, ACTIONS.VEHICLE_EDIT))

/** Add new vehicles to the org (vehicle.add) */
export const canAddVehicle = derived(orgCtx, ($c) => _allows($c, ACTIONS.VEHICLE_ADD))

/** List + manage vehicle groups / routes (vehicle_group.list) */
export const canListVehicleGroups = derived(orgCtx, ($c) => _allows($c, ACTIONS.VEHICLE_GROUP_LIST))

/** Add vehicle groups (vehicle_group.add) */
export const canAddVehicleGroup = derived(orgCtx, ($c) => _allows($c, ACTIONS.VEHICLE_GROUP_ADD))

/** List drivers (driver.list) */
export const canListDrivers = derived(orgCtx, ($c) => _allows($c, ACTIONS.DRIVER_LIST))

/** Edit driver records (driver.edit) */
export const canEditDriver = derived(orgCtx, ($c) => _allows($c, ACTIONS.DRIVER_EDIT))

/** Add new drivers (driver.add) */
export const canAddDriver = derived(orgCtx, ($c) => _allows($c, ACTIONS.DRIVER_ADD))

/** View booking list / passenger manifest (booking.list) */
export const canListBookings = derived(orgCtx, ($c) => _allows($c, ACTIONS.BOOKING_LIST))

/** Edit / cancel bookings (booking.edit) */
export const canEditBooking = derived(orgCtx, ($c) => _allows($c, ACTIONS.BOOKING_EDIT))

/** Create bookings (booking.add) */
export const canAddBooking = derived(orgCtx, ($c) => _allows($c, ACTIONS.BOOKING_ADD))

/** Live GPS tracking (tracking.live) */
export const canTrackLive = derived(orgCtx, ($c) => _allows($c, ACTIONS.TRACKING_LIVE))

/** Historical tracking / playback (tracking.history) */
export const canTrackHistory = derived(orgCtx, ($c) => _allows($c, ACTIONS.TRACKING_HISTORY))

/** View geofences (geofence.list) */
export const canListGeofences = derived(orgCtx, ($c) => _allows($c, ACTIONS.GEOFENCE_LIST))

/** View geofence events / alerts (geofence.events) */
export const canViewGeofenceEvents = derived(orgCtx, ($c) => _allows($c, ACTIONS.GEOFENCE_EVENTS))

/** View finance records (finance.list) */
export const canViewFinance = derived(orgCtx, ($c) => _allows($c, ACTIONS.FINANCE_LIST))

/** Edit finance records (finance.edit) — ACCOUNTANT only */
export const canEditFinance = derived(orgCtx, ($c) => _allows($c, ACTIONS.FINANCE_EDIT))

/** Add finance entries / fare records (finance.add) */
export const canAddFinance = derived(orgCtx, ($c) => _allows($c, ACTIONS.FINANCE_ADD))

/** View fuel logs (fuel.list) */
export const canViewFuel = derived(orgCtx, ($c) => _allows($c, ACTIONS.FUEL_LIST))

/** Edit fuel records (fuel.edit) */
export const canEditFuel = derived(orgCtx, ($c) => _allows($c, ACTIONS.FUEL_EDIT))

/** View maintenance records (maintenance.view) */
export const canViewMaintenance = derived(orgCtx, ($c) => _allows($c, ACTIONS.MAINTENANCE_VIEW))

/** Log a maintenance job (maintenance.log) — MECHANIC */
export const canLogMaintenance = derived(orgCtx, ($c) => _allows($c, ACTIONS.MAINTENANCE_LOG))

/** Edit maintenance records (maintenance.edit) */
export const canEditMaintenance = derived(orgCtx, ($c) => _allows($c, ACTIONS.MAINTENANCE_EDIT))

/** View reports (reports.view) */
export const canViewReports = derived(orgCtx, ($c) => _allows($c, ACTIONS.REPORTS_VIEW))

/** View customer list (customer.list) */
export const canListCustomers = derived(orgCtx, ($c) => _allows($c, ACTIONS.CUSTOMER_LIST))

/** View a customer record (customer.view) */
export const canViewCustomer = derived(orgCtx, ($c) => _allows($c, ACTIONS.CUSTOMER_VIEW))

/** Add new customers (customer.add) — DATA_CLERK, SALES_MANAGER */
export const canAddCustomer = derived(orgCtx, ($c) => _allows($c, ACTIONS.CUSTOMER_ADD))

/** View reminders / alerts (reminder.list) */
export const canViewReminders = derived(orgCtx, ($c) => _allows($c, ACTIONS.REMINDER_LIST))

/** Approve member join requests (member.approve) — SECRETARY */
export const canApproveMembers = derived(orgCtx, ($c) => _allows($c, ACTIONS.MEMBER_APPROVE))

/** Send member invites (member.invite) — SECRETARY */
export const canInviteMembers = derived(orgCtx, ($c) => _allows($c, ACTIONS.MEMBER_INVITE))

/** View pending member requests (member.requests) */
export const canViewMemberRequests = derived(orgCtx, ($c) => _allows($c, ACTIONS.MEMBER_REQUESTS))

/** Manage org settings (org.manage) — senior management only */
export const canManageOrg = derived(orgCtx, ($c) => _allows($c, ACTIONS.ORG_MANAGE))

/** Full settings access (settings.all) — FLEET_MANAGER + above */
export const canChangeSettings = derived(orgCtx, ($c) => _allows($c, ACTIONS.SETTINGS_ALL))

/** The active org ID — for templates */
export const activeOrgId = derived(orgCtx, ($c) => $c?.orgId ?? null)

/** The active org name — for nav breadcrumbs */
export const activeOrgName = derived(orgCtx, ($c) => $c?.orgName ?? '')

/** Active branch ID if branch-scoped, null if org-wide */
export const activeBranchId = derived(orgCtx, ($c) => $c?.branchId ?? null)

/** Role type string — for UI labels ("Fleet Manager", etc.) */
export const activeRoleType = derived(orgCtx, ($c) => $c?.roleType ?? null)

/** All allowed actions — for debug panel or dynamic nav */
export const orgAllowedActions = derived(
  orgCtx,
  ($c) => $c?.permissions.filter((p) => p.effect === 'allow').map((p) => p.action) ?? [],
)

// ── Helpers ───────────────────────────────────────────────────────────────────

export const getOrgActorId     = () => get(orgCtx)?.actor.id ?? null
export const getOrgContextOrgId = () => get(orgCtx)?.orgId ?? null
export const isOrgContextActive = () => get(orgCtx) !== null

/**
 * Imperative permission check — use in load fns or event handlers.
 * @example
 *   if (!orgCan(ACTIONS.FINANCE_EDIT)) throw redirect(302, '/unauthorized')
 */
export function orgCan(action: string): boolean {
  const ctx = get(orgCtx)
  if (!ctx) return false
  return ctx.permissions.some(
    (p) =>
      p.action === action &&
      p.effect === 'allow' &&
      (p.scope_id === ctx.orgId || p.level === 'federal' || p.level === 'branch'),
  )
}