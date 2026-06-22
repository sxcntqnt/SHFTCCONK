/**
 * src/routes/(marketing)/login/sign_in/+page.server.ts
 *
 * Server action for email + password sign-in.
 *
 * FLOW:
 *   1. Validate form fields
 *   2. POST /auth/login → Go auth service
 *   3. Set access_token cookie + forward the Go service's own refresh
 *      cookie (Set-Cookie header) verbatim
 *   4. Redirect → /auth/callback
 *
 * CONTRACT CHANGE FROM THE JWT-ERA VERSION:
 *   login() now returns { body, setCookie } instead of the bare JSON
 *   body, and body has no refresh_token field. See the module doc comment
 *   in $lib/server/auth-client.ts for the full rationale — the refresh
 *   token is now an HttpOnly cookie set directly by the Go service, and
 *   must be forwarded with event.setHeaders rather than read out of the
 *   response body.
 *
 * WHY /auth/callback AND NOT /app/dashboard:
 *   The callback route is the single routing authority for all auth
 *   paths.  For AUTH_PROVIDER=internal it:
 *     a. Confirms locals.auth.user (authHandle reads the new cookies via
 *        InternalAuthProvider.getSession, which now calls the real
 *        GET /auth/verify endpoint — see internal.ts)
 *     b. Syncs internal identity → Supabase users row
 *     c. Creates a user-scoped Supabase client (auth.uid() in Postgres)
 *     d. Redeems any pending invite token
 *     e. Calls bootstrap_session() RPC
 *     f. Runs resolveDestination() → correct landing page
 *
 *   This means sign-in and OAuth share identical post-auth routing:
 *     new user (no profile)   → /onboarding
 *     passenger + incomplete  → /onboarding
 *     org roles               → /org/:id/dashboard
 *     driver / conductor      → /crew/dashboard
 *     admin                   → /admin/dashboard
 *     fallback                → /app/dashboard
 *
 * INVITE + NEXT FORWARDING:
 *   If the sign-in page was reached with ?invite=xyz or ?next=/some/path,
 *   those params are forwarded to the callback so invite redemption and
 *   post-login deep-links work correctly.
 */
import { fail, redirect }             from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import {
  login,
  setAccessTokenCookie,
  forwardAuthServiceCookie,
  AuthError,
}                                      from "$lib/server/auth-client"
import { getPostHogClient }           from "$lib/server/posthog"

export const load: PageServerLoad = async () => ({ })

export const actions: Actions = {
  default: async (event) => {
    const { request, url } = event
    const form     = await request.formData()
    const email    = form.get("email")?.toString().trim() ?? ""
    const password = form.get("password")?.toString()     ?? ""

    // ── Basic validation ─────────────────────────────────────────
    if (!email || !password) {
      return fail(400, { error: "Email and password are required.", email })
    }

    // ── Call Go auth service ──────────────────────────────────────
    try {
      const result = await login({ email, password })
      setAccessTokenCookie(event.cookies, result.body)
      forwardAuthServiceCookie(event.cookies, result.setCookie)
    } catch (err) {
      if (err instanceof AuthError) {
        switch (err.status) {
          case 400:
            return fail(400, { error: "Invalid request — check your input.", email })
          case 401:
            return fail(401, { error: "Invalid email or password.", email })
          case 429:
            return fail(429, { error: "Too many attempts — please wait before trying again.", email })
          default:
            console.error("[sign_in] auth service error:", err.status, err.message)
            return fail(500, { error: "Sign in failed. Please try again.", email })
        }
      }
      console.error("[sign_in] unexpected error:", err)
      return fail(500, { error: "Something went wrong. Please try again.", email })
    }

    // ── Analytics ────────────────────────────────────────────────
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: email,
        event:      "user_signed_in",
        properties: { provider: "email" },
      })
    } catch {
      // Non-fatal
    }

    // ── Route through callback ────────────────────────────────────
    // authHandle will read the new cookies on the next request.
    // Forward invite and next params so the callback can handle
    // invite redemption and deep-link redirects.
    const callbackUrl = new URL("/auth/callback", url.origin)

    const inviteToken = url.searchParams.get("invite")
    const next        = url.searchParams.get("next")
    if (inviteToken) callbackUrl.searchParams.set("invite", inviteToken)
    if (next)        callbackUrl.searchParams.set("next", next)

    throw redirect(303, callbackUrl.pathname + callbackUrl.search)
  },
}
