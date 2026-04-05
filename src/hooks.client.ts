// src/hooks.client.ts

import type { HandleClientError } from "@sveltejs/kit"
import { browser } from "$app/environment"
import { PUBLIC_POSTHOG_KEY } from "$env/static/public"

/* ============================================================
   LAZY SINGLETONS
============================================================ */

let posthogClient: any = null
let sentryReady = false

/* ============================================================
   POSTHOG LAZY INIT
============================================================ */

async function getPosthog() {
  if (!browser) return null
  if (posthogClient) return posthogClient

  try {
    const mod = await import("posthog-js")
    const posthog = mod.default

    posthog.init(PUBLIC_POSTHOG_KEY, {
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      defaults: "2026-01-30",
      capture_exceptions: false, // we'll handle manually
    })

    posthogClient = posthog
    return posthog
  } catch (err) {
    console.error("PostHog failed to load:", err)
    return null
  }
}

/* ============================================================
   SENTRY LAZY INIT
============================================================ */

async function initSentry() {
  if (!browser || sentryReady) return

  try {
    const Sentry = await import("@sentry/sveltekit")

    Sentry.init({
      dsn: "https://939d30ef131c9c0d5ead2c2364017ae0@o4510964210073600.ingest.de.sentry.io/4510964215054416",

      tracesSampleRate: 0.2, // reduce noise in prod
      enableLogs: true,

      // 🚫 no replay here (lazy later if needed)
      sendDefaultPii: false, // safer default
    })

    sentryReady = true
  } catch (err) {
    console.error("Sentry failed to init:", err)
  }
}

/* ============================================================
   EAGER BUT SAFE BOOTSTRAP (NON-BLOCKING)
============================================================ */

if (browser) {
  // Fire and forget — don't block app startup
  initSentry()
  getPosthog()
}

/* ============================================================
   UNIFIED ERROR HANDLER
============================================================ */

export const handleError: HandleClientError = async ({
  error,
  status,
  message,
}) => {
  // 🔹 Send to Sentry
  try {
    if (!sentryReady) await initSentry()
    const Sentry = await import("@sentry/sveltekit")
    Sentry.captureException(error)
  } catch (e) {
    console.error("Sentry capture failed:", e)
  }

  // 🔹 Send to PostHog
  try {
    const posthog = await getPosthog()
    posthog?.captureException?.(error)
  } catch (e) {
    console.error("PostHog capture failed:", e)
  }

  return {
    message:
      error instanceof Error
        ? error.message
        : (message ?? "Unexpected client error"),
    status,
  }
}