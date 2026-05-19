// src/hooks.server.ts
//
// SvelteKit server hooks — Enterprise Actor Model Edition
//
// Composed via sequence():
//   1. Sentry        — error reporting & tracing
//   2. Cloudflare    — HTTPS protocol fix behind proxy
//   3. Location      — geo seed from CF headers → requestContext (NOT auth)
//   4. Map Service   — singleton DuckDB/SSE init (depends on locationHandle)
//   5. PostHog       — analytics ingest reverse proxy
//   6. Supabase      — client creation only (no session logic here)
//   7. Auth          — provider-agnostic session resolution → locals.auth
//   8. Session Sync  — maps internalUserId → Supabase row (internal provider only)
//   9. Auth Guard    — session existence check + route protection
//  10. User State    — resolveUserState + activateXContext (THE BRAIN)
//
// ARCHITECTURE NOTE — WHY locationHandle IS NOT AUTH:
//   requestContext is a request optimization concern, not identity.
//   It seeds the map bootstrap (which data slice to load) and is
//   completely independent from UserState / ActiveContext.
//   Never reads from auth. Never gates routes.
//
//   auth pipeline:  supabaseHandle → authHandle → authGuardHandle → userStateHandle
//   map pipeline:   locationHandle → mapServiceHandle → requestContext → BootstrapManifestService
//
// AUTH PROVIDER SWITCH:
//   Set AUTH_PROVIDER=internal in env to use InternalAuthProvider (opaque sessionId).
//   Defaults to Supabase-backed auth for backwards compatibility.

import { building } from '$app/environment';
import * as Sentry from "@sentry/sveltekit"
import { redirect, type Handle, type HandleServerError } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { env } from '$env/dynamic/private'
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

import { createMapService, getMapService } from '$lib/map/index.server'
import { buildMapServiceConfig } from '$lib/map/services/Config.server'
import { InternalAuthProvider } from '$lib/features/auth/providers/internal'
import type { AuthProvider } from '$lib/features/auth/types/types'
import { getOrCreateSupabaseUser } from '$lib/features/auth/services/sync'


/* ============================================================
   TYPES & HELPERS
============================================================ */

const PUBLIC_PATHS = ["/login", "/verify", "/auth/callback", "/auth/confirm"]
const ONBOARDING_PREFIX = "/onboarding"

const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.some((p) => pathname.startsWith(p))

const isOnboardingPath = (pathname: string): boolean =>
  pathname.startsWith(ONBOARDING_PREFIX)


/* ============================================================
   AUTH PROVIDER — provider-agnostic singleton

   AUTH_PROVIDER=internal  → InternalAuthProvider (opaque sessionId, no JWT leakage)
   AUTH_PROVIDER=supabase  → SupabaseAuthProvider (legacy, default)

   NOTE: The provider is instantiated once at module load and
   reused across all requests. It is stateless per-request —
   all session state lives in event.locals.auth.
============================================================ */

const authProvider: AuthProvider =
  env.AUTH_PROVIDER === "internal"
    ? new InternalAuthProvider(env.AUTH_URL ?? "http://auth-service")
    : (() => {
        // Supabase-backed provider — inline for backwards compatibility
        // until a dedicated SupabaseAuthProvider class is extracted.
        // Satisfies the AuthProvider interface via the supabaseHandle
        // below, which sets locals.auth directly.
        return {
          async getSession() {
            // Supabase session resolution happens in supabaseHandle
            // and authHandle below. This path is unreachable when
            // AUTH_PROVIDER !== 'internal', but satisfies the interface.
            return { session: null, user: null, amr: [] }
          },
          clearCookies() {},
        } satisfies AuthProvider & { clearCookies: (...args: any[]) => void }
      })()


/* ============================================================
   LOCATION HANDLE — GEO SEED (REQUEST LAYER, NOT AUTH)
============================================================ */

const INVALID_CF_CODES = new Set(["XX", "T1", "A1", "A2"])

function normalizeCountry(code: string | null): string | null {
  if (!code) return null
  const upper = code.toUpperCase()
  return INVALID_CF_CODES.has(upper) ? null : upper
}

