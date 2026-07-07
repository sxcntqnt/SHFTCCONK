// src/routes/auth/callback/+server.ts
//
// Auth Callback — Provider-Aware Edition
//
// AUTH_PROVIDER=supabase (default):
//   1. Exchange OAuth/magic-link code → Supabase session (via locals.supabase)
//   2. Validate via getUser()
//   3. Redeem invite token if present
//   4. Bootstrap session via RPC
//   5. Route to correct landing page
//
// AUTH_PROVIDER=internal:
//   1. User already validated — locals.auth.user set by authHandle in hooks
//   2. Sync already ran in sessionSyncHandle (hooks) — read locals.supabaseUserId
//      rather than calling getOrCreateSupabaseUser again. Calling it twice per
//      request caused a race: the second call's identity_accounts lookup could
//      run before the first call's insert was visible, leading it to fall into
//      the "first login" branch, create a duplicate stub profile, and then fail
//      on auth.admin.createUser() with "already registered" — because the first
//      call had already created the Supabase auth user under the deterministic
//      email. sessionSyncHandle is the single source of truth for this value.
//   3. Create user-scoped Supabase client so RPCs see correct auth.uid()
//   4. Redeem invite token if present
//   5. Bootstrap session via RPC
//   6. Route to correct landing page
//
// CLIENT SELECTION RATIONALE:
//   locals.supabaseServiceRole — service role, bypasses RLS
//                                used for: admin.createSession()
//                                (sync itself now happens exclusively in
//                                sessionSyncHandle, not here)
//   locals.supabase            — anon key + request cookies, respects RLS
//                                used for: Supabase provider RPC calls
//                                (session in cookies after code exchange)
//   createSupabaseUserScopedClient — anon key + Authorization header
//                                used for: internal provider RPC calls
//                                (no cookie session; token from admin.createSession)

import { redirect } from "@sveltejs/kit"
import { isAuthApiError } from "@supabase/supabase-js"
import type { RequestHandler } from "./$types"
import { env } from "$env/dynamic/private"
import { createSupabaseUserScopedClient, createSupabaseAnonClient } from "$lib/server/db"


export const GET: RequestHandler = async ({ url, locals }) => {
  const isInternal = env.AUTH_PROVIDER === "internal"

  return isInternal
    ? handleInternalCallback(url, locals)
    : handleSupabaseCallback(url, locals)
}


/* ============================================================
   SUPABASE PROVIDER PATH
   Uses locals.supabase — the cookie-aware request client set up
   by supabaseHandle in hooks. After exchangeCodeForSession(),
   the auth session is written to cookies and all subsequent
   supabase calls in this request are authenticated.
============================================================ */

async function handleSupabaseCallback(
  url: URL,
  locals: App.Locals,
): Promise<Response> {
  const { supabase } = locals
  const code        = url.searchParams.get("code")
  const inviteToken = url.searchParams.get("invite")
  const next        = url.searchParams.get("next")

  // ── 1. Exchange code for session ─────────────────────────
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
    } catch (err) {
      if (isAuthApiError(err)) {
        const params = new URLSearchParams({ verified: "true" })
        if (inviteToken) params.set("invite", inviteToken)
        if (next) params.set("next", next)
        redirect(303, `/login/sign_in?${params.toString()}`)
      }
      console.error("[auth/callback:supabase] Code exchange failed:", err)
      redirect(303, "/auth/auth-code-error")
    }
  }

  // ── 2. Validate session via getUser() ─────────────────────
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error(
      "[auth/callback:supabase] No valid user after code exchange:",
      userError,
    )
    redirect(303, "/login/sign_in?error=session_expired")
  }

  // ── 3 & 4. Redeem invite + bootstrap (locals.supabase has auth.uid()) ──
  const { inviteRedeemed, inviteResult } = await redeemInvite(supabase, inviteToken)
  const bootstrapData = await bootstrapSession(supabase)

  if (next && !inviteRedeemed) redirect(303, sanitizeRedirect(next))

  redirect(
    303,
    resolveDestination(bootstrapData, { inviteRedeemed, inviteResult, inviteToken, next }),
  )
}


/* ============================================================
   INTERNAL PROVIDER PATH
   User authenticated via internal auth service — no Supabase
   session cookie exists. sessionSyncHandle (in hooks.server.ts,
   which runs on every request BEFORE this route handler) already
   performed the sync and set locals.supabaseUserId. This handler
   never calls getOrCreateSupabaseUser — doing so again here was
   the root cause of the duplicate-stub-profile / "already
   registered" failure loop.
============================================================ */

