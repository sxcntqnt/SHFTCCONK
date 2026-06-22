/**
 * src/lib/server/auth-client.ts
 *
 * Typed HTTP client for the internal Go auth microservice.
 *
 * CONTRACTS (matching the session-based Go handler layer — see
 * internal/handler/http/handler.go in the auth-service repo):
 *
 *   POST /auth/login    → { access_token, expires_in }
 *                          + Set-Cookie: rtk=<refresh token>; HttpOnly;
 *                            Secure; SameSite=Strict; Path=/auth/refresh
 *   POST /auth/register → { user, zookie }   (unchanged)
 *
 * BREAKING CHANGE FROM THE JWT-ERA CONTRACT:
 *   The old Go service returned { access_token, refresh_token, expires_in }
 *   as a single JSON body, and this module wrote both into SvelteKit-owned
 *   cookies. The new Go service mints the refresh token as an HttpOnly
 *   cookie of its own (name "rtk", path "/auth/refresh") and never echoes
 *   it in the JSON body at all — putting a refresh token in both a cookie
 *   and a response body would defeat the point of HttpOnly (see the
 *   auth-service README's "Why the refresh token is cookie-only on HTTP"
 *   section). This file no longer expects refresh_token in LoginResponse,
 *   and no longer writes a refresh_token cookie from a JSON field.
 *
 * REFRESH COOKIE FORWARDING:
 *   Because the Go service sets the refresh cookie itself via its own
 *   Set-Cookie response header, this module must forward that header
 *   onto the SvelteKit response — fetch() does NOT do this automatically
 *   when called from server-side code, and SvelteKit's setHeaders cannot
 *   be used for set-cookie at all (it throws). login()/register() return
 *   the raw Set-Cookie header value (if present) alongside the parsed
 *   body; forwardAuthServiceCookie() parses it and re-issues it through
 *   SvelteKit's cookies.set, which is the only supported way to emit a
 *   Set-Cookie header from a load function or action.
 *
 *   The Go service's refresh cookie is scoped to Path=/auth/refresh on
 *   auth.sxcntcnqunts.org. For the browser to send it back on a future
 *   POST /auth/refresh call, that call must go directly to the auth
 *   service's own domain (or the app and auth service must share a
 *   parent domain with the cookie's Domain attribute set accordingly).
 *   If the app and auth service are on different domains with no shared
 *   parent, the browser will not present this cookie on app-domain
 *   requests at all, regardless of anything this file does — that is a
 *   deployment-topology decision, not something fixable in client code.
 *
 * ERROR STRATEGY:
 *   - Non-OK responses are decoded and thrown as AuthError.
 *   - Callers (form actions) switch on err.status to return typed fail()
 *     responses. Never propagate raw fetch errors to the client.
 *   - Network failures throw AuthError(502) — treated as transient on
 *     the caller side (retry-able, non-specific message to user).
 */

const AUTH_URL = process.env.AUTH_URL ?? "https://auth.sxcntcnqunts.org"

// ─── Request types ────────────────────────────────────────────────────────────

export interface LoginRequest {
  email:    string
  password: string
}

export interface RegisterRequest {
  email:      string
  password:   string
  first_name: string
  last_name:  string
  nickname:   string
  country:    string
}

// ─── Response types ───────────────────────────────────────────────────────────

/**
 * Matches the Go service's actual /auth/login, /auth/service/token, and
 * /auth/context/activate response bodies exactly. There is no
 * refresh_token field — see the module doc comment above.
 */
export interface LoginResponse {
  access_token: string
  expires_in:   number // seconds
}

export interface RegisterResponse {
  user: {
    id:         string
    email:      string
    first_name: string
    last_name:  string
    country:    string
    created_at: string
  }
  zookie: string
}

/**
 * Wraps a parsed response body together with the raw Set-Cookie header
 * from the auth service's reply, if any. Only login()/register() (i.e.
 * calls that can mint a session) populate setCookie — it will be
 * undefined for calls that never set a refresh cookie.
 */