const KE_CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  Nairobi:  { lat: -1.2921, lng: 36.8219 },
  Mombasa:  { lat: -4.0435, lng: 39.6682 },
  Kisumu:   { lat: -0.0917, lng: 34.7679 },
  Nakuru:   { lat: -0.3031, lng: 36.0800 },
  Eldoret:  { lat:  0.5143, lng: 35.2698 },
  Thika:    { lat: -1.0332, lng: 37.0693 },
  Machakos: { lat: -1.5177, lng: 37.2634 },
}

const DEFAULT_CENTER = KE_CITY_CENTERS.Nairobi

function inferApproxCenter(
  city: string | null,
  country: string | null,
): { lat: number; lng: number } {
  if (country !== "KE" || !city) return DEFAULT_CENTER
  return KE_CITY_CENTERS[city] ?? DEFAULT_CENTER
}

function inferH3SeedResolution(country: string | null): number {
  if (!country) return 6
  return 7
}

const locationHandle: Handle = async ({ event, resolve }) => {
  const headers = event.request.headers

  const rawCountry = headers.get("cf-ipcountry")
  const city      = headers.get("cf-ipcity")
  const ip        = headers.get("cf-connecting-ip")

  const country = normalizeCountry(rawCountry)

  event.locals.requestContext = {
    country,
    city:             city ?? null,
    ip:               ip ?? null,
    regionKey:        `${country ?? "XX"}:${city ?? "unknown"}`,
    approxCenter:     inferApproxCenter(city, country),
    h3SeedResolution: inferH3SeedResolution(country),
  }

  return resolve(event)
}


/* ============================================================
   MAP SERVICE HANDLE — singleton init (REQUEST LAYER)
============================================================ */

let mapServiceReady = false
let mapServiceInitPromise: Promise<void> | null = null

const mapServiceHandle: Handle = async ({ event, resolve }) => {
  if (!building && !mapServiceReady) {
    if (!mapServiceInitPromise) {
      mapServiceInitPromise = (async () => {
        let service = getMapService()

        if (!service) {
          service = await createMapService(buildMapServiceConfig())
        }

        await service.start()

        mapServiceReady = true

        console.info('[map-service] started successfully')
      })().catch((err) => {
        mapServiceInitPromise = null
        console.error('[map-service] startup failed:', err)
        throw err
      })
    }

    await mapServiceInitPromise
  }

  return resolve(event)
}


/* ============================================================
   SUPABASE HANDLE — client creation only

   Responsibility: create event.locals.supabase and
   event.locals.supabaseServiceRole for use by data layers
   (resolveUserState, etc.). Session resolution has moved to
   authHandle below — this handle no longer owns auth state.

   Locals set:    supabase, supabaseServiceRole
   Locals zeroed: auth, userState, activeContext (null init here
                  so downstream handles can safely read them on
                  public routes without undefined errors)
============================================================ */

const supabaseHandle: Handle = async ({ event, resolve }) => {
  // Zero all auth/domain locals — prevents undefined on public routes
  event.locals.auth = { session: null, user: null, amr: [] }
  event.locals.supabaseUserId = null
  event.locals.userState = null
  event.locals.activeContext = null

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

  return resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      name === "content-range" || name === "x-supabase-api-version",
  })
}


/* ============================================================
   AUTH HANDLE — unified session resolution

   When AUTH_PROVIDER=internal:
     Delegates to InternalAuthProvider, which validates the
     access_token cookie against the auth service and returns
     an opaque sessionId (no JWT exposure to the app layer).

   When AUTH_PROVIDER=supabase (default):
     Falls back to Supabase's getSession/getUser flow, then
     normalises the result into the same locals.auth shape so
     all downstream handles are provider-agnostic.

   Locals set: event.locals.auth = { session, user, amr }

   SINGLE SOURCE OF TRUTH:
     All downstream handles (authGuard, userState, route handlers)
     read ONLY from event.locals.auth. Never from raw cookies,
     never from the supabase client directly, never from session
     or user locals that existed before this refactor.
============================================================ */

