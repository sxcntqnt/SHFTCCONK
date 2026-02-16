import { writable } from 'svelte/store'

export const ROLES = {
  PASSENGER: 'PASSENGER' as const,
  DRIVER: 'DRIVER' as const,
  CONDUCTOR: 'CONDUCTOR' as const,
  OWNER: 'OWNER' as const,
  ORGANIZATION: 'ORGANIZATION' as const,
  STAGE_OPERATOR: 'STAGE_OPERATOR' as const,
  REGULATOR: 'REGULATOR' as const,
  PLANNER: 'PLANNER' as const,
  ADMIN: 'ADMIN' as const,
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export type UserState = {
  profile_id?: string
  actor_id?: string | null
  actor_type?: string | null
  role: Role | string
  name?: string
  sacco?: string | null
}

export const user = writable<UserState>({ role: ROLES.PASSENGER, name: 'Guest' })

export function setUserFromBootstrap(payload: any) {
  if (!payload) return
  user.set({
    profile_id: payload.profile_id,
    actor_id: payload.actor_id ?? null,
    actor_type: payload.actor_type ?? null,
    role: payload.actor_type ?? ROLES.PASSENGER,
    name: payload.name ?? 'User',
    sacco: payload.sacco ?? null,
  })
}

export default user
