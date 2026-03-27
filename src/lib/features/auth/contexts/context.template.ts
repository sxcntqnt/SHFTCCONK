// src/lib/features/auth/contexts/context.template.ts
//
// Two responsibilities:
//
//   SERVER-SIDE  →  activateXContext()
//     Maps a resolved UserState to an App.ActiveContext.
//     Call this ONLY from hooks.server.ts — never from a page or component.
//     Returns App.ActiveContext or null if the user lacks the required actor.
//
//   CLIENT-SIDE  →  createContextStore<T>()
//     Svelte writable factory. Each individual context file creates its
//     own typed store via this helper. Hydrated from data.userState
//     in each route +layout.ts — NOT from sessionStore reads.
//
// SHARED TYPES:
//   Jurisdiction, OrgMembership, EffectivePermission are re-exported from
//   userState.server so the whole codebase uses one definition, not duplicates.
//
// MIGRATION NOTE:
//   Individual context activate*() functions previously read from sessionStore.
//   They now accept UserState as a parameter. sessionStore is being deprecated
//   as the source-of-truth for server-resolved data. See each context file.
//
// ─────────────────────────────────────────────────────────────────────────────

import { writable } from 'svelte/store'
import type { Writable } from 'svelte/store'
import type {
  UserState,
  ActorContext,
  PermissionEntry,
  EnrichedOrgMember,
} from '$lib/features/auth/services/userState.server'
import type { Tables } from '../../../DatabaseDefinitions'

// ─────────────────────────────────────────────────────────────────────────────
// Re-exported shared types
//
// All context files import these from context.template — not from
// userState.server directly. This keeps the import graph clean:
//   context files → context.template → userState.server (server boundary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Jurisdiction entry from actor_jurisdictions table.
 * Re-typed here from the DB row for clarity — created_at dropped
 * since no context file uses it.
 */
export type Jurisdiction = {
  id:       string
  actor_id: string
  level:    string        // 'federal' | 'org' | 'branch' | 'department'
  scope_id: string | null // orgId | branchId | deptId | null (federal)
  max_vehicles: number | null // OPERATOR only — null for all other actor types
}

/**
 * Org membership enriched with org_name.
 * Alias of EnrichedOrgMember from userState.server — single definition,
 * exposed here under the name used across all context files.
 */
export type OrgMembership = EnrichedOrgMember

/**
 * Effective permission — PermissionEntry with actor_id attached.
 * context files need actor_id to filter per-actor permissions from
 * a flat array. PermissionEntry from userState.server omits it
 * because the server groups by actor before building ActorContext.
 * Here we add it back for client-side use.
 */
