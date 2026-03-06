// src/hooks.server.ts
//
// SvelteKit server hooks — Federated Governance Edition (Hardened)
//
// Composed via sequence():
//   1. Sentry        — error reporting & tracing
//   2. Cloudflare    — HTTPS protocol fix behind proxy
//   3. PostHog       — analytics ingest reverse proxy
//   4. Supabase      — client creation + safeGetSession
//   5. Auth Guard    — route protection + locals population
//
// HARDENING CHANGES from previous version:
//   - authGuardHandle now protects /api/* routes with 401 JSON
//     (previously only page routes were guarded with redirects)
//   - safeGetSession populates locals.user alongside locals.session
//   - autoRefreshToken: false on service role client (was missing)
//   - locals.session/user initialized to null in supabaseHandle
//     (were undefined on public routes, violating app.d.ts types)
//   - /app and /operator added to protected page prefixes
//     (were accessible without auth — no data leak but bad UX)

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

/* ============================================================
   TYPES & HELPERS
============================================================ */
type SafeSessionResult = {
  session: Session | null
  user: User | null
  amr: AuthenticatorAssuranceLevelEntry[] | null
}

/* ============================================================
   SUPABASE CLIENT + SAFE SESSION HELPER
============================================================ */
const supabaseHandle: Handle = async ({ event, resolve }) => {
  // ─── Initialize session/user to null ────────────────────────
  // authGuardHandle only populates these on protected routes.
  // Without this, they'd be undefined (not null) on public routes,
  // violating the app.d.ts type contract (Session | null, User | null).
  event.locals.session = null
  event.locals.user = null

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
  // Used for server-side operations where the user's JWT doesn't
  // have direct table access:
  //   - Creating invite_tokens (no INSERT RLS policy by design)
  //   - Stripe webhook handlers
  //   - Admin bulk operations
  //   - Sending invite emails via auth.admin.inviteUserByEmail()
  // NEVER expose this to the client.
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

  // Suppress noisy getSession warning (still needed in many versions)
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
   SERVER-SIDE AUTH GUARD + REDIRECT
   
   Protects page routes with redirects and API routes with 401.
   Populates locals.session and locals.user for downstream use.
============================================================ */
const authGuardHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url

  // Routes that require authentication
  // Routes that require authentication.
  // Must match every directory under routes/(auth)/ that resolves
  // to a URL path. SvelteKit route groups like (auth) don't affect
  // the URL — routes/(auth)/admin → /admin.
  //
  // Note: dashboards are nested (/admin/dashboard, /app/dashboard,
  // /crew/dashboard, /org/[orgId]/dashboard) — all covered by their
  // parent prefix. No top-level /dashboard route exists.
  //
  // If you add a new authenticated route directory, add it here.
  const protectedPagePrefixes = [
    "/admin",       // routes/(auth)/admin — platform admin, account, audit
    "/app",         // routes/(auth)/app — main app (passenger, chat, map, etc.)
    "/crew",        // routes/(auth)/crew — driver/conductor dashboard
    "/onboarding",  // routes/(auth)/onboarding — new user setup
    "/operator",    // routes/(auth)/operator — stage operator (fuel, trips)
    "/org",         // routes/(auth)/org — org management, join-sacco
    "/account",     // if accessed as top-level (may be under /admin/account)
  ]
  const isProtectedPage = protectedPagePrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  )
  const isProtectedApi = pathname.startsWith("/api")

  if (isProtectedPage || isProtectedApi) {
    const { session, user } = await event.locals.safeGetSession()

    if (!session || !user) {
      // API routes get JSON 401 (not a redirect)
      if (isProtectedApi) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      // Page routes get redirect to login with return path
      const loginUrl = new URL("/login/sign_in", event.url.origin)
      loginUrl.searchParams.set(
        "next",
        event.url.pathname + event.url.search,
      )
      throw redirect(303, loginUrl.toString())
    }

    // Populate locals for downstream server loads and API routes
    event.locals.session = session
    event.locals.user = user
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
  const targetHost = isStatic
    ? "eu-assets.i.posthog.com"
    : "eu.i.posthog.com"

  const targetUrl = new URL(event.request.url)
  targetUrl.protocol = "https:"
  targetUrl.hostname = targetHost
  targetUrl.port = "443"
  targetUrl.pathname = pathname.replace(/^\/ingest/, "")

  const headers = new Headers(event.request.headers)
  headers.set("host", targetHost)
  headers.delete("accept-encoding")

  const clientIp =
    event.request.headers.get("x-forwarded-for") ??
    event.getClientAddress()
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
   COMPOSED HOOK
============================================================ */
export const handle = sequence(
  Sentry.sentryHandle(), // error reporting & tracing first
  cloudflareHttpsFix, // fix protocol before anything else
  posthogProxy, // proxy analytics requests
  supabaseHandle, // supabase clients + safeGetSession
  authGuardHandle, // protect routes & populate locals
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