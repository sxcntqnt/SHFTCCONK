/**
 * auth.ts — Federated Governance Edition (Optimized)
 *
 * Changes from previous hardened version:
 *
 *   AGGREGATION-AWARE PERMISSION CHECKS
 *   - The my_permissions view now aggregates per (actor, action, scope, level)
 *     and resolves deny > allow within the same scope at the DB level.
 *   - Client-side can() no longer needs to de-duplicate same-scope conflicts.
 *   - Cross-scope deny precedence is still checked client-side (a federal
 *     deny and an org allow are two separate rows from the view).
 *
 *   canAnyActor() FIX
 *   - Previously checked ALL denies across ALL actors globally, which meant
 *     a deny on Actor A would block Actor B even if B had an allow.
 *   - Now checks deny/allow per-actor and returns true if ANY actor
 *     has an unblocked allow.
 *
 *   FEDERAL PERMISSIONS NOW WORK
 *   - The my_permissions view fix (BUG 6) restores federal-level
 *     permissions. Admin/regulator queries now return actual results.
 *   - Added admin-aware helpers: canManageUsers(), canViewAudit()
 *
 *   NEW HELPERS
 *   - canInOrg(action, orgId) — most common permission check pattern
 *   - canInOrgReactive(action, orgId) — reactive version
 *   - canManageUsers() — checks admin.users at federal level
 *   - canManageOrg(orgId) — checks org.manage scoped to org
 *   - canViewAudit() — checks audit.view at federal level
 *   - getPermittedActions(actorId?) — lists allowed actions for an actor
 *
 * IMPORTANT: All frontend permission checks are for UI gating only.
 * The real enforcement is RLS + can_actor_perform() + my_permissions
 * view in Postgres. Never trust the client.
 */

import { writable, derived, get } from "svelte/store"

import { ROLES } from "$lib/features/auth/stores/roles"
import type { Role } from "$lib/features/auth/stores/roles"