export type EffectivePermission = PermissionEntry & {
  actor_id: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Actor type constants
//
// Single source of truth for actor type strings.
// Must match the values in the roles table (roles.id).
// Previously lived in stores/roles.ts — centralised here for
// server + client compatibility.
// ─────────────────────────────────────────────────────────────────────────────

export const ACTOR_TYPES = {
  SUPER_ADMIN:        'SUPER_ADMIN',
  ADMIN:              'ADMIN',
  ORG_CHAIR:          'ORG_CHAIR',
  GENERAL_MANAGER:    'GENERAL_MANAGER',
  FLEET_MANAGER:      'FLEET_MANAGER',
  OPERATIONS_MANAGER: 'OPERATIONS_MANAGER',
  BRANCH_MANAGER:     'BRANCH_MANAGER',
  SECRETARY:          'SECRETARY',
  ACCOUNTANT:         'ACCOUNTANT',
  ACCOUNTS_CLERK:     'ACCOUNTS_CLERK',
  AUDITOR:            'AUDITOR',
  COMPLIANCE_OFFICER: 'COMPLIANCE_OFFICER',
  ROUTE_SUPERVISOR:   'ROUTE_SUPERVISOR',
  DISPATCHER:         'DISPATCHER',
  MECHANIC:           'MECHANIC',
  FIELD_ATTENDANT:    'FIELD_ATTENDANT',
  DATA_CLERK:         'DATA_CLERK',
  CUSTOMER_SUPPORT:   'CUSTOMER_SUPPORT',
  SALES_MANAGER:      'SALES_MANAGER',
  OPERATOR:           'OPERATOR',
  DRIVER:             'DRIVER',
  CONDUCTOR:          'CONDUCTOR',
  PASSENGER:          'PASSENGER',
  GUEST:              'GUEST',
} as const

export type ActorType = typeof ACTOR_TYPES[keyof typeof ACTOR_TYPES]

/**
 * All org staff roles served by /org/[orgId]/*.
 * Excludes ORG_CHAIR — that has its own context file.
 */
export const ORG_STAFF_TYPES: string[] = [
  ACTOR_TYPES.GENERAL_MANAGER,
  ACTOR_TYPES.FLEET_MANAGER,
  ACTOR_TYPES.OPERATIONS_MANAGER,
  ACTOR_TYPES.BRANCH_MANAGER,
  ACTOR_TYPES.SECRETARY,
  ACTOR_TYPES.ACCOUNTANT,
  ACTOR_TYPES.ACCOUNTS_CLERK,
  ACTOR_TYPES.AUDITOR,
  ACTOR_TYPES.COMPLIANCE_OFFICER,
  ACTOR_TYPES.ROUTE_SUPERVISOR,
  ACTOR_TYPES.DISPATCHER,
  ACTOR_TYPES.MECHANIC,
  ACTOR_TYPES.FIELD_ATTENDANT,
  ACTOR_TYPES.DATA_CLERK,
  ACTOR_TYPES.CUSTOMER_SUPPORT,
  ACTOR_TYPES.SALES_MANAGER,
]

// ─────────────────────────────────────────────────────────────────────────────
// Source string helpers
//
// Must match the effective_permissions_raw view output:
//   'direct'                    — actor_permissions rows
//   'group:<policy_group.name>' — policy_group_permissions rows
//   'delegated_from:<actorId>'  — delegated_authority rows
//
// Never match exact strings on group/delegated — always use startsWith.
// ─────────────────────────────────────────────────────────────────────────────

const isDelegated = (source: string | null): boolean =>
  source?.startsWith('delegated_from:') ?? false

const isDirectOrGroup = (source: string | null): boolean =>
  source === 'direct' || (source?.startsWith('group:') ?? false)

// ─────────────────────────────────────────────────────────────────────────────
// SERVER: activateXContext()
//
// Called exclusively from hooks.server.ts after resolveUserState().
//
// Flow:
//   1. selectActorContext() — finds the right ActorContext for the contextType
//   2. Flatten permissions — allow-only strings for App.ActiveContext
//   3. gatherAssignments() — scoped to this actor only
//   4. Return App.ActiveContext or null
//
// On null: hooks.server.ts falls back to 'passenger'.
// On redirect throws: hooks.server.ts re-throws them (see hooks pattern).
// ─────────────────────────────────────────────────────────────────────────────

export function activateXContext(
  userState: UserState,
  contextType: App.ContextType,
  options?: { orgId?: string },
): App.ActiveContext | null {

  const actorCtx = selectActorContext(userState, contextType, options?.orgId)
  if (!actorCtx) return null

  // Flatten to allowed action strings only.
  // Deny resolution already happened in the my_permissions view —
  // effective_permissions_raw is unfiltered but the view aggregates deny > allow.
  // We trust the view output and only surface 'allow' rows here.
  const permissions: string[] = actorCtx.permissions
    .filter(p => p.effect === 'allow')
    .map(p => p.action)

  const delegatedPermissions: string[] = actorCtx.delegatedPermissions
    .filter(p => p.effect === 'allow')
    .map(p => p.action)

  return {
    actorId:             actorCtx.actorId,
    actorType:           contextType,
    permissions,
    delegatedPermissions,
    policyGroups:        actorCtx.policyGroupIds,
    assignments:         gatherAssignments(userState, actorCtx.actorId),
    hasPaidPlan:         userState.hasPaidPlan,
    userState,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: selectActorContext()
//
// Finds the best matching ActorContext for the requested contextType.
// For org-scoped contexts (orgChair, orgStaff), validates via jurisdictions.
// For crew, prefers DRIVER over CONDUCTOR (driver has more write access).
// For passenger, prefers PASSENGER over GUEST.
// ─────────────────────────────────────────────────────────────────────────────

function selectActorContext(
  userState: UserState,
  contextType: App.ContextType,
  orgId?: string,
): ActorContext | null {
  const active = userState.activeContexts

  switch (contextType) {

    case 'superAdmin':
      return active.find(ctx =>
        [ACTOR_TYPES.SUPER_ADMIN, ACTOR_TYPES.ADMIN].includes(ctx.type as ActorType)
        && ctx.status === 'active'
      ) ?? null

    case 'orgChair':
      return active.find(ctx => {
        if (ctx.type !== ACTOR_TYPES.ORG_CHAIR || ctx.status !== 'active') return false
        if (!orgId) return true
        // Federal jurisdiction = chair over all orgs
        return ctx.jurisdictions.some(
          j => j.level === 'federal' || (j.level === 'org' && j.scope_id === orgId)
        )
      }) ?? null

    case 'orgStaff':
      return active.find(ctx => {
        if (!ORG_STAFF_TYPES.includes(ctx.type) || ctx.status !== 'active') return false
        if (!orgId) return true
        return ctx.jurisdictions.some(
          j => j.level === 'federal'
            || (j.level === 'org'    && j.scope_id === orgId)
            || (j.level === 'branch' && j.scope_id != null)  // branch actors qualify
        )
      }) ?? null

    case 'crew':
      // Prefer DRIVER — has shift + fuel write access that CONDUCTOR lacks
      return (
        active.find(ctx => ctx.type === ACTOR_TYPES.DRIVER    && ctx.status === 'active') ??
        active.find(ctx => ctx.type === ACTOR_TYPES.CONDUCTOR && ctx.status === 'active') ??
        null
      )

    case 'operator':
      return active.find(ctx =>
        ctx.type === ACTOR_TYPES.OPERATOR && ctx.status === 'active'
      ) ?? null

    case 'passenger':
      // Prefer PASSENGER over GUEST — GUEST cannot book
      return (
        active.find(ctx => ctx.type === ACTOR_TYPES.PASSENGER && ctx.status === 'active') ??
        active.find(ctx => ctx.type === ACTOR_TYPES.GUEST      && ctx.status === 'active') ??
        null
      )

    case 'guest':
      return active.find(ctx =>
        ctx.type === ACTOR_TYPES.GUEST && ctx.status === 'active'
      ) ?? null

    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: gatherAssignments()
//
// Collects all assignment rows for a specific actor from the flat bundle.
// Returns unknown[] to satisfy App.ActiveContext — callers narrow as needed.
// ─────────────────────────────────────────────────────────────────────────────

function gatherAssignments(userState: UserState, actorId: string): unknown[] {
  const a = userState.assignments
  return [
    ...a.driverAssignments.filter(r  => r.actor_id    === actorId),
    ...a.conductorAssignments.filter(r => r.actor_id  === actorId),
    ...a.orgMemberships.filter(r     => r.actor_id    === actorId),
    ...a.fleetOwnership.filter(r     => r.actor_id    === actorId),
    ...a.stageAssignments.filter(r   => r.operator_id === actorId),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT: createContextStore<T>()
//
// Generic Svelte writable factory.
// Each context file calls this once at module level:
//
//   const { store, setContext, clearContext } = createContextStore<CrewContext>()
//   export const crewCtx = store
//
// The route +layout.ts hydrates the store:
//
//   export async function load({ data }) {
//     if (!data.userState) throw redirect(302, '/login')
//     if (!activateCrewContext(data.userState)) throw redirect(302, '/app/dashboard')
//   }
// ─────────────────────────────────────────────────────────────────────────────

export type ContextStore<T> = {
  store:        Writable<T | null>
  setContext:   (value: T) => void
  clearContext: () => void
}

export function createContextStore<T>(): ContextStore<T> {
  const store = writable<T | null>(null)
  return {
    store,
    setContext:   (value: T) => store.set(value),
    clearContext: () => store.set(null),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT helpers — used inside individual context activate*() functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract permissions for a given actor from UserState.
 * Merges direct + delegated, optionally scoped to an orgId or branchId.
 * Returns EffectivePermission[] (PermissionEntry + actor_id).
 *
 * Source strings use startsWith matching — never exact match on group/delegated.
 *
 * @param userState  Resolved UserState from server
 * @param actorId    Target actor
 * @param scopeId    Optional org/branch UUID — omit for all permissions
 */
export function extractPermissions(
  userState: UserState,
  actorId: string,
  scopeId?: string,
): EffectivePermission[] {
  const actorCtx = userState.activeContexts.find(ctx => ctx.actorId === actorId)
  if (!actorCtx) return []

  // Merge both arrays — context files use a single flat list
  const all: PermissionEntry[] = [
    ...actorCtx.permissions,
    ...actorCtx.delegatedPermissions,
  ]

  const withActorId = (p: PermissionEntry): EffectivePermission => ({
    actor_id: actorId,
    ...p,
  })

  if (!scopeId) return all.map(withActorId)

  // Scope filter: include if scope matches, OR if federal/branch level
  return all
    .filter(p =>
      p.scope_id === scopeId
      || p.level === 'federal'
      || p.level === 'branch'
    )
    .map(withActorId)
}

/**
 * Extract jurisdiction entries for a given actor.
 * Drops created_at — no context file uses it.
 */
export function extractJurisdictions(
  userState: UserState,
  actorId: string,
): Jurisdiction[] {
  const actorCtx = userState.activeContexts.find(ctx => ctx.actorId === actorId)
  if (!actorCtx) return []

  return actorCtx.jurisdictions.map(j => ({
    id:       j.id,
    actor_id: j.actor_id,
    level:    j.level,
    scope_id: j.scope_id,
  }))
}

/**
 * Extract org memberships for a given actor.
 * Returns EnrichedOrgMember[] (aliased as OrgMembership[]).
 */
export function extractOrgMemberships(
  userState: UserState,
  actorId: string,
): OrgMembership[] {
  return userState.assignments.orgMemberships.filter(m => m.actor_id === actorId)
}

/**
 * Permission check helper for context _allows() functions.
 * Checks for an allowed action, optionally scoped to an org or branch.
 *
 * @param permissions  EffectivePermission[] for this actor + scope
 * @param action       Action string e.g. 'booking.add'
 * @param scopeId      Optional org/branch UUID
 */
export function isAllowed(
  permissions: EffectivePermission[],
  action: string,
  scopeId?: string,
): boolean {
  return permissions.some(p =>
    p.action === action
    && p.effect === 'allow'
    && (!scopeId || p.scope_id === scopeId || p.level === 'federal')
  )
}