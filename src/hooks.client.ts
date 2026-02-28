// src/hooks.client.ts
// Client-side PostHog initialization and error tracking
import posthog from "posthog-js"
import { PUBLIC_POSTHOG_KEY } from "$env/static/public"
import type { HandleClientError } from "@sveltejs/kit"

// Initialize PostHog when the app starts in the browser
export async function init() {
  posthog.init(PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
  })
}

// Capture unhandled client-side errors with PostHog
export const handleError: HandleClientError = async ({
  error,
  status,
  message,
}) => {
  posthog.captureException(error)

  return {
    message,
    status,
  }
}
