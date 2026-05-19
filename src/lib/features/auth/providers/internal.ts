import type { AuthProvider, AuthRequest, AuthUser, AuthSession, SafeSessionResult } from '../types/types';

type AuthServiceValidateResponse = {
  valid: boolean;
  user: AuthUser;
  session: {
    sessionId: string;        // opaque ID
    expiresAt?: number;       // Unix timestamp
    amr?: Array<{ method: string }>;
  };
};

/**
 * InternalAuthProvider
 *
 * Validates sessions with internal auth service and returns opaque session info.
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
      const res = await fetch(`${this.authServiceUrl}/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: req.cookies?.['refresh_token'],
          ip: req.ip,
        }),
      });

      if (!res.ok) {
        console.warn('[InternalAuthProvider] Auth service returned non-OK status:', res.status);
        return { session: null, user: null, amr: [] };
      }

      const payload: AuthServiceValidateResponse = await res.json();

      if (!payload.valid) return { session: null, user: null, amr: [] };

      const authSession: AuthSession = {
        sessionId: payload.session.sessionId,
        expiresAt: payload.session.expiresAt,
      };

      return {
        session: authSession,
        user: payload.user,
        amr: payload.session.amr ?? [],
      };
    } catch (err) {
      console.error('[InternalAuthProvider] Failed to validate session:', err);
      return { session: null, user: null, amr: [] };
    }
  }

  clearCookies(event: { cookies: { delete: (name: string) => void } }) {
    event.cookies.delete('access_token');
    event.cookies.delete('refresh_token');
  }
}