// src/hooks.server.ts
//
// SvelteKit server hooks — Enterprise Actor Model Edition
//
// Composed via sequence():
//   1. Sentry        — error reporting & tracing
//   2. Cloudflare    — HTTPS protocol fix behind proxy
//   3. PostHog       — analytics ingest reverse proxy
//   4. Supabase      — client creation + safeGetSession
//   5. Auth Guard    — basic session check + route protection
//   6. User State    — resolveUserState + activateXContext (THE BRAIN)
//
// CHANGES from previous version:
//   - Added userStateHandle (step 6) — the enterprise context resolver
//   - supabaseHandle now initializes userState + activeContext to null
//     alongside session/user (previously missing — violated app.d.ts)
//   - authGuardHandle unchanged — still handles basic session guard only
//   - userStateHandle owns ALL domain redirects (guest trap, KYC trap)
//     authGuardHandle only redirects to /login on missing session
//   - stripe_customers references replaced with mpesa_customers

import * as Sentry from "@sentry/sveltekit"
import { redirect, type Handle, type HandleServerError } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from "$env/static/public"
import { PRIVATE_SUPABASE_SERVICE_ROLE } from "$env/static/private"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import type { Session, User } from "@supabase/supabase-js"
import type { AuthenticatorAssuranceLevelEntry } from "@supabase/supabase-js"
import { getPostHogClient } from "$lib/server/posthog"
import { resolveUserState } from "$lib/features/auth/services/userState.server"
import { activateXContext } from "$lib/features/auth/contexts/context.template"
import type { App } from "../app"

/* ============================================================
   TYPES & HELPERS
============================================================ */

type SafeSessionResult = {
  session: Session | null
  user: User | null
  amr: AuthenticatorAssuranceLevelEntry[] | null
}

// Paths where userStateHandle must NOT run —
// either because there is no session yet, or because redirecting
// from these paths would cause an infinite loop.
const PUBLIC_PATHS = ["/login", "/verify", "/auth/callback", "/auth/confirm"]

// Paths that authenticated users are allowed on regardless of
// onboarding_status — without this, the onboarding flow itself
// would be redirect-looped by the guest trap.
const ONBOARDING_PREFIX = "/onboarding"

const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.some((p) => pathname.startsWith(p))

const isOnboardingPath = (pathname: string): boolean =>
  pathname.startsWith(ONBOARDING_PREFIX)

/* ============================================================
   SUPABASE CLIENT + SAFE SESSION HELPER
============================================================ */

const supabaseHandle: Handle = async ({ event, resolve }) => {
  // Initialize ALL locals to null — prevents undefined on public routes.
  // Matches app.d.ts type contract (all fields are T | null, never undefined).
  event.locals.session = null
  event.locals.user = null
  event.locals.userState = null
  event.locals.activeContext = null

  // ─── User-scoped client (anon key + user JWT from cookies) ──
  // RLS applies. Runs as the authenticated user.
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (
          cookiesToSet: {
            name: string
            value: string
            options: CookieOptions
          }[],
        ) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: "/" })
          })
        },
      },
    },
  )

  // ─── Service role client (bypasses RLS) ─────────────────────
  // Use for: invite_tokens INSERT, M-Pesa webhooks, admin bulk ops.
  // NEVER expose to the client.
  event.locals.supabaseServiceRole = createClient(
    PUBLIC_SUPABASE_URL,
    PRIVATE_SUPABASE_SERVICE_ROLE,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  if ("suppressGetSessionWarning" in event.locals.supabase.auth) {
    // @ts-expect-error — internal flag
    event.locals.supabase.auth.suppressGetSessionWarning = true
  }

  // ─── Safe session helper ────────────────────────────────────
  // Validates with getUser() (hits auth server) + includes MFA/AMR.
  // More secure than getSession() alone which only reads cookies.
  event.locals.safeGetSession = async (): Promise<SafeSessionResult> => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession()
    if (!session) return { session: null, user: null, amr: null }

    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser()
    if (error || !user) return { session: null, user: null, amr: null }

    const { data: aal } =
      await event.locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    return {
      session,
      user,
      amr: aal?.currentAuthenticationMethods ?? null,
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      name === "content-range" || name === "x-supabase-api-version",
  })
}

