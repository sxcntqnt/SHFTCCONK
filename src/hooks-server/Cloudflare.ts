/**
 * src/hooks/cloudflare.ts
 *
 * Rewrites http:// → https:// on the incoming request URL when running
 * behind a Cloudflare / reverse-proxy that strips TLS before forwarding.
 * Must run before any handle that inspects event.request.url or event.url.
 */

import type { Handle } from '@sveltejs/kit'

export const cloudflareHttpsFix: Handle = async ({ event, resolve }) => {
  const proto = event.request.headers.get('x-forwarded-proto')

  if (proto === 'https') {
    const url = new URL(event.request.url)
    if (url.protocol === 'http:') {
      url.protocol = 'https:'
      event.request = new Request(url.toString(), event.request)
    }
  }

  return resolve(event)
}
