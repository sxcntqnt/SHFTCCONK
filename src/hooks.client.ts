// src/hooks.client.ts
// Client-side PostHog initialization and error tracking
import posthog from "posthog-js"
import { PUBLIC_POSTHOG_KEY } from "$env/static/public"
import type { HandleClientError } from "@sveltejs/kit"
import { handleErrorWithSentry, replayIntegration } from "@sentry/sveltekit";
import * as Sentry from '@sentry/sveltekit';

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


Sentry.init({
  dsn: 'https://939d30ef131c9c0d5ead2c2364017ae0@o4510964210073600.ingest.de.sentry.io/4510964215054416',

  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // If you don't want to use Session Replay, just remove the line below:
  integrations: [replayIntegration()],

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/sveltekit/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
