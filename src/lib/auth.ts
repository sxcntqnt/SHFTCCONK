// lib/stores/auth.store.ts
import { writable, get } from 'svelte/store'

/* ============================================================
   ROLES
============================================================ */

export const ROLES = {
  PASSENGER: 'PASSENGER',
  DRIVER: 'DRIVER',
  CONDUCTOR: 'CONDUCTOR',
  OWNER: 'OWNER',
  ORGANIZATION: 'ORGANIZATION',
  STAGE_OPERATOR: 'STAGE_OPERATOR', // new operator role
  REGULATOR: 'REGULATOR',
  PLANNER: 'PLANNER',
  ADMIN: 'ADMIN',
  ORG_CHAIR: 'ORG_CHAIR',
  OPERATIONS_MANAGER: 'OPERATIONS_MANAGER',
  COMPLIANCE_OFFICER: 'COMPLIANCE_OFFICER',
  ACCOUNTANT: 'ACCOUNTANT',
  ROUTE_SUPERVISOR: 'ROUTE_SUPERVISOR',
  VEHICLE_OWNER: 'VEHICLE_OWNER',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

/* ============================================================
   USER MODEL (Merged + Strict)
============================================================ */

export interface UserState {
  // Core Identity
  profile_id: string | null
  actor_id: string | null
  actor_type: Role
  fullName: string
  email: string | null

  // Multi-Tenant
  organizationId: string | null

  // RBAC
  role: Role
  permissions: string[]

  // Auth
  token: string | null

  // Optional domain context
  sacco: string | null
}

/* ============================================================
   DEFAULT STATE
============================================================ */

const defaultUser: UserState = {
  profile_id: null,
  actor_id: null,
  actor_type: ROLES.PASSENGER,
  fullName: 'Guest',
  email: null,
  organizationId: null,
  role: ROLES.PASSENGER,
  permissions: [],
  token: null,
  sacco: null,
}

/* ============================================================
   STORE
============================================================ */

export const authStore = writable<UserState>(defaultUser)

/* ============================================================
   BOOTSTRAP INITIALIZER (Typed)
============================================================ */

export interface BootstrapPayload {
  profile_id: string
  actor_id?: string | null
  actor_type?: Role
  name?: string
  email?: string
  organizationId?: string
  permissions?: string[]
  token?: string
  sacco?: string | null
}

export function setUserFromBootstrap(payload: BootstrapPayload | null) {
  if (!payload) return

  authStore.set({
    profile_id: payload.profile_id,
    actor_id: payload.actor_id ?? null,
    actor_type: payload.actor_type ?? ROLES.PASSENGER,
    fullName: payload.name ?? 'User',
    email: payload.email ?? null,
    organizationId: payload.organizationId ?? null,
    role: payload.actor_type ?? ROLES.PASSENGER,
    permissions: payload.permissions ?? [],
    token: payload.token ?? null,
    sacco: payload.sacco ?? null,
  })
}

/* ============================================================
   RBAC UTILITIES
============================================================ */

export function hasRole(role: Role): boolean {
  const u = get(authStore)
  return u.role === role
}

export function hasPermission(permission: string): boolean {
  const u = get(authStore)
  return u.permissions.includes(permission)
}

export function requirePermission(permission: string): void {
  if (!hasPermission(permission)) {
    throw new Error(`Permission denied: ${permission}`)
  }
}

/* ============================================================
   TENANT ENFORCEMENT
============================================================ */

export function enforceTenant(resourceOrgId: string): void {
  const u = get(authStore)

  if (!u.organizationId) {
    throw new Error('User has no tenant context')
  }

  if (u.organizationId !== resourceOrgId) {
    throw new Error('Cross-tenant access denied')
  }
}

/* ============================================================
   RESET / LOGOUT
============================================================ */

export function clearUser() {
  authStore.set(defaultUser)
}

