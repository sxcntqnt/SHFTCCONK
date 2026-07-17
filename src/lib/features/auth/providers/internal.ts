import type { AuthProvider, AuthRequest, AuthUser, AuthSession, SafeSessionResult } from '../types/types';
import type { Cookies } from "@sveltejs/kit";
/**
 * InternalAuthProvider
 *
 * Validates sessions against the internal Go auth service's
 * GET /auth/verify endpoint and returns opaque session info.
 *
 * CONTRACT CHANGE:
 *   This provider previously called POST /validate with a JSON body of
 *   { access_token, refresh_token, ip } and expected a JSON response of
 *   { valid, user, session: { sessionId, expiresAt, amr } } back.
 *
 *   That endpoint does not exist on the Go auth service and never did —
 *   the actual contract is GET /auth/verify, authenticated via
 *   `Authorization: Bearer <access_token>`, which returns either:
 *
 *     200 OK  + identity headers (X-Principal-Kind, X-User-Id, X-Actor-Id,
 *              X-Actor-Type, X-Client-Id, X-Service-Name, X-Permissions,
 *              X-Delegated-Permissions, X-Policy-Groups), empty body
 *     401     + empty body, no headers
 *
 *   This is deliberately the same endpoint NGINX's auth_request directive
 *   calls for forward-auth in front of other services (see the auth-service
 *   README's "Routes" table) — there is exactly one verification contract
 *   for every caller, browser-facing SvelteKit hooks included. There is no
 *   JSON body to parse on success; everything the caller needs comes back
 *   as headers.
 *
 *   The refresh_token is intentionally never sent to /auth/verify — that
 *   endpoint only validates the access token. Refresh happens separately
 *   via POST /auth/refresh, which reads the refresh cookie directly (see
 *   auth-client.ts) and is not part of session resolution on every request.
 */
export class InternalAuthProvider implements AuthProvider {
  private authServiceUrl: string;

  constructor(authServiceUrl?: string) {
    // Use ENV if no URL is provided
    this.authServiceUrl = authServiceUrl ?? process.env.AUTH_URL ?? 'http://auth-service';
  }

  async getSession(req: AuthRequest): Promise<SafeSessionResult> {
    const accessToken = req.cookies?.['access_token'];

    if (!accessToken) return { session: null, user: null, amr: [] };

    try {
      const res = await fetch(`${this.authServiceUrl}/auth/verify`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        // 401 from /auth/verify means the access token is missing, expired,
        // invalid, or belongs to a revoked session — SessionService.VerifyToken
        // does not distinguish these to callers outside the Go service (see
        // the auth-service README's "Known gaps" entry on the two-bucket
        // error collapse), so there is nothing more specific to branch on
        // here. Fail closed.
        return { session: null, user: null, amr: [] };
      }

      const kind = res.headers.get('x-principal-kind');

      if (kind !== 'user') {
        // /auth/verify also validates service-account tokens (kind=service),
        // but this provider backs human-facing SvelteKit sessions — a
        // service-account access token presented here is not a valid user
        // session, even though it would pass /auth/verify's own check.
        return { session: null, user: null, amr: [] };
      }

      const userId = res.headers.get('x-user-id');
      if (!userId) {
        // Defensive: a 200 with kind=user should always carry X-User-Id.
        // Its absence indicates a contract drift between this provider and
        // the Go service that should be investigated rather than silently
        // treated as "logged out" — log it distinctly from the normal
        // unauthenticated path above.
        console.error('[InternalAuthProvider] /auth/verify returned 200 with kind=user but no X-User-Id header');
        return { session: null, user: null, amr: [] };
      }

      // /auth/verify carries no expiresAt or amr concept — those were
      // artifacts of the old JWT claims. AuthSession.expiresAt is left
      // undefined; amr is left as an empty array. If downstream code reads
      // expiresAt to decide when to refresh, that decision should instead
      // be driven by the access_token's own short lifetime (15 minutes by
      // default) and a proactive refresh schedule, not by inspecting this
      // provider's return value.
      const authSession: AuthSession = {
        sessionId: accessToken, // opaque reference to the caller; never a JWT
        expiresAt: undefined,
      };

      const user: AuthUser = {
        id: userId,
        // The Go service's /auth/verify response carries identity via
        // headers only, and does not currently include nickname/email
        // (see the auth-service README's "Known gaps" entry — domain.Session
        // does not carry these fields yet). If your AuthUser type requires
        // them, they must be fetched separately, e.g. via GET /auth/me or
        // GET /users/{id}, rather than assumed present here.
      } as AuthUser;

      return {
        session: authSession,
        user,
        amr: [],
      };
    } catch (err) {
      console.error('[InternalAuthProvider] Failed to validate session:', err);
      return { session: null, user: null, amr: [] };
    }
  }

  clearCookies(event: { cookies: Cookies }) {
    event.cookies.delete("access_token", {
      path: "/",
    });
    // The refresh cookie is owned by the Go service (Path=/auth/refresh,
    // set via its own Set-Cookie header) — this provider's clearCookies
    // cannot reach it with event.cookies.delete, since SvelteKit's cookie
    // jar only knows about cookies it itself can see the Path/Domain for.
    // A full logout should call POST /auth/logout on the Go service (see
    // logout() in auth-client.ts) and forward that response's own
    // Set-Cookie header, which clears the refresh cookie correctly.
  }
}
