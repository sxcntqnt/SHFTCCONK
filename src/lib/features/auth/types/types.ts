export type AuthUser = {
  id: string;
  email?: string | null;
  roles?: string[];
  [key: string]: unknown;
};

export type AuthSession = {
  sessionId: string;          // opaque ID only
  expiresAt?: number;         // Unix timestamp
};

export type SafeSessionResult = {
  session: AuthSession | null;
  user: AuthUser | null;
  amr?: Array<{ method: string }>;
};

/**
 * Framework-agnostic request info for auth providers
 */
export type AuthRequest = {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  ip?: string;
};

/**
 * Auth provider interface
 */
export interface AuthProvider {
  getSession(req: AuthRequest): Promise<SafeSessionResult>;
}