import * as Sentry from "@sentry/sveltekit"

import { PRIVATE_SUPABASE_SERVICE_ROLE } from "$env/static/private"
import {
  PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_SUPABASE_URL
} from "$env/static/public"

import { createServerClient } from "@supabase/ssr"
import { createClient, type AMREntry } from "@supabase/supabase-js"

import type { Handle, HandleServerError } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"

import { getPostHogClient } from "$lib/server/posthog"

/* ============================================================
   SUPABASE HANDLE
============================================================ */

const supabase: Handle = async ({ event, resolve }) => {

  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
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

  // suppress warning workaround
  if ("suppressGetSessionWarning" in event.locals.supabase.auth) {
    // @ts-expect-error internal flag
    event.locals.supabase.auth.suppressGetSessionWarning = true
  }

  event.locals.safeGetSession = async () => {

    const {
      data: { session }
    } = await event.locals.supabase.auth.getSession()

    if (!session)
      return { session: null, user: null, amr: null }

    const {
      data: { user },
      error
    } = await event.locals.supabase.auth.getUser()

    if (error)
      return { session: null, user: null, amr: null }

    const { data: aal } =
      await event.locals.supabase.auth.mfa
        .getAuthenticatorAssuranceLevel()

    return {
      session,
      user,
      amr: aal?.currentAuthenticationMethods as AMREntry[]
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return (
        name === "content-range" ||
        name === "x-supabase-api-version"
      )
    }
  })
}

/* ============================================================
   AUTH GUARD
============================================================ */

const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } =
    await event.locals.safeGetSession()

  event.locals.session = session
  event.locals.user = user

  return resolve(event)
}

/* ============================================================
   CLOUDFLARE HTTPS FIX
============================================================ */

const cloudflareProxy: Handle = async ({ event, resolve }) => {

  const proto =
    event.request.headers.get("x-forwarded-proto")

  if (proto === "https") {
    const url = new URL(event.request.url)

    if (url.protocol === "http:") {
      url.protocol = "https:"
      event.request =
        new Request(url.toString(), event.request)
    }
  }

  return resolve(event)
}

/* ============================================================
   POSTHOG REVERSE PROXY
============================================================ */

const posthogProxy: Handle = async ({ event, resolve }) => {

  const { pathname } = event.url

  if (!pathname.startsWith("/ingest"))
    return resolve(event)

  const hostname =
    pathname.startsWith("/ingest/static/")
      ? "eu-assets.i.posthog.com"
      : "eu.i.posthog.com"

  const url = new URL(event.request.url)

  url.protocol = "https:"
  url.hostname = hostname
  url.port = "443"
  url.pathname = pathname.replace(/^\/ingest/, "")

  const headers = new Headers(event.request.headers)

  headers.set("host", hostname)
  headers.set("accept-encoding", "")

  const clientIp =
    event.request.headers.get("x-forwarded-for")
    ?? event.getClientAddress()

  if (clientIp)
    headers.set("x-forwarded-for", clientIp)

  return fetch(url.toString(), {
    method: event.request.method,
    headers,
    body: event.request.body,
    // required for node streaming
    // @ts-expect-error
    duplex: "half"
  })
}

/* ============================================================
   GLOBAL HANDLE
============================================================ */

export const handle: Handle = sequence(
  Sentry.sentryHandle(),
  cloudflareProxy,
  posthogProxy,
  supabase,
  authGuard
)

/* ============================================================
   UNIFIED ERROR HANDLER
============================================================ */

export const handleError: HandleServerError =
  Sentry.handleErrorWithSentry(
    async ({ error, status, message }) => {

      const posthog = getPostHogClient()

      posthog.capture({
        distinctId: "server",
        event: "server_error",
        properties: {
          error:
            error instanceof Error
              ? error.message
              : String(error),
          status,
          message
        }
      })

      return { message, status }
    }
  )