async function handleInternalCallback(
  url: URL,
  locals: App.Locals,
): Promise<Response> {
  const inviteToken = url.searchParams.get("invite")
  const next        = url.searchParams.get("next")

  // ── 1. Confirm internal user resolved by authHandle ───────
  const internalUser = locals.auth.user

  if (!internalUser?.id) {
    console.error(
      "[auth/callback:internal] locals.auth.user missing — " +
      "authHandle may not have run or session cookie is invalid",
    )
    redirect(303, "/login/sign_in?error=session_missing")
  }

  // ── 2. Read the sync result set by sessionSyncHandle ──────
  // sessionSyncHandle runs earlier in the hooks chain and is the single
  // point that calls getOrCreateSupabaseUser. If sync failed there, and
  // /auth/callback is listed in PROTECTED_PREFIXES, the hook itself
  // already returned a 503 and this handler never runs. This check is a
  // defensive fallback for cases where /auth/callback is reached with a
  // stale or missing value (e.g. PROTECTED_PREFIXES misconfigured).
  const { supabaseUserId } = locals

  if (!supabaseUserId) {
    console.error(
      "[auth/callback:internal] No supabaseUserId on locals — " +
      "sessionSyncHandle did not run or failed silently for user:",
      internalUser.id,
    )
    redirect(303, "/auth/auth-code-error")
  }

  // ── 3. Derive user-scoped client for RPC calls ────────────
  // RPCs (bootstrap_session, redeem_invite) rely on auth.uid() in
  // Postgres. Without a Supabase session cookie, auth.uid() is null
  // and all user-scoped queries fail.
  //
  // NOTE: supabase-js has no admin.createSession(userId) method — the
  // GoTrue Admin API only exposes createUser, deleteUser, listUsers,
  // getUserById, updateUserById, generateLink, inviteUserByEmail,
  // signOut, and mfa. To mint a real session for an already-known
  // user without their password, we use the generateLink + verifyOtp
  // workaround: generateLink('magiclink') issues a hashed_token server
  // -side, and verifyOtp redeems it for a genuine session — the same
  // mechanism Supabase's own magic-link email flow uses under the hood.
  //
  // supabaseUserEmail comes straight from locals — sessionSyncHandle
  // (hooks) already resolved it via sync.ts's resolveEmail(), which is
  // a pure function of internalUserId. No getUserById round-trip needed.

  const { supabaseUserEmail } = locals

  if (!supabaseUserEmail) {
    console.error(
      "[auth/callback:internal] No supabaseUserEmail on locals for user:",
      supabaseUserId,
    )
    redirect(303, "/auth/auth-code-error")
  }

  const {
    data: linkData,
    error: linkError,
  } = await locals.supabaseServiceRole.auth.admin.generateLink({
    type:  "magiclink",
    email: supabaseUserEmail,
  })

  const hashedToken = linkData?.properties?.hashed_token

  if (linkError || !hashedToken) {
    console.error(
      "[auth/callback:internal] Failed to generate session link for user:",
      supabaseUserId,
      linkError?.message,
    )
    redirect(303, "/auth/auth-code-error")
  }

  // verifyOtp must run on a plain anon-key client (not the admin client,
  // and not locals.supabase — we don't want this written to cookies for
  // the internal provider). It exchanges the hashed_token for a real
  // access_token + refresh_token pair.
  const anonClient = createSupabaseAnonClient()
  const {
    data: otpData,
    error: otpError,
  } = await anonClient.auth.verifyOtp({
    type:       "magiclink",
    token_hash: hashedToken,
  })

  if (otpError || !otpData.session) {
    console.error(
      "[auth/callback:internal] Failed to verify session token for user:",
      supabaseUserId,
      otpError?.message,
    )
    redirect(303, "/auth/auth-code-error")
  }

  // createSupabaseUserScopedClient injects the token as an
  // Authorization header — auth.uid() = supabaseUserId in Postgres.
  const userScopedClient = createSupabaseUserScopedClient(
    otpData.session.access_token,
  )

  // ── 4 & 5. Redeem invite + bootstrap (userScopedClient has auth.uid()) ─
  const { inviteRedeemed, inviteResult } = await redeemInvite(userScopedClient, inviteToken)
  const bootstrapData = await bootstrapSession(userScopedClient)

  if (next && !inviteRedeemed) redirect(303, sanitizeRedirect(next))

  redirect(
    303,
    resolveDestination(bootstrapData, { inviteRedeemed, inviteResult, inviteToken, next }),
  )
}


/* ============================================================
   SHARED HELPERS — provider-agnostic, accept any Supabase client
============================================================ */

