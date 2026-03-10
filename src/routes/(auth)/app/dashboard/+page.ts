// src/routes/(auth)/app/dashboard/+page.ts
//
// Smart dashboard router.
// Routes users to their appropriate section based on actors.
// Also passes verification + subscription status for banner display.

import { redirect } from "@sveltejs/kit"
import { get } from "svelte/store"
import {
  sessionStore,
  getJurisdictionOrgIds,
} from "$lib/features/auth/stores/auth"
import { ROLES } from "$lib/features/auth/stores/roles"
import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ parent, url }) => {
  const { session } = await parent()
  if (!session) {
    redirect(303, "/login/sign_in")
  }

  const s = get(sessionStore)
  if (!s.initialized) {
    return {
      destinations: [],
      reason: null,
      pendingRequests: [],
      hasActiveSubscription: false,
    }
  }

  const actorTypes = new Set(
    s.actors.filter((a) => a.status === "active").map((a) => a.type),
  )
  const orgIds = getJurisdictionOrgIds()
  const reason = url.searchParams.get("reason")

  // ─── Verification status ──────────────────
  // Check for pending actor_requests
  const pendingRequests = (s as any).pendingRequests ?? []

  // ─── Subscription status ──────────────────
  // This should come from the session bootstrap or layout data.
  // Check if the session has subscription info from custom_access_token_hook
  const hasActiveSubscription = (s as any).hasActiveSubscription ?? (s as any).subscription?.status === 'active' ?? false

  // ─── Onboarding ──────────────────
  const onboardingComplete = url.searchParams.get("onboarding") === "complete"
  const requestedRole = url.searchParams.get("role") ?? null

  // ─── Single clear destination → redirect ──────────────────
  if (actorTypes.size === 0 || (actorTypes.size === 1 && actorTypes.has(ROLES.PASSENGER))) {
    return {
      destinations: [],
      reason,
      isPassenger: true,
      pendingRequests,
      hasActiveSubscription,
      onboardingComplete,
      requestedRole,
    }
  }

  if (actorTypes.size === 1 && actorTypes.has(ROLES.ADMIN)) {
    redirect(303, "/admin/dashboard")
  }

  const hasOnlyCrew =
    [...actorTypes].every((t) =>
      [ROLES.DRIVER, ROLES.CONDUCTOR, ROLES.PASSENGER].includes(t as any),
    ) && (actorTypes.has(ROLES.DRIVER) || actorTypes.has(ROLES.CONDUCTOR))
  if (hasOnlyCrew) {
    redirect(303, "/crew/dashboard")
  }

  const orgRoles = [ROLES.ORGANIZATION, ROLES.STAGE_OPERATOR, ROLES.OWNER]
  const hasOrgRole = orgRoles.some((r) => actorTypes.has(r))
  if (hasOrgRole && orgIds.length === 1) {
    redirect(303, `/org/${orgIds[0]}/dashboard`)
  }

  // ─── Multiple destinations → show selector ────────────────
  const destinations: Array<{ label: string; href: string; icon: string; description: string }> = []

  if (actorTypes.has(ROLES.ADMIN)) {
    destinations.push({
      label: "Admin Panel",
      href: "/admin/dashboard",
      icon: "⚙️",
      description: "Platform administration, user requests, audit logs",
    })
  }

  if (actorTypes.has(ROLES.REGULATOR) || actorTypes.has(ROLES.PLANNER)) {
    destinations.push({
      label: "Analytics",
      href: "/analytics",
      icon: "📊",
      description: "Regulatory oversight and planning data",
    })
  }

  if (hasOrgRole && orgIds.length > 1) {
    for (const membership of s.orgMemberships) {
      destinations.push({
        label: membership.org_name,
        href: `/org/${membership.organization_id}/dashboard`,
        icon: "🏢",
        description: `${membership.role} — ${membership.org_name}`,
      })
    }
  } else if (hasOrgRole && orgIds.length === 1) {
    const org = s.orgMemberships[0]
    destinations.push({
      label: org?.org_name ?? "Organization",
      href: `/org/${orgIds[0]}/dashboard`,
      icon: "🏢",
      description: "Organization management",
    })
  }

  if (actorTypes.has(ROLES.DRIVER) || actorTypes.has(ROLES.CONDUCTOR)) {
    destinations.push({
      label: "Crew Dashboard",
      href: "/crew/dashboard",
      icon: "🚐",
      description: "Vehicle operations, trips, and assignments",
    })
  }

  return {
    destinations,
    reason,
    pendingRequests,
    hasActiveSubscription,
    onboardingComplete,
    requestedRole,
  }
}