/* ============================================================
   AUTH GUARD
   
   Responsibility: session existence only.
   Does NOT make domain decisions — that belongs to userStateHandle.
   
   Page routes  → redirect to /login
   API routes   → 401 JSON
============================================================ */

const authGuardHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url

  const protectedPagePrefixes = [
    "/admin",
    "/app",
    "/crew",
    "/onboarding",
    "/operator",
    "/org",
  ]

  const isProtectedPage = protectedPagePrefixes.some((p) =>
    pathname.startsWith(p),
  )
  const isProtectedApi = pathname.startsWith("/api")

  if (isProtectedPage || isProtectedApi) {
    const { session, user } = await event.locals.safeGetSession()

    if (!session || !user) {
      if (isProtectedApi) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      }

      const loginUrl = new URL("/login/sign_in", event.url.origin)
      loginUrl.searchParams.set("next", event.url.pathname + event.url.search)
      throw redirect(303, loginUrl.toString())
    }

    event.locals.session = session
    event.locals.user = user
  }

  return resolve(event)
}

/* ============================================================
   USER STATE HANDLE — THE BRAIN
   
   Runs after authGuardHandle. By this point locals.user is
   populated on protected routes and null on public routes.
   
   Responsibilities (in order):
     1. Skip entirely on public paths (no session, no state to resolve)
     2. resolveUserState() — full identity + capability resolution
     3. GUEST TRAP — no active actors → /onboarding
     4. KYC TRAP   — AWAITING_KYC mid-flow → /onboarding/[intent]
     5. activateXContext() — build runtime context from cookie preference
     6. Fallback to 'passenger' if preferred context is invalid
   
   ONLY this handle makes domain redirects.
   authGuardHandle only redirects to /login on missing session.
   Pages NEVER redirect for domain reasons.
============================================================ */

const userStateHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url
  const user = event.locals.user

  // ── Skip if no authenticated user ──────────────────────────────────────────
  // Public paths (login, verify, auth/callback) and unauthenticated requests
  // get no state resolution. locals.userState + activeContext stay null.
  if (!user || isPublicPath(pathname)) {
    return resolve(event)
  }

  try {
    // ── 1. Resolve full user state ────────────────────────────────────────────
    // Fetches profile, actors, jurisdictions, assignments, permissions,
    // delegated authority, and M-PESA subscription in one parallel round trip.
    const state = await resolveUserState(event.locals.supabase, user.id)
    event.locals.userState = state

    // ── 2. GUEST TRAP ─────────────────────────────────────────────────────────
    // isGuest = no active actors OR onboarding_status = 'GUEST'.
    // Allow through if already on any /onboarding path.
    if (state.isGuest && !isOnboardingPath(pathname)) {
      const kycIntent = (state.profile as any).kyc_intent as string | null

      // If they have a kyc_intent already set, they picked a role previously
      // but navigated away — send them back to their specific intent flow.
      // Otherwise send to the intent picker.
      if (kycIntent) {
        throw redirect(303, `/onboarding/${kycIntent}`)
      }
      throw redirect(303, "/onboarding")
    }

    // ── 3. KYC TRAP ───────────────────────────────────────────────────────────
    // User has chosen an intent and submitted to Ballerine but webhook
    // hasn't fired yet (kyc_status = 'pending' or 'AWAITING_KYC').
    const onboardingStatus = (state.profile as any).onboarding_status as
      | string
      | null
    const kycIntent = (state.profile as any).kyc_intent as string | null
    const kycStatus = (state.profile as any).kyc_status as string | null

    // Lock to /onboarding/[intent] while KYC is in flight
    if (
      onboardingStatus === "AWAITING_KYC" &&
      kycStatus === "pending" &&
      !isOnboardingPath(pathname)
    ) {
      throw redirect(303, `/onboarding/${kycIntent ?? "passenger"}`)
    }

    // KYC was rejected — send back to retry
    if (kycStatus === "rejected" && !isOnboardingPath(pathname)) {
      throw redirect(303, `/onboarding/${kycIntent ?? "passenger"}?retry=true`)
    }

    // ── 4. Runtime context activation ─────────────────────────────────────────
    // Read the preferred context from the cookie set by the Context Switcher.
    // Falls back to 'passenger' if no cookie is set.
    const preferredContext = (event.cookies.get("active_context") ??
      "passenger") as App.ContextType

    const preferredOrgId = event.cookies.get("active_org_id") ?? undefined

    // activateXContext returns null if the user no longer has the required
    // actor (e.g. a role was revoked since the cookie was set).
    let activeContext = activateXContext(state, preferredContext, {
      orgId: preferredOrgId,
    })

    // ── 5. Fallback to passenger ──────────────────────────────────────────────
    // If the preferred context is invalid, drop back to passenger.
    // This handles revoked roles, expired delegations, and stale cookies.
    if (!activeContext) {
      activeContext = activateXContext(state, "passenger")
    }

    event.locals.activeContext = activeContext
  } catch (err) {
    // Re-throw SvelteKit redirects — swallow everything else.
    // A resolver failure should not break the whole request.
    // The page will receive null userState + activeContext and can
    // handle the degraded state gracefully.
    if (err instanceof Error && "status" in err && "location" in err) {
      throw err
    }

    console.error("[hooks:userStateHandle] Resolution failed:", err)
  }

  return resolve(event)
}

