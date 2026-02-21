// lib/security/permissionGuard.ts

import { get } from 'svelte/store';
import { user } from '$lib/stores/user';

/* ============================================================
   PRODUCTION-GRADE PERMISSION GUARD
   Ensures users have the required permission before accessing
   any sensitive action or resource.
============================================================ */

export class PermissionGuardError extends Error {
  constructor(message = 'Permission denied') {
    super(message);
    this.name = 'PermissionGuardError';
  }
}

/**
 * Enforces that the current user has a specific permission
 * @param requiredPermission The permission string to check
 * @param throwOnFail If true, throws an error; otherwise returns boolean
 * @returns boolean
 */
export function requirePermission(
  requiredPermission: string,
  throwOnFail = true
): boolean {
  const currentUser = get(user);

  if (!currentUser.permissions || currentUser.permissions.length === 0) {
    if (throwOnFail) {
      throw new PermissionGuardError('User has no permissions assigned');
    }
    return false;
  }

  const hasAccess = currentUser.permissions.includes(requiredPermission);

  if (!hasAccess && throwOnFail) {
    throw new PermissionGuardError(`Missing permission: ${requiredPermission}`);
  }

  return hasAccess;
}

/**
 * Utility: Wraps a function with permission enforcement
 */
export function withPermission<T extends (...args: any[]) => any>(
  requiredPermission: string,
  fn: T
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    requirePermission(requiredPermission);
    return fn(...args);
  }) as T;
}