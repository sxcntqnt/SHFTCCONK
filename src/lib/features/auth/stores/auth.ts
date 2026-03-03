/**
 * auth.store.ts — Federated Governance Edition
 *
 * Rewritten to match the federated schema with:
 *  - Multi-actor support (one user → many personas)
 *  - Jurisdiction-scoped permissions (federal/org/branch/department)
 *  - Policy group awareness
 *  - Active actor switching
 *  - Permission-based checks (not role-based)
 *
 * IMPORTANT: All frontend permission checks are for UI gating only.
 * The real enforcement happens via RLS + can_actor_perform() in Postgres.
 * Never trust the client — always let the DB reject unauthorized queries.
 */

import { writable, derived, get } from "svelte/store"

/* ============================================================
   ROLES — matches `roles` table in DB exactly.
   
   These are IDENTITY CLASSIFICATIONS, not access-control primitives.
   Access is governed by permissions + jurisdictions, not roles.
   Roles like "ORG_CHAIR" or "OPERATIONS_MANAGER" are now handled
   as policy groups in the DB, not as role constants.
============================================================ */
export const ROLES = {
  PASSENGER:      "PASSENGER",
  DRIVER:         "DRIVER",
  CONDUCTOR:      "CONDUCTOR",
  OWNER:          "OWNER",
  ORGANIZATION:   "ORGANIZATION",
  STAGE_OPERATOR: "STAGE_OPERATOR",
  REGULATOR:      "REGULATOR",
  PLANNER:        "PLANNER",
  ADMIN:          "ADMIN",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/* ============================================================
   JURISDICTION TYPES — matches `jurisdiction_level` domain in DB
============================================================ */
export const JURISDICTION_LEVELS = {
  FEDERAL:    "federal",
  ORG:        "org",
  BRANCH:     "branch",
  DEPARTMENT: "department",
} as const

export type JurisdictionLevel =
  (typeof JURISDICTION_LEVELS)[keyof typeof JURISDICTION_LEVELS]

/* ============================================================
   DATA SHAPES — match bootstrap_session() payload from DB
============================================================ */

export interface Profile {
  id: string
  full_name: string | null
  company_name: string | null
  avatar_url: string | null
  website: string | null
  unsubscribed: boolean
}

export interface Actor {
  id: string
  profile_id: string
  type: Role
  status: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface Jurisdiction {
  actor_id: string
  level: JurisdictionLevel
  scope_id: string | null // null for federal
}

export interface OrgMembership {
  organization_id: string
  role: string
  org_name: string
}

export interface PolicyGroupBinding {
  group_name: string
  level: JurisdictionLevel
  scope_id: string | null
}

/**
 * Mirrors the JSONB returned by bootstrap_session() RPC.
 */
export interface BootstrapSessionPayload {
  profile: Profile | null
  actors: Actor[]
  jurisdictions: Jurisdiction[]
  organization_memberships: OrgMembership[]
  policy_groups: PolicyGroupBinding[]
}

/**
 * Effective permission for an actor, from the effective_permissions view
 * or a dedicated RPC. Used for UI gating only.
 */
export interface EffectivePermission {
  actor_id: string
  action: string
  effect: "allow" | "deny"
  level: JurisdictionLevel
  scope_id: string | null
  source: string // "direct" | "group:GroupName" | "delegated_from:uuid"
}

/* ============================================================
   SESSION STATE
============================================================ */
export interface SessionState {
  // Lifecycle
  initialized: boolean
  loading: boolean

  // Profile (1:1 with auth.users)
  profile: Profile | null

  // All actors for this user
  actors: Actor[]

  // Currently active actor (selected persona)
  activeActorId: string | null

  // Jurisdictions across all actors
  jurisdictions: Jurisdiction[]

  // Organization memberships
  orgMemberships: OrgMembership[]

  // Policy group bindings
  policyGroups: PolicyGroupBinding[]

  // Effective permissions (fetched separately or from bootstrap)
  // Keyed by actor_id for quick lookup
  permissions: EffectivePermission[]

  // Invite flow metadata
  inviteScoped: boolean
}

/* ============================================================
   DEFAULT STATE
============================================================ */
const defaultSession: SessionState = {
  initialized:   false,
  loading:       false,
  profile:       null,
  actors:        [],
  activeActorId: null,
  jurisdictions: [],
  orgMemberships: [],
  policyGroups:  [],
  permissions:   [],
  inviteScoped:  false,
}

/* ============================================================
   CORE STORE
============================================================ */
export const sessionStore = writable<SessionState>({ ...defaultSession })

/* ============================================================
   DERIVED STORES — reactive slices for components
============================================================ */

/** The currently active actor object (or null) */
export const activeActor = derived(sessionStore, ($s) =>
  $s.actors.find((a) => a.id === $s.activeActorId) ?? null
)

/** Role of the active actor */
export const activeRole = derived(activeActor, ($a) => $a?.type ?? null)

/** Jurisdictions for the active actor only */
export const activeJurisdictions = derived(sessionStore, ($s) =>
  $s.jurisdictions.filter((j) => j.actor_id === $s.activeActorId)
)

/** Organizations the user belongs to (across all actors) */
export const userOrgs = derived(sessionStore, ($s) => $s.orgMemberships)

/** Effective permissions for the active actor, excluding denies */
export const activePermissions = derived(sessionStore, ($s) =>
  $s.permissions.filter(
    (p) => p.actor_id === $s.activeActorId && p.effect === "allow"
  )
)

/** Effective denies for the active actor (for UI warnings) */
export const activeDenies = derived(sessionStore, ($s) =>
  $s.permissions.filter(
    (p) => p.actor_id === $s.activeActorId && p.effect === "deny"
  )
)

/** True if the user has completed initial profile setup */
export const profileComplete = derived(
  sessionStore,
  ($s) => !!$s.profile?.full_name && $s.profile.full_name !== "User"
)

/** All unique actor types the user holds */
export const userRoles = derived(sessionStore, ($s) =>
  [...new Set($s.actors.map((a) => a.type))]
)

/* ============================================================
   BOOTSTRAP INITIALIZER
   Called with the payload from: supabase.rpc('bootstrap_session')
============================================================ */
export function initSession(
  payload: BootstrapSessionPayload | null,
  opts: { inviteScoped?: boolean } = {}
): void {
  if (!payload) return

  const actors = payload.actors ?? []

  // Default active actor: prefer first non-PASSENGER, fallback to first
  const preferredActor =
    actors.find((a) => a.type !== ROLES.PASSENGER && a.status === "active") ??
    actors.find((a) => a.status === "active") ??
    actors[0] ??
    null

  sessionStore.set({
    initialized:    true,
    loading:        false,
    profile:        payload.profile,
    actors,
    activeActorId:  preferredActor?.id ?? null,
    jurisdictions:  payload.jurisdictions ?? [],
    orgMemberships: payload.organization_memberships ?? [],
    policyGroups:   payload.policy_groups ?? [],
    permissions:    [], // loaded separately via loadPermissions()
    inviteScoped:   opts.inviteScoped ?? false,
  })
}

/* ============================================================
   PERMISSION LOADING
   Fetches effective_permissions for all user's actors.
   Call after initSession or when permissions may have changed.
============================================================ */
export async function loadPermissions(
  supabase: { rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }
): Promise<void> {
  sessionStore.update((s) => ({ ...s, loading: true }))

  try {
    // Option A: RPC that returns effective_permissions for the current user
    const { data, error } = await supabase.rpc("get_my_effective_permissions")

    if (error) {
      console.error("[auth] Failed to load permissions:", error)
      return
    }

    sessionStore.update((s) => ({
      ...s,
      permissions: (data as EffectivePermission[]) ?? [],
      loading: false,
    }))
  } catch (err) {
    console.error("[auth] Permission load error:", err)
    sessionStore.update((s) => ({ ...s, loading: false }))
  }
}

/* ============================================================
   ACTOR SWITCHING
   Users with multiple actors can switch context.
============================================================ */
export function switchActor(actorId: string): void {
  sessionStore.update((s) => {
    const exists = s.actors.some((a) => a.id === actorId)
    if (!exists) {
      console.warn(`[auth] Cannot switch to unknown actor: ${actorId}`)
      return s
    }
    return { ...s, activeActorId: actorId }
  })
}

/* ============================================================
   PERMISSION CHECKS — for UI gating only.
   
   These operate on the cached effective_permissions.
   The DB enforces the real authorization via RLS.
   
   Design: check by ACTION string (e.g. "vehicle.view"),
   not by role. This aligns with atomic permissions.
============================================================ */

/**
 * Check if the active actor has a specific permission.
 * Optionally scope to a jurisdiction level + scope_id.
 */
export function can(
  action: string,
  scope?: { level: JurisdictionLevel; scopeId: string | null }
): boolean {
  const s = get(sessionStore)
  if (!s.activeActorId) return false

  // Check for deny first (deny overrides allow, matching DB behavior)
  const hasDeny = s.permissions.some(
    (p) =>
      p.actor_id === s.activeActorId &&
      p.action === action &&
      p.effect === "deny" &&
      (!scope || scopeCovers(p.level, p.scope_id, scope.level, scope.scopeId))
  )
  if (hasDeny) return false

  // Check for allow
  return s.permissions.some(
    (p) =>
      p.actor_id === s.activeActorId &&
      p.action === action &&
      p.effect === "allow" &&
      (!scope || scopeCovers(p.level, p.scope_id, scope.level, scope.scopeId))
  )
}

/**
 * Check multiple permissions (OR — any match = true).
 */
export function canAny(...actions: string[]): boolean {
  return actions.some((a) => can(a))
}

/**
 * Check multiple permissions (AND — all required).
 */
export function canAll(...actions: string[]): boolean {
  return actions.every((a) => can(a))
}

/**
 * Reactive derived store version of `can()` for use in templates.
 *
 * Usage in Svelte:
 *   $: canViewVehicles = canReactive("vehicle.view")
 *   {#if $canViewVehicles} ... {/if}
 */
export function canReactive(action: string) {
  return derived(sessionStore, ($s) => {
    if (!$s.activeActorId) return false

    const hasDeny = $s.permissions.some(
      (p) =>
        p.actor_id === $s.activeActorId &&
        p.action === action &&
        p.effect === "deny"
    )
    if (hasDeny) return false

    return $s.permissions.some(
      (p) =>
        p.actor_id === $s.activeActorId &&
        p.action === action &&
        p.effect === "allow"
    )
  })
}

/* ============================================================
   JURISDICTION HELPERS
============================================================ */

const LEVEL_RANK: Record<JurisdictionLevel, number> = {
  federal: 0,
  org: 1,
  branch: 2,
  department: 3,
}

/**
 * Returns true if a permission at (permLevel, permScope) covers
 * a resource at (resLevel, resScope).
 *
 * Rules:
 *  - federal covers everything
 *  - same level covers if scope matches
 *  - higher level covers lower (org covers branch within it)
 *
 * Note: This is a CLIENT-SIDE approximation. The DB function
 * scope_covers_resource() does the real check against the
 * actual hierarchy tables.
 */
function scopeCovers(
  permLevel: JurisdictionLevel,
  permScope: string | null,
  resLevel: JurisdictionLevel,
  resScope: string | null
): boolean {
  // Federal covers everything
  if (permLevel === "federal") return true

  // Same level — must match scope
  if (permLevel === resLevel) return permScope === resScope

  // Higher level covers lower (approximate — real check is in DB)
  if (LEVEL_RANK[permLevel] < LEVEL_RANK[resLevel]) return true

  return false
}

/**
 * Check if the active actor has jurisdiction at or above a given level.
 */
export function hasJurisdictionAt(
  level: JurisdictionLevel,
  scopeId?: string | null
): boolean {
  const s = get(sessionStore)
  return s.jurisdictions.some(
    (j) =>
      j.actor_id === s.activeActorId &&
      (LEVEL_RANK[j.level] <= LEVEL_RANK[level]) &&
      (j.level === "federal" || !scopeId || j.scope_id === scopeId)
  )
}

/**
 * Get all organization IDs the active actor has jurisdiction over.
 */
export function getJurisdictionOrgIds(): string[] {
  const s = get(sessionStore)
  const ids = new Set<string>()

  for (const j of s.jurisdictions) {
    if (j.actor_id !== s.activeActorId) continue
    if (j.level === "federal") {
      // Federal: add all orgs from memberships
      for (const m of s.orgMemberships) ids.add(m.organization_id)
    } else if (j.level === "org" && j.scope_id) {
      ids.add(j.scope_id)
    }
  }

  return [...ids]
}

/* ============================================================
   ROLE IDENTITY CHECKS
   
   These check the actor TYPE (identity classification),
   NOT access permissions. Use `can()` for authorization.
   Useful for UI layout decisions (show driver UI vs passenger UI).
============================================================ */

/** Active actor is of the given type */
export function isActorType(type: Role): boolean {
  const actor = get(activeActor)
  return actor?.type === type
}

/** User has ANY actor of the given type (across all personas) */
export function hasActorOfType(type: Role): boolean {
  return get(sessionStore).actors.some((a) => a.type === type)
}

/** Convenience: active actor is a vehicle crew member */
export function isOperational(): boolean {
  const actor = get(activeActor)
  return actor?.type === ROLES.DRIVER || actor?.type === ROLES.CONDUCTOR
}

/** Convenience: user has at least one admin actor */
export function isAdmin(): boolean {
  return hasActorOfType(ROLES.ADMIN)
}

/* ============================================================
   TENANT / SCOPE ENFORCEMENT
   
   Client-side guards for multi-tenant navigation.
   Real enforcement is in RLS — these prevent bad UX, not attacks.
============================================================ */

/**
 * Throws if the active actor has no jurisdiction covering the given org.
 * Use before navigating to org-scoped pages.
 */
export function requireOrgAccess(orgId: string): void {
  const orgIds = getJurisdictionOrgIds()
  if (!orgIds.includes(orgId)) {
    throw new Error(
      `Access denied: no jurisdiction over organization ${orgId}`
    )
  }
}

/**
 * Returns the "home" org for the active actor.
 * If the actor has jurisdiction over exactly one org, return it.
 * If multiple, returns null (UI should show org picker).
 * If federal, returns null (UI should show global view).
 */
export function getHomeOrg(): OrgMembership | null {
  const s = get(sessionStore)
  const jurisdictionOrgIds = getJurisdictionOrgIds()

  if (jurisdictionOrgIds.length === 1) {
    return (
      s.orgMemberships.find(
        (m) => m.organization_id === jurisdictionOrgIds[0]
      ) ?? null
    )
  }

  return null // multiple orgs or federal — let UI decide
}

/* ============================================================
   SESSION LIFECYCLE
============================================================ */

/** Full reset on logout */
export function clearSession(): void {
  sessionStore.set({ ...defaultSession })
}

/** Mark invite scope as cleared (after profile completion) */
export function clearInviteScope(): void {
  sessionStore.update((s) => ({ ...s, inviteScoped: false }))
}

/** Update profile in store (after profile edit, without full re-bootstrap) */
export function patchProfile(updates: Partial<Profile>): void {
  sessionStore.update((s) => ({
    ...s,
    profile: s.profile ? { ...s.profile, ...updates } : null,
  }))
}

/* ============================================================
   BACKWARD COMPATIBILITY — deprecated, use can() instead
   
   These map old role-based checks to permission-based checks.
   Remove once all consuming components are migrated.
============================================================ */

/** @deprecated Use `can('org.manage')` instead */
export function isOrgAdmin(): boolean {
  return canAny("org.manage", "org.members")
}

/** @deprecated Use `isActorType(ROLES.REGULATOR)` or `can(...)` */
export function isRegulatory(): boolean {
  const actor = get(activeActor)
  return (
    actor?.type === ROLES.REGULATOR || actor?.type === ROLES.PLANNER
  )
}

/** @deprecated Use `can('vehicle.view')` */
export function hasPermission(permission: string): boolean {
  return can(permission)
}

/** @deprecated Use initSession() */
export function setUserFromBootstrap(
  payload: BootstrapSessionPayload | null,
  opts: { inviteScoped?: boolean } = {}
): void {
  initSession(payload, opts)
}

/** @deprecated Use sessionStore directly */
export const authStore = derived(sessionStore, ($s) => ({
  profile_id:     $s.profile?.id ?? null,
  actor_id:       $s.activeActorId,
  actor_type:     get(activeActor)?.type ?? ROLES.PASSENGER,
  fullName:       $s.profile?.full_name ?? "Guest",
  email:          null as string | null, // email is in auth.users, not profile
  organizationId: getHomeOrg()?.organization_id ?? null,
  sacco:          getHomeOrg()?.org_name ?? null,
  role:           get(activeActor)?.type ?? ROLES.PASSENGER,
  permissions:    $s.permissions
    .filter((p) => p.actor_id === $s.activeActorId && p.effect === "allow")
    .map((p) => p.action),
  token:          null,
  inviteScoped:   $s.inviteScoped,
}))