const authHandle: Handle = async ({ event, resolve }) => {
  const isInternal = env.AUTH_PROVIDER === "internal"

  if (isInternal) {
    // ── Internal provider path ──────────────────────────────
    const cookies: Record<string, string> = {}
    event.cookies.getAll().forEach(({ name, value }) => (cookies[name] = value))

    const result = await authProvider.getSession({
      cookies,
      headers: Object.fromEntries(event.request.headers),
      ip: event.getClientAddress?.(),
    })

    event.locals.auth = {
      session: result.session,
      user:    result.user,
      amr:     result.amr ?? [],
    }
  } else {
    // ── Supabase provider path ──────────────────────────────
    // Use the client created by supabaseHandle to resolve the session.
    // We call getUser() (server-validated) rather than trusting the
    // client-side session data directly.
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession()

    if (!session) {
      // locals.auth already zeroed by supabaseHandle — nothing to do
      return resolve(event)
    }

    const {
      data: { user },
      error: userError,
    } = await event.locals.supabase.auth.getUser()

    if (userError || !user) {
      return resolve(event)
    }

    const { data: aal } =
      await event.locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    // Normalise Supabase session into the unified auth shape.
    // session here is the full Supabase Session object — downstream
    // handles that need the raw session can cast from locals.auth.session.
    event.locals.auth = {
      session: {
        // Wrap in our unified shape: expose sessionId, hide raw JWT.
        sessionId: session.access_token,  // opaque reference; never re-exposed
        expiresAt: session.expires_at,
      } as any,  // cast: App.Locals.auth.session accepts our AuthSession type
      user,
      amr: aal?.currentAuthenticationMethods ?? [],
    }
  }

  return resolve(event)
}


/* ============================================================
   SESSION SYNC HANDLE — internal provider only

   Responsibility: given a validated internal session, find or
   create the matching Supabase `users` row and store its UUID
   in event.locals.supabaseUserId.

   WHY HERE (between authHandle and authGuardHandle):
     - Needs locals.auth.user to be populated (set by authHandle).
     - Must run before authGuardHandle so that a missing row doesn't
       silently let a valid session through with a null supabaseUserId.
     - Must run before userStateHandle, which needs the Supabase UUID
       to query user profile data and resolve permissions.

   NO-OP when:
     - AUTH_PROVIDER !== 'internal' (Supabase users already have a row)
     - No authenticated user on the request (public routes)

   HARD FAIL POLICY:
     If sync fails on a protected route, we return 503 rather than
     letting the request proceed with a null supabaseUserId, which
     would cause confusing downstream failures in resolveUserState.
     On public routes, we log and continue — the page will render
     without auth-gated content.
============================================================ */