async function redeemInvite(
  client: ReturnType<typeof createSupabaseUserScopedClient>,
  inviteToken: string | null,
): Promise<{ inviteRedeemed: boolean; inviteResult: InviteResult | null }> {
  if (!inviteToken) return { inviteRedeemed: false, inviteResult: null }

  const { data, error } = await client.rpc("redeem_invite", {
    invite_token: inviteToken,
  })

  if (error) {
    // Non-blocking — user continues with existing permissions.
    // Surface the error on the landing page via query param if needed.
    console.warn("[auth/callback] Invite redemption failed (non-blocking):", error)
    return { inviteRedeemed: false, inviteResult: null }
  }

  const inviteResult = data as InviteResult | null
  return {
    inviteRedeemed: inviteResult?.status === "success",
    inviteResult,
  }
}

async function bootstrapSession(
  client: ReturnType<typeof createSupabaseUserScopedClient>,
): Promise<BootstrapPayload> {
  const { data, error } = await client.rpc("bootstrap_session")

  if (error || !data) {
    console.error("[auth/callback] Bootstrap failed:", error)
    redirect(303, "/app/dashboard")  // client layout will retry
  }

  return data as BootstrapPayload
}


/* ============================================================
   ROUTING — same logic for both providers
============================================================ */

function resolveDestination(
  session: BootstrapPayload,
  ctx: RoutingContext,
): string {
  if (!session.profile) return "/onboarding"

  const { profile, actors, organization_memberships: orgs, permissions } = session
  const activeActors      = actors.filter((a) => a.status === "active")
  const profileIncomplete = !profile.full_name || profile.full_name.trim() === "User"
  const hasOnlyPassenger  =
    activeActors.length === 0 ||
    (activeActors.length === 1 && activeActors[0].type === "PASSENGER")

  if (hasOnlyPassenger && profileIncomplete) {
    const params = new URLSearchParams()
    if (ctx.inviteRedeemed && ctx.inviteToken) params.set("invite", ctx.inviteToken)
    const qs = params.toString()
    return `/onboarding${qs ? `?${qs}` : ""}`
  }

  if (ctx.inviteRedeemed && ctx.inviteResult) {
    if (profileIncomplete) {
      return `/onboarding/${profile.kyc_intent ?? "passenger"}/create_profile`
    }
    const inviteOrgId = ctx.inviteResult.organization_id
    if (inviteOrgId) return `/org/${inviteOrgId}/dashboard`
    if (orgs.length === 1) return `/org/${orgs[0].organization_id}/dashboard`
    if (orgs.length > 1) return "/org/select"
    return "/org/dashboard"
  }

  if (ctx.next) return sanitizeRedirect(ctx.next)

  const hasAdminPermission = permissions.some(
    (p) =>
      p.effect === "allow" &&
      p.level === "federal" &&
      (p.action === "admin.full" || p.action === "admin.users"),
  )
  if (hasAdminPermission) return "/admin/dashboard"

  const actorTypes = new Set(activeActors.map((a) => a.type))

  if (actorTypes.has("ADMIN")) return "/admin/dashboard"
  if (actorTypes.has("REGULATOR") || actorTypes.has("PLANNER")) return "/app/dashboard"

  const orgActorTypes = ["ORGANIZATION", "STAGE_OPERATOR", "OWNER"]
  if (orgActorTypes.some((t) => actorTypes.has(t))) {
    if (orgs.length === 1) return `/org/${orgs[0].organization_id}/dashboard`
    if (orgs.length > 1) return "/org/select"
    return "/org/dashboard"
  }

  if (actorTypes.has("DRIVER") || actorTypes.has("CONDUCTOR")) return "/crew/dashboard"

  return "/app/dashboard"
}

function sanitizeRedirect(path: string): string {
  const FALLBACK = "/app/dashboard"
  if (!path || !path.startsWith("/") || path.startsWith("//")) return FALLBACK
  try {
    const url = new URL(path, "http://localhost")
    if (url.hostname !== "localhost") return FALLBACK
  } catch {
    return FALLBACK
  }
  return path
}


/* ============================================================
   TYPES
============================================================ */

interface BootstrapPayload {
  profile: {
    id: string
    full_name: string | null
    permissions_version: number
    kyc_intent: string | null
  } | null
  actors: Array<{ id: string; type: string; status: string }>
  jurisdictions: Array<{ actor_id: string; level: string; scope_id: string | null }>
  organization_memberships: Array<{
    organization_id: string
    role: string
    org_name: string
  }>
  policy_groups: Array<{ group_name: string; level: string; scope_id: string | null }>
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
