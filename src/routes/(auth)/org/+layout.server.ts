/**
 * src/routes/(auth)/org/+layout.server.ts
 *
 * FIX: LayoutLoad → LayoutServerLoad.
 *   The previous version used LayoutLoad (runs on client).
 *   Supabase calls must run server-side — LayoutServerLoad is correct here.
 *
 * COVERS:
 *   /org/select       — org picker for multi-org users
 *   /org/join-sacco   — browse orgs and submit join request
 *   /org/join-success — confirmation page
 *
 * The [orgId] sub-layout handles its own guard for
 * /org/[orgId]/dashboard and other scoped routes.
 */

import type { LayoutServerLoad } from './$types'
import { redirect }              from '@sveltejs/kit'
import { requireAuth }           from '$lib/guards/auth.guard'

export const load: LayoutServerLoad = async (event) => {
  // Throws redirect(303, '/login') if no session
  await requireAuth(event)

  const { supabase, session, user } = event.locals

  if (!session || !user) throw redirect(303, '/login/sign_in')

  return {
    session,
    user,
  }
}