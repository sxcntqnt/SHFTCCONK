// src/hooks.client.ts

import posthog from "posthog-js"
import { PUBLIC_POSTHOG_KEY } from "$env/dynamic/public"

import type { HandleClientError } from "@sveltejs/kit"
import * as Sentry from "@sentry/sveltekit"
import { replayIntegration } from "@sentry/sveltekit"

/* ============================================================
   POSTHOG INIT
============================================================ */

export function init() {
  posthog.init(PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true
  })
}

/* ============================================================
   SENTRY INIT
============================================================ */

Sentry.init({
  dsn: "https://939d30ef131c9c0d5ead2c2364017ae0@o4510964210073600.ingest.de.sentry.io/4510964215054416",

  tracesSampleRate: 1.0,
  enableLogs: true,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [replayIntegration()],
  sendDefaultPii: true
})

/* ============================================================
   UNIFIED CLIENT ERROR HANDLER
============================================================ */

export const handleError: HandleClientError =
  Sentry.handleErrorWithSentry(
    ({ error, status, message }) => {

      /* ---------- PostHog ---------- */
      try {
        posthog.captureException(error)
      } catch (e) {
        console.error("PostHog capture failed:", e)
      }

      return {
        message:
          error instanceof Error
            ? error.message
            : message ?? "Unexpected client error",
        status
      }
    }
  )