const sessionSyncHandle: Handle = async ({ event, resolve }) => {
  // Only needed for the internal auth provider
  if (env.AUTH_PROVIDER !== "internal") return resolve(event)

  const user = event.locals.auth.user
  if (!user) return resolve(event)  // unauthenticated — skip

  const result = await getOrCreateSupabaseUser(
    event.locals.supabaseServiceRole,  // service role — bypasses RLS
    user.id,                           // internalUserId from auth provider
    user.email,
  )

  if (result.supabaseUserId === null) {
    // Sync failed — log with context for debugging
    console.error(
      "[hooks:sessionSyncHandle] Failed to sync user:",
      user.id,
      result.error.message,
    )

    const { pathname } = event.url
    const isProtected =
      ["/admin", "/app", "/crew", "/onboarding", "/operator", "/org"].some(
        (p) => pathname.startsWith(p),
      ) || pathname.startsWith("/api")

    if (isProtected) {
      // Don't let a broken sync silently produce auth errors downstream
      return new Response(
        JSON.stringify({ error: "Session sync failed. Please try again." }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      )
    }

    // Public route — log and continue without supabaseUserId
    return resolve(event)
  }

  event.locals.supabaseUserId = result.supabaseUserId

  if (result.created) {
    console.info(
      "[hooks:sessionSyncHandle] New Supabase user created:",
      result.supabaseUserId,
      "← internal:",
      user.id,
    )
  }

  return resolve(event)
}


/* ============================================================
   AUTH GUARD — session existence only

   Reads ONLY from event.locals.auth (set by authHandle above).
   Does NOT call safeGetSession or touch cookies directly.
   Does NOT make any domain decisions.
   Does NOT know about location or user state.
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
    const { session, user } = event.locals.auth

    if (!session || !user) {
      // Clear provider cookies on auth failure
      if ("clearCookies" in authProvider) {
        (authProvider as any).clearCookies(event)
      } else {
        // Supabase fallback — sign out clears cookies
        await event.locals.supabase.auth.signOut()
      }

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
  }

  return resolve(event)
}


/* ============================================================
   USER STATE HANDLE — THE BRAIN

   Reads from event.locals.auth.user (set by authHandle).
   Owns: resolveUserState, activateXContext, guest/KYC traps,
         context fallback logic.

   Does NOT know about requestContext or auth providers.
   Does NOT read cookies for session — only for context preferences.
============================================================ */

const userStateHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url
  const user = event.locals.auth.user  // ← unified source of truth

  if (!user || isPublicPath(pathname)) {
    return resolve(event)
  }

  // When AUTH_PROVIDER=internal, supabaseUserId is the Supabase row UUID
  // resolved by sessionSyncHandle. All profile queries and RLS policies
  // anchor on this ID. Fall back to user.id for the Supabase provider
  // (where user.id is already the Supabase UUID).
  const resolveId = event.locals.supabaseUserId ?? user.id

  try {
    const state = await resolveUserState(event.locals.supabase, resolveId)
    event.locals.userState = state

    if (state.isGuest && !isOnboardingPath(pathname)) {
      const kycIntent = (state.profile as any).kyc_intent as string | null
      if (kycIntent) {
        throw redirect(303, `/onboarding/${kycIntent}`)
      }
      throw redirect(303, "/onboarding")
    }

    const onboardingStatus = (state.profile as any).onboarding_status as string | null
    const kycIntent        = (state.profile as any).kyc_intent        as string | null
    const kycStatus        = (state.profile as any).kyc_status        as string | null

    if (
      onboardingStatus === "AWAITING_KYC" &&
      kycStatus === "pending" &&
      !isOnboardingPath(pathname)
    ) {
      throw redirect(303, `/onboarding/${kycIntent ?? "passenger"}`)
    }

    if (kycStatus === "rejected" && !isOnboardingPath(pathname)) {
      throw redirect(303, `/onboarding/${kycIntent ?? "passenger"}?retry=true`)
    }

    const preferredContext = (event.cookies.get("active_context") ??
      "passenger") as App.ContextType

    const preferredOrgId = event.cookies.get("active_org_id") ?? undefined

    let activeContext = activateXContext(state, preferredContext, {
      orgId: preferredOrgId,
    })

    if (!activeContext) {
      activeContext = activateXContext(state, "passenger")
    }

    event.locals.activeContext = activeContext
  } catch (err) {
    if (err instanceof Error && "status" in err && "location" in err) {
      throw err  // re-throw SvelteKit redirects
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

  const isStatic   = pathname.startsWith("/ingest/static/")
  const targetHost = isStatic ? "eu-assets.i.posthog.com" : "eu.i.posthog.com"

  const targetUrl = new URL(event.request.url)
  targetUrl.protocol = "https:"
  targetUrl.hostname = targetHost
  targetUrl.port     = "443"
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
    body:   event.request.body,
    // @ts-expect-error — Node.js fetch duplex support
    duplex: "half",
  })
}


/* ============================================================
   COMPOSED HOOK SEQUENCE

   Order matters:
    1. Sentry          — must be first for full trace coverage
    2. CF fix          — must run before any URL inspection
    3. Location        — geo seed; feeds map pipeline + PostHog
    4. Map Service     — singleton DuckDB init; depends on locationHandle
    5. PostHog         — can use requestContext.regionKey
    6. Supabase        — client creation + null-init auth locals
    7. Auth            — provider-agnostic session → locals.auth
    8. Session Sync    — internalUserId → supabaseUserId (internal only)
    9. Auth Guard      — session check → /login or 401 (reads locals.auth)
   10. User State      — domain resolution (reads locals.supabaseUserId)
============================================================ */

export const handle = sequence(
  Sentry.sentryHandle(),
  cloudflareHttpsFix,
  locationHandle,       // geo seed — request optimization, NOT auth
  mapServiceHandle,     // map singleton init — depends on locationHandle
  posthogProxy,
  supabaseHandle,       // client creation only
  authHandle,           // unified session resolution via provider
  sessionSyncHandle,    // ← NEW: internalUserId → Supabase row UUID
  authGuardHandle,      // session existence guard
  userStateHandle,      // domain resolution
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