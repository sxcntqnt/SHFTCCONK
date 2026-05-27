/**
 * csrf-primitives.ts
 *
 * Pure, side-effect-free cryptographic primitives for CSRF double-submit.
 * Every function is independently unit-testable.
 *
 * Vulnerabilities addressed vs. the naive implementation:
 *  1. timingSafeEqual length-mismatch guard  → prevents thrown exceptions on malformed input
 *  2. Strict hex regex + length validation   → prevents silent normalisation by Buffer.from
 *  3. Timestamp embedded in HMAC payload     → tokens expire; replay after TTL is rejected
 *  4. Optional sessionId in payload          → token is bound to a session identity
 */

import { randomBytes, createHmac, timingSafeEqual } from 'crypto'

// ─── constants ───────────────────────────────────────────────────────────────

/** Only lowercase hex digits – rejects any other byte silently accepted by Buffer.from */
const HEX_RE = /^[0-9a-f]+$/

// ─── types ────────────────────────────────────────────────────────────────────

export interface BundleOptions {
  /** Unix ms timestamp when the token expires */
  expiresAt: number
  /** Optionally bind the token to a session/user id */
  sessionId?: string
}

export interface UnbundleOptions {
  /** Current time in Unix ms – injectable for deterministic tests */
  now?: number
  /** If provided the session segment must match exactly */
  sessionId?: string
}

export type UnbundleResult =
  | { valid: true;  raw: Buffer }
  | { valid: false; raw?: never }

// ─── primitives ──────────────────────────────────────────────────────────────

/**
 * generateRawToken
 * Produces `size` cryptographically-secure random bytes.
 */
export const generateRawToken = (size: number): Buffer => randomBytes(size)

/**
 * signPayload
 * HMAC-SHA256 over an arbitrary string payload.
 * Kept separate so tests can verify the exact bytes being signed.
 */
export const signPayload = (payload: string, secret: string): string =>
  createHmac('sha256', secret).update(payload).digest('hex')

/**
 * bundleToken
 *
 * Encodes a token as:
 *   hex(raw) . expiresAt . sessionId . HMAC(hex.expiresAt.sessionId, secret)
 *
 * The HMAC covers ALL three segments, so altering any one of them invalidates
 * the signature.  Expiry and session-binding are therefore tamper-proof.
 */
export const bundleToken = (
  raw: Buffer,
  secret: string,
  opts: BundleOptions,
): string => {
  const hex       = raw.toString('hex')
  const ts        = String(opts.expiresAt)
  const session   = opts.sessionId ?? ''
  const payload   = `${hex}.${ts}.${session}`
  const sig       = signPayload(payload, secret)
  return `${payload}.${sig}`
}

/**
 * unbundleToken
 *
 * Validates and decodes a bundled token string.
 *
 * Guards applied (in order):
 *  1. Structural split – must produce exactly 4 segments
 *  2. Hex format       – rejects non-hex before Buffer.from ever runs
 *  3. Hex length       – must be even (whole bytes only)
 *  4. Expiry           – rejects tokens past their expiresAt timestamp
 *  5. Session match    – when opts.sessionId is provided it must equal the stored value
 *  6. HMAC integrity   – constant-time comparison; length checked first to avoid throw
 */
export const unbundleToken = (
  bundled: string,
  secret: string,
  opts: UnbundleOptions = {},
): UnbundleResult => {
  // ── 1. structural split ──────────────────────────────────────────────────
  const parts = bundled.split('.')
  if (parts.length !== 4) return { valid: false }

  const [hex, tsStr, session, sig] = parts as [string, string, string, string]

  // ── 2. hex format guard ──────────────────────────────────────────────────
  if (!HEX_RE.test(hex)) return { valid: false }

  // ── 3. hex length guard (must represent whole bytes) ─────────────────────
  if (hex.length === 0 || hex.length % 2 !== 0) return { valid: false }

  // ── 4. expiry ─────────────────────────────────────────────────────────────
  const expiresAt = Number(tsStr)
  if (!Number.isFinite(expiresAt)) return { valid: false }
  const now = opts.now ?? Date.now()
  if (now > expiresAt) return { valid: false }

  // ── 5. session binding ────────────────────────────────────────────────────
  if (opts.sessionId !== undefined && session !== opts.sessionId) {
    return { valid: false }
  }

  // ── 6. HMAC constant-time comparison ────────────────────────────────────
  const payload  = `${hex}.${tsStr}.${session}`
  const expected = signPayload(payload, secret)

  const sigBuf      = Buffer.from(sig,      'utf8')
  const expectedBuf = Buffer.from(expected, 'utf8')

  // timingSafeEqual THROWS when lengths differ – guard first
  if (sigBuf.length !== expectedBuf.length) return { valid: false }

  const valid = timingSafeEqual(sigBuf, expectedBuf)
  if (!valid) return { valid: false }

  return { valid: true, raw: Buffer.from(hex, 'hex') }
}
