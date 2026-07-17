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
//   1. authHandle has already validated the caller and set locals.auth.user;
//      sessionSyncHandle has already resolved the canonical domain identity
//      and set locals.profileId. Both run in hooks.server.ts, before this
//      route is ever reached.
//   2. Open a Neon transaction scoped to that profile via
//      withProfileContext() (src/lib/server/pg.ts) — it sets
//      app.current_profile_id for the duration of the transaction, the
//      same session GUC every RLS policy resolves identity from — and
//      call bootstrap_session()/redeem_invite() as plain SQL function
//      calls.
//   3. Route to correct landing page.
//
//   REMOVED (Neon/auth-service migration): the entire Supabase-session
//   -minting shim that used to live here for the internal provider —
//   generateLink('magiclink') + verifyOtp() + createSupabaseUserScopedClient(),
//   plus its supabaseUserId/supabaseUserEmail locals dependency. That
//   machinery existed for exactly one reason: Postgres RPCs used to
//   resolve identity via auth.uid(), which only exists inside a
//   Supabase-authenticated session. Since 03_functions.sql/06_rls.sql
//   replaced every auth.uid() call with get_current_profile_id() reading
//   app.current_profile_id, there is no longer any reason to manufacture
//   a fake Supabase login for internal-provider users — and
//   sessionSyncHandle no longer populates supabaseUserId/supabaseUserEmail
//   at all (that belonged to the old "internal auth → shadow Supabase
//   user" architecture), which was the direct cause of the
//   "No supabaseUserId on locals" error immediately following successful
//   profile creation.
//
// CLIENT SELECTION RATIONALE (Supabase path only):
//   locals.supabaseServiceRole — service role, bypasses RLS
//                                used for: admin.createSession()
//   locals.supabase            — anon key + request cookies, respects RLS
//                                used for: Supabase provider RPC calls
//                                (session in cookies after code exchange)
//
// The internal path has no equivalent client-selection question — there
// is exactly one connection layer (src/lib/server/pg.ts), and identity is
// scoped per-call via withProfileContext(), not per-client.

import { redirect } from "@sveltejs/kit"
import { isAuthApiError } from "@supabase/supabase-js"
import type { RequestHandler } from "./$types"
import type { TransactionSql } from "postgres"
import { env } from "$env/dynamic/private"
import { withProfileContext } from "$lib/server/pg"


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
  const { inviteRedeemed, inviteResult } = await redeemInviteSupabase(supabase, inviteToken)
  const bootstrapData = await bootstrapSessionSupabase(supabase)

  if (next && !inviteRedeemed) redirect(303, sanitizeRedirect(next))

  redirect(
    303,
    resolveDestination(bootstrapData, { inviteRedeemed, inviteResult, inviteToken, next }),
  )
}


/* ============================================================
   INTERNAL PROVIDER PATH
   authHandle -> sessionSyncHandle -> locals.profileId
     -> withProfileContext(profileId, tx => ...)
     -> bootstrap_session() / redeem_invite() as plain SQL
     -> redirect
   No Supabase client, no shadow session, no auth.uid().
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

  // ── 2. Confirm sessionSyncHandle resolved the canonical profile ──
  // sessionSyncHandle runs earlier in the hooks chain and is the single
  // point that resolves profileId (sync.ts's resolveProfileId). If sync
  // failed there, and /auth/callback is listed in PROTECTED_PREFIXES, the
  // hook itself already returned a 503 and this handler never runs. This
  // check is a defensive fallback for cases where /auth/callback is
  // reached with a stale or missing value (e.g. PROTECTED_PREFIXES
  // misconfigured).
  const { profileId } = locals

  if (!profileId) {
    console.error(
      "[auth/callback:internal] No profileId on locals — " +
      "sessionSyncHandle did not run or failed silently for user:",
      internalUser.id,
    )
    redirect(303, "/auth/auth-code-error")
  }

  // ── 3 & 4. Redeem invite + bootstrap ──────────────────────
  // Two independent transactions (not one combined transaction) — this
  // preserves the original two-independent-calls semantics: a failed
  // bootstrap_session() must not roll back a successful invite
  // redemption, the same way two separate Supabase RPC calls never
  // shared a transaction on the old path.
  const { inviteRedeemed, inviteResult } = await withProfileContext(
    profileId,
    (tx) => redeemInviteInternal(tx, inviteToken),
  )
  const bootstrapData = await withProfileContext(
    profileId,
    (tx) => bootstrapSessionInternal(tx),
  )

  if (next && !inviteRedeemed) redirect(303, sanitizeRedirect(next))

  redirect(
    303,
    resolveDestination(bootstrapData, { inviteRedeemed, inviteResult, inviteToken, next }),
  )
}


/* ============================================================
   HELPERS — SUPABASE PATH (unchanged from before)
============================================================ */

async function redeemInviteSupabase(
  client: App.Locals["supabase"],
  inviteToken: string | null,
): Promise<{ inviteRedeemed: boolean; inviteResult: InviteResult | null }> {
  if (!inviteToken) return { inviteRedeemed: false, inviteResult: null }

  const { data, error } = await client.rpc("redeem_invite", {
    invite_token: inviteToken,
  })

  if (error) {
    // Non-blocking — user continues with existing permissions.
    console.warn("[auth/callback] Invite redemption failed (non-blocking):", error)
    return { inviteRedeemed: false, inviteResult: null }
  }

  const inviteResult = data as InviteResult | null
  return {
    inviteRedeemed: inviteResult?.status === "success",
    inviteResult,
  }
}

async function bootstrapSessionSupabase(
  client: App.Locals["supabase"],
): Promise<BootstrapPayload> {
  const { data, error } = await client.rpc("bootstrap_session")

  if (error || !data) {
    console.error("[auth/callback] Bootstrap failed:", error)
    redirect(303, "/app/dashboard")  // client layout will retry
  }

  return data as BootstrapPayload
}


/* ============================================================
   HELPERS — INTERNAL PATH (raw SQL via withProfileContext)
============================================================ */

async function redeemInviteInternal(
  tx: TransactionSql,
  inviteToken: string | null,
): Promise<{ inviteRedeemed: boolean; inviteResult: InviteResult | null }> {
  if (!inviteToken) return { inviteRedeemed: false, inviteResult: null }

  try {
    const [row] = await tx<{ result: InviteResult | null }[]>`
      select public.redeem_invite(${inviteToken}::uuid) as result
    `
    const inviteResult = row?.result ?? null
    return {
      inviteRedeemed: inviteResult?.status === "success",
      inviteResult,
    }
  } catch (err) {
    // Non-blocking — user continues with existing permissions. Matches
    // the Supabase path's behavior: an invalid/expired/already-redeemed
    // token should never block signup/login.
    console.warn("[auth/callback] Invite redemption failed (non-blocking):", err)
    return { inviteRedeemed: false, inviteResult: null }
  }
}

async function bootstrapSessionInternal(
  tx: TransactionSql,
): Promise<BootstrapPayload> {
  try {
    const [row] = await tx<{ result: BootstrapPayload }[]>`
      select public.bootstrap_session() as result
    `
    if (!row?.result) throw new Error("bootstrap_session() returned no data")
    return row.result
  } catch (err) {
    console.error("[auth/callback] Bootstrap failed:", err)
    redirect(303, "/app/dashboard")  // client layout will retry
  }
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
