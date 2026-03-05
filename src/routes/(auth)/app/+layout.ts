// src/routes/admin/+layout.ts
//
// Admin section: requires platform ADMIN actor.
// Loads admin-specific data (pending requests, system stats, etc.)

import { redirect } from "@sveltejs/kit"
import { get } from "svelte/store"
import {
  sessionStore,
  activeActor,
  isAdmin,
  switchActor,
  ROLES,
} from "$lib/stores/auth.store"
import type { LayoutLoad } from "./$types"

export const load: LayoutLoad = async ({ parent, url }) => {
  const { supabase, session, user } = await parent()

  // ─── Auth guard ───────────────────────────────────────────
  if (!session || !user) {
    redirect(303, `/login/sign_in?next=${encodeURIComponent(url.pathname)}`)
  }

  const s = get(sessionStore)

  // ─── Admin actor guard ────────────────────────────────────
  // Check if user has an ADMIN actor at all
  const adminActor = s.actors.find(
    (a) => a.type === ROLES.ADMIN && a.status === "active",
  )

  if (!adminActor) {
    // No admin actor → redirect to their appropriate dashboard
    redirect(303, "/dashboard?reason=not_admin")
  }

  // Auto-switch to admin actor if not already active
  const current = get(activeActor)
  if (current?.type !== ROLES.ADMIN) {
    switchActor(adminActor.id)
  }

  // ─── Load admin-specific data ─────────────────────────────
  const [
    { data: pendingRequests },
    { data: recentAuditLogs },
  ] = await Promise.all([
    supabase
      .from("actor_requests")
      .select("id, profile_id, requested_type, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("audit_logs")
      .select("id, event_type, actor_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  return {
    supabase,
    session,
    user,
    pendingRequests: pendingRequests ?? [],
    recentAuditLogs: recentAuditLogs ?? [],
  }
}