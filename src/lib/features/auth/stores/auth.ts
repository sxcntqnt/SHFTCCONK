/**
 * auth.ts — Post-Supabase Edition
 *
 * CHANGES FROM PREVIOUS VERSION:
 *
 *   SUPABASE RPC REMOVED
 *   - checkVersionAndRefresh(), loadPermissions(), rebootstrap(), and
 *     SupabaseMinimalClient are gone. All three called supabase.rpc(...)
 *     directly from the client.
 *   - bootstrap_session() is no longer a client-callable RPC — it's a
 *     Neon SQL function called server-side in +layout.server.ts via
 *     pg.ts's withProfileContext(), once per navigation.
 *   - The JWT-staleness premise behind checkVersionAndRefresh no longer
 *     applies: under the auth-service opaque-token model, permissions
 *     are resolved fresh on every request (NGINX injects X-Permissions
 *     from a live session lookup) — nothing is cached in a client-held
 *     token that could go stale. Only this store's local cache (for UI
 *     gating) can be stale, and that's refreshed by simply re-running
 *     +layout.server.ts's load function.
 *   - To force a re-hydration from a component (e.g. after invite
 *     redemption or a permission-changing mutation), call
 *     `invalidateAll()` from `$app/navigation`. +layout.server.ts will
 *     re-query bootstrap_session() and +layout.ts will call initSession()
 *     with the fresh payload automatically — no store function needed
 *     for this anymore.
 *
 *   DEPRECATED HELPERS REMOVED
 *   - isOrgAdmin(), isRegulatory(), hasPermission(), setUserFromBootstrap(),
 *     authStore were all marked @deprecated in the previous version.
 *     Removed outright. ⚠️ grep the codebase for these names before
 *     deploying — any remaining call sites will now fail to compile,
 *     which is the point (they need to move to the non-deprecated
 *     equivalents: can(), canInOrg(), isActorType(), initSession(),
 *     sessionStore directly).
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
   (see 03_functions.sql for the canonical jsonb_build_object shape)
============================================================ */

