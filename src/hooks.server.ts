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
//   6. Supabase      — client creation + safeGetSession
//   7. Auth Guard    — basic session check + route protection
//   8. User State    — resolveUserState + activateXContext (THE BRAIN)
//
// ARCHITECTURE NOTE — WHY locationHandle IS NOT AUTH:
//   requestContext is a request optimization concern, not identity.
//   It seeds the map bootstrap (which data slice to load) and is
//   completely independent from UserState / ActiveContext.
//   Never reads from auth. Never gates routes.
//
//   auth pipeline:  supabaseHandle → authGuardHandle → userStateHandle
//   map pipeline:   locationHandle → mapServiceHandle → requestContext → BootstrapManifestService

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

import { createMapService, getMapService } from '$lib/server/map/map.service'
import { buildMapServiceConfig } from '$lib/server/map/config'

/* ============================================================
   TYPES & HELPERS
============================================================ */

type SafeSessionResult = {
  session: Session | null
  user: User | null
  amr: AuthenticatorAssuranceLevelEntry[] | null
}

const PUBLIC_PATHS = ["/login", "/verify", "/auth/callback", "/auth/confirm"]
const ONBOARDING_PREFIX = "/onboarding"

const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.some((p) => pathname.startsWith(p))

const isOnboardingPath = (pathname: string): boolean =>
  pathname.startsWith(ONBOARDING_PREFIX)

/* ============================================================
   LOCATION HANDLE — GEO SEED (REQUEST LAYER, NOT AUTH)

   Reads Cloudflare edge headers to build a requestContext that
   seeds the map bootstrap pipeline. This is NOT identity — it
   is a performance optimization: "which spatial slice of the
   world should exist in this session?"

   Placement: AFTER cloudflareHttpsFix (so protocol is clean),
   BEFORE mapServiceHandle + posthogProxy (so both can use regionKey).

   Locals set: event.locals.requestContext
   Locals NOT touched: session, user, userState, activeContext
============================================================ */

// Cloudflare returns edge-case codes we must not treat as real countries
const INVALID_CF_CODES = new Set(["XX", "T1", "A1", "A2"])

function normalizeCountry(code: string | null): string | null {
  if (!code) return null
  const upper = code.toUpperCase()
  return INVALID_CF_CODES.has(upper) ? null : upper
}

// Approximate city centers — Kenya/Nairobi subset only for now.
// Expand when dataset grows beyond this region.
const KE_CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  Nairobi:  { lat: -1.2921, lng: 36.8219 },
  Mombasa:  { lat: -4.0435, lng: 39.6682 },
  Kisumu:   { lat: -0.0917, lng: 34.7679 },
  Nakuru:   { lat: -0.3031, lng: 36.0800 },
  Eldoret:  { lat:  0.5143, lng: 35.2698 },
  Thika:    { lat: -1.0332, lng: 37.0693 },
  Machakos: { lat: -1.5177, lng: 37.2634 },
}

// Nairobi is the primary dataset anchor — default to it
const DEFAULT_CENTER = KE_CITY_CENTERS.Nairobi

function inferApproxCenter(
  city: string | null,
  country: string | null,
): { lat: number; lng: number } {
  // Only apply city lookup for KE dataset — prevents wrong centres
  // when a non-KE user accesses the app
  if (country !== "KE" || !city) return DEFAULT_CENTER
  return KE_CITY_CENTERS[city] ?? DEFAULT_CENTER
}

// H3 seed resolution — determines the coarseness of the initial
// bootstrap manifest. Zoom level refines this on the client.
// 7 = city/metro level (~5km² cells) — right for Nairobi initial load
function inferH3SeedResolution(country: string | null): number {
  if (!country) return 6  // unknown → extra coarse, minimize data
  return 7               // country known → city-level seed
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
    // regionKey is stable per city — usable as cache key and analytics dim
    regionKey:        `${country ?? "XX"}:${city ?? "unknown"}`,
    approxCenter:     inferApproxCenter(city, country),
    h3SeedResolution: inferH3SeedResolution(country),
  }

  return resolve(event)
}

/* ============================================================
   MAP SERVICE HANDLE — singleton init (REQUEST LAYER)

   Initialises the DuckDB + SSE map service exactly once across
   the lifetime of the process. Uses a module-level promise so
   concurrent cold-boot requests all await the same init rather
   than racing to spin up multiple DuckDB connections.

   Placement: AFTER locationHandle (requestContext is ready),
   BEFORE posthogProxy + supabaseHandle (no auth dependency).

   On failure the promise is cleared so the next request retries
   — avoids a permanently broken singleton after a transient
   startup error (e.g. DuckDB file locked during deploy).
============================================================ */

let mapServiceReady = false
let mapServiceInitPromise: Promise<void> | null = null

const mapServiceHandle: Handle = async ({ event, resolve }) => {
  if (!mapServiceReady) {
    if (!mapServiceInitPromise) {
      mapServiceInitPromise = createMapService(buildMapServiceConfig())
        .then(() => {
          mapServiceReady = true
        })
        .catch((err) => {
          // Reset so the next request retries after a transient failure
          mapServiceInitPromise = null
          throw err
        })
    }
    await mapServiceInitPromise
  }
  return resolve(event)
}

/* ============================================================
   SUPABASE CLIENT + SAFE SESSION HELPER
============================================================ */

const supabaseHandle: Handle = async ({ event, resolve }) => {
  // Initialize ALL locals to null — prevents undefined on public routes.
  event.locals.session = null
  event.locals.user = null
  event.locals.userState = null
  event.locals.activeContext = null
  // Note: requestContext is already set by locationHandle above

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
   Does NOT make domain decisions.
   Does NOT know about location.
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

   Unchanged. Still owns: resolveUserState, activateXContext,
   guest trap, KYC trap, context fallback.
   Does NOT know about requestContext.
============================================================ */

const userStateHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url
  const user = event.locals.user

  if (!user || isPublicPath(pathname)) {
    return resolve(event)
  }

  try {
    const state = await resolveUserState(event.locals.supabase, user.id)
    event.locals.userState = state

    if (state.isGuest && !isOnboardingPath(pathname)) {
      const kycIntent = (state.profile as any).kyc_intent as string | null
      if (kycIntent) {
        throw redirect(303, `/onboarding/${kycIntent}`)
      }
      throw redirect(303, "/onboarding")
    }

    const onboardingStatus = (state.profile as any).onboarding_status as string | null
    const kycIntent = (state.profile as any).kyc_intent as string | null
    const kycStatus = (state.profile as any).kyc_status as string | null

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

   Order matters:
   1. Sentry          — must be first for full trace coverage
   2. CF fix          — must run before any URL inspection
   3. Location        — runs early: feeds map pipeline + PostHog
   4. Map Service     — singleton init, depends on locationHandle
   5. PostHog         — can now use requestContext.regionKey
   6. Supabase        — clients + safeGetSession + null-init locals
   7. Auth Guard      — session guard → /login or 401
   8. User State      — domain resolution (auth-only, no location)
============================================================ */

export const handle = sequence(
  Sentry.sentryHandle(),
  cloudflareHttpsFix,
  locationHandle,    // geo seed — request optimization, NOT auth
  mapServiceHandle,  // map singleton init — depends on locationHandle
  posthogProxy,
  supabaseHandle,
  authGuardHandle,
  userStateHandle,
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