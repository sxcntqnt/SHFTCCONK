/**
 * csrf-primitives.test.ts
 *
 * Vitest / Jest unit tests.  Because the primitives are pure functions every
 * branch can be exercised without a running server.
 *
 * Run:  npx vitest run sec/hooks/csrf-primitives.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  generateRawToken,
  bundleToken,
  unbundleToken,
} from './csrf-primitives'

const SECRET  = 'test-secret-do-not-use-in-prod'
const SIZE    = 32
const ONE_HOUR = 60 * 60 * 1_000

// ─── generateRawToken ────────────────────────────────────────────────────────

describe('generateRawToken', () => {
  it('returns a Buffer of the requested byte length', () => {
    expect(generateRawToken(16).length).toBe(16)
    expect(generateRawToken(32).length).toBe(32)
  })

  it('produces unique values on each call', () => {
    const a = generateRawToken(16).toString('hex')
    const b = generateRawToken(16).toString('hex')
    expect(a).not.toBe(b)
  })
})

// ─── bundleToken + unbundleToken (happy path) ────────────────────────────────

describe('round-trip', () => {
  it('unbundles a freshly-bundled token as valid', () => {
    const raw     = generateRawToken(SIZE)
    const bundled = bundleToken(raw, SECRET, { expiresAt: Date.now() + ONE_HOUR })
    const result  = unbundleToken(bundled, SECRET)

    expect(result.valid).toBe(true)
    expect(result.raw?.toString('hex')).toBe(raw.toString('hex'))
  })

  it('is valid with a session id that matches', () => {
    const raw     = generateRawToken(SIZE)
    const bundled = bundleToken(raw, SECRET, {
      expiresAt: Date.now() + ONE_HOUR,
      sessionId: 'user-42',
    })
    const result  = unbundleToken(bundled, SECRET, { sessionId: 'user-42' })
    expect(result.valid).toBe(true)
  })
})

// ─── expiry ──────────────────────────────────────────────────────────────────

describe('expiry', () => {
  it('rejects a token whose expiresAt is in the past', () => {
    const raw     = generateRawToken(SIZE)
    const bundled = bundleToken(raw, SECRET, { expiresAt: Date.now() - 1 })
    const result  = unbundleToken(bundled, SECRET)
    expect(result.valid).toBe(false)
  })

  it('accepts a token when injected "now" is before expiresAt', () => {
    const base    = 1_000_000
    const raw     = generateRawToken(SIZE)
    const bundled = bundleToken(raw, SECRET, { expiresAt: base + ONE_HOUR })
    const result  = unbundleToken(bundled, SECRET, { now: base })
    expect(result.valid).toBe(true)
  })

  it('rejects a token when injected "now" is after expiresAt', () => {
    const base    = 1_000_000
    const raw     = generateRawToken(SIZE)
    const bundled = bundleToken(raw, SECRET, { expiresAt: base + ONE_HOUR })
    const result  = unbundleToken(bundled, SECRET, { now: base + ONE_HOUR + 1 })
    expect(result.valid).toBe(false)
  })
})

// ─── session binding ─────────────────────────────────────────────────────────

describe('session binding', () => {
  it('rejects a token presented with a different session id', () => {
    const raw     = generateRawToken(SIZE)
    const bundled = bundleToken(raw, SECRET, {
      expiresAt: Date.now() + ONE_HOUR,
      sessionId: 'user-1',
    })
    const result = unbundleToken(bundled, SECRET, { sessionId: 'user-2' })
    expect(result.valid).toBe(false)
  })

  it('rejects a token created without session id when one is expected', () => {
    const raw     = generateRawToken(SIZE)
    const bundled = bundleToken(raw, SECRET, { expiresAt: Date.now() + ONE_HOUR })
    const result  = unbundleToken(bundled, SECRET, { sessionId: 'user-1' })
    expect(result.valid).toBe(false)
  })
})

// ─── tamper detection ────────────────────────────────────────────────────────

describe('tamper detection', () => {
  it('rejects a token signed with the wrong secret', () => {
    const raw     = generateRawToken(SIZE)
    const bundled = bundleToken(raw, 'secret-A', { expiresAt: Date.now() + ONE_HOUR })
    const result  = unbundleToken(bundled, 'secret-B')
    expect(result.valid).toBe(false)
  })

  it('rejects a token whose hex segment is altered', () => {
    const raw     = generateRawToken(SIZE)
    const bundled = bundleToken(raw, SECRET, { expiresAt: Date.now() + ONE_HOUR })
    // flip the first character of the hex segment
    const tampered = ('f' + bundled.slice(1))
    const result   = unbundleToken(tampered, SECRET)
    expect(result.valid).toBe(false)
  })

  it('rejects a token whose timestamp segment is altered', () => {
    const raw     = generateRawToken(SIZE)
    const bundled = bundleToken(raw, SECRET, { expiresAt: Date.now() + ONE_HOUR })
    const parts   = bundled.split('.')
    // push expiry far into the future
    parts[1]      = String(Date.now() + 99 * ONE_HOUR)
    const result  = unbundleToken(parts.join('.'), SECRET)
    expect(result.valid).toBe(false)
  })
})

// ─── malformed-input hardening ───────────────────────────────────────────────

describe('malformed input – never throws, always returns valid:false', () => {
  const cases: Array<[string, string]> = [
    ['empty string',              ''],
    ['only dots',                 '...'],
    ['three segments',            'aa.111.'],
    ['five segments',             'aa.111..sig.extra'],
    ['non-hex token',             'zzzz.111..sig'],
    ['odd-length hex',            'abc.111..sig'],
    ['non-numeric timestamp',     'aabb.NaN..sig'],
    ['length-mismatched sig',     'aabb.111..x'],
    ['arbitrary garbage',         '!@#$%^&*()'],
    ['SQL injection attempt',     "' OR 1=1; --"],
  ]

  it.each(cases)('%s', (_label, input) => {
    expect(() => unbundleToken(input, SECRET)).not.toThrow()
    expect(unbundleToken(input, SECRET).valid).toBe(false)
  })
})