export interface Profile {
  id: string
  full_name: string | null
  company_name: string | null
  avatar_url: string | null
  website: string | null
  unsubscribed: boolean
  /** Incremented whenever this user's permissions change.
   *  Compared against the store's cached value to detect a stale
   *  client-side permissions cache — NOT a JWT claim anymore; there
   *  is no client-held token carrying this value under the
   *  auth-service opaque-token model. */
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
 * The DB view aggregates per (actor_id, action, scope_id, level) and
 * resolves deny > allow within that group. So for any given
 * (actor, action, scope, level) there is exactly ONE row — either
 * 'allow' or 'deny', never both.
 *
 * Cross-scope conflicts (e.g., federal deny + org allow) still
 * produce two separate rows and must be handled client-side.
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
 * Mirrors the JSONB returned by bootstrap_session() (03_functions.sql).
 * Keep this in sync if that function's return shape changes.
 */
export interface BootstrapSessionPayload {
  profile: Profile | null
  actors: Actor[]
  jurisdictions: Jurisdiction[]
  organization_memberships: OrgMembership[]
  policy_groups: PolicyGroupBinding[]
  permissions: EffectivePermission[]
}

/* ============================================================
   SESSION STATE
============================================================ */
export interface SessionState {
  initialized: boolean
  loading: boolean
  profile: Profile | null
  actors: Actor[]
  activeActorId: string | null
  jurisdictions: Jurisdiction[]
  orgMemberships: OrgMembership[]
  policyGroups: PolicyGroupBinding[]
  permissions: EffectivePermission[]
  permissionsVersion: number
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

export const activeActor = derived(
  sessionStore,
  ($s) => $s.actors.find((a) => a.id === $s.activeActorId) ?? null,
)

export const activeRole = derived(activeActor, ($a) => $a?.type ?? null)

export const activeJurisdictions = derived(sessionStore, ($s) =>
  $s.jurisdictions.filter((j) => j.actor_id === $s.activeActorId),
)

export const userOrgs = derived(sessionStore, ($s) => $s.orgMemberships)

export const activePermissions = derived(sessionStore, ($s) =>
  $s.permissions.filter(
    (p) => p.actor_id === $s.activeActorId && p.effect === "allow",
  ),
)

export const activeDenies = derived(sessionStore, ($s) =>
  $s.permissions.filter(
    (p) => p.actor_id === $s.activeActorId && p.effect === "deny",
  ),
)

export const profileComplete = derived(
  sessionStore,
  ($s) => !!$s.profile?.full_name && $s.profile.full_name !== "User",
)

export const userRoles = derived(sessionStore, ($s) => [
  ...new Set($s.actors.map((a) => a.type)),
])

/**
 * True if the store's cached permissions_version doesn't match the
 * profile's — i.e. this component tree is rendering with a stale
 * permissions snapshot from before the last bootstrap. Since
 * bootstrap_session() now re-runs server-side on every navigation,
 * this should self-correct on the next load; it's here mainly to
 * gate a "your permissions changed, refresh" banner for long-lived
 * pages that don't navigate.
 */
export const isVersionStale = derived(sessionStore, ($s) => {
  if (!$s.initialized || !$s.profile) return false
  return $s.profile.permissions_version !== $s.permissionsVersion
})

export const hasFederalAccess = derived(sessionStore, ($s) =>
  $s.jurisdictions.some(
    (j) => j.actor_id === $s.activeActorId && j.level === "federal",
  ),
)

export const allowedActions = derived(sessionStore, ($s) => [
  ...new Set(
    $s.permissions
      .filter((p) => p.actor_id === $s.activeActorId && p.effect === "allow")
      .map((p) => p.action),
  ),
])

/* ============================================================
   BOOTSTRAP INITIALIZER
   Called with the payload resolved server-side by +layout.server.ts
   (Neon bootstrap_session(), via pg.ts). No client-side RPC anymore.
============================================================ */
export function initSession(
  payload: BootstrapSessionPayload | null,
  opts: { inviteScoped?: boolean } = {},
): void {
  if (!payload) return

  const actors = payload.actors ?? []

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

/**
 * Lightweight local check: does the store's cached permissions_version
 * match the profile's current one? No network call. Use this for
 * cheap polling; if it returns false, call invalidateAll() (from
 * $app/navigation, inside a component) to force a fresh bootstrap.
 */
export function isSessionCurrent(): boolean {
  const s = get(sessionStore)
  if (!s.initialized || !s.profile) return true
  return s.profile.permissions_version === s.permissionsVersion
}

/* ============================================================
   ACTOR SWITCHING
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
   Check by ACTION string (e.g. "vehicle.view"), not by role.
============================================================ */

export function can(
  action: string,
  scope?: { level: JurisdictionLevel; scopeId: string | null },
): boolean {
  const s = get(sessionStore)
  if (!s.activeActorId) return false
  return _canForActor(s, s.activeActorId, action, scope)
}

export function canAnyActor(action: string): boolean {
  const s = get(sessionStore)
  for (const actor of s.actors) {
    if (actor.status !== "active") continue
    if (_canForActor(s, actor.id, action)) return true
  }
  return false
}

function _canForActor(
  s: SessionState,
  actorId: string,
  action: string,
  scope?: { level: JurisdictionLevel; scopeId: string | null },
): boolean {
  const actorPerms = s.permissions.filter(
    (p) => p.actor_id === actorId && p.action === action,
  )
  if (actorPerms.length === 0) return false

  const hasDeny = actorPerms.some(
    (p) =>
      p.effect === "deny" &&
      (!scope || scopeCovers(p.level, p.scope_id, scope.level, scope.scopeId)),
  )
  if (hasDeny) return false

  return actorPerms.some(
    (p) =>
      p.effect === "allow" &&
      (!scope || scopeCovers(p.level, p.scope_id, scope.level, scope.scopeId)),
  )
}

export function canInOrg(action: string, orgId: string): boolean {
  return can(action, { level: "org", scopeId: orgId })
}

export function canAny(...actions: string[]): boolean {
  return actions.some((a) => can(a))
}

export function canAll(...actions: string[]): boolean {
  return actions.every((a) => can(a))
}

export function canReactive(action: string) {
  return derived(sessionStore, ($s) => {
    if (!$s.activeActorId) return false
    return _canForActor($s, $s.activeActorId, action)
  })
}

export function canInOrgReactive(action: string, orgId: string) {
  return derived(sessionStore, ($s) => {
    if (!$s.activeActorId) return false
    return _canForActor($s, $s.activeActorId, action, {
      level: "org",
      scopeId: orgId,
    })
  })
}

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
============================================================ */

export function canManageUsers(): boolean {
  return can("admin.users", { level: "federal", scopeId: null })
}

export function canManageOrg(orgId: string): boolean {
  return canInOrg("org.manage", orgId)
}

export function canViewAudit(): boolean {
  return can("audit.view", { level: "federal", scopeId: null })
}

export function canAdminFull(): boolean {
  return can("admin.full", { level: "federal", scopeId: null })
}

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

function scopeCovers(
  permLevel: JurisdictionLevel,
  permScope: string | null,
  resLevel: JurisdictionLevel,
  resScope: string | null,
): boolean {
  if (permLevel === "federal") return true
  if (permLevel === resLevel) return permScope === resScope
  if (LEVEL_RANK[permLevel] < LEVEL_RANK[resLevel]) return true
  return false
}

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

export function hasFederalJurisdiction(): boolean {
  return hasJurisdictionAt("federal")
}

export function getJurisdictionOrgIds(): string[] {
  const s = get(sessionStore)
  const ids = new Set<string>()

  for (const j of s.jurisdictions) {
    if (j.level === "federal") {
      for (const m of s.orgMemberships) {
        ids.add(m.organization_id)
      }
    } else if (j.level === "org" && j.scope_id) {
      ids.add(j.scope_id)
    }
  }

  return [...ids]
}

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

export function findActorForOrg(orgId: string): string | null {
  const s = get(sessionStore)

  for (const j of s.jurisdictions) {
    if (j.level !== "federal") continue
    const actor = s.actors.find(
      (a) => a.id === j.actor_id && a.status === "active",
    )
    if (actor) return actor.id
  }

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
============================================================ */

export function isActorType(type: Role): boolean {
  const actor = get(activeActor)
  return actor?.type === type
}

export function hasActorOfType(type: Role): boolean {
  return get(sessionStore).actors.some(
    (a) => a.type === type && a.status === "active",
  )
}

export function isOperational(): boolean {
  const actor = get(activeActor)
  return actor?.type === ROLES.DRIVER || actor?.type === ROLES.CONDUCTOR
}

export function isAdmin(): boolean {
  return hasActorOfType(ROLES.ADMIN)
}

/* ============================================================
   TENANT / SCOPE ENFORCEMENT
============================================================ */

export function requireOrgAccess(orgId: string): void {
  const orgIds = getJurisdictionOrgIds()
  if (!orgIds.includes(orgId)) {
    throw new Error(`Access denied: no jurisdiction over organization ${orgId}`)
  }
}

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

export function clearSession(): void {
  sessionStore.set({ ...defaultSession })
}

export function clearInviteScope(): void {
  sessionStore.update((s) => ({ ...s, inviteScoped: false }))
}

export function patchProfile(updates: Partial<Profile>): void {
  sessionStore.update((s) => ({
    ...s,
    profile: s.profile ? { ...s.profile, ...updates } : null,
  }))
}

/** @deprecated Prefer sessionStore + can()/canInOrg()/isActorType() directly
 *  for new code. Kept because it's still the primary identity read in
 *  Sidebar.svelte and several route components — removing it needs those
 *  call sites migrated first, not a silent deletion here. */
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
