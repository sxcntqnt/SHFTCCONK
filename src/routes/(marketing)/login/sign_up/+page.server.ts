/**
 * src/routes/(marketing)/login/sign_up/+page.server.ts
 *
 * Server action for new account registration.
 *
 * FLOW:
 *   1. Validate form fields
 *   2. POST /auth/register → Go auth service (creates account)
 *   3. POST /auth/login    → Go auth service (auto-login, same creds)
 *   4. Set access_token cookie + forward the Go service's own refresh
 *      cookie (Set-Cookie header) verbatim
 *   5. Redirect → /auth/callback
 *
 * CONTRACT CHANGE FROM THE JWT-ERA VERSION:
 *   login() and register() now return { body, setCookie } instead of the
 *   bare JSON body. body no longer has a refresh_token field — the Go
 *   service sets the refresh token as its own HttpOnly cookie via
 *   Set-Cookie, and that header must be forwarded onto this response with
 *   event.setHeaders rather than reconstructed from a JSON value. See the
 *   module doc comment in $lib/server/auth-client.ts for the full
 *   rationale; this was the source of a real bug where setAuthCookies was
 *   called with tokens.refresh_token === undefined, silently writing a
 *   broken refresh cookie on every sign-up.
 *
 * WHY /auth/callback AND NOT /app/dashboard:
 *   New users have no profile row and no actors. Redirecting to
 *   /app/dashboard directly skips the callback's resolveDestination()
 *   which is the only place that gates on profile completeness:
 *
 *     no profile row           → /onboarding
 *     passenger + no full_name → /onboarding
 *     invite redeemed          → /org/:id/dashboard
 *     driver/conductor         → /crew/dashboard
 *     admin                    → /admin/dashboard
 *     fallback                 → /app/dashboard
 *
 *   Without the callback, every new user lands at /app/dashboard
 *   with a blank profile and no PASSENGER actor — a broken state.
 *
 * REGISTER → AUTO-LOGIN:
 *   The Go auth service creates the user but does not issue tokens.
 *   We call login() immediately so the user reaches the app without
 *   a second prompt.  If email verification is added to the service
 *   later, remove the login() block and redirect to a "check your
 *   email" page instead.
 *
 * NICKNAME DERIVATION:
 *   The Go /auth/register endpoint requires a nickname field.
 *   We derive it server-side from first_name + last_name initial,
 *   lowercase, non-alphanumeric chars stripped.
 *   e.g. "Adrian Mwicigi" → "adrianm"
 *   The Go service enforces uniqueness — on collision the register
 *   call returns 409 which is surfaced as a user-facing error.
 *
 * INVITE FORWARDING:
 *   If sign-up was reached with ?invite=xyz, the token is forwarded
 *   to the callback which calls redeem_invite() RPC before routing.
 *   Org-invite members skip onboarding and land at /org/:id/dashboard.
 *
 * AUTO-LOGIN FALLBACK:
 *   Registration succeeded but token issuance failed (edge case —
 *   service restart between the two calls).  Send to sign-in with
 *   ?registered=true so a banner confirms the account exists.
 *
 * SSR:
 *   No `ssr = false` — required only for Supabase Auth UI (client-only).
 *
 * ANALYTICS:
 *   Server-side with the real user ID from the registration response.
 */
import { fail, redirect }              from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import {
  register,
  login,
  setAccessTokenCookie,
  forwardAuthServiceCookie,
  AuthError,
}                                      from "$lib/server/auth-client"
import { getPostHogClient }            from "$lib/server/posthog"

export const load: PageServerLoad = async () => ({})

/**
 * deriveNickname
 *
 * Builds a URL-safe, lowercase nickname from first + last name.
 * Strips all non-alphanumeric characters so the Go nicknameRegex
 * (which typically allows [a-z0-9_]) always passes.
 *
 * Examples:
 *   "Adrian", "Mwicigi" → "adrianm"
 *   "Jean-Pierre", "Dupont" → "jeanpierred"
 */
function deriveNickname(firstName: string, lastName: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
  return clean(firstName) + clean(lastName).charAt(0)
}

export const actions: Actions = {
  default: async (event) => {
    const { request, url } = event
    const form      = await request.formData()
    const email     = form.get("email")?.toString().trim()      ?? ""
    const password  = form.get("password")?.toString()          ?? ""
    const firstName = form.get("first_name")?.toString().trim() ?? ""
    const lastName  = form.get("last_name")?.toString().trim()  ?? ""
    const country   = form.get("country")?.toString().trim()    ?? "KE"

    const fields = { email, firstName, lastName, country }

    // ── Validation ───────────────────────────────────────────────
    if (!email || !password || !firstName || !lastName) {
      return fail(400, { error: "All fields are required.", ...fields })
    }
    if (password.length < 8) {
      return fail(400, { error: "Password must be at least 8 characters.", ...fields })
    }

    // ── Derive nickname for the Go service ───────────────────────
    const nickname = deriveNickname(firstName, lastName)

    // ── Register ─────────────────────────────────────────────────
    let userId: string | undefined
    try {
      const result = await register({
        email,
        password,
        first_name: firstName,
        last_name:  lastName,
        nickname,
        country,
      })
      userId = result.body.user.id
      // register() does not mint a session — the Go service's
      // POST /auth/register never sets a refresh cookie, so there is
      // nothing to forward from result.setCookie here (it will be
      // undefined). The actual session is opened by the login() call below.
    } catch (err) {
      if (err instanceof AuthError) {
        switch (err.status) {
          case 400:
            return fail(400, { error: "Invalid registration details — check your input.", ...fields })
          case 409:
            return fail(409, { error: "An account with that email already exists.", ...fields })
          case 429:
            return fail(429, { error: "Too many requests — please wait before trying again.", ...fields })
          default:
            console.error("[sign_up] register error:", err.status, err.message)
            return fail(500, { error: "Registration failed. Please try again.", ...fields })
        }
      }
      console.error("[sign_up] unexpected register error:", err)
      return fail(500, { error: "Something went wrong. Please try again.", ...fields })
    }

    // ── Auto-login ───────────────────────────────────────────────
    try {
      const result = await login({ email, password })
      setAccessTokenCookie(event.cookies, result.body)
      forwardAuthServiceCookie(event.cookies, result.setCookie)
    } catch (err) {
      console.error("[sign_up] auto-login after register failed:", err)
      throw redirect(303, "/login/sign_in?registered=true")
    }

    // ── Analytics ────────────────────────────────────────────────
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: userId ?? email,
        event:      "user_signed_up",
        properties: { email, country, provider: "email" },
      })
    } catch {
      // Non-fatal
    }

    // ── Route through callback ────────────────────────────────────
    // New user → no profile → resolveDestination() → /onboarding.
    // Invite token forwarded so org-invite members skip onboarding.
    const callbackUrl = new URL("/auth/callback", url.origin)

    const inviteToken = url.searchParams.get("invite")
    const next        = url.searchParams.get("next")
    if (inviteToken) callbackUrl.searchParams.set("invite", inviteToken)
    if (next)        callbackUrl.searchParams.set("next", next)

    throw redirect(303, callbackUrl.pathname + callbackUrl.search)
  },
}