export interface AuthServiceResult<T> {
  body:      T
  setCookie: string | undefined
}

// ─── Error ────────────────────────────────────────────────────────────────────

/**
 * Thrown by every auth-client function on non-OK responses.
 * Callers should switch on `status` to map to user-facing messages:
 *
 *   401 → "Invalid email or password"
 *   409 → "An account with that email already exists"
 *   429 → "Too many attempts — please wait before trying again"
 *   5xx → "Something went wrong — please try again"
 */
export class AuthError extends Error {
  constructor(
    public readonly status:  number,
    public readonly message: string,
  ) {
    super(message)
    this.name = "AuthError"
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return typeof body?.error === "string" ? body.error : res.statusText
  } catch {
    return res.statusText || "unknown error"
  }
}

async function post<T>(path: string, body: unknown): Promise<AuthServiceResult<T>> {
  let res: Response
  try {
    res = await fetch(`${AUTH_URL}${path}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })
  } catch (err) {
    // Network-level failure (DNS, ECONNREFUSED, etc.)
    console.error(`[auth-client] fetch failed for ${path}:`, err)
    throw new AuthError(502, "auth service unreachable")
  }

  if (!res.ok) {
    const message = await parseErrorMessage(res)
    throw new AuthError(res.status, message)
  }

  const parsed = (await res.json()) as T

  // NOTE: the standard fetch() Headers API exposes only a single combined
  // value for repeated headers in most runtimes (Node 18+/undici folds
  // multiple Set-Cookie lines into one comma-joined string via .get(),
  // though .getSetCookie() is available in newer undici/Node — prefer that
  // if your deployment target supports it, since comma-joining can corrupt
  // a Set-Cookie value that itself contains a comma, e.g. in Expires=).
  // Using getSetCookie() defensively here with a fallback to get().
  const setCookie =
    typeof (res.headers as any).getSetCookie === "function"
      ? (res.headers as any).getSetCookie()[0]
      : res.headers.get("set-cookie") ?? undefined

  return { body: parsed, setCookie }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Authenticate with email + password.
 * Throws AuthError on failure. The caller is responsible for:
 *   1. Setting the access_token cookie from result.body.access_token
 *      (via setAccessTokenCookie below).
 *   2. Forwarding result.setCookie verbatim if present (via
 *      forwardAuthServiceCookie below) so the browser receives the
 *      Go service's own HttpOnly refresh cookie.
 */
export async function login(req: LoginRequest): Promise<AuthServiceResult<LoginResponse>> {
  return post<LoginResponse>("/auth/login", req)
}

/**
 * Create a new user account.
 * Does NOT auto-login — the caller should call login() and set cookies
 * after a successful registration to provide a seamless sign-up → in flow.
 * Throws AuthError on failure (409 = email already taken, 400 = invalid input).
 */
export async function register(req: RegisterRequest): Promise<AuthServiceResult<RegisterResponse>> {
  return post<RegisterResponse>("/auth/register", req)
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === "production"

/**
 * Place the access token into a SvelteKit HttpOnly cookie.
 *
 * Only the access token is written here. The refresh token is never
 * placed into a cookie by this module — it arrives as a Set-Cookie header
 * directly from the Go service and must be forwarded with
 * forwardAuthServiceCookie(), not reconstructed from a JSON field that no
 * longer exists.
 *
 * @param cookies SvelteKit Cookies API from the request event
 * @param tokens  the `body` field of login()'s/register()'s AuthServiceResult
 */
export function setAccessTokenCookie(
  cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void },
  tokens:  LoginResponse,
): void {
  cookies.set("access_token", tokens.access_token, {
    path:     "/",
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "strict",
    maxAge:   tokens.expires_in,
  })
}

/**
 * Forward the auth service's own Set-Cookie header (the refresh token
 * cookie) onto the SvelteKit response.
 *
 * CORRECTION: an earlier version of this function called
 * `event.setHeaders({ 'set-cookie': setCookie })`. That throws at runtime —
 * SvelteKit explicitly disallows setting the set-cookie header via
 * setHeaders precisely because it manages that header itself through the
 * cookies API (confirmed against sveltejs/kit's own issue tracker and
 * docs: "You cannot add a set-cookie header with setHeaders — use the
 * cookies API instead"). There is no way to pass an opaque Set-Cookie
 * string through verbatim; it must be parsed and re-issued through
 * `cookies.set`.
 *
 * This parses the minimal cookie-string grammar needed here (name=value
 * plus the attributes the Go service actually sends: Path, Max-Age,
 * HttpOnly, Secure, SameSite — see Handler.setRefreshCookie in the Go
 * service) and re-issues it via cookies.set so SvelteKit emits its own,
 * correctly-formed Set-Cookie header.
 *
 * For anything beyond this single known cookie shape, prefer a
 * battle-tested parser (e.g. the `cookie` or `set-cookie-parser` npm
 * package, as used in the community workaround this function is based
 * on) rather than extending the hand-rolled parsing below.
 *
 * @param cookies SvelteKit's Cookies API (event.cookies)
 * @param setCookie the raw Set-Cookie header value from AuthServiceResult
 */
export function forwardAuthServiceCookie(
  cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void },
  setCookie: string | undefined,
): void {
  if (!setCookie) return

  const parts = setCookie.split(";").map((p) => p.trim())
  const [nameValue, ...attrParts] = parts
  const eqIdx = nameValue.indexOf("=")
  if (eqIdx === -1) {
    console.error("[auth-client] forwardAuthServiceCookie: malformed Set-Cookie, no name=value pair:", setCookie)
    return
  }
  const name = nameValue.slice(0, eqIdx)
  const value = nameValue.slice(eqIdx + 1)

  const opts: Record<string, unknown> = { path: "/" }
  for (const attr of attrParts) {
    const [rawKey, rawVal] = attr.split("=")
    const key = rawKey.trim().toLowerCase()
    switch (key) {
      case "path":
        opts.path = rawVal
        break
      case "max-age":
        opts.maxAge = Number(rawVal)
        break
      case "httponly":
        opts.httpOnly = true
        break
      case "secure":
        opts.secure = true
        break
      case "samesite":
        opts.sameSite = (rawVal ?? "").toLowerCase()
        break
      // domain/expires intentionally not mapped: SvelteKit's cookies.set
      // derives Domain from the request and computes Expires from maxAge
      // itself; passing them through would either be redundant or could
      // conflict with SvelteKit's own cookie-jar bookkeeping.
    }
  }

  cookies.set(name, value, opts)
}

/**
 * Clear the access token cookie. The refresh cookie is owned by the Go
 * service (Path=/auth/refresh on its own domain) — this module cannot
 * clear it from here. Call POST /auth/logout on the Go service instead,
 * which clears its own refresh cookie via Set-Cookie with MaxAge=-1 (see
 * Handler.clearRefreshCookie in the Go service) — forward that response's
 * Set-Cookie header the same way login() and register() are forwarded.
 */
export function clearAccessTokenCookie(
  cookies: { delete: (name: string, opts: Record<string, unknown>) => void },
): void {
  cookies.delete("access_token", { path: "/" })
}

/**
 * Calls POST /auth/logout on the Go service, forwarding the caller's
 * current access token. Returns the Set-Cookie header from that response
 * (which clears the refresh cookie) so the caller can forward it the same
 * way login()'s setCookie is forwarded.
 */
export async function logout(accessToken: string): Promise<{ setCookie: string | undefined }> {
  let res: Response
  try {
    res = await fetch(`${AUTH_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (err) {
    console.error("[auth-client] fetch failed for /auth/logout:", err)
    throw new AuthError(502, "auth service unreachable")
  }

  if (!res.ok) {
    const message = await parseErrorMessage(res)
    throw new AuthError(res.status, message)
  }

  const setCookie =
    typeof (res.headers as any).getSetCookie === "function"
      ? (res.headers as any).getSetCookie()[0]
      : res.headers.get("set-cookie") ?? undefined

  return { setCookie }
}