/* ============================================================
   JURISDICTION TYPES — matches `jurisdiction_level` domain in DB
============================================================ */
export const JURISDICTION_LEVELS = {
  FEDERAL: "federal",
  ORG: "org",
  BRANCH: "branch",
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
  /** Incremented whenever this user's permissions change.
   *  Compared against JWT claim to detect stale sessions. */
  permissions_version: number
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
 * Effective permission for an actor, from the my_permissions view
 * or bootstrap_session(). Used for UI gating only.
 *
 * POST-OPTIMIZATION GUARANTEE:
 *   The DB view aggregates per (actor_id, action, scope_id, level)
 *   and resolves deny > allow within that group. So for any given
 *   (actor, action, scope, level) there is exactly ONE row — either
 *   'allow' or 'deny', never both.
 *
 *   Cross-scope conflicts (e.g., federal deny + org allow) still
 *   produce two separate rows and must be handled client-side.
 */
export interface EffectivePermission {
  actor_id: string
  action: string
  effect: "allow" | "deny"
  level: JurisdictionLevel
  scope_id: string | null
  source: string // "direct" | "group:GroupName" | "delegated_from:uuid"
}

/**
 * Mirrors the JSONB returned by bootstrap_session() RPC.
 * The hardened version includes permissions directly.
 */
export interface BootstrapSessionPayload {
  profile: Profile | null
  actors: Actor[]
  jurisdictions: Jurisdiction[]
  organization_memberships: OrgMembership[]
  policy_groups: PolicyGroupBinding[]
  /** Included in hardened bootstrap — no separate RPC needed */
  permissions: EffectivePermission[]
}

/* ============================================================
   SUPABASE CLIENT TYPE (minimal interface for store functions)
============================================================ */
export interface SupabaseMinimalClient {
  rpc: (
    fn: string,
    params?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>
  auth: {
    refreshSession: () => Promise<{
      data: { session: unknown } | null
      error: unknown
    }>
    getSession: () => Promise<{
      data: { session: { access_token: string } | null }
      error: unknown
    }>
  }
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

  // Effective permissions (from bootstrap or loadPermissions)
  // POST-OPTIMIZATION: pre-aggregated, one row per (actor, action, scope, level)
  permissions: EffectivePermission[]

  // DB permissions_version at time of last bootstrap
  // Compared against JWT to detect stale sessions
  permissionsVersion: number

  // Invite flow metadata
  inviteScoped: boolean
}

/* ============================================================
   DEFAULT STATE
============================================================ */
const defaultSession: SessionState = {
  initialized: false,
  loading: false,
  profile: null,
  actors: [],
  activeActorId: null,
  jurisdictions: [],
  orgMemberships: [],
  policyGroups: [],
  permissions: [],
  permissionsVersion: 0,
  inviteScoped: false,
}

/* ============================================================
   CORE STORE
============================================================ */
export const sessionStore = writable<SessionState>({ ...defaultSession })

/* ============================================================
   DERIVED STORES — reactive slices for components
============================================================ */

/** The currently active actor object (or null) */
export const activeActor = derived(
  sessionStore,
  ($s) => $s.actors.find((a) => a.id === $s.activeActorId) ?? null,
)

/** Role of the active actor */
export const activeRole = derived(activeActor, ($a) => $a?.type ?? null)

/** Jurisdictions for the active actor only */
export const activeJurisdictions = derived(sessionStore, ($s) =>
  $s.jurisdictions.filter((j) => j.actor_id === $s.activeActorId),
)

/** Organizations the user belongs to (across all actors) */
export const userOrgs = derived(sessionStore, ($s) => $s.orgMemberships)

/** Effective permissions for the active actor, excluding denies */
export const activePermissions = derived(sessionStore, ($s) =>
  $s.permissions.filter(
    (p) => p.actor_id === $s.activeActorId && p.effect === "allow",
  ),
)

/** Effective denies for the active actor (for UI warnings) */
export const activeDenies = derived(sessionStore, ($s) =>
  $s.permissions.filter(
    (p) => p.actor_id === $s.activeActorId && p.effect === "deny",
  ),
)

/** True if the user has completed initial profile setup */
export const profileComplete = derived(
  sessionStore,
  ($s) => !!$s.profile?.full_name && $s.profile.full_name !== "User",
)

/** All unique actor types the user holds */
export const userRoles = derived(sessionStore, ($s) => [
  ...new Set($s.actors.map((a) => a.type)),
])

/** True if the session's permissions may be stale (version mismatch) */
export const isVersionStale = derived(sessionStore, ($s) => {
  if (!$s.initialized || !$s.profile) return false
  return $s.profile.permissions_version !== $s.permissionsVersion
})

/**
 * True if the user has any federal-level jurisdiction (admin/regulator).
 * Reactive — updates on actor switch or permission reload.
 */
export const hasFederalAccess = derived(sessionStore, ($s) =>
  $s.jurisdictions.some(
    (j) => j.actor_id === $s.activeActorId && j.level === "federal",
  ),
)

/**
 * List of distinct allowed actions for the active actor.
 * Useful for feature-flag style UI gating.
 */
export const allowedActions = derived(sessionStore, ($s) => [
  ...new Set(
    $s.permissions
      .filter((p) => p.actor_id === $s.activeActorId && p.effect === "allow")
      .map((p) => p.action),
  ),
])

/* ============================================================
   BOOTSTRAP INITIALIZER
   Called with the payload from: supabase.rpc('bootstrap_session')
============================================================ */
export function initSession(
  payload: BootstrapSessionPayload | null,
  opts: { inviteScoped?: boolean } = {},
): void {
  if (!payload) return

  const actors = payload.actors ?? []

  // Default active actor: prefer first non-PASSENGER, fallback to first
  const preferredActor =
    actors.find((a) => a.type !== ROLES.PASSENGER && a.status === "active") ??
    actors.find((a) => a.status === "active") ??
    actors[0] ??
    null

  const version = payload.profile?.permissions_version ?? 1

  sessionStore.set({
    initialized: true,
    loading: false,
    profile: payload.profile,
    actors,
    activeActorId: preferredActor?.id ?? null,
    jurisdictions: payload.jurisdictions ?? [],
    orgMemberships: payload.organization_memberships ?? [],
    policyGroups: payload.policy_groups ?? [],
    permissions: payload.permissions ?? [],
    permissionsVersion: version,
    inviteScoped: opts.inviteScoped ?? false,
  })
}

/* ============================================================
   VERSION CHECK + AUTO-REFRESH (Kill-Switch Integration)

   The DB bumps profiles.permissions_version whenever actor_permissions,
   actor_policy_groups, actor_jurisdictions, or delegated_authority
   change. The JWT carries the version at issue time.

   If the bootstrap payload's version doesn't match what we stored,
   the user's permissions have changed since their last token refresh.
   We force a session refresh so the new JWT gets the updated version,
   which re-aligns with the DB and un-blocks my_permissions.

   Call this:
     - After every bootstrap_session() call
     - On a timer (optional, for long-lived sessions)
     - When a mutation might have changed permissions
============================================================ */

/**
 * Compares the stored permissionsVersion against the latest from DB.
 * If they differ, forces a JWT refresh and re-bootstraps.
 *
 * Returns true if a refresh was triggered (caller should re-render).
 */
export async function checkVersionAndRefresh(
  supabase: SupabaseMinimalClient,
): Promise<boolean> {
  const s = get(sessionStore)
  if (!s.initialized || !s.profile) return false

  // Fetch current version from DB (single lightweight query)
  const { data, error } = await supabase.rpc("bootstrap_session")
  if (error || !data) return false

  const fresh = data as BootstrapSessionPayload
  const dbVersion = fresh.profile?.permissions_version ?? 1

  if (dbVersion === s.permissionsVersion) {
    return false // versions match, nothing to do
  }

  // Version mismatch detected — force JWT refresh
  console.info(
    `[auth] Permission version mismatch: store=${s.permissionsVersion} db=${dbVersion}. Refreshing session.`,
  )

  const { error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError) {
    console.error("[auth] Session refresh failed:", refreshError)
    return false
  }

  // Re-hydrate store with fresh data (which includes new permissions)
  initSession(fresh)

  return true
}

/**
 * Lightweight version check without full re-bootstrap.
 * Returns true if the JWT version matches the DB version.
 * Use this for periodic polling without the cost of full bootstrap.
 */
export function isSessionCurrent(): boolean {
  const s = get(sessionStore)
  if (!s.initialized || !s.profile) return true // assume current if not loaded
  return s.profile.permissions_version === s.permissionsVersion
}

/* ============================================================
   PERMISSION LOADING
   Fetches effective_permissions for all user's actors.

   In the hardened schema, bootstrap_session() already includes
   permissions. This function is for MANUAL REFRESH only —
   call after mutations that might affect permissions (e.g.
   delegation grant, policy group change).
============================================================ */
export async function loadPermissions(
  supabase: SupabaseMinimalClient,
): Promise<void> {
  sessionStore.update((s) => ({ ...s, loading: true }))

  try {
    const { data, error } = await supabase.rpc("get_my_effective_permissions")

    if (error) {
      console.error("[auth] Failed to load permissions:", error)
      sessionStore.update((s) => ({ ...s, loading: false }))
      return
    }

    const permissions = (data as EffectivePermission[]) ?? []

    sessionStore.update((s) => ({
      ...s,
      permissions,
      loading: false,
    }))
  } catch (err) {
    console.error("[auth] Permission load error:", err)
    sessionStore.update((s) => ({ ...s, loading: false }))
  }
}

/**
 * Full re-bootstrap: re-runs bootstrap_session() and refreshes
 * the JWT if the version has changed. Use after major mutations
 * like invite redemption or actor creation.
 */
export async function rebootstrap(
  supabase: SupabaseMinimalClient,
): Promise<void> {
  sessionStore.update((s) => ({ ...s, loading: true }))

  try {
    const { data, error } = await supabase.rpc("bootstrap_session")

    if (error) {
      console.error("[auth] Re-bootstrap failed:", error)
      sessionStore.update((s) => ({ ...s, loading: false }))
      return
    }

    const payload = data as BootstrapSessionPayload
    const dbVersion = payload.profile?.permissions_version ?? 1
    const s = get(sessionStore)

    // If version changed, refresh JWT so it matches
    if (dbVersion !== s.permissionsVersion) {
      await supabase.auth.refreshSession()
    }

    initSession(payload)
  } catch (err) {
    console.error("[auth] Re-bootstrap error:", err)
    sessionStore.update((s) => ({ ...s, loading: false }))
  }
}

/* ============================================================
   ACTOR SWITCHING
   Users with multiple actors can switch context.
============================================================ */
export function switchActor(actorId: string): void {
  sessionStore.update((s) => {
    const target = s.actors.find((a) => a.id === actorId)
    if (!target) {
      console.warn(`[auth] Cannot switch to unknown actor: ${actorId}`)
      return s
    }
    if (target.status !== "active") {
      console.warn(`[auth] Cannot switch to inactive actor: ${actorId}`)
      return s
    }
    return { ...s, activeActorId: actorId }
  })
}

/* ============================================================
   PERMISSION CHECKS — for UI gating only.

   POST-OPTIMIZATION DESIGN:
   The my_permissions view now aggregates per (actor, action, scope, level)
   and resolves deny > allow within that scope group. So for any given
   (actor, action, scope, level) tuple there is exactly ONE row.

   Cross-scope deny precedence still applies:
     - A deny at federal scope blocks everything
     - A deny at org scope blocks branch/dept allows within that org
   The client handles this via scopeCovers() in the deny check.

   Check by ACTION string (e.g. "vehicle.view"), not by role.
   This aligns with atomic, revocable, jurisdiction-scoped permissions.
============================================================ */

/**
 * Check if the active actor has a specific permission.
 * Optionally scope to a jurisdiction level + scope_id.
 *
 * Deny precedence: a deny at a broader scope overrides an allow
 * at a narrower scope (e.g., federal deny blocks org allow).
 * Same-scope conflicts are pre-resolved by the DB (deny wins).
 */
export function can(
  action: string,
  scope?: { level: JurisdictionLevel; scopeId: string | null },
): boolean {
  const s = get(sessionStore)
  if (!s.activeActorId) return false

  return _canForActor(s, s.activeActorId, action, scope)
}

/**
 * Check if ANY of the user's active actors has an unblocked permission.
 * Useful for routing decisions where actor auto-switching will happen.
 *
 * FIX: Previous version checked denies globally across all actors.
 * A deny on Actor A would block Actor B even if B had an allow.
 * Now checks per-actor: returns true if at least one actor has
 * an unblocked allow.
 */
export function canAnyActor(action: string): boolean {
  const s = get(sessionStore)

  // Check each active actor independently
  for (const actor of s.actors) {
    if (actor.status !== "active") continue
    if (_canForActor(s, actor.id, action)) return true
  }

  return false
}

/**
 * Internal: check permission for a specific actor, with deny precedence.
 * Shared by can() and canAnyActor() to avoid logic duplication.
 */
function _canForActor(
  s: SessionState,
  actorId: string,
  action: string,
  scope?: { level: JurisdictionLevel; scopeId: string | null },
): boolean {
  const actorPerms = s.permissions.filter(
    (p) => p.actor_id === actorId && p.action === action,
  )

  // No permissions for this action at all
  if (actorPerms.length === 0) return false

  // Check for deny at covering scope (broader scope denies override narrower allows)
  const hasDeny = actorPerms.some(
    (p) =>
      p.effect === "deny" &&
      (!scope || scopeCovers(p.level, p.scope_id, scope.level, scope.scopeId)),
  )
  if (hasDeny) return false

  // Check for allow
  return actorPerms.some(
    (p) =>
      p.effect === "allow" &&
      (!scope || scopeCovers(p.level, p.scope_id, scope.level, scope.scopeId)),
  )
}

/**
 * Check permission scoped to a specific organization.
 * This is the most common check pattern in the app.
 *
 * Equivalent to: can(action, { level: "org", scopeId: orgId })
 * but more readable in templates and route guards.
 *
 * Usage:
 *   if (canInOrg("vehicle.view", orgId)) { ... }
 */
export function canInOrg(action: string, orgId: string): boolean {
  return can(action, { level: "org", scopeId: orgId })
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
 * Reactive derived store version of `can()` for use in Svelte templates.
 *
 * Usage:
 *   const canViewVehicles = canReactive("vehicle.view")
 *   {#if $canViewVehicles} ... {/if}
 */
export function canReactive(action: string) {
  return derived(sessionStore, ($s) => {
    if (!$s.activeActorId) return false
    return _canForActor($s, $s.activeActorId, action)
  })
}

/**
 * Reactive store for org-scoped permission check.
 *
 * Usage:
 *   const canManage = canInOrgReactive("org.manage", orgId)
 *   {#if $canManage} ... {/if}
 */
export function canInOrgReactive(action: string, orgId: string) {
  return derived(sessionStore, ($s) => {
    if (!$s.activeActorId) return false
    return _canForActor($s, $s.activeActorId, action, {
      level: "org",
      scopeId: orgId,
    })
  })
}

/**
 * Reactive store for scoped permission check.
 * Re-evaluates when the store changes (actor switch, permission reload).
 */
export function canScopedReactive(
  action: string,
  level: JurisdictionLevel,
  scopeId: string | null,
) {
  return derived(sessionStore, ($s) => {
    if (!$s.activeActorId) return false
    return _canForActor($s, $s.activeActorId, action, { level, scopeId })
  })
}

/* ============================================================
   ADMIN / PLATFORM PERMISSION HELPERS

   These check federal-level permissions that were previously
   broken (BUG 6: federal permissions silently dropped).
   Now that the my_permissions view properly handles federal
   jurisdiction, these actually return correct results.

   Backed by RLS policies:
     - profiles_select_admin (admin.users at federal)
     - actors_select_admin (admin.users at federal)
     - audit_logs_select (audit.view at federal)
============================================================ */

/**
 * Check if the active actor can manage user accounts.
 * Maps to `admin.users` permission at federal level.
 * Used to gate: user list, profile editing, actor deactivation.
 */
export function canManageUsers(): boolean {
  return can("admin.users", { level: "federal", scopeId: null })
}

/**
 * Check if the active actor can manage a specific organization.
 * Maps to `org.manage` permission scoped to the org.
 * Used to gate: member management, invite sending, settings.
 */
export function canManageOrg(orgId: string): boolean {
  return canInOrg("org.manage", orgId)
}

/**
 * Check if the active actor can view audit logs.
 * Maps to `audit.view` permission at federal level.
 * Used to gate: audit log pages, access denied log.
 */
export function canViewAudit(): boolean {
  return can("audit.view", { level: "federal", scopeId: null })
}

/**
 * Check if the active actor has full platform admin access.
 * Maps to `admin.full` permission at federal level.
 */
export function canAdminFull(): boolean {
  return can("admin.full", { level: "federal", scopeId: null })
}

/**
 * Get the list of allowed actions for a specific actor (or active actor).
 * Useful for feature-flag style checks and debugging.
 */
export function getPermittedActions(actorId?: string): string[] {
  const s = get(sessionStore)
  const targetId = actorId ?? s.activeActorId
  if (!targetId) return []

  const allowed = new Set<string>()
  const denied = new Set<string>()

  for (const p of s.permissions) {
    if (p.actor_id !== targetId) continue
    if (p.effect === "deny") {
      denied.add(p.action)
    } else {
      allowed.add(p.action)
    }
  }

  // Remove any actions that have a deny at any scope
  // (conservative — a federal deny blocks even if org allow exists)
  for (const action of denied) {
    allowed.delete(action)
  }

  return [...allowed]
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
 * This is a client-side approximation. The DB-side scope join in
 * my_permissions does the real check against the actual hierarchy
 * tables (branches → organizations, departments → branches).
 *
 * Client-side simplification:
 *   - Federal covers everything
 *   - Same level: must match scope_id
 *   - Broader level (lower rank): assumed to cover narrower
 *     (imprecise — we don't have branch→org mapping client-side,
 *      but the DB already filtered, so this is a safe approximation)
 */
function scopeCovers(
  permLevel: JurisdictionLevel,
  permScope: string | null,
  resLevel: JurisdictionLevel,
  resScope: string | null,
): boolean {
  // Federal covers everything
  if (permLevel === "federal") return true
  // Same level: must be same scope
  if (permLevel === resLevel) return permScope === resScope
  // Broader level covers narrower (org covers branch, branch covers dept)
  if (LEVEL_RANK[permLevel] < LEVEL_RANK[resLevel]) return true
  // Narrower cannot cover broader
  return false
}

/**
 * Check if the active actor has jurisdiction at or above a given level.
 */
export function hasJurisdictionAt(
  level: JurisdictionLevel,
  scopeId?: string | null,
): boolean {
  const s = get(sessionStore)
  return s.jurisdictions.some(
    (j) =>
      j.actor_id === s.activeActorId &&
      LEVEL_RANK[j.level] <= LEVEL_RANK[level] &&
      (j.level === "federal" || !scopeId || j.scope_id === scopeId),
  )
}

/**
 * Check if the active actor has federal-level jurisdiction.
 * Shortcut for hasJurisdictionAt("federal").
 */
export function hasFederalJurisdiction(): boolean {
  return hasJurisdictionAt("federal")
}

/**
 * Get all organization IDs the user has jurisdiction over,
 * across ALL actors (not just active). Used for routing
 * decisions like the org picker and dashboard redirects.
 */
export function getJurisdictionOrgIds(): string[] {
  const s = get(sessionStore)
  const ids = new Set<string>()

  // Collect from jurisdictions across all actors
  for (const j of s.jurisdictions) {
    if (j.level === "federal") {
      // Federal jurisdiction: user can access ALL orgs they're a member of
      for (const m of s.orgMemberships) {
        ids.add(m.organization_id)
      }
    } else if (j.level === "org" && j.scope_id) {
      ids.add(j.scope_id)
    }
    // Branch/dept jurisdictions: add the parent org from memberships
    // (we don't have branch→org mapping client-side, but org memberships cover it)
  }

  return [...ids]
}

/**
 * Get org IDs for a SPECIFIC actor (not all actors).
 * Used when deciding which actor to auto-switch to.
 */
export function getActorOrgIds(actorId: string): string[] {
  const s = get(sessionStore)
  const ids = new Set<string>()

  for (const j of s.jurisdictions) {
    if (j.actor_id !== actorId) continue
    if (j.level === "federal") {
      for (const m of s.orgMemberships) ids.add(m.organization_id)
    } else if (j.level === "org" && j.scope_id) {
      ids.add(j.scope_id)
    }
  }

  return [...ids]
}

/**
 * Find the best actor to use for accessing a specific org.
 * Returns the actor_id or null if no access.
 * Used by org layout guards for auto-switching.
 *
 * Priority: federal jurisdiction first (broadest access),
 * then org-level jurisdiction matching the target org.
 */
export function findActorForOrg(orgId: string): string | null {
  const s = get(sessionStore)

  // First pass: prefer federal-jurisdiction actors
  for (const j of s.jurisdictions) {
    if (j.level !== "federal") continue
    const actor = s.actors.find(
      (a) => a.id === j.actor_id && a.status === "active",
    )
    if (actor) return actor.id
  }

  // Second pass: org-level jurisdiction for this specific org
  for (const j of s.jurisdictions) {
    if (j.level !== "org" || j.scope_id !== orgId) continue
    const actor = s.actors.find(
      (a) => a.id === j.actor_id && a.status === "active",
    )
    if (actor) return actor.id
  }

  return null
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
  return get(sessionStore).actors.some(
    (a) => a.type === type && a.status === "active",
  )
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
 * Throws if no actor has jurisdiction covering the given org.
 * Use before navigating to org-scoped pages.
 */
export function requireOrgAccess(orgId: string): void {
  const orgIds = getJurisdictionOrgIds()
  if (!orgIds.includes(orgId)) {
    throw new Error(`Access denied: no jurisdiction over organization ${orgId}`)
  }
}

/**
 * Returns the "home" org for the active actor.
 * Single org → returns it. Multiple or federal → null (show picker).
 */
export function getHomeOrg(): OrgMembership | null {
  const jurisdictionOrgIds = getJurisdictionOrgIds()
  if (jurisdictionOrgIds.length !== 1) return null

  const s = get(sessionStore)
  return (
    s.orgMemberships.find((m) => m.organization_id === jurisdictionOrgIds[0]) ??
    null
  )
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

/** @deprecated Use `can('org.manage')` or `canManageOrg(orgId)` */
export function isOrgAdmin(): boolean {
  return canAny("org.manage")
}

/** @deprecated Use `isActorType(ROLES.REGULATOR)` or `canViewAudit()` */
export function isRegulatory(): boolean {
  const actor = get(activeActor)
  return actor?.type === ROLES.REGULATOR || actor?.type === ROLES.PLANNER
}

/** @deprecated Use `can('vehicle.view')` */
export function hasPermission(permission: string): boolean {
  return can(permission)
}

/** @deprecated Use initSession() */
export function setUserFromBootstrap(
  payload: BootstrapSessionPayload | null,
  opts: { inviteScoped?: boolean } = {},
): void {
  initSession(payload, opts)
}

/** @deprecated Use sessionStore directly */
export const authStore = derived(sessionStore, ($s) => ({
  profile_id: $s.profile?.id ?? null,
  actor_id: $s.activeActorId,
  actor_type:
    $s.actors.find((a) => a.id === $s.activeActorId)?.type ?? ROLES.PASSENGER,
  fullName: $s.profile?.full_name ?? "Guest",
  email: null as string | null,
  organizationId: getHomeOrg()?.organization_id ?? null,
  sacco: getHomeOrg()?.org_name ?? null,
  role:
    $s.actors.find((a) => a.id === $s.activeActorId)?.type ?? ROLES.PASSENGER,
  permissions: $s.permissions
    .filter((p) => p.actor_id === $s.activeActorId && p.effect === "allow")
    .map((p) => p.action),
  token: null,
  inviteScoped: $s.inviteScoped,
}))
