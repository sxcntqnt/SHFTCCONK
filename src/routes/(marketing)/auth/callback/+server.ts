// src/routes/auth/callback/+server.ts
//
// Auth Callback — Federated Governance (Production)
//
// Aligned with:
//   - hooks.server.ts (supabase client from locals)
//   - redeem_invite(invite_token uuid) actual signature
//   - bootstrap_session() → BootstrapPayload shape
//   - auth.ts initSession() / ROLES constants
//   - Optimized my_permissions (federal permissions now work)
//
// Flow:
//   1. Exchange OAuth/magic-link code for Supabase session
//   2. Validate user via getUser() (hits auth server, not just cookies)
//   3. Redeem invite token if present (creates actor + jurisdiction + membership)
//   4. Bootstrap session via RPC for routing decision
//   5. Route to correct landing page based on actors, permissions, orgs
//
// The client-side +layout.ts will re-hydrate the full session store —
// this server-side logic is for the initial redirect only.

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
        // Invalid/expired code → back to login with context preserved
        const params = new URLSearchParams({ verified: "true" })
        if (inviteToken) params.set("invite", inviteToken)
        if (next) params.set("next", next)
        redirect(303, `/login/sign_in?${params.toString()}`)
      }
      console.error("[auth/callback] Code exchange failed:", err)
      redirect(303, "/auth/auth-code-error")
    }
  }

  // ─── 2. Validate session via getUser() ───────────────────────
  // getUser() hits the Supabase auth server to validate the JWT.
  // More secure than getSession() which only reads cookies.
  // One-time cost at callback — subsequent requests use cookies.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error(
      "[auth/callback] No valid user after code exchange:",
      userError,
    )
    redirect(303, "/login/sign_in?error=session_expired")
  }

  // ─── 3. Redeem invite token ──────────────────────────────────
  // Runs BEFORE bootstrap so the new actor appears in the payload.
  //
  // redeem_invite() is idempotent:
  //   - Success: creates actor + jurisdiction + org_member + policy_group
  //   - Already exists: returns { status: 'already_exists' }
  //   - Invalid/expired: raises exception (caught below)
  //
  // RPC signature: redeem_invite(invite_token uuid) returns jsonb
  let inviteRedeemed = false
  let inviteResult: {
    status: string
    actor_id?: string
    actor_type?: string
    organization_id?: string
  } | null = null

  if (inviteToken) {
    const { data, error: inviteError } = await supabase.rpc(
      "redeem_invite",
      { invite_token: inviteToken },
    )

    if (inviteError) {
      console.error(
        "[auth/callback] Invite redemption failed:",
        inviteError,
      )
      // Non-blocking: user proceeds with existing permissions.
      // The invite error can be surfaced in the landing page
      // via a query param if desired.
    } else {
      inviteResult = data as typeof inviteResult
      inviteRedeemed = inviteResult?.status === "success"
    }
  }

  // ─── 4. Bootstrap session ────────────────────────────────────
  // Returns: profile, actors, jurisdictions, org_memberships,
  //          policy_groups, permissions (post-optimization: aggregated)
  const { data: bootstrapData, error: bootstrapError } = await supabase.rpc(
    "bootstrap_session",
  )

  if (bootstrapError || !bootstrapData) {
    console.error("[auth/callback] Bootstrap failed:", bootstrapError)
    // Fallback: client-side layout will retry bootstrap
    redirect(303, "/app/dashboard")
  }

  // ─── 5. Route to final destination ───────────────────────────
  //
  // Priority:
  //   1. Explicit ?next= (unless invite was just redeemed)
  //   2. Invite-based routing (new actor → org dashboard)
  //   3. Permission-aware routing (admin, regulator, org, crew, etc.)
  //   4. Default: /dashboard
  if (next && !inviteRedeemed) {
    redirect(303, sanitizeRedirect(next))
  }

  const destination = resolveDestination(
    bootstrapData as BootstrapPayload,
    {
      inviteRedeemed,
      inviteResult,
      inviteToken,
      next,
    },
  )

  redirect(303, destination)
}

/* ============================================================
   TYPES — minimal bootstrap shape for routing decisions.
   The full EffectivePermission[] is in the payload but we don't
   need it server-side — client layout will hydrate the store.
============================================================ */
interface BootstrapPayload {
  profile: {
    id: string
    full_name: string | null
    permissions_version: number
  } | null
  actors: Array<{
    id: string
    type: string
    status: string
  }>
  jurisdictions: Array<{
    actor_id: string
    level: string
    scope_id: string | null
  }>
  organization_memberships: Array<{
    organization_id: string
    role: string
    org_name: string
  }>
  policy_groups: Array<{
    group_name: string
    level: string
    scope_id: string | null
  }>
  permissions: Array<{
    actor_id: string
    action: string
    effect: string
    level: string
    scope_id: string | null
  }>
}

interface InviteResult {
  status: string
  actor_id?: string
  actor_type?: string
  organization_id?: string
}

