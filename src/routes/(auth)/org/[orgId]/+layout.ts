// src/routes/(auth)/org/[orgId]/+layout.ts
//
// Org-scoped layout.
// Guard: requireOrgAccess → checks jurisdiction, auto-switches actor.
//
// Auto-switch logic (handled by the guard):
//   1. Finds the best actor for this org (federal first, then org-level)
//   2. Switches to that actor if it's not currently active
//   3. Redirects to /org/select if no actor has access
//
// Data: loads org context (name, branches, member list) used by
// all child pages (dashboard, settings, vehicles, etc.) for the
// sidebar navigation and org header.
//
// REMOVED: The old layout had a local findActorForOrg() function
// that duplicated the store export. Now uses the guard which calls
// the store's findActorForOrg() + switchActor() internally.

import type { LayoutLoad } from "./$types"
import { requireOrgAccess } from "$lib/guards/auth.guard"

export const load: LayoutLoad = async (event) => {
  const orgId = event.params.orgId
  await requireOrgAccess(event, orgId)

  const { supabase, session, user } = await event.parent()

  // ─── Load org context ─────────────────────────────────────
  // These queries run as the auto-switched actor's JWT.
  // RLS policies (orgs_select_member, branches_select,
  // org_members_select_org) gate visibility.
  const [
    { data: organization },
    { data: branches },
    { data: members },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, status, metadata")
      .eq("id", orgId)
      .single(),
    supabase
      .from("branches")
      .select("id, name")
      .eq("organization_id", orgId)
      .order("name"),
    supabase
      .from("organization_members")
      .select(`
        actor_id,
        role,
        actors (
          id,
          type,
          status,
          profiles ( id, full_name, avatar_url )
        )
      `)
      .eq("organization_id", orgId)
      .limit(100),
  ])

  return {
    supabase,
    session,
    user,
    orgId,
    organization,
    branches: branches ?? [],
    members: members ?? [],
  }
}