/* ============================================================
   CLOUDFLARE / PROXY HTTPS FIX
============================================================ */

const cloudflareHttpsFix: Handle = async ({ event, resolve }) => {
  const proto = event.request.headers.get("x-forwarded-proto")
  if (proto === "https") {
    const url = new URL(event.request.url)
    if (url.protocol === "http:") {
      url.protocol = "https:"
      event.request = new Request(url.toString(), event.request)
    }
  }
  return resolve(event)
}

/* ============================================================
   POSTHOG INGEST REVERSE PROXY
============================================================ */

const posthogProxy: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url

  if (!pathname.startsWith("/ingest")) {
    return resolve(event)
  }

  const isStatic = pathname.startsWith("/ingest/static/")
  const targetHost = isStatic ? "eu-assets.i.posthog.com" : "eu.i.posthog.com"

  const targetUrl = new URL(event.request.url)
  targetUrl.protocol = "https:"
  targetUrl.hostname = targetHost
  targetUrl.port = "443"
  targetUrl.pathname = pathname.replace(/^\/ingest/, "")

  const headers = new Headers(event.request.headers)
  headers.set("host", targetHost)
  headers.delete("accept-encoding")

  const clientIp =
    event.request.headers.get("x-forwarded-for") ?? event.getClientAddress()
  if (clientIp) headers.set("x-forwarded-for", clientIp)

  return fetch(targetUrl.toString(), {
    method: event.request.method,
    headers,
    body: event.request.body,
    // @ts-expect-error — Node.js fetch duplex support
    duplex: "half",
  })
}

/* ============================================================
   COMPOSED HOOK SEQUENCE
============================================================ */

export const handle = sequence(
  Sentry.sentryHandle(), // error reporting + tracing — must be first
  cloudflareHttpsFix, // fix protocol before any URL inspection
  posthogProxy, // proxy analytics before auth touches cookies
  supabaseHandle, // clients + safeGetSession + null-initialize locals
  authGuardHandle, // session existence guard → /login or 401
  userStateHandle, // domain resolution → resolveUserState + activateXContext
)

/* ============================================================
   GLOBAL ERROR HANDLER
============================================================ */

export const handleError: HandleServerError = Sentry.handleErrorWithSentry(
  async ({ error, status, message }) => {
    const posthog = getPostHogClient()

    posthog.capture({
      distinctId: "server",
      event: "server_error",
      properties: {
        error: error instanceof Error ? error.message : String(error),
        status,
        message,
        stack: error instanceof Error ? error.stack : undefined,
      },
    })

    return { message, status }
  },
)
