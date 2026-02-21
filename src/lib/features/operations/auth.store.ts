// lib/stores/auth.store.ts
import { writable } from 'svelte/store';
import { persist, createIndexedDBStorage } from '@macfja/svelte-persistent-store'; // Install via npm
import { z } from 'zod'; // Install via npm

export type Role = 'ORG_CHAIR' | 'OPERATIONS_MANAGER' | 'COMPLIANCE_OFFICER' | 'ACCOUNTANT' | 'ROUTE_SUPERVISOR' | 'VEHICLE_OWNER' | 'DRIVER';

const authSchema = z.object({
  userId: z.string(),
  role: z.enum(['ORG_CHAIR', 'OPERATIONS_MANAGER', 'COMPLIANCE_OFFICER', 'ACCOUNTANT', 'ROUTE_SUPERVISOR', 'VEHICLE_OWNER', 'DRIVER']),
  organizationId: z.string(),
  token: z.string().optional(), // JWT
});

export const authStore = persist(writable({
  userId: '',
  role: 'ORG_CHAIR' as Role,
  organizationId: '',
  token: ''
}), createIndexedDBStorage(), 'auth');

export function validateAuth(data: unknown) {
  try {
    return authSchema.parse(data);
  } catch (e) {
    console.error('Invalid auth data:', e);
    return null;
  }
}

// RBAC example: Check permission
export function hasPermission(role: Role, action: string) {
  const permissions: Record<Role, string[]> = {
    ORG_CHAIR: ['all'],
    OPERATIONS_MANAGER: ['fleet', 'routes', 'incidents'],
    // ... define for others
  };
  return permissions[role]?.includes(action) || permissions[role]?.includes('all');
}