// src/hooks.server.ts
import * as Sentry from "@sentry/sveltekit"
import { redirect, type Handle, type HandleServerError } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
} from "$env/static/public"
import { PRIVATE_SUPABASE_SERVICE_ROLE } from "$env/static/private"
import { createServerClient, type CookieOptions } from "@supabase/ssr"  // ← Import CookieOptions here
import { createClient } from "@supabase/supabase-js"
import type { Session, User } from "@supabase/supabase-js"
import type { AuthenticatorAssuranceLevelEntry } from "@supabase/supabase-js"  // ← Proper type (may need to import from auth-js if not re-exported)
import { getPostHogClient } from "$lib/server/posthog"

/* ============================================================
   TYPES & HELPERS
============================================================ */
type SafeSessionResult = {
  session: Session | null
  user: User | null
  amr: AuthenticatorAssuranceLevelEntry[] | null  // Use the real type (no undefined)
}

/* ============================================================
   SUPABASE CLIENT + SAFE SESSION HELPER
============================================================ */
const supabaseHandle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {  // ← Explicit type here
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: "/" })
          })
        }
      }
    }
  )

  event.locals.supabaseServiceRole = createClient(
    PUBLIC_SUPABASE_URL,
    PRIVATE_SUPABASE_SERVICE_ROLE,
    { auth: { persistSession: false } }
  )

  // Suppress noisy warning (still needed in many versions)
  if ("suppressGetSessionWarning" in event.locals.supabase.auth) {
    // @ts-expect-error — internal flag
    event.locals.supabase.auth.suppressGetSessionWarning = true
  }

  // Safe session: validate with getUser() + include AAL/AMR
  event.locals.safeGetSession = async (): Promise<SafeSessionResult> => {
    const { data: { session } } = await event.locals.supabase.auth.getSession()
    if (!session) return { session: null, user: null, amr: null }

    const { data: { user }, error } = await event.locals.supabase.auth.getUser()
    if (error || !user) return { session: null, user: null, amr: null }

    const { data: aal } = await event.locals.supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    return {
      session,
      user,
      amr: aal?.currentAuthenticationMethods ?? null  // Safe null fallback
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      name === "content-range" || name === "x-supabase-api-version"
  })
}

/* ============================================================
   SERVER-SIDE AUTH GUARD + REDIRECT
============================================================ */
const authGuardHandle: Handle = async ({ event, resolve }) => {
  const protectedPrefixes = ["/account", "/admin", "/org", "/crew", "/onboarding"]

  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    event.url.pathname.startsWith(prefix)
  )

  if (isProtectedRoute) {
    const { session } = await event.locals.safeGetSession()

    if (!session) {
      const loginUrl = new URL("/login/sign_in", event.url.origin)
      loginUrl.searchParams.set("next", event.url.pathname + event.url.search)
      throw redirect(303, loginUrl.toString())
    }

    event.locals.session = session
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
  headers.delete("accept-encoding") // avoid double compression issues

  const clientIp = event.request.headers.get("x-forwarded-for") ?? event.getClientAddress()
  if (clientIp) headers.set("x-forwarded-for", clientIp)

  return fetch(targetUrl.toString(), {
    method: event.request.method,
    headers,
    body: event.request.body,
    // @ts-expect-error — Node.js fetch duplex support
    duplex: "half"
  })
}

/* ============================================================
   COMPOSED HOOK
============================================================ */
export const handle = sequence(
  Sentry.sentryHandle(),        // error reporting & tracing first
  cloudflareHttpsFix,           // fix protocol before anything else
  posthogProxy,                 // proxy analytics requests
  supabaseHandle,               // supabase clients + safeGetSession
  authGuardHandle               // protect routes & populate locals
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
        stack: error instanceof Error ? error.stack : undefined
      }
    })

    // Return minimal info to client
    return { message, status }
  }
)