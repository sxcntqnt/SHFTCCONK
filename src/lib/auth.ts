/**
 * auth.store.ts  (updated)
 *
 * Changes from previous version:
 *  - Added `inviteScoped` flag — true when session came from an invite redemption.
 *    Used to show "finish your profile" prompts without blocking access.
 *  - setUserFromBootstrap now accepts BootstrapSessionPayload type directly.
 *  - Added hasAnyRole() utility for multi-role checks.
 *  - All role constants unchanged — no new roles added here.
 */

import { writable, get } from "svelte/store"
import type { BootstrapSessionPayload } from "./auth.types"

/* ============================================================
   ROLES  — unchanged, single source of truth
============================================================ */
export const ROLES = {
  PASSENGER:           "PASSENGER",
  DRIVER:              "DRIVER",
  CONDUCTOR:           "CONDUCTOR",
  OWNER:               "OWNER",
  ORGANIZATION:        "ORGANIZATION",
  STAGE_OPERATOR:      "STAGE_OPERATOR",
  REGULATOR:           "REGULATOR",
  PLANNER:             "PLANNER",
  ADMIN:               "ADMIN",
  ORG_CHAIR:           "ORG_CHAIR",
  OPERATIONS_MANAGER:  "OPERATIONS_MANAGER",
  COMPLIANCE_OFFICER:  "COMPLIANCE_OFFICER",
  ACCOUNTANT:          "ACCOUNTANT",
  ROUTE_SUPERVISOR:    "ROUTE_SUPERVISOR",
  VEHICLE_OWNER:       "VEHICLE_OWNER",
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

/* ============================================================
   USER MODEL
============================================================ */
export interface UserState {
  // Core identity
  profile_id:     string | null
  actor_id:       string | null
  actor_type:     Role
  fullName:       string
  email:          string | null

  // Multi-tenant
  organizationId: string | null
  sacco:          string | null

  // RBAC
  role:           Role
  permissions:    string[]

  // Auth
  token:          string | null

  // Session metadata
  /**
   * True when the session was established via invitation redemption.
   * Used to surface "complete your profile" nudges without blocking access.
   * Cleared after the user updates their profile name.
   */
  inviteScoped:   boolean
}

/* ============================================================
   DEFAULT STATE
============================================================ */
const defaultUser: UserState = {
  profile_id:     null,
  actor_id:       null,
  actor_type:     ROLES.PASSENGER,
  fullName:       "Guest",
  email:          null,
  organizationId: null,
  sacco:          null,
  role:           ROLES.PASSENGER,
  permissions:    [],
  token:          null,
  inviteScoped:   false,
}

/* ============================================================
   STORE
============================================================ */
export const authStore = writable<UserState>(defaultUser)

/* ============================================================
   BOOTSTRAP INITIALIZER
   Called with the payload returned by bootstrap_session() RPC.
   Role always comes from the server — never from UI input.
============================================================ */
export function setUserFromBootstrap(
  payload: BootstrapSessionPayload | null,
  opts: { inviteScoped?: boolean } = {}
) {
  if (!payload) return

  authStore.set({
    profile_id:     payload.profile_id,
    actor_id:       payload.actor_id ?? null,
    actor_type:     payload.actor_type,
    fullName:       payload.name ?? "User",
    email:          payload.email ?? null,
    organizationId: payload.organizationId ?? null,
    sacco:          payload.sacco ?? null,
    role:           payload.actor_type,   // single source: actor_type from server
    permissions:    payload.permissions ?? [],
    token:          null,                 // token managed by Supabase session, not store
    inviteScoped:   opts.inviteScoped ?? false,
  })
}

/* ============================================================
   RBAC UTILITIES
============================================================ */

/** Exact role match */
export function hasRole(role: Role): boolean {
  return get(authStore).role === role
}

/** True if the user has ANY of the given roles */
export function hasAnyRole(...roles: Role[]): boolean {
  return roles.includes(get(authStore).role)
}

/** True if the user has ALL of the given roles (unusual, but available) */
export function hasAllRoles(...roles: Role[]): boolean {
  const current = get(authStore).role
  return roles.every((r) => r === current)
}

/** Permission string check */
export function hasPermission(permission: string): boolean {
  return get(authStore).permissions.includes(permission)
}

/** Throws if permission is missing */
export function requirePermission(permission: string): void {
  if (!hasPermission(permission)) {
    throw new Error(`Permission denied: ${permission}`)
  }
}

/** Convenience: true for any operational role (in-vehicle) */
export function isOperational(): boolean {
  return hasAnyRole(ROLES.DRIVER, ROLES.CONDUCTOR)
}

/** Convenience: true for any org-admin role */
export function isOrgAdmin(): boolean {
  return hasAnyRole(
    ROLES.ORG_CHAIR,
    ROLES.OPERATIONS_MANAGER,
    ROLES.OWNER,
    ROLES.ORGANIZATION
  )
}

/** Convenience: true for regulatory / government roles */
export function isRegulatory(): boolean {
  return hasAnyRole(ROLES.REGULATOR, ROLES.PLANNER)
}

/* ============================================================
   TENANT ENFORCEMENT
============================================================ */
export function enforceTenant(resourceOrgId: string): void {
  const u = get(authStore)
  if (!u.organizationId) {
    throw new Error("User has no tenant context")
  }
  if (u.organizationId !== resourceOrgId) {
    throw new Error("Cross-tenant access denied")
  }
}

/* ============================================================
   RESET / LOGOUT
============================================================ */
export function clearUser() {
  authStore.set(defaultUser)
}