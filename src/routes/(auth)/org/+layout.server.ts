// src/routes/(auth)/org/+layout.server.ts
//
// Parent layout for all /org/* routes.
//
// COVERS:
//   /org/select       — org picker for multi-org users
//   /org/join-sacco   — browse orgs + submit join request
//   /org/join-success — confirmation after joining
//
// MIGRATION FROM sessionStore:
//   requireAuth() removed — authGuardHandle already redirected
//   unauthenticated users to /login before this runs.
//
// GATE:
//   Loosest gate in the org group — any authenticated user with a
//   resolved userState can access /org/select and /org/join-sacco.
//   The [orgId] child layout handles the stricter org-membership gate.
//
// RESPONSIBILITY:
//   Pass-through only — no domain data fetched here.
//   The /org/select page fetches its own org list.
//   The /org/[orgId] child layout handles org-specific access.

import type { LayoutServerLoad } from './$types'
import { redirect }              from '@sveltejs/kit'

export const load: LayoutServerLoad = async ({ locals }) => {
  const { userState, activeContext } = locals

  // userState null = resolution failed or reached without session.
  // authGuardHandle protects /org — this is a safety net only.
  if (!userState) {
    throw redirect(303, '/login')
  }

  return {
    userState,
    activeContext,
  }
}