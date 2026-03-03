// src/routes/auth/callback/+server.ts
//
// Supabase Auth Callback — Federated Governance Edition (merged & modernized)
//
// Handles:
//  - OAuth / magic-link code → session exchange
//  - Invite token redemption (creates actor/jurisdiction/membership)
//  - Session bootstrapping via RPC for routing decisions
//  - Intelligent post-login routing based on profile, actors, orgs, etc.
//
// Client-side layout will re-hydrate via load_helper() — this is mainly for correct initial redirect.

import { redirect } from "@sveltejs/kit"
import { isAuthApiError } from "@supabase/supabase-js"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const code        = url.searchParams.get("code")
  const inviteToken = url.searchParams.get("invite")
  const next        = url.searchParams.get("next")

  // ─── 1. Exchange code for session (OAuth / magic link / email OTP) ───────
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
    } catch (err) {
      if (isAuthApiError(err)) {
        // Invalid/expired code → back to login with context
        const params = new URLSearchParams({ verified: "true" })
        if (inviteToken) params.set("invite", inviteToken)
        redirect(303, `/login/sign_in?${params.toString()}`)
      }
      // Unexpected error — log & rethrow (or handle gracefully)
      console.error("[auth/callback] Code exchange failed:", err)
      redirect(303, "/auth/auth-code-error") // or your error page
    }
  }

  // ─── 2. Redeem invite token if present ───────────────────────────────────
  // Runs BEFORE bootstrap so new actor/org shows up in bootstrap payload
  let inviteRedeemed = false
  if (inviteToken) {
    const { error: inviteError } = await supabase.rpc("redeem_invite", {
      invite_token: inviteToken,
    })

    if (inviteError) {
      console.error("[auth/callback] Invite redemption failed:", inviteError)
      // Non-blocking: user can still log in with existing permissions
      // UI can show error via invite_error param if desired
    } else {
      inviteRedeemed = true
    }
  }

  // ─── 3. Bootstrap session (RPC that returns rich user context) ───────────
  const { data: bootstrapData, error: bootstrapError } = await supabase.rpc(
    "bootstrap_session"
  )

  if (bootstrapError || !bootstrapData) {
    console.error("[auth/callback] Bootstrap failed:", bootstrapError)
    // Fallback — client will retry bootstrap
    redirect(303, "/account")
  }

  // ─── 4. Decide final destination ─────────────────────────────────────────
  // Priority order:
  //   1. Explicit ?next= (if not just-redeemed invite)
  //   2. Invite-based routing (onboarding / profile / org dashboard)
  //   3. Actor/role-based landing page
  if (next && !inviteRedeemed) {
    redirect(303, sanitizeRedirect(next))
  }

  const destination = resolveDestination(bootstrapData, {
    inviteRedeemed,
    inviteToken,
    next,
  })

  redirect(303, destination)
}

// ─── Routing Decision Logic ────────────────────────────────────────────────
interface BootstrapPayload {
  profile: { id: string; full_name: string | null } | null
  actors: Array<{ id: string; type: string; status: string }>
  jurisdictions: Array<{ actor_id: string; level: string; scope_id: string | null }>
  organization_memberships: Array<{ organization_id: string; role: string; org_name: string }>
  policy_groups: Array<{ group_name: string; level: string; scope_id: string | null }>
}

function resolveDestination(
  session: BootstrapPayload,
  ctx: { inviteRedeemed: boolean; inviteToken: string | null; next: string | null }
): string {
  if (!session.profile) {
    return "/account"
  }

  const { profile, actors, organization_memberships: orgs } = session
  const activeActors = actors.filter(a => a.status === "active")
  const profileIncomplete = !profile.full_name || profile.full_name.trim() === "User"

  const hasOnlyPassenger =
    activeActors.length === 0 ||
    (activeActors.length === 1 && activeActors[0].type === "PASSENGER")

  // New / incomplete user with passenger-only → onboarding
  if (hasOnlyPassenger && profileIncomplete) {
    const params = new URLSearchParams()
    if (ctx.inviteRedeemed && ctx.inviteToken) {
      params.set("invite", ctx.inviteToken)
    }
    const qs = params.toString()
    return `/onboarding${qs ? `?${qs}` : ""}`
  }

  // Just accepted invite → complete profile if needed, else org dashboard
  if (ctx.inviteRedeemed) {
    if (profileIncomplete) {
      return "/account?complete_profile=true"
    }
    // Single org → go straight there
    if (orgs.length === 1) {
      return `/org/${orgs[0].organization_id}/dashboard`
    }
    return "/dashboard" // or "/org/select" if you prefer
  }

  // Explicit next (already checked !inviteRedeemed above)
  if (ctx.next) {
    return sanitizeRedirect(ctx.next)
  }

  // ─── Actor/role-based priority routing ────────────────────────────────
  const actorTypes = new Set(activeActors.map(a => a.type))

  if (actorTypes.has("ADMIN")) {
    return "/admin/dashboard"
  }

  if (actorTypes.has("REGULATOR") || actorTypes.has("PLANNER")) {
    return "/analytics"
  }

  const orgActorTypes = ["ORGANIZATION", "STAGE_OPERATOR", "OWNER"]
  if (orgActorTypes.some(t => actorTypes.has(t))) {
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

// ─── Prevent open redirect attacks ─────────────────────────────────────────
function sanitizeRedirect(path: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard"
  }

  // Block protocol-relative or absolute external URLs
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