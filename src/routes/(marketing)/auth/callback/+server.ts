// src/routes/auth/callback/+server.ts
//
// Supabase Auth Callback — Federated Governance Edition (Hardened)
//
// Flow:
//   1. Exchange OAuth/magic-link code for Supabase session
//   2. If invite token present, redeem it (creates actor + jurisdiction + membership)
//   3. Bootstrap session via RPC for routing decision
//   4. Route to correct landing page based on actors, profile, orgs
//
// HARDENING CHANGES:
//   - Uses getUser() after code exchange to validate JWT (not just getSession)
//   - BootstrapPayload includes permissions_version for completeness
//   - Invite redemption captures the result for richer routing
//   - Error responses include structured context for the login page

import { redirect } from "@sveltejs/kit"
import { isAuthApiError } from "@supabase/supabase-js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const code        = url.searchParams.get("code")
  const inviteToken = url.searchParams.get("invite")
  const next        = url.searchParams.get("next")

  // ─── 1. Exchange code for session ────────────────────────────
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
    } catch (err) {
      if (isAuthApiError(err)) {
        const params = new URLSearchParams({ verified: "true" })
        if (inviteToken) params.set("invite", inviteToken)
        redirect(303, `/login/sign_in?${params.toString()}`)
      }
      console.error("[auth/callback] Code exchange failed:", err)
      redirect(303, "/auth/auth-code-error")
    }
  }

  // ─── 2. Validate the session is real ─────────────────────────
  // getUser() hits the Supabase auth server to validate the JWT.
  // getSession() only reads cookies and is faster but less secure.
  // Since this is a one-time callback, we use getUser() for safety.
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error("[auth/callback] No valid user after code exchange:", userError)
    redirect(303, "/login/sign_in?error=session_expired")
  }

  // ─── 3. Redeem invite token if present ───────────────────────
  // Runs BEFORE bootstrap so the new actor appears in the payload.
  // redeem_invite() is idempotent — if the user already has this
  // actor+org combo, it returns { status: 'already_exists' }.
  let inviteRedeemed = false
  let inviteResult: { status: string; actor_type?: string; organization_id?: string } | null = null

  if (inviteToken) {
    const { data, error: inviteError } = await supabase.rpc("redeem_invite", {
      invite_token: inviteToken,
    })

    if (inviteError) {
      console.error("[auth/callback] Invite redemption failed:", inviteError)
      // Non-blocking: user can still log in with existing permissions.
      // Pass error context to the landing page if needed.
    } else {
      inviteResult = data as typeof inviteResult
      inviteRedeemed = inviteResult?.status === "success"
    }
  }

  // ─── 4. Bootstrap session for routing decision ───────────────
  const { data: bootstrapData, error: bootstrapError } = await supabase.rpc(
    "bootstrap_session",
  )

  if (bootstrapError || !bootstrapData) {
    console.error("[auth/callback] Bootstrap failed:", bootstrapError)
    redirect(303, "/account")
  }

  // ─── 5. Route to final destination ───────────────────────────
  if (next && !inviteRedeemed) {
    redirect(303, sanitizeRedirect(next))
  }

  const destination = resolveDestination(bootstrapData as BootstrapPayload, {
    inviteRedeemed,
    inviteResult,
    inviteToken,
    next,
  })

  redirect(303, destination)
}

// ─── Types ─────────────────────────────────────────────────────
// Minimal shape of bootstrap_session() for routing decisions.
// We don't need the full EffectivePermission[] here — just
// enough to decide where to redirect.
interface BootstrapPayload {
  profile: {
    id: string
    full_name: string | null
    permissions_version: number
  } | null
  actors: Array<{ id: string; type: string; status: string }>
  jurisdictions: Array<{ actor_id: string; level: string; scope_id: string | null }>
  organization_memberships: Array<{ organization_id: string; role: string; org_name: string }>
  policy_groups: Array<{ group_name: string; level: string; scope_id: string | null }>
}

interface RoutingContext {
  inviteRedeemed: boolean
  inviteResult: { status: string; actor_type?: string; organization_id?: string } | null
  inviteToken: string | null
  next: string | null
}

// ─── Routing Decision Logic ────────────────────────────────────
function resolveDestination(
  session: BootstrapPayload,
  ctx: RoutingContext,
): string {
  if (!session.profile) {
    return "/account"
  }

  const { profile, actors, organization_memberships: orgs } = session
  const activeActors = actors.filter((a) => a.status === "active")
  const profileIncomplete =
    !profile.full_name || profile.full_name.trim() === "User"

  const hasOnlyPassenger =
    activeActors.length === 0 ||
    (activeActors.length === 1 && activeActors[0].type === "PASSENGER")

  // New/incomplete user with passenger-only → onboarding
  if (hasOnlyPassenger && profileIncomplete) {
    const params = new URLSearchParams()
    if (ctx.inviteRedeemed && ctx.inviteToken) {
      params.set("invite", ctx.inviteToken)
    }
    const qs = params.toString()
    return `/onboarding${qs ? `?${qs}` : ""}`
  }

  // Just accepted invite → profile completion or org dashboard
  if (ctx.inviteRedeemed && ctx.inviteResult) {
    if (profileIncomplete) {
      return "/account?complete_profile=true"
    }

    // If the invite specified an org, go straight to that org's dashboard
    const inviteOrgId = ctx.inviteResult.organization_id
    if (inviteOrgId) {
      return `/org/${inviteOrgId}/dashboard`
    }

    // Fallback: single org → go there, else dashboard
    if (orgs.length === 1) {
      return `/org/${orgs[0].organization_id}/dashboard`
    }
    return "/dashboard"
  }

  // Explicit next (already checked !inviteRedeemed above)
  if (ctx.next) {
    return sanitizeRedirect(ctx.next)
  }

  // ─── Actor/role-based priority routing ───────────────────────
  const actorTypes = new Set(activeActors.map((a) => a.type))

  if (actorTypes.has("ADMIN")) {
    return "/admin/dashboard"
  }

  if (actorTypes.has("REGULATOR") || actorTypes.has("PLANNER")) {
    return "/analytics"
  }

  const orgActorTypes = ["ORGANIZATION", "STAGE_OPERATOR", "OWNER"]
  if (orgActorTypes.some((t) => actorTypes.has(t))) {
    if (orgs.length === 1) {
      return `/org/${orgs[0].organization_id}/dashboard`
    }
    if (orgs.length > 1) {
      return "/org/select"
    }
    return "/dashboard"
  }

  if (actorTypes.has("DRIVER") || actorTypes.has("CONDUCTOR")) {
    return "/crew/dashboard"
  }

  // Default / passenger
  return "/dashboard"
}

// ─── Prevent open redirect attacks ─────────────────────────────
function sanitizeRedirect(path: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard"
  }

  try {
    const url = new URL(path, "http://localhost")
    if (url.hostname !== "localhost") {
      return "/dashboard"
    }
  } catch {
    return "/dashboard"
  }

  return path
}