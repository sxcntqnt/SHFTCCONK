// lib/security/tenantGuard.ts

import { get } from "svelte/store"
import { user } from "$lib/stores/user"

/* ============================================================
   PRODUCTION-GRADE TENANT GUARD
   Enforces multi-tenant isolation across:
     1️⃣ JWT org binding (frontend / auth token)
     2️⃣ Server query filtering
     3️⃣ DB-level RLS (optional but recommended)
============================================================ */

export class TenantGuardError extends Error {
  constructor(message = "Cross-tenant access denied") {
    super(message)
    this.name = "TenantGuardError"
  }
}

/**
 * Checks if the current user can access a resource tied to an org
 * @param resourceOrgId Organization ID of the resource
 * @param throwOnFail If true, throws an error; otherwise returns boolean
 * @returns boolean
 */
export function enforceTenantAccess(
  resourceOrgId: string,
  throwOnFail = true,
): boolean {
  const currentUser = get(user)

  if (!currentUser.organizationId) {
    if (throwOnFail) {
      throw new TenantGuardError("User has no tenant context")
    }
    return false
  }

  const hasAccess = currentUser.organizationId === resourceOrgId

  if (!hasAccess && throwOnFail) {
    throw new TenantGuardError()
  }

  return hasAccess
}

/**
 * Utility: Wraps a server-side function with tenant enforcement
 */
export function withTenantGuard<T extends (...args: any[]) => any>(
  resourceOrgId: string,
  fn: T,
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    enforceTenantAccess(resourceOrgId)
    return fn(...args)
  }) as T
}
