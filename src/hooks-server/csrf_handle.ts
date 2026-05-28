/**
 * csrf-handle.ts
 *
 * SvelteKit `handle` hook factory for stateless double-submit CSRF protection.
 *
 * Usage in src/hooks.server.ts:
 *
 *   import { sequence }        from '@sveltejs/kit/hooks'
 *   import { createCsrfHandle } from '$lib/sec/hooks/csrf-handle'
 *   import { CSRF_SECRET }      from '$env/static/private'
 *
 *   const csrf = createCsrfHandle({
 *     secret:         CSRF_SECRET,
 *     allowedOrigins: ['https://yourapp.com'],
 *   })
 *
 *   export const handle = sequence(csrf)
 *
 * Vulnerabilities addressed vs. the naive Express port:
 *  1. Tokens are issued only once per session (cookie absence check) – no
 *     multi-tab invalidation, no SPA prefetch races.
 *  2. Origin header validation – layered defence for JSON APIs.
 *  3. Expiry timestamp baked into HMAC payload – token replay after TTL is rejected.
 *  4. Optional session binding – token is tied to a session id from event.locals.
 *  5. Cookie flags include path + maxAge – no scope ambiguity.
 *  6. Body access is safely guarded with optional chaining.
 */

import type { Handle, RequestEvent } from '@sveltejs/kit'
import {
  generateRawToken,
  bundleToken,
  unbundleToken,
} from './csrf_primitives'

// ─── config ──────────────────────────────────────────────────────────────────

const SAFE_METHODS   = new Set(['GET', 'HEAD', 'OPTIONS'])
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export interface CsrfHandleOptions {
  /** HMAC secret – load from $env/static/private, never hard-code */
  secret: string

  /** Cookie that carries the double-submit token. Default: 'csrf-token' */
  cookieName?: string

  /**
   * Request header the client echoes the token in.
   * Default: 'x-csrf-token'
   */
  headerName?: string

  /**
   * Allowed Origin header values for state-mutating requests.
   * Omit to skip origin validation (useful during local dev).
   */
  allowedOrigins?: string[]

  /** Token lifetime in milliseconds. Default: 1 hour */
  tokenTtlMs?: number

  /** Random byte length for the raw token. Default: 32 */
  tokenSize?: number

  /**
   * Optional resolver: return a session/user id to bind tokens to the
   * current identity.  Receive a request event and return a string, or
   * undefined to skip session binding.
   *
   * Example:
   *   getSessionId: (event) => event.locals.session?.userId
   */
  getSessionId?: (event: RequestEvent) => string | undefined | Promise<string | undefined>
}

// ─── factory ─────────────────────────────────────────────────────────────────

export function createCsrfHandle(opts: CsrfHandleOptions): Handle {
  const {
    secret,
    cookieName     = 'csrf-token',
    headerName     = 'x-csrf-token',
    allowedOrigins = [],
    tokenTtlMs     = 60 * 60 * 1_000, // 1 hour
    tokenSize      = 32,
    getSessionId,
  } = opts

  return async ({ event, resolve }) => {
    const method = event.request.method.toUpperCase()

    // ── safe methods: issue token only when the cookie is absent ────────────
    if (SAFE_METHODS.has(method)) {
      const existing = event.cookies.get(cookieName)

      if (!existing) {
        const sessionId = await getSessionId?.(event)
        const raw       = generateRawToken(tokenSize)
        const bundled   = bundleToken(raw, secret, {
          expiresAt: Date.now() + tokenTtlMs,
          sessionId,
        })

        event.cookies.set(cookieName, bundled, {
          httpOnly: false,               // JS must be able to read it
          sameSite: 'lax',
          secure:   process.env.NODE_ENV === 'production',
          path:     '/',
          maxAge:   Math.floor(tokenTtlMs / 1_000),
        })

        event.locals.csrfToken = bundled
      } else {
        // Surface the existing token to server-side renderers
        event.locals.csrfToken = existing
      }

      return resolve(event)
    }

    // ── unsafe methods: verify ───────────────────────────────────────────────
    if (UNSAFE_METHODS.has(method)) {

      // 1. Origin check ───────────────────────────────────────────────────────
      if (allowedOrigins.length > 0) {
        const origin = event.request.headers.get('origin')
        if (origin && !allowedOrigins.includes(origin)) {
          return forbidden('Invalid origin')
        }
      }

      // 2. Token presence ─────────────────────────────────────────────────────
      const cookieVal = event.cookies.get(cookieName)
      let headerVal = event.request.headers.get(headerName)

      // If the header is missing, fall back to a hidden form field when the
      // request is a traditional browser form submission. We clone the request
      // before reading the body so downstream handlers (actions) can still
      // consume it.
      if (!headerVal) {
        const contentType = event.request.headers.get('content-type') ?? ''
        if (
          contentType.includes('application/x-www-form-urlencoded') ||
          contentType.includes('multipart/form-data')
        ) {
          try {
            const cloned = event.request.clone()
            const form = await cloned.formData()
            // Prefer the cookie-name as the hidden input name, fall back to
            // some common alternatives to ease integration.
            headerVal = (form.get(cookieName) as string) ??
              (form.get('csrf-token') as string) ??
              (form.get('_csrf') as string) ??
              (form.get('csrf') as string) ??
              null
          } catch (e) {
            // If form parsing fails, we'll continue and treat the token as
            // missing which results in a 403 below.
            headerVal = null
          }
        }
      }

      if (!cookieVal || !headerVal) {
        return forbidden('Missing CSRF token')
      }

      // 3. Double-submit equality check ──────────────────────────────────────
      //    The token the cookie holds must match the token in the header byte-for-byte.
      //    Note: this comparison is NOT timing-sensitive because the attacker
      //    cannot set the cookie (SameSite + HttpOnly-on-session-cookie); the
      //    HMAC check below is where constant-time matters.
      if (cookieVal !== headerVal) {
        return forbidden('CSRF token mismatch')
      }

      // 4. HMAC + expiry + optional session validation ─────────────────────────
      const sessionId = await getSessionId?.(event)
      const { valid } = unbundleToken(cookieVal, secret, { sessionId })

      if (!valid) {
        return forbidden('Invalid or expired CSRF token')
      }
    }

    return resolve(event)
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function forbidden(message: string): Response {
  return new Response(message, {
    status:  403,
    headers: { 'Content-Type': 'text/plain' },
  })
}
