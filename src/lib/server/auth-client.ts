/**
 * src/lib/server/auth-client.ts
 *
 * Typed HTTP client for the internal Go auth microservice.
 *
 * CONTRACTS (matching Go handler layer):
 *   POST /auth/login    → LoginResponse   (access_token, refresh_token, expires_in)
 *   POST /auth/register → RegisterResponse (user, zookie)
 *
 * ERROR STRATEGY:
 *   - Non-OK responses are decoded and thrown as AuthError.
 *   - Callers (form actions) switch on err.status to return typed fail()
 *     responses. Never propagate raw fetch errors to the client.
 *   - Network failures throw AuthError(502) — treated as transient on
 *     the caller side (retry-able, non-specific message to user).
 *
 * TOKEN LIFECYCLE:
 *   This module only issues tokens. Cookie placement is the caller's
 *   responsibility so SvelteKit's cookies API controls the Set-Cookie
 *   header (httpOnly, sameSite, path, maxAge).
 *
 *   Cookie names must match InternalAuthProvider:
 *     access_token   ← req.cookies?.['access_token']
 *     refresh_token  ← req.cookies?.['refresh_token']
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
  country:    string
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token:  string
  refresh_token: string
  expires_in:    number // seconds
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

async function post<T>(path: string, body: unknown): Promise<T> {
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

  return res.json() as Promise<T>
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Authenticate with email + password.
 * Throws AuthError on failure; caller is responsible for setting cookies.
 */
export async function login(req: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse>("/auth/login", req)
}

/**
 * Create a new user account.
 * Does NOT auto-login — the caller should call login() and set cookies
 * after a successful registration to provide a seamless sign-up → in flow.
 * Throws AuthError on failure (409 = email already taken, 400 = invalid input).
 */
export async function register(req: RegisterRequest): Promise<RegisterResponse> {
  return post<RegisterResponse>("/auth/register", req)
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === "production"
const THIRTY_DAYS_S = 60 * 60 * 24 * 30

/**
 * Place auth tokens into SvelteKit HttpOnly cookies.
 *
 * Cookie names are fixed — InternalAuthProvider reads exactly
 * `access_token` and `refresh_token`.
 *
 * @param cookies  SvelteKit Cookies API from the request event
 * @param tokens   LoginResponse returned by login()
 */
export function setAuthCookies(
  cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void },
  tokens:  LoginResponse,
): void {
  const base = {
    path:     "/",
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "strict" as const,
  }

  cookies.set("access_token", tokens.access_token, {
    ...base,
    maxAge: tokens.expires_in, // 900 s from Go service
  })

  cookies.set("refresh_token", tokens.refresh_token, {
    ...base,
    maxAge: THIRTY_DAYS_S,
  })
}

/**
 * Clear auth tokens — mirrors InternalAuthProvider.clearCookies().
 */
export function clearAuthCookies(
  cookies: { delete: (name: string, opts: Record<string, unknown>) => void },
): void {
  cookies.delete("access_token",  { path: "/" })
  cookies.delete("refresh_token", { path: "/" })
}