interface RoutingContext {
  inviteRedeemed: boolean
  inviteResult: InviteResult | null
  inviteToken: string | null
  next: string | null
}

/* ============================================================
   ROUTING DECISION LOGIC

   Uses actor types for broad routing categories, then
   falls back to permission checks for edge cases.

   The DB already resolved permissions (aggregated, deny-wins,
   federal-aware), so we can trust the bootstrap payload.

   Actor types map to route groups:
     ADMIN                    → /admin/dashboard
     REGULATOR, PLANNER       → /analytics
     ORGANIZATION, OWNER,
       STAGE_OPERATOR         → /org/{id}/dashboard (or /org/select)
     DRIVER, CONDUCTOR        → /crew/dashboard
     PASSENGER (default)      → /dashboard
============================================================ */
function resolveDestination(
  session: BootstrapPayload,
  ctx: RoutingContext,
): string {
  if (!session.profile) {
    return "/onboarding"
  }

  const { profile, actors, organization_memberships: orgs } = session
  const activeActors = actors.filter((a) => a.status === "active")
  const profileIncomplete =
    !profile.full_name || profile.full_name.trim() === "User"

  const hasOnlyPassenger =
    activeActors.length === 0 ||
    (activeActors.length === 1 && activeActors[0].type === "PASSENGER")

  // ─── New/incomplete user → onboarding ────────────────────
  if (hasOnlyPassenger && profileIncomplete) {
    const params = new URLSearchParams()
    if (ctx.inviteRedeemed && ctx.inviteToken) {
      params.set("invite", ctx.inviteToken)
    }
    const qs = params.toString()
    return `/onboarding${qs ? `?${qs}` : ""}`
  }

  // ─── Just accepted invite → org dashboard ────────────────
  if (ctx.inviteRedeemed && ctx.inviteResult) {
    if (profileIncomplete) {
      return "/account?complete_profile=true"
    }

    // Direct to the invited org's dashboard
    const inviteOrgId = ctx.inviteResult.organization_id
    if (inviteOrgId) {
      return `/org/${inviteOrgId}/dashboard`
    }

    if (orgs.length === 1) {
      return `/org/${orgs[0].organization_id}/dashboard`
    }
    // Multiple orgs or no org context → org picker
    return "/org/select"
  }

  // ─── Explicit next (already checked !inviteRedeemed) ─────
  if (ctx.next) {
    return sanitizeRedirect(ctx.next)
  }

  // ─── Permission-aware routing ────────────────────────────
  // Check for federal-level admin permissions first (these only
  // work after the BUG 6 fix — federal permissions in my_permissions)
  const hasAdminPermission = session.permissions.some(
    (p) =>
      p.effect === "allow" &&
      p.level === "federal" &&
      (p.action === "admin.full" || p.action === "admin.users"),
  )

  if (hasAdminPermission) {
    return "/admin/dashboard"
  }

  // ─── Actor-type routing ──────────────────────────────────
  // Maps actor types to their actual route-group dashboards.
  //
  // Route structure:
  //   /admin/dashboard        — ADMIN
  //   /app/dashboard          — PASSENGER, REGULATOR, PLANNER (default app)
  //   /crew/dashboard         — DRIVER, CONDUCTOR
  //   /org/[orgId]/dashboard  — ORGANIZATION, STAGE_OPERATOR, OWNER
  //   /operator/*             — STAGE_OPERATOR (fuel, trips, notifications)
  const actorTypes = new Set(activeActors.map((a) => a.type))

  if (actorTypes.has("ADMIN")) {
    return "/admin/dashboard"
  }

  // Regulators/planners use the main app (map, feed, routes, etc.)
  if (actorTypes.has("REGULATOR") || actorTypes.has("PLANNER")) {
    return "/app/dashboard"
  }

  // Org-level actors → org dashboard (or picker if multiple)
  const orgActorTypes = ["ORGANIZATION", "STAGE_OPERATOR", "OWNER"]
  if (orgActorTypes.some((t) => actorTypes.has(t))) {
    if (orgs.length === 1) {
      return `/org/${orgs[0].organization_id}/dashboard`
    }
    if (orgs.length > 1) {
      return "/org/select"
    }
    // Org actor but no org memberships (shouldn't happen, but safe fallback)
    return "/org/dashboard"
  }

  if (actorTypes.has("DRIVER") || actorTypes.has("CONDUCTOR")) {
    return "/crew/dashboard"
  }

  // Default: passenger or unknown → main app
  return "/app/dashboard"
}

/* ============================================================
   REDIRECT SANITIZATION — prevent open redirect attacks
============================================================ */
function sanitizeRedirect(path: string): string {
  // Default fallback — must be a real route
  const FALLBACK = "/app/dashboard"

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return FALLBACK
  }

  try {
    const url = new URL(path, "http://localhost")
    if (url.hostname !== "localhost") {
      return FALLBACK
    }
  } catch {
    return FALLBACK
  }

  return path
}