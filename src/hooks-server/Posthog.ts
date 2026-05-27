/**
 * src/hooks/posthog.ts
 *
 * Reverse-proxies PostHog ingest traffic so the browser sends events to
 * /ingest/* on the same origin instead of directly to PostHog's EU endpoint.
 * This bypasses ad-blockers that target first-party analytics domains.
 *
 * Placement: AFTER locationHandle (can use requestContext.regionKey if needed),
 *            BEFORE supabaseHandle (no auth dependency).
 *
 * Short-circuits immediately for all non-/ingest paths — zero overhead on
 * normal page requests.
 */

import type { Handle } from '@sveltejs/kit'

export const posthogProxy: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url

  if (!pathname.startsWith('/ingest')) {
    return resolve(event)
  }

  const isStatic  = pathname.startsWith('/ingest/static/')
  const targetHost = isStatic ? 'eu-assets.i.posthog.com' : 'eu.i.posthog.com'

  const targetUrl      = new URL(event.request.url)
  targetUrl.protocol   = 'https:'
  targetUrl.hostname   = targetHost
  targetUrl.port       = '443'
  targetUrl.pathname   = pathname.replace(/^\/ingest/, '')

  const headers = new Headers(event.request.headers)
  headers.set('host', targetHost)
  headers.delete('accept-encoding')

  const clientIp =
    event.request.headers.get('x-forwarded-for') ?? event.getClientAddress()
  if (clientIp) headers.set('x-forwarded-for', clientIp)

  return fetch(targetUrl.toString(), {
    method:  event.request.method,
    headers,
    body:    event.request.body,
    // @ts-expect-error — Node.js fetch duplex support
    duplex: 'half',
  })
}
