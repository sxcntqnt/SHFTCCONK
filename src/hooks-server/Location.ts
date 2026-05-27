/**
 * src/hooks/location.ts
 *
 * Reads Cloudflare edge headers and seeds event.locals.requestContext.
 *
 * ARCHITECTURE NOTE — THIS IS NOT AUTH:
 *   requestContext is a request-optimisation concern.  It tells the map
 *   bootstrap pipeline which spatial slice of the world to load for this
 *   session.  It never reads from auth, never gates routes, and is
 *   completely independent from UserState / ActiveContext.
 *
 *   auth pipeline:  supabaseHandle → authGuardHandle → userStateHandle
 *   map pipeline:   locationHandle → mapServiceHandle → requestContext
 *
 * Placement: AFTER cloudflareHttpsFix (clean protocol),
 *            BEFORE mapServiceHandle + posthogProxy (both consume regionKey).
 *
 * Locals set:     event.locals.requestContext
 * Locals NOT set: session, user, userState, activeContext
 */

import type { Handle } from '@sveltejs/kit'

// ─── invalid Cloudflare geo codes ────────────────────────────────────────────

/** Edge-case codes CF returns that must not be treated as real countries */
const INVALID_CF_CODES = new Set(['XX', 'T1', 'A1', 'A2'])

function normalizeCountry(code: string | null): string | null {
  if (!code) return null
  const upper = code.toUpperCase()
  return INVALID_CF_CODES.has(upper) ? null : upper
}

// ─── city centre lookup ───────────────────────────────────────────────────────

/**
 * Approximate city centres for the Kenya / Nairobi dataset.
 * Expand this record when the dataset grows beyond this region.
 */
const KE_CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  Nairobi:  { lat: -1.2921, lng: 36.8219 },
  Mombasa:  { lat: -4.0435, lng: 39.6682 },
  Kisumu:   { lat: -0.0917, lng: 34.7679 },
  Nakuru:   { lat: -0.3031, lng: 36.0800 },
  Eldoret:  { lat:  0.5143, lng: 35.2698 },
  Thika:    { lat: -1.0332, lng: 37.0693 },
  Machakos: { lat: -1.5177, lng: 37.2634 },
}

/** Nairobi is the primary dataset anchor — default when city/country unknown */
const DEFAULT_CENTER = KE_CITY_CENTERS.Nairobi

function inferApproxCenter(
  city: string | null,
  country: string | null,
): { lat: number; lng: number } {
  // Only apply city lookup for the KE dataset — prevents wrong centres when a
  // non-KE user accesses the app
  if (country !== 'KE' || !city) return DEFAULT_CENTER
  return KE_CITY_CENTERS[city] ?? DEFAULT_CENTER
}

// ─── H3 seed resolution ───────────────────────────────────────────────────────

/**
 * Determines the coarseness of the initial bootstrap manifest.
 * Resolution 7 = city/metro level (~5 km² cells) — correct for Nairobi.
 * Resolution 6 = extra coarse, used when country is unknown to minimise data.
 */
function inferH3SeedResolution(country: string | null): number {
  if (!country) return 6
  return 7
}

// ─── handle ───────────────────────────────────────────────────────────────────

export const locationHandle: Handle = async ({ event, resolve }) => {
  const headers = event.request.headers

  const rawCountry = headers.get('cf-ipcountry')
  const city       = headers.get('cf-ipcity')
  const ip         = headers.get('cf-connecting-ip')

  const country = normalizeCountry(rawCountry)

  event.locals.requestContext = {
    country,
    city:             city ?? null,
    ip:               ip ?? null,
    /** Stable per city — usable as a cache key and analytics dimension */
    regionKey:        `${country ?? 'XX'}:${city ?? 'unknown'}`,
    approxCenter:     inferApproxCenter(city, country),
    h3SeedResolution: inferH3SeedResolution(country),
  }

  return resolve(event)
}
