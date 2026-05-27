/**
 * csrf-client.ts
 *
 * Browser-side utility that reads the CSRF token from the cookie the server
 * wrote (non-HttpOnly) and attaches it to outgoing fetch requests.
 *
 * Import and use in your SvelteKit +page.svelte or a shared API client:
 *
 *   import { csrfFetch, getCsrfToken } from '$lib/sec/hooks/csrf-client'
 *
 *   // Option A – drop-in replacement for fetch
 *   const res = await csrfFetch('/api/orders', { method: 'POST', body: … })
 *
 *   // Option B – manual header injection (for use with $app/fetch or ky)
 *   const token = getCsrfToken()
 *   const res = await fetch('/api/orders', {
 *     method: 'POST',
 *     headers: { 'x-csrf-token': token, … },
 *   })
 *
 * Note: only runs in the browser. Never import this from server-only modules.
 */

// ─── config ──────────────────────────────────────────────────────────────────

const COOKIE_NAME  = 'csrf-token'    // must match CsrfHandleOptions.cookieName
const HEADER_NAME  = 'x-csrf-token'  // must match CsrfHandleOptions.headerName
const UNSAFE       = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// ─── token reader ─────────────────────────────────────────────────────────────

/**
 * Read the CSRF token from document.cookie.
 * Returns an empty string when running server-side or when the cookie is absent.
 */
export function getCsrfToken(cookieName = COOKIE_NAME): string {
  if (typeof document === 'undefined') return ''

  const match = document.cookie
    .split('; ')
    .find(c => c.startsWith(`${cookieName}=`))

  // decodeURIComponent handles any percent-encoded bytes in the cookie value
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : ''
}

// ─── header injection ────────────────────────────────────────────────────────

/**
 * Given a method string and an existing headers map, return a new headers map
 * with the CSRF header added when the method is state-mutating.
 *
 * Pure function – original headers object is not mutated.
 */
export function withCsrfHeader(
  method: string,
  headers: Record<string, string> = {},
  options: { cookieName?: string; headerName?: string } = {},
): Record<string, string> {
  if (!UNSAFE.has(method.toUpperCase())) return headers

  const token = getCsrfToken(options.cookieName ?? COOKIE_NAME)
  if (!token) return headers

  return { ...headers, [options.headerName ?? HEADER_NAME]: token }
}

// ─── fetch wrapper ────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for the global `fetch` that automatically injects the
 * CSRF header on state-mutating requests.
 *
 * Respects any headers the caller already provides; does not clobber them.
 */
export async function csrfFetch(
  input:  RequestInfo | URL,
  init:   RequestInit = {},
): Promise<Response> {
  const method  = (init.method ?? 'GET').toUpperCase()
  const current = headersToRecord(init.headers)
  const patched  = withCsrfHeader(method, current)

  return fetch(input, { ...init, headers: patched })
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Normalise the heterogeneous RequestInit.headers into a plain object. */
function headersToRecord(
  headers: HeadersInit | undefined,
): Record<string, string> {
  if (!headers)                  return {}
  if (headers instanceof Headers) return Object.fromEntries(headers.entries())
  if (Array.isArray(headers))     return Object.fromEntries(headers)
  return { ...(headers as Record<string, string>) }
}
