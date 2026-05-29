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

/**
 * src/hooks-server/csrf_handle.ts
 *
 * Prerender-safe CSRF double-submit protection.
 * - Does NOT assume auth exists
 * - Does NOT crash when locals.auth is missing
 * - Safe for build-time crawling
 */

import type { Handle, RequestEvent } from '@sveltejs/kit'
import { building } from '$app/environment'
import {
	generateRawToken,
	bundleToken,
	unbundleToken,
} from './csrf_primitives'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export interface CsrfHandleOptions {
	secret: string
	cookieName?: string
	headerName?: string
	allowedOrigins?: string[]
	tokenTtlMs?: number
	tokenSize?: number
	getSessionId?: (
		event: RequestEvent
	) => string | undefined | Promise<string | undefined>
}

export function createCsrfHandle(opts: CsrfHandleOptions): Handle {
	const {
		secret,
		cookieName = 'csrf-token',
		headerName = 'x-csrf-token',
		allowedOrigins = [],
		tokenTtlMs = 60 * 60 * 1000,
		tokenSize = 32,
		getSessionId,
	} = opts

	return async ({ event, resolve }) => {
		const method = event.request.method.toUpperCase()

		// 🧠 CRITICAL: skip CSRF entirely during prerender
		if (building) return resolve(event)

		// ── SAFE METHODS: issue or reuse token ───────────────────────────────
		if (SAFE_METHODS.has(method)) {
			const existing = event.cookies.get(cookieName)

			if (!existing) {
				const sessionId = await getSessionId?.(event)
				const raw = generateRawToken(tokenSize)

				const bundled = bundleToken(raw, secret, {
					expiresAt: Date.now() + tokenTtlMs,
					sessionId,
				})

				event.cookies.set(cookieName, bundled, {
					httpOnly: false,
					sameSite: 'lax',
					secure: process.env.NODE_ENV === 'production',
					path: '/',
					maxAge: Math.floor(tokenTtlMs / 1000),
				})

				event.locals.csrfToken = bundled
			} else {
				event.locals.csrfToken = existing
			}

			return resolve(event)
		}

		// ── UNSAFE METHODS: verify ───────────────────────────────────────────
		if (UNSAFE_METHODS.has(method)) {
			// Origin check (optional)
			if (allowedOrigins.length > 0) {
				const origin = event.request.headers.get('origin')
				if (origin && !allowedOrigins.includes(origin)) {
					return forbidden('Invalid origin')
				}
			}

			const cookieVal = event.cookies.get(cookieName)
			let headerVal = event.request.headers.get(headerName)

			// fallback for form submissions
			if (!headerVal) {
				const contentType =
					event.request.headers.get('content-type') ?? ''

				if (
					contentType.includes('application/x-www-form-urlencoded') ||
					contentType.includes('multipart/form-data')
				) {
					try {
						const form = await event.request.clone().formData()

						headerVal =
							(form.get(cookieName) as string) ??
							(form.get('csrf-token') as string) ??
							(form.get('_csrf') as string) ??
							(form.get('csrf') as string) ??
							null
					} catch {
						headerVal = null
					}
				}
			}

			if (!cookieVal || !headerVal) {
				return forbidden('Missing CSRF token')
			}

			if (cookieVal !== headerVal) {
				return forbidden('CSRF token mismatch')
			}

			const sessionId = await getSessionId?.(event)
			const { valid } = unbundleToken(cookieVal, secret, {
				sessionId,
			})

			if (!valid) {
				return forbidden('Invalid or expired CSRF token')
			}
		}

		return resolve(event)
	}
}

function forbidden(message: string): Response {
	return new Response(message, {
		status: 403,
		headers: { 'Content-Type': 'text/plain' },
	})
}
